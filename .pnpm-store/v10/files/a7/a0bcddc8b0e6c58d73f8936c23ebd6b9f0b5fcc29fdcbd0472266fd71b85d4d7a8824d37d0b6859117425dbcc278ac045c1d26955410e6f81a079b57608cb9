import { ProtoError } from "../../errors.js";
export function string(value) {
    if (typeof value === "string") {
        return value;
    }
    throw typeError(value, "string");
}
export function stringOpt(value) {
    if (value === null || value === undefined) {
        return undefined;
    }
    else if (typeof value === "string") {
        return value;
    }
    throw typeError(value, "string or null");
}
export function number(value) {
    if (typeof value === "number") {
        return value;
    }
    throw typeError(value, "number");
}
export function boolean(value) {
    if (typeof value === "boolean") {
        return value;
    }
    throw typeError(value, "boolean");
}
export function array(value) {
    if (Array.isArray(value)) {
        return value;
    }
    throw typeError(value, "array");
}
export function object(value) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    throw typeError(value, "object");
}
export function arrayObjectsMap(value, fun) {
    return array(value).map((elemValue) => fun(object(elemValue)));
}
function typeError(value, expected) {
    if (value === undefined) {
        return new ProtoError(`Expected ${expected}, but the property was missing`);
    }
    let received = typeof value;
    if (value === null) {
        received = "null";
    }
    else if (Array.isArray(value)) {
        received = "array";
    }
    return new ProtoError(`Expected ${expected}, received ${received}`);
}
export function readJsonObject(value, fun) {
    return fun(object(value));
}
