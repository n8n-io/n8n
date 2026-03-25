/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EncodingTypes, ICrypto, PkceCodes } from "@azure/msal-common/node";
import { GuidGenerator } from "./GuidGenerator.js";
import { EncodingUtils } from "../utils/EncodingUtils.js";
import { PkceGenerator } from "./PkceGenerator.js";
import { HashUtils } from "./HashUtils.js";

/**
 * This class implements MSAL node's crypto interface, which allows it to perform base64 encoding and decoding, generating cryptographically random GUIDs and
 * implementing Proof Key for Code Exchange specs for the OAuth Authorization Code Flow using PKCE (rfc here: https://tools.ietf.org/html/rfc7636).
 * @public
 */
export class CryptoProvider implements ICrypto {
    private pkceGenerator: PkceGenerator;
    private guidGenerator: GuidGenerator;
    private hashUtils: HashUtils;

    constructor() {
        // Browser crypto needs to be validated first before any other classes can be set.
        this.pkceGenerator = new PkceGenerator();
        this.guidGenerator = new GuidGenerator();
        this.hashUtils = new HashUtils();
    }

    /**
     * base64 URL safe encoded string
     */
    base64UrlEncode(): string {
        throw new Error("Method not implemented.");
    }
    /**
     * Stringifies and base64Url encodes input public key
     * @param inputKid - public key id
     * @returns Base64Url encoded public key
     */
    encodeKid(): string {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates a new random GUID - used to populate state and nonce.
     * @returns string (GUID)
     */
    createNewGuid(): string {
        return this.guidGenerator.generateGuid();
    }

    /**
     * Encodes input string to base64.
     * @param input - string to be encoded
     */
    base64Encode(input: string): string {
        return EncodingUtils.base64Encode(input);
    }

    /**
     * Decodes input string from base64.
     * @param input - string to be decoded
     */
    base64Decode(input: string): string {
        return EncodingUtils.base64Decode(input);
    }

    /**
     * Generates PKCE codes used in Authorization Code Flow.
     */
    generatePkceCodes(): Promise<PkceCodes> {
        return this.pkceGenerator.generatePkceCodes();
    }

    /**
     * Generates a keypair, stores it and returns a thumbprint - not yet implemented for node
     */
    getPublicKeyThumbprint(): Promise<string> {
        throw new Error("Method not implemented.");
    }

    /**
     * Removes cryptographic keypair from key store matching the keyId passed in
     * @param kid - public key id
     */
    removeTokenBindingKey(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    /**
     * Removes all cryptographic keys from Keystore
     */
    clearKeystore(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    /**
     * Signs the given object as a jwt payload with private key retrieved by given kid - currently not implemented for node
     */
    signJwt(): Promise<string> {
        throw new Error("Method not implemented.");
    }

    /**
     * Returns the SHA-256 hash of an input string
     */
    async hashString(plainText: string): Promise<string> {
        return EncodingUtils.base64EncodeUrl(
            this.hashUtils.sha256(plainText).toString(EncodingTypes.BASE64),
            EncodingTypes.BASE64
        );
    }
}
