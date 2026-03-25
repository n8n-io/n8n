/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { nowSeconds } from '../utils/TimeUtils.mjs';
import { UrlString } from '../url/UrlString.mjs';
import { PerformanceEvents } from '../telemetry/performance/PerformanceEvent.mjs';
import { invokeAsync } from '../utils/FunctionWrappers.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const KeyLocation = {
    SW: "sw"};
/** @internal */
class PopTokenGenerator {
    constructor(cryptoUtils, performanceClient) {
        this.cryptoUtils = cryptoUtils;
        this.performanceClient = performanceClient;
    }
    /**
     * Generates the req_cnf validated at the RP in the POP protocol for SHR parameters
     * and returns an object containing the keyid, the full req_cnf string and the req_cnf string hash
     * @param request
     * @returns
     */
    async generateCnf(request, logger) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.PopTokenGenerateCnf, request.correlationId);
        const reqCnf = await invokeAsync(this.generateKid.bind(this), PerformanceEvents.PopTokenGenerateCnf, logger, this.performanceClient, request.correlationId)(request);
        const reqCnfString = this.cryptoUtils.base64UrlEncode(JSON.stringify(reqCnf));
        return {
            kid: reqCnf.kid,
            reqCnfString,
        };
    }
    /**
     * Generates key_id for a SHR token request
     * @param request
     * @returns
     */
    async generateKid(request) {
        this.performanceClient?.addQueueMeasurement(PerformanceEvents.PopTokenGenerateKid, request.correlationId);
        const kidThumbprint = await this.cryptoUtils.getPublicKeyThumbprint(request);
        return {
            kid: kidThumbprint,
            xms_ksl: KeyLocation.SW,
        };
    }
    /**
     * Signs the POP access_token with the local generated key-pair
     * @param accessToken
     * @param request
     * @returns
     */
    async signPopToken(accessToken, keyId, request) {
        return this.signPayload(accessToken, keyId, request);
    }
    /**
     * Utility function to generate the signed JWT for an access_token
     * @param payload
     * @param kid
     * @param request
     * @param claims
     * @returns
     */
    async signPayload(payload, keyId, request, claims) {
        // Deconstruct request to extract SHR parameters
        const { resourceRequestMethod, resourceRequestUri, shrClaims, shrNonce, shrOptions, } = request;
        const resourceUrlString = resourceRequestUri
            ? new UrlString(resourceRequestUri)
            : undefined;
        const resourceUrlComponents = resourceUrlString?.getUrlComponents();
        return this.cryptoUtils.signJwt({
            at: payload,
            ts: nowSeconds(),
            m: resourceRequestMethod?.toUpperCase(),
            u: resourceUrlComponents?.HostNameAndPort,
            nonce: shrNonce || this.cryptoUtils.createNewGuid(),
            p: resourceUrlComponents?.AbsolutePath,
            q: resourceUrlComponents?.QueryString
                ? [[], resourceUrlComponents.QueryString]
                : undefined,
            client_claims: shrClaims || undefined,
            ...claims,
        }, keyId, shrOptions, request.correlationId);
    }
}

export { PopTokenGenerator };
//# sourceMappingURL=PopTokenGenerator.mjs.map
