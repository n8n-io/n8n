import { rgbaToArgbHex } from './conversion';
import { TinyColor } from './index';
/**
 * Returns the color represented as a Microsoft filter for use in old versions of IE.
 */
export function toMsFilter(firstColor, secondColor) {
    var color = new TinyColor(firstColor);
    var hex8String = '#' + rgbaToArgbHex(color.r, color.g, color.b, color.a);
    var secondHex8String = hex8String;
    var gradientType = color.gradientType ? 'GradientType = 1, ' : '';
    if (secondColor) {
        var s = new TinyColor(secondColor);
        secondHex8String = '#' + rgbaToArgbHex(s.r, s.g, s.b, s.a);
    }
    return "progid:DXImageTransform.Microsoft.gradient(".concat(gradientType, "startColorstr=").concat(hex8String, ",endColorstr=").concat(secondHex8String, ")");
}
