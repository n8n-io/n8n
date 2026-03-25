"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureNamedKeyCredential = void 0;
exports.isNamedKeyCredential = isNamedKeyCredential;
const core_util_1 = require("@azure/core-util");
/**
 * A static name/key-based credential that supports updating
 * the underlying name and key values.
 */
class AzureNamedKeyCredential {
    _key;
    _name;
    /**
     * The value of the key to be used in authentication.
     */
    get key() {
        return this._key;
    }
    /**
     * The value of the name to be used in authentication.
     */
    get name() {
        return this._name;
    }
    /**
     * Create an instance of an AzureNamedKeyCredential for use
     * with a service client.
     *
     * @param name - The initial value of the name to use in authentication.
     * @param key - The initial value of the key to use in authentication.
     */
    constructor(name, key) {
        if (!name || !key) {
            throw new TypeError("name and key must be non-empty strings");
        }
        this._name = name;
        this._key = key;
    }
    /**
     * Change the value of the key.
     *
     * Updates will take effect upon the next request after
     * updating the key value.
     *
     * @param newName - The new name value to be used.
     * @param newKey - The new key value to be used.
     */
    update(newName, newKey) {
        if (!newName || !newKey) {
            throw new TypeError("newName and newKey must be non-empty strings");
        }
        this._name = newName;
        this._key = newKey;
    }
}
exports.AzureNamedKeyCredential = AzureNamedKeyCredential;
/**
 * Tests an object to determine whether it implements NamedKeyCredential.
 *
 * @param credential - The assumed NamedKeyCredential to be tested.
 */
function isNamedKeyCredential(credential) {
    return ((0, core_util_1.isObjectWithProperties)(credential, ["name", "key"]) &&
        typeof credential.key === "string" &&
        typeof credential.name === "string");
}
//# sourceMappingURL=azureNamedKeyCredential.js.map