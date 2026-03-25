"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMsFilter = void 0;
var conversion_1 = require("./conversion");
var index_1 = require("./index");
/**
 * Returns the color represented as a Microsoft filter for use in old versions of IE.
 */
function toMsFilter(firstColor, secondColor) {
    var color = new index_1.TinyColor(firstColor);
    var hex8String = '#' + (0, conversion_1.rgbaToArgbHex)(color.r, color.g, color.b, color.a);
    var secondHex8String = hex8String;
    var gradientType = color.gradientType ? 'GradientType = 1, ' : '';
    if (secondColor) {
        var s = new index_1.TinyColor(secondColor);
        secondHex8String = '#' + (0, conversion_1.rgbaToArgbHex)(s.r, s.g, s.b, s.a);
    }
    return "progid:DXImageTransform.Microsoft.gradient(".concat(gradientType, "startColorstr=").concat(hex8String, ",endColorstr=").concat(secondHex8String, ")");
}
exports.toMsFilter = toMsFilter;
