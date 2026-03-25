/* jshint esversion: 6 */
"use strict";

module.exports = class NodeList extends Array {
    constructor(a) {
        super((a && a.length) || 0);
        if (a) {
            for (var idx in a) { this[idx] = a[idx]; }
        }
    }
    item(i) { return this[i] || null; }
};
