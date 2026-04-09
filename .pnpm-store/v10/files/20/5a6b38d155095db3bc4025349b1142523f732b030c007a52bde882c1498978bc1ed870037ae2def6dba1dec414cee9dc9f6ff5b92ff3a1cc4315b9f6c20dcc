"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readJsonObject = exports.arrayObjectsMap = exports.object = exports.array = exports.boolean = exports.number = exports.stringOpt = exports.string = void 0;
const errors_js_1 = require("../../errors.js");
function string(value) {
    if (typeof value === "string") {
        return value;
    }
    throw typeError(value, "string");
}
exports.string = string;
function stringOpt(value) {
    if (value === null || value === undefined) {
        return undefined;
    }
    else if (typeof value === "string") {
        return value;
    }
    throw typeError(value, "string or null");
}
exports.stringOpt = stringOpt;
function number(value) {
    if (typeof value === "number") {
        return value;
    }
    throw typeError(value, "number");
}
exports.number = number;
function boolean(value) {
    if (typeof value === "boolean") {
        return value;
    }
    throw typeError(value, "boolean");
}
exports.boolean = boolean;
function array(value) {
    if (Array.isArray(value)) {
        return value;
    }
    throw typeError(value, "array");
}
exports.array = array;
function object(value) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    throw typeError(value, "object");
}
exports.object = object;
function arrayObjectsMap(value, fun) {
    return array(value).map((elemValue) => fun(object(elemValue)));
}
exports.arrayObjectsMap = arrayObjectsMap;
function typeError(value, expected) {
    if (value === undefined) {
        return new errors_js_1.ProtoError(`Expected ${expected}, but the property was missing`);
    }
    let received = typeof value;
    if (value === null) {
        received = "null";
    }
    else if (Array.isArray(value)) {
        received = "array";
    }
    return new errors_js_1.ProtoError(`Expected ${expected}, received ${received}`);
}
function readJsonObject(value, fun) {
    return fun(object(value));
}
exports.readJsonObject = readJsonObject;
