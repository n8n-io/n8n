import { TinyColor } from './index.js';
import { convertToPercentage } from './util.js';
/**
 * If input is an object, force 1 into "1.0" to handle ratios properly
 * String input requires "1.0" as input, so 1 will be treated as 1
 */
export function fromRatio(ratio, opts) {
    var newColor = {
        r: convertToPercentage(ratio.r),
        g: convertToPercentage(ratio.g),
        b: convertToPercentage(ratio.b),
    };
    if (ratio.a !== undefined) {
        newColor.a = Number(ratio.a);
    }
    return new TinyColor(newColor, opts);
}
/** old random function */
export function legacyRandom() {
    return new TinyColor({
        r: Math.random(),
        g: Math.random(),
        b: Math.random(),
    });
}
