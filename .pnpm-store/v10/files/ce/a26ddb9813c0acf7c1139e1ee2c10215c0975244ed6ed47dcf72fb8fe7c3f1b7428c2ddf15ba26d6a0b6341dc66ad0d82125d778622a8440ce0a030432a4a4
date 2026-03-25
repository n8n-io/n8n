/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface IAsyncStorage<T> {
    /**
     * Get the item from the asynchronous storage object matching the given key.
     * @param key
     */
    getItem(key: string): Promise<T | null>;

    /**
     * Sets the item in the asynchronous storage object with the given key.
     * @param key
     * @param value
     */
    setItem(key: string, value: T): Promise<void>;

    /**
     * Removes the item in the asynchronous storage object matching the given key.
     * @param key
     */
    removeItem(key: string): Promise<void>;

    /**
     * Get all the keys from the asynchronous storage object as an iterable array of strings.
     */
    getKeys(): Promise<string[]>;

    /**
     * Returns true or false if the given key is present in the cache.
     * @param key
     */
    containsKey(key: string): Promise<boolean>;
}
