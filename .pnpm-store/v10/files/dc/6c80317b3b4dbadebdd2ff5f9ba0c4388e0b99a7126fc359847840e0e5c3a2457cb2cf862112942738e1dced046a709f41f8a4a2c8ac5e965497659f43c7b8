"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = isObject;
exports.isEmptyObject = isEmptyObject;
exports.isString = isString;
exports.keysOf = keysOf;
exports.capitalize = capitalize;
function isObject(obj) {
    const type = typeof obj;
    return type === 'function' || (type === 'object' && !!obj);
}
function isEmptyObject(obj) {
    return !!obj && Object.keys(obj).length === 0;
}
function isString(str) {
    return Object.prototype.toString.call(str) === '[object String]';
}
function keysOf(obj) {
    if (!obj)
        return [];
    return Object.keys(obj);
}
function capitalize(s) {
    if (s?.length > 0) {
        return s[0].toUpperCase() + s.slice(1);
    }
    return s;
}
