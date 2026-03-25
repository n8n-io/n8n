"use strict";

/**
 * A reference to the global object
 *
 * @type {object} globalObject
 */
var globalObject;

/* istanbul ignore else */
if (typeof global !== "undefined") {
    // Node
    globalObject = global;
} else if (typeof window !== "undefined") {
    // Browser
    globalObject = window;
} else {
    // WebWorker
    globalObject = self;
}

module.exports = globalObject;
