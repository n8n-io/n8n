/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { PerformanceEvents, createClientAuthError, ClientAuthErrorCodes, JoseHeader } from '@azure/msal-common/browser';
import { base64Encode, urlEncode, urlEncodeArr } from '../encode/Base64Encode.mjs';
import { base64Decode } from '../encode/Base64Decode.mjs';
import { validateCryptoAvailable, createNewGuid, generateKeyPair, exportJwk, importJwk, sign, hashString } from './BrowserCrypto.mjs';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { AsyncMemoryStorage } from '../cache/AsyncMemoryStorage.mjs';
import { cryptoKeyNotFound } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements MSAL's crypto interface, which allows it to perform base64 encoding and decoding, generating cryptographically random GUIDs and
 * implementing Proof Key for Code Exchange specs for the OAuth Authorization Code Flow using PKCE (rfc here: https://tools.ietf.org/html/rfc7636).
 */
class CryptoOps {
    constructor(logger, performanceClient, skipValidateSubtleCrypto) {
        this.logger = logger;
        // Browser crypto needs to be validated first before any other classes can be set.
        validateCryptoAvailable(skipValidateSubtleCrypto ?? false);
        this.cache = new AsyncMemoryStorage(this.logger);
        this.performanceClient = performanceClient;
    }
    /**
     * Creates a new random GUID - used to populate state and nonce.
     * @returns string (GUID)
     */
    createNewGuid() {
        return createNewGuid();
    }
    /**
     * Encodes input string to base64.
     * @param input
     */
    base64Encode(input) {
        return base64Encode(input);
    }
    /**
     * Decodes input string from base64.
     * @param input
     */
    base64Decode(input) {
        return base64Decode(input);
    }
    /**
     * Encodes input string to base64 URL safe string.
     * @param input
     */
    base64UrlEncode(input) {
        return urlEncode(input);
    }
    /**
     * Stringifies and base64Url encodes input public key
     * @param inputKid
     * @returns Base64Url encoded public key
     */
    encodeKid(inputKid) {
        return this.base64UrlEncode(JSON.stringify({ kid: inputKid }));
    }
    /**
     * Generates a keypair, stores it and returns a thumbprint
     * @param request
     */
    async getPublicKeyThumbprint(request) {
        const publicKeyThumbMeasurement = this.performanceClient?.startMeasurement(PerformanceEvents.CryptoOptsGetPublicKeyThumbprint, request.correlationId);
        // Generate Keypair
        const keyPair = await generateKeyPair(CryptoOps.EXTRACTABLE, CryptoOps.POP_KEY_USAGES);
        // Generate Thumbprint for Public Key
        const publicKeyJwk = await exportJwk(keyPair.publicKey);
        const pubKeyThumprintObj = {
            e: publicKeyJwk.e,
            kty: publicKeyJwk.kty,
            n: publicKeyJwk.n,
        };
        const publicJwkString = getSortedObjectString(pubKeyThumprintObj);
        const publicJwkHash = await this.hashString(publicJwkString);
        // Generate Thumbprint for Private Key
        const privateKeyJwk = await exportJwk(keyPair.privateKey);
        // Re-import private key to make it unextractable
        const unextractablePrivateKey = await importJwk(privateKeyJwk, false, ["sign"]);
        // Store Keypair data in keystore
        await this.cache.setItem(publicJwkHash, {
            privateKey: unextractablePrivateKey,
            publicKey: keyPair.publicKey,
            requestMethod: request.resourceRequestMethod,
            requestUri: request.resourceRequestUri,
        });
        if (publicKeyThumbMeasurement) {
            publicKeyThumbMeasurement.end({
                success: true,
            });
        }
        return publicJwkHash;
    }
    /**
     * Removes cryptographic keypair from key store matching the keyId passed in
     * @param kid
     */
    async removeTokenBindingKey(kid) {
        await this.cache.removeItem(kid);
        const keyFound = await this.cache.containsKey(kid);
        if (keyFound) {
            throw createClientAuthError(ClientAuthErrorCodes.bindingKeyNotRemoved);
        }
    }
    /**
     * Removes all cryptographic keys from IndexedDB storage
     */
    async clearKeystore() {
        // Delete in-memory keystores
        this.cache.clearInMemory();
        /**
         * There is only one database, so calling clearPersistent on asymmetric keystore takes care of
         * every persistent keystore
         */
        try {
            await this.cache.clearPersistent();
            return true;
        }
        catch (e) {
            if (e instanceof Error) {
                this.logger.error(`Clearing keystore failed with error: ${e.message}`);
            }
            else {
                this.logger.error("Clearing keystore failed with unknown error");
            }
            return false;
        }
    }
    /**
     * Signs the given object as a jwt payload with private key retrieved by given kid.
     * @param payload
     * @param kid
     */
    async signJwt(payload, kid, shrOptions, correlationId) {
        const signJwtMeasurement = this.performanceClient?.startMeasurement(PerformanceEvents.CryptoOptsSignJwt, correlationId);
        const cachedKeyPair = await this.cache.getItem(kid);
        if (!cachedKeyPair) {
            throw createBrowserAuthError(cryptoKeyNotFound);
        }
        // Get public key as JWK
        const publicKeyJwk = await exportJwk(cachedKeyPair.publicKey);
        const publicKeyJwkString = getSortedObjectString(publicKeyJwk);
        // Base64URL encode public key thumbprint with keyId only: BASE64URL({ kid: "FULL_PUBLIC_KEY_HASH" })
        const encodedKeyIdThumbprint = urlEncode(JSON.stringify({ kid: kid }));
        // Generate header
        const shrHeader = JoseHeader.getShrHeaderString({
            ...shrOptions?.header,
            alg: publicKeyJwk.alg,
            kid: encodedKeyIdThumbprint,
        });
        const encodedShrHeader = urlEncode(shrHeader);
        // Generate payload
        payload.cnf = {
            jwk: JSON.parse(publicKeyJwkString),
        };
        const encodedPayload = urlEncode(JSON.stringify(payload));
        // Form token string
        const tokenString = `${encodedShrHeader}.${encodedPayload}`;
        // Sign token
        const encoder = new TextEncoder();
        const tokenBuffer = encoder.encode(tokenString);
        const signatureBuffer = await sign(cachedKeyPair.privateKey, tokenBuffer);
        const encodedSignature = urlEncodeArr(new Uint8Array(signatureBuffer));
        const signedJwt = `${tokenString}.${encodedSignature}`;
        if (signJwtMeasurement) {
            signJwtMeasurement.end({
                success: true,
            });
        }
        return signedJwt;
    }
    /**
     * Returns the SHA-256 hash of an input string
     * @param plainText
     */
    async hashString(plainText) {
        return hashString(plainText);
    }
}
CryptoOps.POP_KEY_USAGES = ["sign", "verify"];
CryptoOps.EXTRACTABLE = true;
function getSortedObjectString(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

export { CryptoOps };
//# sourceMappingURL=CryptoOps.mjs.map
