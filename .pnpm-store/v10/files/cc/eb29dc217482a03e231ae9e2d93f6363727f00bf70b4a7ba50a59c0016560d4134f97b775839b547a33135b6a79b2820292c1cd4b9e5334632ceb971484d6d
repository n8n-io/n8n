/*! @azure/msal-browser v4.30.0 2026-03-18 */
'use strict';
import { getAccountKeysCacheKey, getTokenKeysCacheKey } from './CacheKeys.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns a list of cache keys for all known accounts
 * @param storage
 * @returns
 */
function getAccountKeys(storage, schemaVersion) {
    const accountKeys = storage.getItem(getAccountKeysCacheKey(schemaVersion));
    if (accountKeys) {
        return JSON.parse(accountKeys);
    }
    return [];
}
/**
 * Returns a list of cache keys for all known tokens
 * @param clientId
 * @param storage
 * @returns
 */
function getTokenKeys(clientId, storage, schemaVersion) {
    const item = storage.getItem(getTokenKeysCacheKey(clientId, schemaVersion));
    if (item) {
        const tokenKeys = JSON.parse(item);
        if (tokenKeys &&
            tokenKeys.hasOwnProperty("idToken") &&
            tokenKeys.hasOwnProperty("accessToken") &&
            tokenKeys.hasOwnProperty("refreshToken")) {
            return tokenKeys;
        }
    }
    return {
        idToken: [],
        accessToken: [],
        refreshToken: [],
    };
}

export { getAccountKeys, getTokenKeys };
//# sourceMappingURL=CacheHelpers.mjs.map
