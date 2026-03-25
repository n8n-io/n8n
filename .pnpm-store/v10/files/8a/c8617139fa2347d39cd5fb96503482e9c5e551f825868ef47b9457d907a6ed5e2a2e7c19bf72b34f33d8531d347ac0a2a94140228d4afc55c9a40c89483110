/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { createBrowserConfigurationAuthError } from '../error/BrowserConfigurationAuthError.mjs';
import { storageNotSupported } from '../error/BrowserConfigurationAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SessionStorage {
    constructor() {
        if (!window.sessionStorage) {
            throw createBrowserConfigurationAuthError(storageNotSupported);
        }
    }
    async initialize() {
        // Session storage does not require initialization
    }
    getItem(key) {
        return window.sessionStorage.getItem(key);
    }
    getUserData(key) {
        return this.getItem(key);
    }
    setItem(key, value) {
        window.sessionStorage.setItem(key, value);
    }
    async setUserData(key, value) {
        this.setItem(key, value);
    }
    removeItem(key) {
        window.sessionStorage.removeItem(key);
    }
    getKeys() {
        return Object.keys(window.sessionStorage);
    }
    containsKey(key) {
        return window.sessionStorage.hasOwnProperty(key);
    }
    decryptData() {
        // Session storage does not support encryption, so this method is a no-op
        return Promise.resolve(null);
    }
}

export { SessionStorage };
//# sourceMappingURL=SessionStorage.mjs.map
