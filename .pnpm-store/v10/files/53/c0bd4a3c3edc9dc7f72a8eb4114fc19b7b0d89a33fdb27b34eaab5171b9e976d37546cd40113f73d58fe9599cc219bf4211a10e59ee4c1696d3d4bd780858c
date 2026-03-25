'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
function isNothing(subject) {
    return (typeof subject === 'undefined') || (null === subject);
}
exports.isNothing = isNothing;
function isObject(subject) {
    return (typeof subject === 'object') && (null !== subject);
}
exports.isObject = isObject;
function toArray(sequence) {
    if (Array.isArray(sequence)) {
        return sequence;
    }
    else if (isNothing(sequence)) {
        return [];
    }
    return [sequence];
}
exports.toArray = toArray;
function extend(target, source) {
    var index, length, key, sourceKeys;
    if (source) {
        sourceKeys = Object.keys(source);
        for (index = 0, length = sourceKeys.length; index < length; index += 1) {
            key = sourceKeys[index];
            target[key] = source[key];
        }
    }
    return target;
}
exports.extend = extend;
function repeat(string, count) {
    var result = '', cycle;
    for (cycle = 0; cycle < count; cycle += 1) {
        result += string;
    }
    return result;
}
exports.repeat = repeat;
function isNegativeZero(number) {
    return (0 === number) && (Number.NEGATIVE_INFINITY === 1 / number);
}
exports.isNegativeZero = isNegativeZero;
//# sourceMappingURL=common.js.map