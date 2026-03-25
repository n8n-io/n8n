/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { AccountEntity } from '@azure/msal-common/node';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Cache plugin that serializes data to the cache and deserializes data from the cache
 * @public
 */
class DistributedCachePlugin {
    constructor(client, partitionManager) {
        this.client = client;
        this.partitionManager = partitionManager;
    }
    /**
     * Deserializes the cache before accessing it
     * @param cacheContext - TokenCacheContext
     */
    async beforeCacheAccess(cacheContext) {
        const partitionKey = await this.partitionManager.getKey();
        const cacheData = await this.client.get(partitionKey);
        cacheContext.tokenCache.deserialize(cacheData);
    }
    /**
     * Serializes the cache after accessing it
     * @param cacheContext - TokenCacheContext
     */
    async afterCacheAccess(cacheContext) {
        if (cacheContext.cacheHasChanged) {
            const kvStore = cacheContext.tokenCache.getKVStore();
            const accountEntities = Object.values(kvStore).filter((value) => AccountEntity.isAccountEntity(value));
            let partitionKey;
            if (accountEntities.length > 0) {
                const accountEntity = accountEntities[0];
                partitionKey = await this.partitionManager.extractKey(accountEntity);
            }
            else {
                partitionKey = await this.partitionManager.getKey();
            }
            await this.client.set(partitionKey, cacheContext.tokenCache.serialize());
        }
    }
}

export { DistributedCachePlugin };
//# sourceMappingURL=DistributedCachePlugin.mjs.map
