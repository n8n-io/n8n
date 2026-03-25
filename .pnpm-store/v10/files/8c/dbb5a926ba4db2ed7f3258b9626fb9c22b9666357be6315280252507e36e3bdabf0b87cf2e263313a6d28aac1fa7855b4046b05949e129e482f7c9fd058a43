/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { PerformanceEvents, invoke, invokeAsync } from '@azure/msal-common/browser';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { urlEncodeArr } from '../encode/Base64Encode.mjs';
import { getRandomValues, sha256Digest } from './BrowserCrypto.mjs';
import { pkceNotCreated } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
// Constant byte array length
const RANDOM_BYTE_ARR_LENGTH = 32;
/**
 * This file defines APIs to generate PKCE codes and code verifiers.
 */
/**
 * Generates PKCE Codes. See the RFC for more information: https://tools.ietf.org/html/rfc7636
 */
async function generatePkceCodes(performanceClient, logger, correlationId) {
    performanceClient.addQueueMeasurement(PerformanceEvents.GeneratePkceCodes, correlationId);
    const codeVerifier = invoke(generateCodeVerifier, PerformanceEvents.GenerateCodeVerifier, logger, performanceClient, correlationId)(performanceClient, logger, correlationId);
    const codeChallenge = await invokeAsync(generateCodeChallengeFromVerifier, PerformanceEvents.GenerateCodeChallengeFromVerifier, logger, performanceClient, correlationId)(codeVerifier, performanceClient, logger, correlationId);
    return {
        verifier: codeVerifier,
        challenge: codeChallenge,
    };
}
/**
 * Generates a random 32 byte buffer and returns the base64
 * encoded string to be used as a PKCE Code Verifier
 */
function generateCodeVerifier(performanceClient, logger, correlationId) {
    try {
        // Generate random values as utf-8
        const buffer = new Uint8Array(RANDOM_BYTE_ARR_LENGTH);
        invoke(getRandomValues, PerformanceEvents.GetRandomValues, logger, performanceClient, correlationId)(buffer);
        // encode verifier as base64
        const pkceCodeVerifierB64 = urlEncodeArr(buffer);
        return pkceCodeVerifierB64;
    }
    catch (e) {
        throw createBrowserAuthError(pkceNotCreated);
    }
}
/**
 * Creates a base64 encoded PKCE Code Challenge string from the
 * hash created from the PKCE Code Verifier supplied
 */
async function generateCodeChallengeFromVerifier(pkceCodeVerifier, performanceClient, logger, correlationId) {
    performanceClient.addQueueMeasurement(PerformanceEvents.GenerateCodeChallengeFromVerifier, correlationId);
    try {
        // hashed verifier
        const pkceHashedCodeVerifier = await invokeAsync(sha256Digest, PerformanceEvents.Sha256Digest, logger, performanceClient, correlationId)(pkceCodeVerifier, performanceClient, correlationId);
        // encode hash as base64
        return urlEncodeArr(new Uint8Array(pkceHashedCodeVerifier));
    }
    catch (e) {
        throw createBrowserAuthError(pkceNotCreated);
    }
}

export { generatePkceCodes };
//# sourceMappingURL=PkceGenerator.mjs.map
