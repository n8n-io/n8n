"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectableMapView = void 0;
/**
 * The internal wrapper used by ProtectableMap.  It extends the real `Map<K, V>` base class,
 * but hooks the destructive operations (clear/delete/set) to give the owner a chance
 * to block them.
 *
 * NOTE: This is not a public API.
 */
class ProtectableMapView extends Map {
    constructor(owner, parameters) {
        super();
        this._owner = owner;
        this._parameters = parameters;
    }
    clear() {
        if (this._parameters.onClear) {
            this._parameters.onClear(this._owner);
        }
        super.clear();
    }
    delete(key) {
        if (this._parameters.onDelete) {
            this._parameters.onDelete(this._owner, key);
        }
        return super.delete(key);
    }
    set(key, value) {
        let modifiedValue = value;
        if (this._parameters.onSet) {
            modifiedValue = this._parameters.onSet(this._owner, key, modifiedValue);
        }
        super.set(key, modifiedValue);
        return this;
    }
    // INTERNAL USAGE ONLY
    _clearUnprotected() {
        super.clear();
    }
    // INTERNAL USAGE ONLY
    _deleteUnprotected(key) {
        return super.delete(key);
    }
    // INTERNAL USAGE ONLY
    _setUnprotected(key, value) {
        super.set(key, value);
    }
}
exports.ProtectableMapView = ProtectableMapView;
//# sourceMappingURL=ProtectableMapView.js.map