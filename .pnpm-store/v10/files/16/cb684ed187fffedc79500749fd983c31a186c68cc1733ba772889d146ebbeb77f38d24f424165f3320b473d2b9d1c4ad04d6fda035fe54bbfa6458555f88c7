/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ICrypto, SignedHttpRequestParameters } from "./ICrypto.js";
import * as TimeUtils from "../utils/TimeUtils.js";
import { UrlString } from "../url/UrlString.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import { PerformanceEvents } from "../telemetry/performance/PerformanceEvent.js";
import { invokeAsync } from "../utils/FunctionWrappers.js";
import { Logger } from "../logger/Logger.js";

/**
 * See eSTS docs for more info.
 * - A kid element, with the value containing an RFC 7638-compliant JWK thumbprint that is base64 encoded.
 * -  xms_ksl element, representing the storage location of the key's secret component on the client device. One of two values:
 *      - sw: software storage
 *      - uhw: hardware storage
 */
type ReqCnf = {
    kid: string;
    xms_ksl: KeyLocation;
};

export type ReqCnfData = {
    kid: string;
    reqCnfString: string;
};

const KeyLocation = {
    SW: "sw",
    UHW: "uhw",
} as const;
export type KeyLocation = (typeof KeyLocation)[keyof typeof KeyLocation];

/** @internal */
export class PopTokenGenerator {
    private cryptoUtils: ICrypto;
    private performanceClient?: IPerformanceClient;

    constructor(cryptoUtils: ICrypto, performanceClient?: IPerformanceClient) {
        this.cryptoUtils = cryptoUtils;
        this.performanceClient = performanceClient;
    }

    /**
     * Generates the req_cnf validated at the RP in the POP protocol for SHR parameters
     * and returns an object containing the keyid, the full req_cnf string and the req_cnf string hash
     * @param request
     * @returns
     */
    async generateCnf(
        request: SignedHttpRequestParameters,
        logger: Logger
    ): Promise<ReqCnfData> {
        this.performanceClient?.addQueueMeasurement(
            PerformanceEvents.PopTokenGenerateCnf,
            request.correlationId
        );

        const reqCnf = await invokeAsync(
            this.generateKid.bind(this),
            PerformanceEvents.PopTokenGenerateCnf,
            logger,
            this.performanceClient,
            request.correlationId
        )(request);
        const reqCnfString: string = this.cryptoUtils.base64UrlEncode(
            JSON.stringify(reqCnf)
        );

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
    async generateKid(request: SignedHttpRequestParameters): Promise<ReqCnf> {
        this.performanceClient?.addQueueMeasurement(
            PerformanceEvents.PopTokenGenerateKid,
            request.correlationId
        );

        const kidThumbprint = await this.cryptoUtils.getPublicKeyThumbprint(
            request
        );

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
    async signPopToken(
        accessToken: string,
        keyId: string,
        request: SignedHttpRequestParameters
    ): Promise<string> {
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
    async signPayload(
        payload: string,
        keyId: string,
        request: SignedHttpRequestParameters,
        claims?: object
    ): Promise<string> {
        // Deconstruct request to extract SHR parameters
        const {
            resourceRequestMethod,
            resourceRequestUri,
            shrClaims,
            shrNonce,
            shrOptions,
        } = request;

        const resourceUrlString = resourceRequestUri
            ? new UrlString(resourceRequestUri)
            : undefined;
        const resourceUrlComponents = resourceUrlString?.getUrlComponents();
        return this.cryptoUtils.signJwt(
            {
                at: payload,
                ts: TimeUtils.nowSeconds(),
                m: resourceRequestMethod?.toUpperCase(),
                u: resourceUrlComponents?.HostNameAndPort,
                nonce: shrNonce || this.cryptoUtils.createNewGuid(),
                p: resourceUrlComponents?.AbsolutePath,
                q: resourceUrlComponents?.QueryString
                    ? [[], resourceUrlComponents.QueryString]
                    : undefined,
                client_claims: shrClaims || undefined,
                ...claims,
            },
            keyId,
            shrOptions,
            request.correlationId
        );
    }
}
