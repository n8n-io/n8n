"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computedSet = computedSet;
const index_js_1 = require("../index.js");
function computedSet(source) {
    return (0, index_js_1.computed)((oldValue) => {
        const newValue = source.get();
        if (oldValue?.size === newValue.size && [...oldValue].every(c => newValue.has(c))) {
            return oldValue;
        }
        return newValue;
    });
}
