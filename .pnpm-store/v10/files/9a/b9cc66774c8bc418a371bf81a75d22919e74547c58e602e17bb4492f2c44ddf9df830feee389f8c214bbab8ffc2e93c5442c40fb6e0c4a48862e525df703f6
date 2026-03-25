"use strict";

var NodeList;

try {
    // Attempt to use ES6-style Array subclass if possible.
    NodeList = require('./NodeList.es6.js');
} catch (e) {
    // No support for subclassing array, return an actual Array object.
    NodeList = require('./NodeList.es5.js');
}

module.exports = NodeList;
