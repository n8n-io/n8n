/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    BrowserConfigurationAuthErrorCodes,
    createBrowserConfigurationAuthError,
} from "../error/BrowserConfigurationAuthError.js";
import { IWindowStorage } from "./IWindowStorage.js";

export class SessionStorage implements IWindowStorage<string> {
    constructor() {
        if (!window.sessionStorage) {
            throw createBrowserConfigurationAuthError(
                BrowserConfigurationAuthErrorCodes.storageNotSupported
            );
        }
    }

    async initialize(): Promise<void> {
        // Session storage does not require initialization
    }

    getItem(key: string): string | null {
        return window.sessionStorage.getItem(key);
    }

    getUserData(key: string): string | null {
        return this.getItem(key);
    }

    setItem(key: string, value: string): void {
        window.sessionStorage.setItem(key, value);
    }

    async setUserData(key: string, value: string): Promise<void> {
        this.setItem(key, value);
    }

    removeItem(key: string): void {
        window.sessionStorage.removeItem(key);
    }

    getKeys(): string[] {
        return Object.keys(window.sessionStorage);
    }

    containsKey(key: string): boolean {
        return window.sessionStorage.hasOwnProperty(key);
    }

    decryptData(): Promise<object | null> {
        // Session storage does not support encryption, so this method is a no-op
        return Promise.resolve(null);
    }
}
