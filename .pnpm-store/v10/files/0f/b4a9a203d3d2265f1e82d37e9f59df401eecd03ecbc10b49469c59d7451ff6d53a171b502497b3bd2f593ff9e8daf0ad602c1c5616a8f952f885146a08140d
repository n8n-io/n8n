'use strict';

var timeSafeCompare = require('../../lib/index');

function random(length) {

    length = length || 32;
    var result = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-+/*[]{}-=\|;\':\"<>?,./";

    for( var i=0; i < length; i++ ){
        result += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return result;
}

function run(count) {
    count = count || 100*1000;
    console.log('benchmark count: ' + count/1000 + 'k');
    console.time('benchmark');
    
    while(count--){
        timeSafeCompare(random(), random());
    }
    console.timeEnd('benchmark');
}

run(100000);

module.exports = run;
