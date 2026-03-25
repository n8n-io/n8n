/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Interface for the cache that defines a getter and setter
 * @public
 */
export interface ICacheClient {
    /**
     * Retrieve the value from the cache
     *
     * @param key - key of item in the cache
     * @returns Promise<string>
     */
    get(key: string): Promise<string>;

    /**
     * Save the required value using the provided key to cache
     *
     * @param key - key of item in the cache
     * @param value - value of item to be saved in the cache
     * @returns Promise<string>
     */
    set(key: string, value: string): Promise<string>;
}
