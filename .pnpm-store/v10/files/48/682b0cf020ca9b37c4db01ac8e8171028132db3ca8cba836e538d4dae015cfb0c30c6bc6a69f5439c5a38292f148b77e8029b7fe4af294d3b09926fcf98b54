'use strict';

var recursionDetectionMiddleware = require('./recursionDetectionMiddleware');

const recursionDetectionMiddlewareOptions = {
    step: "build",
    tags: ["RECURSION_DETECTION"],
    name: "recursionDetectionMiddleware",
    override: true,
    priority: "low",
};

const getRecursionDetectionPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(recursionDetectionMiddleware.recursionDetectionMiddleware(), recursionDetectionMiddlewareOptions);
    },
});

exports.getRecursionDetectionPlugin = getRecursionDetectionPlugin;
Object.prototype.hasOwnProperty.call(recursionDetectionMiddleware, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: recursionDetectionMiddleware['__proto__']
    });

Object.keys(recursionDetectionMiddleware).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = recursionDetectionMiddleware[k];
});
