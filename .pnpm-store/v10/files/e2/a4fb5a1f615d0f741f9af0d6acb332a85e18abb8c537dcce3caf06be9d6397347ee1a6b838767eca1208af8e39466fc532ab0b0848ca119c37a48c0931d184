/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ClientAuthErrorCodes,
    createClientAuthError,
} from "@azure/msal-common/browser";
import { IWindowStorage } from "./IWindowStorage.js";

// Cookie life calculation (hours * minutes * seconds * ms)
const COOKIE_LIFE_MULTIPLIER = 24 * 60 * 60 * 1000;

export const SameSiteOptions = {
    Lax: "Lax",
    None: "None",
} as const;
export type SameSiteOptions =
    (typeof SameSiteOptions)[keyof typeof SameSiteOptions];

export class CookieStorage implements IWindowStorage<string> {
    initialize(): Promise<void> {
        return Promise.resolve();
    }

    getItem(key: string): string | null {
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

    getUserData(): string | null {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    }

    setItem(
        key: string,
        value: string,
        cookieLifeDays?: number,
        secure: boolean = true,
        sameSite: SameSiteOptions = SameSiteOptions.Lax
    ): void {
        let cookieStr = `${encodeURIComponent(key)}=${encodeURIComponent(
            value
        )};path=/;SameSite=${sameSite};`;

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

    async setUserData(): Promise<void> {
        return Promise.reject(
            createClientAuthError(ClientAuthErrorCodes.methodNotImplemented)
        );
    }

    removeItem(key: string): void {
        // Setting expiration to -1 removes it
        this.setItem(key, "", -1);
    }

    getKeys(): string[] {
        const cookieList = document.cookie.split(";");
        const keys: Array<string> = [];
        cookieList.forEach((cookie) => {
            const cookieParts = decodeURIComponent(cookie).trim().split("=");
            keys.push(cookieParts[0]);
        });

        return keys;
    }

    containsKey(key: string): boolean {
        return this.getKeys().includes(key);
    }

    decryptData(): Promise<object | null> {
        // Cookie storage does not support encryption, so this method is a no-op
        return Promise.resolve(null);
    }
}

/**
 * Get cookie expiration time
 * @param cookieLifeDays
 */
export function getCookieExpirationTime(cookieLifeDays: number): string {
    const today = new Date();
    const expr = new Date(
        today.getTime() + cookieLifeDays * COOKIE_LIFE_MULTIPLIER
    );
    return expr.toUTCString();
}
