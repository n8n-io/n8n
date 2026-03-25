import { S3ExpressIdentityCacheEntry } from "./S3ExpressIdentityCacheEntry";
/**
 * @internal
 *
 * Stores identities by key.
 */
export declare class S3ExpressIdentityCache {
    private data;
    private lastPurgeTime;
    static EXPIRED_CREDENTIAL_PURGE_INTERVAL_MS: number;
    constructor(data?: Record<string, S3ExpressIdentityCacheEntry>);
    get(key: string): undefined | S3ExpressIdentityCacheEntry;
    set(key: string, entry: S3ExpressIdentityCacheEntry): S3ExpressIdentityCacheEntry;
    delete(key: string): void;
    purgeExpired(): Promise<void>;
}
