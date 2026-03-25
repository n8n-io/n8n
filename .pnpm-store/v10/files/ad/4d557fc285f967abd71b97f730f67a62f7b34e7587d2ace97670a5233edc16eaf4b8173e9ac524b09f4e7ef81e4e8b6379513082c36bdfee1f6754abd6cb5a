import { CacheOutcome } from "../../utils/Constants.js";
import { CacheManager } from "../../cache/CacheManager.js";
import { ServerTelemetryRequest } from "./ServerTelemetryRequest.js";
import { ServerTelemetryEntity } from "../../cache/entities/ServerTelemetryEntity.js";
import { RegionDiscoveryMetadata } from "../../authority/RegionDiscoveryMetadata.js";
type SkuParams = {
    libraryName?: string;
    libraryVersion?: string;
    extensionName?: string;
    extensionVersion?: string;
    skus?: string;
};
/** @internal */
export declare class ServerTelemetryManager {
    private cacheManager;
    private apiId;
    private correlationId;
    private telemetryCacheKey;
    private wrapperSKU;
    private wrapperVer;
    private regionUsed;
    private regionSource;
    private regionOutcome;
    private cacheOutcome;
    constructor(telemetryRequest: ServerTelemetryRequest, cacheManager: CacheManager);
    /**
     * API to add MSER Telemetry to request
     */
    generateCurrentRequestHeaderValue(): string;
    /**
     * API to add MSER Telemetry for the last failed request
     */
    generateLastRequestHeaderValue(): string;
    /**
     * API to cache token failures for MSER data capture
     * @param error
     */
    cacheFailedRequest(error: unknown): void;
    /**
     * Update server telemetry cache entry by incrementing cache hit counter
     */
    incrementCacheHits(): number;
    /**
     * Get the server telemetry entity from cache or initialize a new one
     */
    getLastRequests(): ServerTelemetryEntity;
    /**
     * Remove server telemetry cache entry
     */
    clearTelemetryCache(): void;
    /**
     * Returns the maximum number of errors that can be flushed to the server in the next network request
     * @param serverTelemetryEntity
     */
    static maxErrorsToSend(serverTelemetryEntity: ServerTelemetryEntity): number;
    /**
     * Get the region discovery fields
     *
     * @returns string
     */
    getRegionDiscoveryFields(): string;
    /**
     * Update the region discovery metadata
     *
     * @param regionDiscoveryMetadata
     * @returns void
     */
    updateRegionDiscoveryMetadata(regionDiscoveryMetadata: RegionDiscoveryMetadata): void;
    /**
     * Set cache outcome
     */
    setCacheOutcome(cacheOutcome: CacheOutcome): void;
    setNativeBrokerErrorCode(errorCode: string): void;
    getNativeBrokerErrorCode(): string | undefined;
    clearNativeBrokerErrorCode(): void;
    static makeExtraSkuString(params: SkuParams): string;
}
export {};
//# sourceMappingURL=ServerTelemetryManager.d.ts.map