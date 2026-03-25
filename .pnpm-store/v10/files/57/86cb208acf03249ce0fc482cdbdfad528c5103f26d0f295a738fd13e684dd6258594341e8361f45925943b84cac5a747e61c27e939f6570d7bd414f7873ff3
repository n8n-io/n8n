/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { EncodingTypes } from '@azure/msal-common/node';
import { GuidGenerator } from './GuidGenerator.mjs';
import { EncodingUtils } from '../utils/EncodingUtils.mjs';
import { PkceGenerator } from './PkceGenerator.mjs';
import { HashUtils } from './HashUtils.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements MSAL node's crypto interface, which allows it to perform base64 encoding and decoding, generating cryptographically random GUIDs and
 * implementing Proof Key for Code Exchange specs for the OAuth Authorization Code Flow using PKCE (rfc here: https://tools.ietf.org/html/rfc7636).
 * @public
 */
class CryptoProvider {
    constructor() {
        // Browser crypto needs to be validated first before any other classes can be set.
        this.pkceGenerator = new PkceGenerator();
        this.guidGenerator = new GuidGenerator();
        this.hashUtils = new HashUtils();
    }
    /**
     * base64 URL safe encoded string
     */
    base64UrlEncode() {
        throw new Error("Method not implemented.");
    }
    /**
     * Stringifies and base64Url encodes input public key
     * @param inputKid - public key id
     * @returns Base64Url encoded public key
     */
    encodeKid() {
        throw new Error("Method not implemented.");
    }
    /**
     * Creates a new random GUID - used to populate state and nonce.
     * @returns string (GUID)
     */
    createNewGuid() {
        return this.guidGenerator.generateGuid();
    }
    /**
     * Encodes input string to base64.
     * @param input - string to be encoded
     */
    base64Encode(input) {
        return EncodingUtils.base64Encode(input);
    }
    /**
     * Decodes input string from base64.
     * @param input - string to be decoded
     */
    base64Decode(input) {
        return EncodingUtils.base64Decode(input);
    }
    /**
     * Generates PKCE codes used in Authorization Code Flow.
     */
    generatePkceCodes() {
        return this.pkceGenerator.generatePkceCodes();
    }
    /**
     * Generates a keypair, stores it and returns a thumbprint - not yet implemented for node
     */
    getPublicKeyThumbprint() {
        throw new Error("Method not implemented.");
    }
    /**
     * Removes cryptographic keypair from key store matching the keyId passed in
     * @param kid - public key id
     */
    removeTokenBindingKey() {
        throw new Error("Method not implemented.");
    }
    /**
     * Removes all cryptographic keys from Keystore
     */
    clearKeystore() {
        throw new Error("Method not implemented.");
    }
    /**
     * Signs the given object as a jwt payload with private key retrieved by given kid - currently not implemented for node
     */
    signJwt() {
        throw new Error("Method not implemented.");
    }
    /**
     * Returns the SHA-256 hash of an input string
     */
    async hashString(plainText) {
        return EncodingUtils.base64EncodeUrl(this.hashUtils.sha256(plainText).toString(EncodingTypes.BASE64), EncodingTypes.BASE64);
    }
}

export { CryptoProvider };
//# sourceMappingURL=CryptoProvider.mjs.map
