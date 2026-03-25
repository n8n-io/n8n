/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IPerformanceClient,
    Logger,
    PerformanceEvents,
    PkceCodes,
    invoke,
    invokeAsync,
} from "@azure/msal-common/browser";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import { urlEncodeArr } from "../encode/Base64Encode.js";
import { getRandomValues, sha256Digest } from "./BrowserCrypto.js";

// Constant byte array length
const RANDOM_BYTE_ARR_LENGTH = 32;

/**
 * This file defines APIs to generate PKCE codes and code verifiers.
 */

/**
 * Generates PKCE Codes. See the RFC for more information: https://tools.ietf.org/html/rfc7636
 */
export async function generatePkceCodes(
    performanceClient: IPerformanceClient,
    logger: Logger,
    correlationId: string
): Promise<PkceCodes> {
    performanceClient.addQueueMeasurement(
        PerformanceEvents.GeneratePkceCodes,
        correlationId
    );
    const codeVerifier = invoke(
        generateCodeVerifier,
        PerformanceEvents.GenerateCodeVerifier,
        logger,
        performanceClient,
        correlationId
    )(performanceClient, logger, correlationId);
    const codeChallenge = await invokeAsync(
        generateCodeChallengeFromVerifier,
        PerformanceEvents.GenerateCodeChallengeFromVerifier,
        logger,
        performanceClient,
        correlationId
    )(codeVerifier, performanceClient, logger, correlationId);
    return {
        verifier: codeVerifier,
        challenge: codeChallenge,
    };
}

/**
 * Generates a random 32 byte buffer and returns the base64
 * encoded string to be used as a PKCE Code Verifier
 */
function generateCodeVerifier(
    performanceClient: IPerformanceClient,
    logger: Logger,
    correlationId: string
): string {
    try {
        // Generate random values as utf-8
        const buffer: Uint8Array = new Uint8Array(RANDOM_BYTE_ARR_LENGTH);
        invoke(
            getRandomValues,
            PerformanceEvents.GetRandomValues,
            logger,
            performanceClient,
            correlationId
        )(buffer);
        // encode verifier as base64
        const pkceCodeVerifierB64: string = urlEncodeArr(buffer);
        return pkceCodeVerifierB64;
    } catch (e) {
        throw createBrowserAuthError(BrowserAuthErrorCodes.pkceNotCreated);
    }
}

/**
 * Creates a base64 encoded PKCE Code Challenge string from the
 * hash created from the PKCE Code Verifier supplied
 */
async function generateCodeChallengeFromVerifier(
    pkceCodeVerifier: string,
    performanceClient: IPerformanceClient,
    logger: Logger,
    correlationId: string
): Promise<string> {
    performanceClient.addQueueMeasurement(
        PerformanceEvents.GenerateCodeChallengeFromVerifier,
        correlationId
    );
    try {
        // hashed verifier
        const pkceHashedCodeVerifier = await invokeAsync(
            sha256Digest,
            PerformanceEvents.Sha256Digest,
            logger,
            performanceClient,
            correlationId
        )(pkceCodeVerifier, performanceClient, correlationId);
        // encode hash as base64
        return urlEncodeArr(new Uint8Array(pkceHashedCodeVerifier));
    } catch (e) {
        throw createBrowserAuthError(BrowserAuthErrorCodes.pkceNotCreated);
    }
}
