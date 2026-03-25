import { S3ExpressIdentity } from "../interfaces/S3ExpressIdentity";
/**
 * @internal
 */
export declare class S3ExpressIdentityCacheEntry {
    private _identity;
    isRefreshing: boolean;
    accessed: number;
    /**
     * @param identity - stored identity.
     * @param accessed - timestamp of last access in epoch ms.
     * @param isRefreshing - this key is currently in the process of being refreshed (background).
     */
    constructor(_identity: Promise<S3ExpressIdentity>, isRefreshing?: boolean, accessed?: number);
    get identity(): Promise<S3ExpressIdentity>;
}
