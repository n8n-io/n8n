/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import jwt from 'jsonwebtoken';
import { createClientAuthError, ClientAuthErrorCodes, TimeUtils, EncodingTypes, Constants } from '@azure/msal-common/node';
import { EncodingUtils } from '../utils/EncodingUtils.mjs';
import { JwtConstants } from '../utils/Constants.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Client assertion of type jwt-bearer used in confidential client flows
 * @public
 */
class ClientAssertion {
    /**
     * Initialize the ClientAssertion class from the clientAssertion passed by the user
     * @param assertion - refer https://tools.ietf.org/html/rfc7521
     */
    static fromAssertion(assertion) {
        const clientAssertion = new ClientAssertion();
        clientAssertion.jwt = assertion;
        return clientAssertion;
    }
    /**
     * @deprecated Use fromCertificateWithSha256Thumbprint instead, with a SHA-256 thumprint
     * Initialize the ClientAssertion class from the certificate passed by the user
     * @param thumbprint - identifier of a certificate
     * @param privateKey - secret key
     * @param publicCertificate - electronic document provided to prove the ownership of the public key
     */
    static fromCertificate(thumbprint, privateKey, publicCertificate) {
        const clientAssertion = new ClientAssertion();
        clientAssertion.privateKey = privateKey;
        clientAssertion.thumbprint = thumbprint;
        clientAssertion.useSha256 = false;
        if (publicCertificate) {
            clientAssertion.publicCertificate =
                this.parseCertificate(publicCertificate);
        }
        return clientAssertion;
    }
    /**
     * Initialize the ClientAssertion class from the certificate passed by the user
     * @param thumbprint - identifier of a certificate
     * @param privateKey - secret key
     * @param publicCertificate - electronic document provided to prove the ownership of the public key
     */
    static fromCertificateWithSha256Thumbprint(thumbprint, privateKey, publicCertificate) {
        const clientAssertion = new ClientAssertion();
        clientAssertion.privateKey = privateKey;
        clientAssertion.thumbprint = thumbprint;
        clientAssertion.useSha256 = true;
        if (publicCertificate) {
            clientAssertion.publicCertificate =
                this.parseCertificate(publicCertificate);
        }
        return clientAssertion;
    }
    /**
     * Update JWT for certificate based clientAssertion, if passed by the user, uses it as is
     * @param cryptoProvider - library's crypto helper
     * @param issuer - iss claim
     * @param jwtAudience - aud claim
     */
    getJwt(cryptoProvider, issuer, jwtAudience) {
        // if assertion was created from certificate, check if jwt is expired and create new one.
        if (this.privateKey && this.thumbprint) {
            if (this.jwt &&
                !this.isExpired() &&
                issuer === this.issuer &&
                jwtAudience === this.jwtAudience) {
                return this.jwt;
            }
            return this.createJwt(cryptoProvider, issuer, jwtAudience);
        }
        /*
         * if assertion was created by caller, then we just append it. It is up to the caller to
         * ensure that it contains necessary claims and that it is not expired.
         */
        if (this.jwt) {
            return this.jwt;
        }
        throw createClientAuthError(ClientAuthErrorCodes.invalidAssertion);
    }
    /**
     * JWT format and required claims specified: https://tools.ietf.org/html/rfc7523#section-3
     */
    createJwt(cryptoProvider, issuer, jwtAudience) {
        this.issuer = issuer;
        this.jwtAudience = jwtAudience;
        const issuedAt = TimeUtils.nowSeconds();
        this.expirationTime = issuedAt + 600;
        const algorithm = this.useSha256
            ? JwtConstants.PSS_256
            : JwtConstants.RSA_256;
        const header = {
            alg: algorithm,
        };
        const thumbprintHeader = this.useSha256
            ? JwtConstants.X5T_256
            : JwtConstants.X5T;
        Object.assign(header, {
            [thumbprintHeader]: EncodingUtils.base64EncodeUrl(this.thumbprint, EncodingTypes.HEX),
        });
        if (this.publicCertificate) {
            Object.assign(header, {
                [JwtConstants.X5C]: this.publicCertificate,
            });
        }
        const payload = {
            [JwtConstants.AUDIENCE]: this.jwtAudience,
            [JwtConstants.EXPIRATION_TIME]: this.expirationTime,
            [JwtConstants.ISSUER]: this.issuer,
            [JwtConstants.SUBJECT]: this.issuer,
            [JwtConstants.NOT_BEFORE]: issuedAt,
            [JwtConstants.JWT_ID]: cryptoProvider.createNewGuid(),
        };
        this.jwt = jwt.sign(payload, this.privateKey, { header });
        return this.jwt;
    }
    /**
     * Utility API to check expiration
     */
    isExpired() {
        return this.expirationTime < TimeUtils.nowSeconds();
    }
    /**
     * Extracts the raw certs from a given certificate string and returns them in an array.
     * @param publicCertificate - electronic document provided to prove the ownership of the public key
     */
    static parseCertificate(publicCertificate) {
        /**
         * This is regex to identify the certs in a given certificate string.
         * We want to look for the contents between the BEGIN and END certificate strings, without the associated newlines.
         * The information in parens "(.+?)" is the capture group to represent the cert we want isolated.
         * "." means any string character, "+" means match 1 or more times, and "?" means the shortest match.
         * The "g" at the end of the regex means search the string globally, and the "s" enables the "." to match newlines.
         */
        const regexToFindCerts = /-----BEGIN CERTIFICATE-----\r*\n(.+?)\r*\n-----END CERTIFICATE-----/gs;
        const certs = [];
        let matches;
        while ((matches = regexToFindCerts.exec(publicCertificate)) !== null) {
            // matches[1] represents the first parens capture group in the regex.
            certs.push(matches[1].replace(/\r*\n/g, Constants.EMPTY_STRING));
        }
        return certs;
    }
}

export { ClientAssertion };
//# sourceMappingURL=ClientAssertion.mjs.map
