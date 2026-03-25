/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { createClientAuthError } from '../error/ClientAuthError.mjs';
import { tokenParsingError, nullOrEmptyToken, maxAgeTranspired } from '../error/ClientAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Extract token by decoding the rawToken
 *
 * @param encodedToken
 */
function extractTokenClaims(encodedToken, base64Decode) {
    const jswPayload = getJWSPayload(encodedToken);
    // token will be decoded to get the username
    try {
        // base64Decode() should throw an error if there is an issue
        const base64Decoded = base64Decode(jswPayload);
        return JSON.parse(base64Decoded);
    }
    catch (err) {
        throw createClientAuthError(tokenParsingError);
    }
}
/**
 * Check if the signin_state claim contains "kmsi"
 * @param idTokenClaims
 * @returns
 */
function isKmsi(idTokenClaims) {
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
    const kmsi = idTokenClaims.signin_state.some((value) => kmsiClaims.includes(value.trim().toLowerCase()));
    return kmsi;
}
/**
 * decode a JWT
 *
 * @param authToken
 */
function getJWSPayload(authToken) {
    if (!authToken) {
        throw createClientAuthError(nullOrEmptyToken);
    }
    const tokenPartsRegex = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/;
    const matches = tokenPartsRegex.exec(authToken);
    if (!matches || matches.length < 4) {
        throw createClientAuthError(tokenParsingError);
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
function checkMaxAge(authTime, maxAge) {
    /*
     * per https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
     * To force an immediate re-authentication: If an app requires that a user re-authenticate prior to access,
     * provide a value of 0 for the max_age parameter and the AS will force a fresh login.
     */
    const fiveMinuteSkew = 300000; // five minutes in milliseconds
    if (maxAge === 0 || Date.now() - fiveMinuteSkew > authTime + maxAge) {
        throw createClientAuthError(maxAgeTranspired);
    }
}

export { checkMaxAge, extractTokenClaims, getJWSPayload, isKmsi };
//# sourceMappingURL=AuthToken.mjs.map
