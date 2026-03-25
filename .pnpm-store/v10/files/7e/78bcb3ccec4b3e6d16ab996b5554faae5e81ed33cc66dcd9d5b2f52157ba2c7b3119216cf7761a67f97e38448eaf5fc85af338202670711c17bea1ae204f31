"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _FormData_instances, _FormData_entries, _FormData_setEntry;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormData = void 0;
const util_1 = require("util");
const File_1 = require("./File");
const isFile_1 = require("./isFile");
const isBlob_1 = require("./isBlob");
const isFunction_1 = require("./isFunction");
const deprecateConstructorEntries_1 = require("./deprecateConstructorEntries");
class FormData {
    constructor(entries) {
        _FormData_instances.add(this);
        _FormData_entries.set(this, new Map());
        if (entries) {
            (0, deprecateConstructorEntries_1.deprecateConstructorEntries)();
            entries.forEach(({ name, value, fileName }) => this.append(name, value, fileName));
        }
    }
    static [(_FormData_entries = new WeakMap(), _FormData_instances = new WeakSet(), Symbol.hasInstance)](value) {
        return Boolean(value
            && (0, isFunction_1.isFunction)(value.constructor)
            && value[Symbol.toStringTag] === "FormData"
            && (0, isFunction_1.isFunction)(value.append)
            && (0, isFunction_1.isFunction)(value.set)
            && (0, isFunction_1.isFunction)(value.get)
            && (0, isFunction_1.isFunction)(value.getAll)
            && (0, isFunction_1.isFunction)(value.has)
            && (0, isFunction_1.isFunction)(value.delete)
            && (0, isFunction_1.isFunction)(value.entries)
            && (0, isFunction_1.isFunction)(value.values)
            && (0, isFunction_1.isFunction)(value.keys)
            && (0, isFunction_1.isFunction)(value[Symbol.iterator])
            && (0, isFunction_1.isFunction)(value.forEach));
    }
    append(name, value, fileName) {
        __classPrivateFieldGet(this, _FormData_instances, "m", _FormData_setEntry).call(this, {
            name,
            fileName,
            append: true,
            rawValue: value,
            argsLength: arguments.length
        });
    }
    set(name, value, fileName) {
        __classPrivateFieldGet(this, _FormData_instances, "m", _FormData_setEntry).call(this, {
            name,
            fileName,
            append: false,
            rawValue: value,
            argsLength: arguments.length
        });
    }
    get(name) {
        const field = __classPrivateFieldGet(this, _FormData_entries, "f").get(String(name));
        if (!field) {
            return null;
        }
        return field[0];
    }
    getAll(name) {
        const field = __classPrivateFieldGet(this, _FormData_entries, "f").get(String(name));
        if (!field) {
            return [];
        }
        return field.slice();
    }
    has(name) {
        return __classPrivateFieldGet(this, _FormData_entries, "f").has(String(name));
    }
    delete(name) {
        __classPrivateFieldGet(this, _FormData_entries, "f").delete(String(name));
    }
    *keys() {
        for (const key of __classPrivateFieldGet(this, _FormData_entries, "f").keys()) {
            yield key;
        }
    }
    *entries() {
        for (const name of this.keys()) {
            const values = this.getAll(name);
            for (const value of values) {
                yield [name, value];
            }
        }
    }
    *values() {
        for (const [, value] of this) {
            yield value;
        }
    }
    [(_FormData_setEntry = function _FormData_setEntry({ name, rawValue, append, fileName, argsLength }) {
        const methodName = append ? "append" : "set";
        if (argsLength < 2) {
            throw new TypeError(`Failed to execute '${methodName}' on 'FormData': `
                + `2 arguments required, but only ${argsLength} present.`);
        }
        name = String(name);
        let value;
        if ((0, isFile_1.isFile)(rawValue)) {
            value = fileName === undefined
                ? rawValue
                : new File_1.File([rawValue], fileName, {
                    type: rawValue.type,
                    lastModified: rawValue.lastModified
                });
        }
        else if ((0, isBlob_1.isBlob)(rawValue)) {
            value = new File_1.File([rawValue], fileName === undefined ? "blob" : fileName, {
                type: rawValue.type
            });
        }
        else if (fileName) {
            throw new TypeError(`Failed to execute '${methodName}' on 'FormData': `
                + "parameter 2 is not of type 'Blob'.");
        }
        else {
            value = String(rawValue);
        }
        const values = __classPrivateFieldGet(this, _FormData_entries, "f").get(name);
        if (!values) {
            return void __classPrivateFieldGet(this, _FormData_entries, "f").set(name, [value]);
        }
        if (!append) {
            return void __classPrivateFieldGet(this, _FormData_entries, "f").set(name, [value]);
        }
        values.push(value);
    }, Symbol.iterator)]() {
        return this.entries();
    }
    forEach(callback, thisArg) {
        for (const [name, value] of this) {
            callback.call(thisArg, value, name, this);
        }
    }
    get [Symbol.toStringTag]() {
        return "FormData";
    }
    [util_1.inspect.custom]() {
        return this[Symbol.toStringTag];
    }
}
exports.FormData = FormData;
