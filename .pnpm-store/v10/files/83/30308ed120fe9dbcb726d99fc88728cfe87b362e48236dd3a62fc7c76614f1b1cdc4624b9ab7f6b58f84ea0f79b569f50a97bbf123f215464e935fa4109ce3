/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ISerializableTokenCache } from "../interface/ISerializableTokenCache.js";

/**
 * This class instance helps track the memory changes facilitating
 * decisions to read from and write to the persistent cache
 */ export class TokenCacheContext {
    /**
     * boolean indicating cache change
     */
    hasChanged: boolean;
    /**
     * serializable token cache interface
     */
    cache: ISerializableTokenCache;

    constructor(tokenCache: ISerializableTokenCache, hasChanged: boolean) {
        this.cache = tokenCache;
        this.hasChanged = hasChanged;
    }

    /**
     * boolean which indicates the changes in cache
     */
    get cacheHasChanged(): boolean {
        return this.hasChanged;
    }

    /**
     * function to retrieve the token cache
     */
    get tokenCache(): ISerializableTokenCache {
        return this.cache;
    }
}
