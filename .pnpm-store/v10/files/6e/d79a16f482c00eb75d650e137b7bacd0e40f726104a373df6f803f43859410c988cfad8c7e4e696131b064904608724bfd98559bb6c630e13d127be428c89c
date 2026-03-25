/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AccountEntity } from "@azure/msal-common/node";

/**
 * Interface that defines getter methods to get keys used to identity data in the cache
 * @public
 */
export interface IPartitionManager {
    /**
     * This function should return the correct key from which to read
     * the specific user's information from cache.
     *
     * Example: Your application may be partitioning the user's cache
     * information for each user using the homeAccountId and thus
     * this function would return the homeAccountId for
     * the user in question
     *
     * @returns Promise<string>
     */
    getKey(): Promise<string>;

    /**
     * This function should return the correct key being used to save each
     * user's cache information to cache - given an AccountEntity
     *
     * Example: Your application may be partitioning the user's cache
     * information for each user using the homeAccountId thus
     * this function would return the homeAccountId from
     * the provided AccountEntity
     *
     * @param accountEntity - AccountEntity
     * @returns Promise<string>
     */
    extractKey(accountEntity: AccountEntity): Promise<string>;
}
