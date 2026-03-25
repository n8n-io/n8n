/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    SERVER_TELEM_CONSTANTS,
    Separators,
    CacheOutcome,
    Constants,
    RegionDiscoverySources,
    RegionDiscoveryOutcomes,
} from "../../utils/Constants.js";
import { CacheManager } from "../../cache/CacheManager.js";
import { AuthError } from "../../error/AuthError.js";
import { ServerTelemetryRequest } from "./ServerTelemetryRequest.js";
import { ServerTelemetryEntity } from "../../cache/entities/ServerTelemetryEntity.js";
import { RegionDiscoveryMetadata } from "../../authority/RegionDiscoveryMetadata.js";

const skuGroupSeparator = ",";
const skuValueSeparator = "|";

type SkuParams = {
    libraryName?: string;
    libraryVersion?: string;
    extensionName?: string;
    extensionVersion?: string;
    skus?: string;
};

function makeExtraSkuString(params: SkuParams): string {
    const {
        skus,
        libraryName,
        libraryVersion,
        extensionName,
        extensionVersion,
    } = params;
    const skuMap: Map<number, (string | undefined)[]> = new Map([
        [0, [libraryName, libraryVersion]],
        [2, [extensionName, extensionVersion]],
    ]);
    let skuArr: string[] = [];

    if (skus?.length) {
        skuArr = skus.split(skuGroupSeparator);

        // Ignore invalid input sku param
        if (skuArr.length < 4) {
            return skus;
        }
    } else {
        skuArr = Array.from({ length: 4 }, () => skuValueSeparator);
    }

    skuMap.forEach((value, key) => {
        if (value.length === 2 && value[0]?.length && value[1]?.length) {
            setSku({
                skuArr,
                index: key,
                skuName: value[0],
                skuVersion: value[1],
            });
        }
    });

    return skuArr.join(skuGroupSeparator);
}

function setSku(params: {
    skuArr: string[];
    index: number;
    skuName: string;
    skuVersion: string;
}): void {
    const { skuArr, index, skuName, skuVersion } = params;
    if (index >= skuArr.length) {
        return;
    }
    skuArr[index] = [skuName, skuVersion].join(skuValueSeparator);
}

/** @internal */
export class ServerTelemetryManager {
    private cacheManager: CacheManager;
    private apiId: number;
    private correlationId: string;
    private telemetryCacheKey: string;
    private wrapperSKU: String;
    private wrapperVer: String;
    private regionUsed: string | undefined;
    private regionSource: RegionDiscoverySources | undefined;
    private regionOutcome: RegionDiscoveryOutcomes | undefined;
    private cacheOutcome: CacheOutcome = CacheOutcome.NOT_APPLICABLE;

    constructor(
        telemetryRequest: ServerTelemetryRequest,
        cacheManager: CacheManager
    ) {
        this.cacheManager = cacheManager;
        this.apiId = telemetryRequest.apiId;
        this.correlationId = telemetryRequest.correlationId;
        this.wrapperSKU = telemetryRequest.wrapperSKU || Constants.EMPTY_STRING;
        this.wrapperVer = telemetryRequest.wrapperVer || Constants.EMPTY_STRING;

        this.telemetryCacheKey =
            SERVER_TELEM_CONSTANTS.CACHE_KEY +
            Separators.CACHE_KEY_SEPARATOR +
            telemetryRequest.clientId;
    }

    /**
     * API to add MSER Telemetry to request
     */
    generateCurrentRequestHeaderValue(): string {
        const request = `${this.apiId}${SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR}${this.cacheOutcome}`;
        const platformFieldsArr = [this.wrapperSKU, this.wrapperVer];
        const nativeBrokerErrorCode = this.getNativeBrokerErrorCode();
        if (nativeBrokerErrorCode?.length) {
            platformFieldsArr.push(`broker_error=${nativeBrokerErrorCode}`);
        }
        const platformFields = platformFieldsArr.join(
            SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR
        );
        const regionDiscoveryFields = this.getRegionDiscoveryFields();
        const requestWithRegionDiscoveryFields = [
            request,
            regionDiscoveryFields,
        ].join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);

        return [
            SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
            requestWithRegionDiscoveryFields,
            platformFields,
        ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
    }

    /**
     * API to add MSER Telemetry for the last failed request
     */
    generateLastRequestHeaderValue(): string {
        const lastRequests = this.getLastRequests();

        const maxErrors = ServerTelemetryManager.maxErrorsToSend(lastRequests);
        const failedRequests = lastRequests.failedRequests
            .slice(0, 2 * maxErrors)
            .join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        const errors = lastRequests.errors
            .slice(0, maxErrors)
            .join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
        const errorCount = lastRequests.errors.length;

        // Indicate whether this header contains all data or partial data
        const overflow =
            maxErrors < errorCount
                ? SERVER_TELEM_CONSTANTS.OVERFLOW_TRUE
                : SERVER_TELEM_CONSTANTS.OVERFLOW_FALSE;
        const platformFields = [errorCount, overflow].join(
            SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR
        );

        return [
            SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
            lastRequests.cacheHits,
            failedRequests,
            errors,
            platformFields,
        ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
    }

    /**
     * API to cache token failures for MSER data capture
     * @param error
     */
    cacheFailedRequest(error: unknown): void {
        const lastRequests = this.getLastRequests();
        if (
            lastRequests.errors.length >=
            SERVER_TELEM_CONSTANTS.MAX_CACHED_ERRORS
        ) {
            // Remove a cached error to make room, first in first out
            lastRequests.failedRequests.shift(); // apiId
            lastRequests.failedRequests.shift(); // correlationId
            lastRequests.errors.shift();
        }

        lastRequests.failedRequests.push(this.apiId, this.correlationId);

        if (error instanceof Error && !!error && error.toString()) {
            if (error instanceof AuthError) {
                if (error.subError) {
                    lastRequests.errors.push(error.subError);
                } else if (error.errorCode) {
                    lastRequests.errors.push(error.errorCode);
                } else {
                    lastRequests.errors.push(error.toString());
                }
            } else {
                lastRequests.errors.push(error.toString());
            }
        } else {
            lastRequests.errors.push(SERVER_TELEM_CONSTANTS.UNKNOWN_ERROR);
        }

        this.cacheManager.setServerTelemetry(
            this.telemetryCacheKey,
            lastRequests,
            this.correlationId
        );

        return;
    }

    /**
     * Update server telemetry cache entry by incrementing cache hit counter
     */
    incrementCacheHits(): number {
        const lastRequests = this.getLastRequests();
        lastRequests.cacheHits += 1;

        this.cacheManager.setServerTelemetry(
            this.telemetryCacheKey,
            lastRequests,
            this.correlationId
        );
        return lastRequests.cacheHits;
    }

    /**
     * Get the server telemetry entity from cache or initialize a new one
     */
    getLastRequests(): ServerTelemetryEntity {
        const initialValue: ServerTelemetryEntity = {
            failedRequests: [],
            errors: [],
            cacheHits: 0,
        };
        const lastRequests = this.cacheManager.getServerTelemetry(
            this.telemetryCacheKey
        ) as ServerTelemetryEntity;

        return lastRequests || initialValue;
    }

    /**
     * Remove server telemetry cache entry
     */
    clearTelemetryCache(): void {
        const lastRequests = this.getLastRequests();
        const numErrorsFlushed =
            ServerTelemetryManager.maxErrorsToSend(lastRequests);
        const errorCount = lastRequests.errors.length;
        if (numErrorsFlushed === errorCount) {
            // All errors were sent on last request, clear Telemetry cache
            this.cacheManager.removeItem(
                this.telemetryCacheKey,
                this.correlationId
            );
        } else {
            // Partial data was flushed to server, construct a new telemetry cache item with errors that were not flushed
            const serverTelemEntity: ServerTelemetryEntity = {
                failedRequests: lastRequests.failedRequests.slice(
                    numErrorsFlushed * 2
                ), // failedRequests contains 2 items for each error
                errors: lastRequests.errors.slice(numErrorsFlushed),
                cacheHits: 0,
            };

            this.cacheManager.setServerTelemetry(
                this.telemetryCacheKey,
                serverTelemEntity,
                this.correlationId
            );
        }
    }

    /**
     * Returns the maximum number of errors that can be flushed to the server in the next network request
     * @param serverTelemetryEntity
     */
    static maxErrorsToSend(
        serverTelemetryEntity: ServerTelemetryEntity
    ): number {
        let i;
        let maxErrors = 0;
        let dataSize = 0;
        const errorCount = serverTelemetryEntity.errors.length;
        for (i = 0; i < errorCount; i++) {
            // failedRequests parameter contains pairs of apiId and correlationId, multiply index by 2 to preserve pairs
            const apiId =
                serverTelemetryEntity.failedRequests[2 * i] ||
                Constants.EMPTY_STRING;
            const correlationId =
                serverTelemetryEntity.failedRequests[2 * i + 1] ||
                Constants.EMPTY_STRING;
            const errorCode =
                serverTelemetryEntity.errors[i] || Constants.EMPTY_STRING;

            // Count number of characters that would be added to header, each character is 1 byte. Add 3 at the end to account for separators
            dataSize +=
                apiId.toString().length +
                correlationId.toString().length +
                errorCode.length +
                3;

            if (dataSize < SERVER_TELEM_CONSTANTS.MAX_LAST_HEADER_BYTES) {
                // Adding this entry to the header would still keep header size below the limit
                maxErrors += 1;
            } else {
                break;
            }
        }

        return maxErrors;
    }

    /**
     * Get the region discovery fields
     *
     * @returns string
     */
    getRegionDiscoveryFields(): string {
        const regionDiscoveryFields: string[] = [];

        regionDiscoveryFields.push(this.regionUsed || Constants.EMPTY_STRING);
        regionDiscoveryFields.push(this.regionSource || Constants.EMPTY_STRING);
        regionDiscoveryFields.push(
            this.regionOutcome || Constants.EMPTY_STRING
        );

        return regionDiscoveryFields.join(",");
    }

    /**
     * Update the region discovery metadata
     *
     * @param regionDiscoveryMetadata
     * @returns void
     */
    updateRegionDiscoveryMetadata(
        regionDiscoveryMetadata: RegionDiscoveryMetadata
    ): void {
        this.regionUsed = regionDiscoveryMetadata.region_used;
        this.regionSource = regionDiscoveryMetadata.region_source;
        this.regionOutcome = regionDiscoveryMetadata.region_outcome;
    }

    /**
     * Set cache outcome
     */
    setCacheOutcome(cacheOutcome: CacheOutcome): void {
        this.cacheOutcome = cacheOutcome;
    }

    setNativeBrokerErrorCode(errorCode: string): void {
        const lastRequests = this.getLastRequests();
        lastRequests.nativeBrokerErrorCode = errorCode;
        this.cacheManager.setServerTelemetry(
            this.telemetryCacheKey,
            lastRequests,
            this.correlationId
        );
    }

    getNativeBrokerErrorCode(): string | undefined {
        return this.getLastRequests().nativeBrokerErrorCode;
    }

    clearNativeBrokerErrorCode(): void {
        const lastRequests = this.getLastRequests();
        delete lastRequests.nativeBrokerErrorCode;
        this.cacheManager.setServerTelemetry(
            this.telemetryCacheKey,
            lastRequests,
            this.correlationId
        );
    }

    static makeExtraSkuString(params: SkuParams): string {
        return makeExtraSkuString(params);
    }
}
