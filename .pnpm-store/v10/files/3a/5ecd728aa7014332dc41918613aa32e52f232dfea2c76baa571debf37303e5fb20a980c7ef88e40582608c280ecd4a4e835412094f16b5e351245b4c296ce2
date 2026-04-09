"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyRandom = exports.fromRatio = void 0;
var index_js_1 = require("./index.js");
var util_js_1 = require("./util.js");
/**
 * If input is an object, force 1 into "1.0" to handle ratios properly
 * String input requires "1.0" as input, so 1 will be treated as 1
 */
function fromRatio(ratio, opts) {
    var newColor = {
        r: (0, util_js_1.convertToPercentage)(ratio.r),
        g: (0, util_js_1.convertToPercentage)(ratio.g),
        b: (0, util_js_1.convertToPercentage)(ratio.b),
    };
    if (ratio.a !== undefined) {
        newColor.a = Number(ratio.a);
    }
    return new index_js_1.TinyColor(newColor, opts);
}
exports.fromRatio = fromRatio;
/** old random function */
function legacyRandom() {
    return new index_js_1.TinyColor({
        r: Math.random(),
        g: Math.random(),
        b: Math.random(),
    });
}
exports.legacyRandom = legacyRandom;
