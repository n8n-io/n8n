"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickBy = pickBy;
exports.compact = compact;
exports.uniqBy = uniqBy;
exports.last = last;
exports.sortBy = sortBy;
exports.castArray = castArray;
exports.isProd = isProd;
exports.maxBy = maxBy;
exports.sumBy = sumBy;
exports.capitalize = capitalize;
exports.isTruthy = isTruthy;
exports.isNotFalsy = isNotFalsy;
exports.uniq = uniq;
exports.mapValues = mapValues;
exports.mergeNestedObjects = mergeNestedObjects;
function pickBy(obj, fn) {
    return Object.entries(obj).reduce((o, [k, v]) => {
        if (fn(v))
            o[k] = v;
        return o;
    }, {});
}
function compact(a) {
    // eslint-disable-next-line unicorn/prefer-native-coercion-functions
    return a.filter((a) => Boolean(a));
}
function uniqBy(arr, fn) {
    return arr.filter((a, i) => {
        const aVal = fn(a);
        return !arr.some((b, j) => j > i && fn(b) === aVal);
    });
}
function last(arr) {
    if (!arr)
        return;
    return arr.at(-1);
}
function compare(a, b) {
    a = a === undefined ? 0 : a;
    b = b === undefined ? 0 : b;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length === 0 && b.length === 0)
            return 0;
        const diff = compare(a[0], b[0]);
        if (diff !== 0)
            return diff;
        return compare(a.slice(1), b.slice(1));
    }
    if (a < b)
        return -1;
    if (a > b)
        return 1;
    return 0;
}
function sortBy(arr, fn) {
    return arr.sort((a, b) => compare(fn(a), fn(b)));
}
function castArray(input) {
    if (input === undefined)
        return [];
    return Array.isArray(input) ? input : [input];
}
function isProd() {
    return !['development', 'test'].includes(process.env.NODE_ENV ?? '');
}
function maxBy(arr, fn) {
    if (arr.length === 0) {
        return undefined;
    }
    return arr.reduce((maxItem, i) => {
        const curr = fn(i);
        const max = fn(maxItem);
        return curr > max ? i : maxItem;
    });
}
function sumBy(arr, fn) {
    return arr.reduce((sum, i) => sum + fn(i), 0);
}
function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}
function isTruthy(input) {
    return ['1', 'true', 'y', 'yes'].includes(input.toLowerCase());
}
function isNotFalsy(input) {
    return !['0', 'false', 'n', 'no'].includes(input.toLowerCase());
}
function uniq(arr) {
    return [...new Set(arr)].sort();
}
function mapValues(obj, fn) {
    return Object.entries(obj).reduce((o, [k, v]) => {
        o[k] = fn(v, k);
        return o;
    }, {});
}
function get(obj, path) {
    return path.split('.').reduce((o, p) => o?.[p], obj);
}
function mergeNestedObjects(objs, path) {
    return Object.fromEntries(objs.flatMap((o) => Object.entries(get(o, path) ?? {})).reverse());
}
