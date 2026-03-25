// =============================================================================
// Helper functions
// =============================================================================
import { ALL_WEEKDAYS } from './weekday';
export var isPresent = function (value) {
    return value !== null && value !== undefined;
};
export var isNumber = function (value) {
    return typeof value === 'number';
};
export var isWeekdayStr = function (value) {
    return typeof value === 'string' && ALL_WEEKDAYS.includes(value);
};
export var isArray = Array.isArray;
/**
 * Simplified version of python's range()
 */
export var range = function (start, end) {
    if (end === void 0) { end = start; }
    if (arguments.length === 1) {
        end = start;
        start = 0;
    }
    var rang = [];
    for (var i = start; i < end; i++)
        rang.push(i);
    return rang;
};
export var clone = function (array) {
    return [].concat(array);
};
export var repeat = function (value, times) {
    var i = 0;
    var array = [];
    if (isArray(value)) {
        for (; i < times; i++)
            array[i] = [].concat(value);
    }
    else {
        for (; i < times; i++)
            array[i] = value;
    }
    return array;
};
export var toArray = function (item) {
    if (isArray(item)) {
        return item;
    }
    return [item];
};
export function padStart(item, targetLength, padString) {
    if (padString === void 0) { padString = ' '; }
    var str = String(item);
    targetLength = targetLength >> 0;
    if (str.length > targetLength) {
        return String(str);
    }
    targetLength = targetLength - str.length;
    if (targetLength > padString.length) {
        padString += repeat(padString, targetLength / padString.length);
    }
    return padString.slice(0, targetLength) + String(str);
}
/**
 * Python like split
 */
export var split = function (str, sep, num) {
    var splits = str.split(sep);
    return num
        ? splits.slice(0, num).concat([splits.slice(num).join(sep)])
        : splits;
};
/**
 * closure/goog/math/math.js:modulo
 * Copyright 2006 The Closure Library Authors.
 * The % operator in JavaScript returns the remainder of a / b, but differs from
 * some other languages in that the result will have the same sign as the
 * dividend. For example, -1 % 8 == -1, whereas in some other languages
 * (such as Python) the result would be 7. This function emulates the more
 * correct modulo behavior, which is useful for certain applications such as
 * calculating an offset index in a circular list.
 *
 * @param {number} a The dividend.
 * @param {number} b The divisor.
 * @return {number} a % b where the result is between 0 and b (either 0 <= x < b
 * or b < x <= 0, depending on the sign of b).
 */
export var pymod = function (a, b) {
    var r = a % b;
    // If r and b differ in sign, add b to wrap the result to the correct sign.
    return r * b < 0 ? r + b : r;
};
/**
 * @see: <http://docs.python.org/library/functions.html#divmod>
 */
export var divmod = function (a, b) {
    return { div: Math.floor(a / b), mod: pymod(a, b) };
};
export var empty = function (obj) {
    return !isPresent(obj) || obj.length === 0;
};
/**
 * Python-like boolean
 *
 * @return {Boolean} value of an object/primitive, taking into account
 * the fact that in Python an empty list's/tuple's
 * boolean value is False, whereas in JS it's true
 */
export var notEmpty = function (obj) {
    return !empty(obj);
};
/**
 * Return true if a value is in an array
 */
export var includes = function (arr, val) {
    return notEmpty(arr) && arr.indexOf(val) !== -1;
};
//# sourceMappingURL=helpers.js.map