"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureKeyCredential = void 0;
/**
 * A static-key-based credential that supports updating
 * the underlying key value.
 */
class AzureKeyCredential {
    _key;
    /**
     * The value of the key to be used in authentication
     */
    get key() {
        return this._key;
    }
    /**
     * Create an instance of an AzureKeyCredential for use
     * with a service client.
     *
     * @param key - The initial value of the key to use in authentication
     */
    constructor(key) {
        if (!key) {
            throw new Error("key must be a non-empty string");
        }
        this._key = key;
    }
    /**
     * Change the value of the key.
     *
     * Updates will take effect upon the next request after
     * updating the key value.
     *
     * @param newKey - The new key value to be used
     */
    update(newKey) {
        this._key = newKey;
    }
}
exports.AzureKeyCredential = AzureKeyCredential;
//# sourceMappingURL=azureKeyCredential.js.map