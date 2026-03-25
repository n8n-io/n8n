"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectableMap = void 0;
const ProtectableMapView_1 = require("./ProtectableMapView");
/**
 * The ProtectableMap provides an easy way for an API to expose a `Map<K, V>` property
 * while intercepting and validating any write operations that are performed by
 * consumers of the API.
 *
 * @remarks
 * The ProtectableMap itself is intended to be a private object that only its owner
 * can access directly.  Any operations performed directly on the ProtectableMap will
 * bypass the hooks and any validation they perform.  The public property that is exposed
 * to API consumers should return {@link ProtectableMap.protectedView} instead.
 *
 * For example, suppose you want to share your `Map<string, number>` data structure,
 * but you want to enforce that the key must always be an upper case string:
 * You could use the onSet() hook to validate the keys and throw an exception
 * if the key is not uppercase.
 *
 * @public
 */
class ProtectableMap {
    constructor(parameters) {
        this._protectedView = new ProtectableMapView_1.ProtectableMapView(this, parameters);
    }
    /**
     * The owner of the protectable map should return this object via its public API.
     */
    get protectedView() {
        return this._protectedView;
    }
    // ---------------------------------------------------------------------------
    // lib.es2015.collections contract - write operations
    /**
     * Removes all entries from the map.
     * This operation does NOT invoke the ProtectableMap onClear() hook.
     */
    clear() {
        this._protectedView._clearUnprotected();
    }
    /**
     * Removes the specified key from the map.
     * This operation does NOT invoke the ProtectableMap onDelete() hook.
     */
    delete(key) {
        return this._protectedView._deleteUnprotected(key);
    }
    /**
     * Sets a value for the specified key.
     * This operation does NOT invoke the ProtectableMap onSet() hook.
     */
    set(key, value) {
        this._protectedView._setUnprotected(key, value);
        return this;
    }
    // ---------------------------------------------------------------------------
    // lib.es2015.collections contract - read operations
    /**
     * Performs an operation for each (key, value) entries in the map.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    forEach(callbackfn, thisArg) {
        this._protectedView.forEach(callbackfn);
    }
    /**
     * Retrieves the value for the specified key.
     * @returns undefined if the value is undefined OR if the key is missing;
     * otherwise returns the value associated with the key.
     */
    get(key) {
        return this._protectedView.get(key);
    }
    /**
     * Returns true if the specified key belongs to the map.
     */
    has(key) {
        return this._protectedView.has(key);
    }
    /**
     * Returns the number of (key, value) entries in the map.
     */
    get size() {
        return this._protectedView.size;
    }
}
exports.ProtectableMap = ProtectableMap;
//# sourceMappingURL=ProtectableMap.js.map