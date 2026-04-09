"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentMap = void 0;
const node_process_1 = __importDefault(require("node:process"));
const InternalError_1 = require("./InternalError");
/**
 * A map data structure that stores process environment variables.  On Windows
 * operating system, the variable names are case-insensitive.
 * @public
 */
class EnvironmentMap {
    constructor(environmentObject = {}) {
        this._map = new Map();
        // This property helps catch a mistake where an instance of `EnvironmentMap` is accidentally passed to
        // a function that expects a `Record<string, string>` (as would be used with the `process.env` API).
        // The property getter will throw an exception if that function tries to enumerate the object values.
        Object.defineProperty(this, '_sanityCheck', {
            enumerable: true,
            get: function () {
                throw new InternalError_1.InternalError('Attempt to read EnvironmentMap class as an object');
            }
        });
        this.caseSensitive = node_process_1.default.platform !== 'win32';
        this.mergeFromObject(environmentObject);
    }
    /**
     * Clears all entries, resulting in an empty map.
     */
    clear() {
        this._map.clear();
    }
    /**
     * Assigns the variable to the specified value.  A previous value will be overwritten.
     *
     * @remarks
     * The value can be an empty string.  To completely remove the entry, use
     * {@link EnvironmentMap.unset} instead.
     */
    set(name, value) {
        const key = this.caseSensitive ? name : name.toUpperCase();
        this._map.set(key, { name: name, value });
    }
    /**
     * Removes the key from the map, if present.
     */
    unset(name) {
        const key = this.caseSensitive ? name : name.toUpperCase();
        this._map.delete(key);
    }
    /**
     * Returns the value of the specified variable, or `undefined` if the map does not contain that name.
     */
    get(name) {
        const key = this.caseSensitive ? name : name.toUpperCase();
        const entry = this._map.get(key);
        if (entry === undefined) {
            return undefined;
        }
        return entry.value;
    }
    /**
     * Returns the map keys, which are environment variable names.
     */
    names() {
        return this._map.keys();
    }
    /**
     * Returns the map entries.
     */
    entries() {
        return this._map.values();
    }
    /**
     * Adds each entry from `environmentMap` to this map.
     */
    mergeFrom(environmentMap) {
        for (const entry of environmentMap.entries()) {
            this.set(entry.name, entry.value);
        }
    }
    /**
     * Merges entries from a plain JavaScript object, such as would be used with the `process.env` API.
     */
    mergeFromObject(environmentObject = {}) {
        for (const [name, value] of Object.entries(environmentObject)) {
            if (value !== undefined) {
                this.set(name, value);
            }
        }
    }
    /**
     * Returns the keys as a plain JavaScript object similar to the object returned by the `process.env` API.
     */
    toObject() {
        const result = {};
        for (const entry of this.entries()) {
            result[entry.name] = entry.value;
        }
        return result;
    }
}
exports.EnvironmentMap = EnvironmentMap;
//# sourceMappingURL=EnvironmentMap.js.map