"use strict";

// No support for subclassing array, return an actual Array object.
function item(i) {
    /* jshint validthis: true */
    return this[i] || null;
}

function NodeList(a) {
    if (!a) a = [];
    a.item = item;
    return a;
}

module.exports = NodeList;
