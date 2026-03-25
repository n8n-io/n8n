/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { BaseClient } from './BaseClient.mjs';
import { wasClockTurnedBack, isTokenExpired } from '../utils/TimeUtils.mjs';
import { createClientAuthError } from '../error/ClientAuthError.mjs';
import { ResponseHandler } from '../response/ResponseHandler.mjs';
import { CacheOutcome } from '../utils/Constants.mjs';
import { StringUtils } from '../utils/StringUtils.mjs';
import { extractTokenClaims, checkMaxAge } from '../account/AuthToken.mjs';
import { PerformanceEvents } from '../telemetry/performance/PerformanceEvent.mjs';
import { invokeAsync } from '../utils/FunctionWrappers.mjs';
import { getTenantFromAuthorityString } from '../authority/Authority.mjs';
import { tokenRefreshRequired, noAccountInSilentRequest, authTimeNotFound } from '../error/ClientAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/** @internal */
class SilentFlowClient extends BaseClient {
    constructor(configuration, performanceClient) {
        super(configuration, performanceClient);
    }
    /**
     * Retrieves token from cache or throws an error if it must be refreshed.
     * @param request
     */
    async acquireCachedToken(request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.SilentFlowClientAcquireCachedToken, request.correlationId);
        let lastCacheOutcome = CacheOutcome.NOT_APPLICABLE;
        if (request.forceRefresh ||
            (!this.config.cacheOptions.claimsBasedCachingEnabled &&
                !StringUtils.isEmptyObj(request.claims))) {
            // Must refresh due to present force_refresh flag.
            this.setCacheOutcome(CacheOutcome.FORCE_REFRESH_OR_CLAIMS, request.correlationId);
            throw createClientAuthError(tokenRefreshRequired);
        }
        // We currently do not support silent flow for account === null use cases; This will be revisited for confidential flow usecases
        if (!request.account) {
            throw createClientAuthError(noAccountInSilentRequest);
        }
        const requestTenantId = request.account.tenantId ||
            getTenantFromAuthorityString(request.authority);
        const tokenKeys = this.cacheManager.getTokenKeys();
        const cachedAccessToken = this.cacheManager.getAccessToken(request.account, request, tokenKeys, requestTenantId);
        if (!cachedAccessToken) {
            // must refresh due to non-existent access_token
            this.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN, request.correlationId);
            throw createClientAuthError(tokenRefreshRequired);
        }
        else if (wasClockTurnedBack(cachedAccessToken.cachedAt) ||
            isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)) {
            // must refresh due to the expires_in value
            this.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED, request.correlationId);
            throw createClientAuthError(tokenRefreshRequired);
        }
        else if (cachedAccessToken.refreshOn &&
            isTokenExpired(cachedAccessToken.refreshOn, 0)) {
            // must refresh (in the background) due to the refresh_in value
            lastCacheOutcome = CacheOutcome.PROACTIVELY_REFRESHED;
            // don't throw ClientAuthError.createRefreshRequiredError(), return cached token instead
        }
        const environment = request.authority || this.authority.getPreferredCache();
        const cacheRecord = {
            account: this.cacheManager.getAccount(this.cacheManager.generateAccountKey(request.account), request.correlationId),
            accessToken: cachedAccessToken,
            idToken: this.cacheManager.getIdToken(request.account, request.correlationId, tokenKeys, requestTenantId, this.performanceClient),
            refreshToken: null,
            appMetadata: this.cacheManager.readAppMetadataFromCache(environment),
        };
        this.setCacheOutcome(lastCacheOutcome, request.correlationId);
        if (this.config.serverTelemetryManager) {
            this.config.serverTelemetryManager.incrementCacheHits();
        }
        return [
            await invokeAsync(this.generateResultFromCacheRecord.bind(this), PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord, this.logger, this.performanceClient, request.correlationId)(cacheRecord, request),
            lastCacheOutcome,
        ];
    }
    setCacheOutcome(cacheOutcome, correlationId) {
        this.serverTelemetryManager?.setCacheOutcome(cacheOutcome);
        this.performanceClient?.addFields({
            cacheOutcome: cacheOutcome,
        }, correlationId);
        if (cacheOutcome !== CacheOutcome.NOT_APPLICABLE) {
            this.logger.info(`Token refresh is required due to cache outcome: ${cacheOutcome}`);
        }
    }
    /**
     * Helper function to build response object from the CacheRecord
     * @param cacheRecord
     */
    async generateResultFromCacheRecord(cacheRecord, request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord, request.correlationId);
        let idTokenClaims;
        if (cacheRecord.idToken) {
            idTokenClaims = extractTokenClaims(cacheRecord.idToken.secret, this.config.cryptoInterface.base64Decode);
        }
        // token max_age check
        if (request.maxAge || request.maxAge === 0) {
            const authTime = idTokenClaims?.auth_time;
            if (!authTime) {
                throw createClientAuthError(authTimeNotFound);
            }
            checkMaxAge(authTime, request.maxAge);
        }
        return ResponseHandler.generateAuthenticationResult(this.cryptoUtils, this.authority, cacheRecord, true, request, idTokenClaims);
    }
}

export { SilentFlowClient };
//# sourceMappingURL=SilentFlowClient.mjs.map
