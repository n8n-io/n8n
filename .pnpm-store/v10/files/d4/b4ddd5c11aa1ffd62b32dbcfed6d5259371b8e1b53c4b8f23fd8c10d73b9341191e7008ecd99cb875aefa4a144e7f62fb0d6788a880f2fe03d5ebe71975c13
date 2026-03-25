/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { createClientConfigurationError } from '../error/ClientConfigurationError.mjs';
import { Constants, HeaderNames } from '../utils/Constants.mjs';
import { invalidAuthenticationHeader, missingNonceAuthenticationHeader } from '../error/ClientConfigurationErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This is a helper class that parses supported HTTP response authentication headers to extract and return
 * header challenge values that can be used outside the basic authorization flows.
 */
class AuthenticationHeaderParser {
    constructor(headers) {
        this.headers = headers;
    }
    /**
     * This method parses the SHR nonce value out of either the Authentication-Info or WWW-Authenticate authentication headers.
     * @returns
     */
    getShrNonce() {
        // Attempt to parse nonce from Authentiacation-Info
        const authenticationInfo = this.headers[HeaderNames.AuthenticationInfo];
        if (authenticationInfo) {
            const authenticationInfoChallenges = this.parseChallenges(authenticationInfo);
            if (authenticationInfoChallenges.nextnonce) {
                return authenticationInfoChallenges.nextnonce;
            }
            throw createClientConfigurationError(invalidAuthenticationHeader);
        }
        // Attempt to parse nonce from WWW-Authenticate
        const wwwAuthenticate = this.headers[HeaderNames.WWWAuthenticate];
        if (wwwAuthenticate) {
            const wwwAuthenticateChallenges = this.parseChallenges(wwwAuthenticate);
            if (wwwAuthenticateChallenges.nonce) {
                return wwwAuthenticateChallenges.nonce;
            }
            throw createClientConfigurationError(invalidAuthenticationHeader);
        }
        // If neither header is present, throw missing headers error
        throw createClientConfigurationError(missingNonceAuthenticationHeader);
    }
    /**
     * Parses an HTTP header's challenge set into a key/value map.
     * @param header
     * @returns
     */
    parseChallenges(header) {
        const schemeSeparator = header.indexOf(" ");
        const challenges = header.substr(schemeSeparator + 1).split(",");
        const challengeMap = {};
        challenges.forEach((challenge) => {
            const [key, value] = challenge.split("=");
            // Remove escaped quotation marks (', ") from challenge string to keep only the challenge value
            challengeMap[key] = unescape(value.replace(/['"]+/g, Constants.EMPTY_STRING));
        });
        return challengeMap;
    }
}

export { AuthenticationHeaderParser };
//# sourceMappingURL=AuthenticationHeaderParser.mjs.map
