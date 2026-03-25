/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { createClientAuthError, ClientAuthErrorCodes } from '@azure/msal-common/browser';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// Cookie life calculation (hours * minutes * seconds * ms)
const COOKIE_LIFE_MULTIPLIER = 24 * 60 * 60 * 1000;
const SameSiteOptions = {
    Lax: "Lax",
    None: "None",
};
class CookieStorage {
    initialize() {
        return Promise.resolve();
    }
    getItem(key) {
        const name = `${encodeURIComponent(key)}`;
        const cookieList = document.cookie.split(";");
        for (let i = 0; i < cookieList.length; i++) {
            const cookie = cookieList[i];
            const [key, ...rest] = decodeURIComponent(cookie).trim().split("=");
            const value = rest.join("=");
            if (key === name) {
                return value;
            }
        }
        return "";
    }
    getUserData() {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    }
    setItem(key, value, cookieLifeDays, secure = true, sameSite = SameSiteOptions.Lax) {
        let cookieStr = `${encodeURIComponent(key)}=${encodeURIComponent(value)};path=/;SameSite=${sameSite};`;
        if (cookieLifeDays) {
            const expireTime = getCookieExpirationTime(cookieLifeDays);
            cookieStr += `expires=${expireTime};`;
        }
        if (secure || sameSite === SameSiteOptions.None) {
            // SameSite None requires Secure flag
            cookieStr += "Secure;";
        }
        document.cookie = cookieStr;
    }
    async setUserData() {
        return Promise.reject(createClientAuthError(ClientAuthErrorCodes.methodNotImplemented));
    }
    removeItem(key) {
        // Setting expiration to -1 removes it
        this.setItem(key, "", -1);
    }
    getKeys() {
        const cookieList = document.cookie.split(";");
        const keys = [];
        cookieList.forEach((cookie) => {
            const cookieParts = decodeURIComponent(cookie).trim().split("=");
            keys.push(cookieParts[0]);
        });
        return keys;
    }
    containsKey(key) {
        return this.getKeys().includes(key);
    }
    decryptData() {
        // Cookie storage does not support encryption, so this method is a no-op
        return Promise.resolve(null);
    }
}
/**
 * Get cookie expiration time
 * @param cookieLifeDays
 */
function getCookieExpirationTime(cookieLifeDays) {
    const today = new Date();
    const expr = new Date(today.getTime() + cookieLifeDays * COOKIE_LIFE_MULTIPLIER);
    return expr.toUTCString();
}

export { CookieStorage, SameSiteOptions, getCookieExpirationTime };
//# sourceMappingURL=CookieStorage.mjs.map
