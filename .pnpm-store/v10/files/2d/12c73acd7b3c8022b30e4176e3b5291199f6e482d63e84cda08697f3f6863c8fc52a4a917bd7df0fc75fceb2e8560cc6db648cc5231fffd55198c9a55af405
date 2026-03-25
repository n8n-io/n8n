/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { EncodingTypes, Constants } from '@azure/msal-common/node';
import { RANDOM_OCTET_SIZE, CharSet } from '../utils/Constants.mjs';
import { EncodingUtils } from '../utils/EncodingUtils.mjs';
import { HashUtils } from './HashUtils.mjs';
import crypto from 'crypto';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * https://tools.ietf.org/html/rfc7636#page-8
 */
class PkceGenerator {
    constructor() {
        this.hashUtils = new HashUtils();
    }
    /**
     * generates the codeVerfier and the challenge from the codeVerfier
     * reference: https://tools.ietf.org/html/rfc7636#section-4.1 and https://tools.ietf.org/html/rfc7636#section-4.2
     */
    async generatePkceCodes() {
        const verifier = this.generateCodeVerifier();
        const challenge = this.generateCodeChallengeFromVerifier(verifier);
        return { verifier, challenge };
    }
    /**
     * generates the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.1
     */
    generateCodeVerifier() {
        const charArr = [];
        const maxNumber = 256 - (256 % CharSet.CV_CHARSET.length);
        while (charArr.length <= RANDOM_OCTET_SIZE) {
            const byte = crypto.randomBytes(1)[0];
            if (byte >= maxNumber) {
                /*
                 * Ignore this number to maintain randomness.
                 * Including it would result in an unequal distribution of characters after doing the modulo
                 */
                continue;
            }
            const index = byte % CharSet.CV_CHARSET.length;
            charArr.push(CharSet.CV_CHARSET[index]);
        }
        const verifier = charArr.join(Constants.EMPTY_STRING);
        return EncodingUtils.base64EncodeUrl(verifier);
    }
    /**
     * generate the challenge from the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.2
     * @param codeVerifier
     */
    generateCodeChallengeFromVerifier(codeVerifier) {
        return EncodingUtils.base64EncodeUrl(this.hashUtils.sha256(codeVerifier).toString(EncodingTypes.BASE64), EncodingTypes.BASE64);
    }
}

export { PkceGenerator };
//# sourceMappingURL=PkceGenerator.mjs.map
