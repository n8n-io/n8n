/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IWindowStorage } from "./IWindowStorage.js";

export class MemoryStorage<T> implements IWindowStorage<T> {
    private cache: Map<string, T>;

    constructor() {
        this.cache = new Map<string, T>();
    }

    async initialize(): Promise<void> {
        // Memory storage does not require initialization
    }

    getItem(key: string): T | null {
        return this.cache.get(key) || null;
    }

    getUserData(key: string): T | null {
        return this.getItem(key);
    }

    setItem(key: string, value: T): void {
        this.cache.set(key, value);
    }

    async setUserData(key: string, value: T): Promise<void> {
        this.setItem(key, value);
    }

    removeItem(key: string): void {
        this.cache.delete(key);
    }

    getKeys(): string[] {
        const cacheKeys: string[] = [];
        this.cache.forEach((value: T, key: string) => {
            cacheKeys.push(key);
        });
        return cacheKeys;
    }

    containsKey(key: string): boolean {
        return this.cache.has(key);
    }

    clear(): void {
        this.cache.clear();
    }

    decryptData(): Promise<object | null> {
        // Memory storage does not support encryption, so this method is a no-op
        return Promise.resolve(null);
    }
}
