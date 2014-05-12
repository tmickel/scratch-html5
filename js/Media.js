// Copyright (C) 2014 Massachusetts Institute of Technology
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 2,
// as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

// Scratch HTML5 Player
// Media.js
// Tim Mickel, June 2014

'use strict';

var Media = function() {
    navigator.getUserMedia = (navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);
    this.audioInitialized = false;
    this.loudnessMin = 1.1; // Intensity normalization
    this.loudnessConstant = 100;
}

Media.prototype.audioStreamProcess = function(stream) {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();
    this.audioAnalyser = context.createAnalyser();
    this.audioAnalyser.smoothingTimeConstant = 0; // Don't use old data for calculation
    this.audioAnalyser.fftSize = 1024;
    this.audioSource = context.createMediaStreamSource(stream);
    var jsnode = context.createScriptProcessor(2048, 1, 1);
    this.audioSource.connect(this.audioAnalyser);
    this.audioAnalyser.connect(jsnode);
    jsnode.connect(context.destination);
    jsnode.onaudioprocess = this.audioProcess.bind(this); 
}

Media.prototype.audioProcess = function() {
    var a = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    this.audioAnalyser.getByteFrequencyData(a);
    // Sum the frequency data
    var total = 0;
    var freqSize = a.length;
    for (var i = 0; i < freqSize; i++) { total += a[i]; }
    var volume = total / freqSize;
    // Logarithmically calculate the loudness - constants need to be calibrated to the flash player
    // In AS, media input provides "microphone activity" as a property; in HTML5, we
    // need to calculate this value based on the actual content of the stream.
    var intensity = this.loudnessConstant * ((Math.log(volume / this.loudnessMin) / Math.log(10)) - 1);
    intensity = Math.round(Math.max(0, Math.min(intensity, 100)));
    runtime.micLoudness = intensity;
}

Media.prototype.audioInitialize = function() {
    if (!this.audioInitialized) {
        navigator.getUserMedia({audio: true, video: false},
            this.audioStreamProcess.bind(this), function() {});
        this.audioInitialized = true;
    }
}
