"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (...args) {
    return function (...ignoredArgs /*, callback*/) {
        var callback = ignoredArgs.pop();
        return callback(null, ...args);
    };
};

module.exports = exports.default;