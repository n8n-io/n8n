import { ICachePlugin, TokenCacheContext } from "@azure/msal-common/node";
import { IPartitionManager } from "./IPartitionManager.js";
import { ICacheClient } from "./ICacheClient.js";
/**
 * Cache plugin that serializes data to the cache and deserializes data from the cache
 * @public
 */
export declare class DistributedCachePlugin implements ICachePlugin {
    private client;
    private partitionManager;
    constructor(client: ICacheClient, partitionManager: IPartitionManager);
    /**
     * Deserializes the cache before accessing it
     * @param cacheContext - TokenCacheContext
     */
    beforeCacheAccess(cacheContext: TokenCacheContext): Promise<void>;
    /**
     * Serializes the cache after accessing it
     * @param cacheContext - TokenCacheContext
     */
    afterCacheAccess(cacheContext: TokenCacheContext): Promise<void>;
}
//# sourceMappingURL=DistributedCachePlugin.d.ts.map