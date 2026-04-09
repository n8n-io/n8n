"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valueFromProto = exports.valueToProto = void 0;
const errors_js_1 = require("./errors.js");
const util_js_1 = require("./util.js");
function valueToProto(value) {
    if (value === null) {
        return null;
    }
    else if (typeof value === "string") {
        return value;
    }
    else if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new RangeError("Only finite numbers (not Infinity or NaN) can be passed as arguments");
        }
        return value;
    }
    else if (typeof value === "bigint") {
        if (value < minInteger || value > maxInteger) {
            throw new RangeError("This bigint value is too large to be represented as a 64-bit integer and passed as argument");
        }
        return value;
    }
    else if (typeof value === "boolean") {
        return value ? 1n : 0n;
    }
    else if (value instanceof ArrayBuffer) {
        return new Uint8Array(value);
    }
    else if (value instanceof Uint8Array) {
        return value;
    }
    else if (value instanceof Date) {
        return +value.valueOf();
    }
    else if (typeof value === "object") {
        return "" + value.toString();
    }
    else {
        throw new TypeError("Unsupported type of value");
    }
}
exports.valueToProto = valueToProto;
const minInteger = -9223372036854775808n;
const maxInteger = 9223372036854775807n;
function valueFromProto(value, intMode) {
    if (value === null) {
        return null;
    }
    else if (typeof value === "number") {
        return value;
    }
    else if (typeof value === "string") {
        return value;
    }
    else if (typeof value === "bigint") {
        if (intMode === "number") {
            const num = Number(value);
            if (!Number.isSafeInteger(num)) {
                throw new RangeError("Received integer which is too large to be safely represented as a JavaScript number");
            }
            return num;
        }
        else if (intMode === "bigint") {
            return value;
        }
        else if (intMode === "string") {
            return "" + value;
        }
        else {
            throw new errors_js_1.MisuseError("Invalid value for IntMode");
        }
    }
    else if (value instanceof Uint8Array) {
        // TODO: we need to copy data from `Uint8Array` to return an `ArrayBuffer`. Perhaps we should add a
        // `blobMode` parameter, similar to `intMode`, which would allow the user to choose between receiving
        // `ArrayBuffer` (default, convenient) and `Uint8Array` (zero copy)?
        return value.slice().buffer;
    }
    else if (value === undefined) {
        throw new errors_js_1.ProtoError("Received unrecognized type of Value");
    }
    else {
        throw (0, util_js_1.impossible)(value, "Impossible type of Value");
    }
}
exports.valueFromProto = valueFromProto;
