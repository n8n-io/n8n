/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TokenClaims } from "./TokenClaims.js";
import {
    createClientAuthError,
    ClientAuthErrorCodes,
} from "../error/ClientAuthError.js";

/**
 * Extract token by decoding the rawToken
 *
 * @param encodedToken
 */
export function extractTokenClaims(
    encodedToken: string,
    base64Decode: (input: string) => string
): TokenClaims {
    const jswPayload = getJWSPayload(encodedToken);

    // token will be decoded to get the username
    try {
        // base64Decode() should throw an error if there is an issue
        const base64Decoded = base64Decode(jswPayload);
        return JSON.parse(base64Decoded) as TokenClaims;
    } catch (err) {
        throw createClientAuthError(ClientAuthErrorCodes.tokenParsingError);
    }
}

/**
 * Check if the signin_state claim contains "kmsi"
 * @param idTokenClaims
 * @returns
 */
export function isKmsi(idTokenClaims: TokenClaims): boolean {
    if (!idTokenClaims.signin_state) {
        return false;
    }
    /**
     * Signin_state claim known values:
     * dvc_mngd - device is managed
     * dvc_dmjd - device is domain joined
     * kmsi - user opted to "keep me signed in"
     * inknownntwk - Request made inside a known network. Don't use this, use CAE instead.
     */
    const kmsiClaims = ["kmsi", "dvc_dmjd"]; // There are some cases where kmsi may not be returned but persistent storage is still OK - allow dvc_dmjd as well
    const kmsi = idTokenClaims.signin_state.some((value) =>
        kmsiClaims.includes(value.trim().toLowerCase())
    );
    return kmsi;
}

/**
 * decode a JWT
 *
 * @param authToken
 */
export function getJWSPayload(authToken: string): string {
    if (!authToken) {
        throw createClientAuthError(ClientAuthErrorCodes.nullOrEmptyToken);
    }
    const tokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/;
    const matches = tokenPartsRegex.exec(authToken);
    if (!matches || matches.length < 4) {
        throw createClientAuthError(ClientAuthErrorCodes.tokenParsingError);
    }
    /**
     * const crackedToken = {
     *  header: matches[1],
     *  JWSPayload: matches[2],
     *  JWSSig: matches[3],
     * };
     */

    return matches[2];
}

/**
 * Determine if the token's max_age has transpired
 */
export function checkMaxAge(authTime: number, maxAge: number): void {
    /*
     * per https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
     * To force an immediate re-authentication: If an app requires that a user re-authenticate prior to access,
     * provide a value of 0 for the max_age parameter and the AS will force a fresh login.
     */
    const fiveMinuteSkew = 300000; // five minutes in milliseconds
    if (maxAge === 0 || Date.now() - fiveMinuteSkew > authTime + maxAge) {
        throw createClientAuthError(ClientAuthErrorCodes.maxAgeTranspired);
    }
}
