"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getType = (value) => (Object.prototype.toString.call(value).slice(8, -1).toLowerCase());
function isPlainObject(value) {
    if (getType(value) !== "object") {
        return false;
    }
    const pp = Object.getPrototypeOf(value);
    if (pp === null || pp === undefined) {
        return true;
    }
    const Ctor = pp.constructor && pp.constructor.toString();
    return Ctor === Object.toString();
}
exports.default = isPlainObject;
