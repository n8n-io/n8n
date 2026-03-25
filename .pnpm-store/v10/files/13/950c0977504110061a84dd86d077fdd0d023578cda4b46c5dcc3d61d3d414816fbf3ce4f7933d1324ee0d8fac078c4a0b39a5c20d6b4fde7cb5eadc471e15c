/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ClientAuthErrorCodes,
    createClientAuthError,
} from "../error/ClientAuthError.js";
import type { BaseAuthRequest } from "../request/BaseAuthRequest.js";
import type { ShrOptions, SignedHttpRequest } from "./SignedHttpRequest.js";

/**
 * The PkceCodes type describes the structure
 * of objects that contain PKCE code
 * challenge and verifier pairs
 */
export type PkceCodes = {
    verifier: string;
    challenge: string;
};

export type SignedHttpRequestParameters = Pick<
    BaseAuthRequest,
    | "resourceRequestMethod"
    | "resourceRequestUri"
    | "shrClaims"
    | "shrNonce"
    | "shrOptions"
> & {
    correlationId?: string;
};

/**
 * Interface for crypto functions used by library
 */
export interface ICrypto {
    /**
     * Creates a guid randomly.
     */
    createNewGuid(): string;
    /**
     * base64 Encode string
     * @param input
     */
    base64Encode(input: string): string;
    /**
     * base64 decode string
     * @param input
     */
    base64Decode(input: string): string;
    /**
     * base64 URL safe encoded string
     */
    base64UrlEncode(input: string): string;
    /**
     * Stringifies and base64Url encodes input public key
     * @param inputKid
     * @returns Base64Url encoded public key
     */
    encodeKid(inputKid: string): string;
    /**
     * Generates an JWK RSA S256 Thumbprint
     * @param request
     */
    getPublicKeyThumbprint(
        request: SignedHttpRequestParameters
    ): Promise<string>;
    /**
     * Removes cryptographic keypair from key store matching the keyId passed in
     * @param kid
     */
    removeTokenBindingKey(kid: string): Promise<void>;
    /**
     * Removes all cryptographic keys from IndexedDB storage
     */
    clearKeystore(): Promise<boolean>;
    /**
     * Returns a signed proof-of-possession token with a given acces token that contains a cnf claim with the required kid.
     * @param accessToken
     */
    signJwt(
        payload: SignedHttpRequest,
        kid: string,
        shrOptions?: ShrOptions,
        correlationId?: string
    ): Promise<string>;
    /**
     * Returns the SHA-256 hash of an input string
     * @param plainText
     */
    hashString(plainText: string): Promise<string>;
}

export const DEFAULT_CRYPTO_IMPLEMENTATION: ICrypto = {
    createNewGuid: (): string => {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    base64Decode: (): string => {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    base64Encode: (): string => {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    base64UrlEncode: (): string => {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    encodeKid: (): string => {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    async getPublicKeyThumbprint(): Promise<string> {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    async removeTokenBindingKey(): Promise<void> {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    async clearKeystore(): Promise<boolean> {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    async signJwt(): Promise<string> {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
    async hashString(): Promise<string> {
        throw createClientAuthError(ClientAuthErrorCodes.methodNotImplemented);
    },
};
