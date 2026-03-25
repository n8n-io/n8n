/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Constants, EncodingTypes, PkceCodes } from "@azure/msal-common/node";
import { CharSet, RANDOM_OCTET_SIZE } from "../utils/Constants.js";
import { EncodingUtils } from "../utils/EncodingUtils.js";
import { HashUtils } from "./HashUtils.js";
import crypto from "crypto";

/**
 * https://tools.ietf.org/html/rfc7636#page-8
 */
export class PkceGenerator {
    private hashUtils: HashUtils;

    constructor() {
        this.hashUtils = new HashUtils();
    }
    /**
     * generates the codeVerfier and the challenge from the codeVerfier
     * reference: https://tools.ietf.org/html/rfc7636#section-4.1 and https://tools.ietf.org/html/rfc7636#section-4.2
     */
    async generatePkceCodes(): Promise<PkceCodes> {
        const verifier = this.generateCodeVerifier();
        const challenge = this.generateCodeChallengeFromVerifier(verifier);
        return { verifier, challenge };
    }

    /**
     * generates the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.1
     */
    private generateCodeVerifier(): string {
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
        const verifier: string = charArr.join(Constants.EMPTY_STRING);
        return EncodingUtils.base64EncodeUrl(verifier);
    }

    /**
     * generate the challenge from the codeVerfier; reference: https://tools.ietf.org/html/rfc7636#section-4.2
     * @param codeVerifier
     */
    private generateCodeChallengeFromVerifier(codeVerifier: string): string {
        return EncodingUtils.base64EncodeUrl(
            this.hashUtils.sha256(codeVerifier).toString(EncodingTypes.BASE64),
            EncodingTypes.BASE64
        );
    }
}
