/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
import { createClientAuthError } from '../error/ClientAuthError.mjs';
import { methodNotImplemented } from '../error/ClientAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const DEFAULT_CRYPTO_IMPLEMENTATION = {
    createNewGuid: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    base64Decode: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    base64Encode: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    base64UrlEncode: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    encodeKid: () => {
        throw createClientAuthError(methodNotImplemented);
    },
    async getPublicKeyThumbprint() {
        throw createClientAuthError(methodNotImplemented);
    },
    async removeTokenBindingKey() {
        throw createClientAuthError(methodNotImplemented);
    },
    async clearKeystore() {
        throw createClientAuthError(methodNotImplemented);
    },
    async signJwt() {
        throw createClientAuthError(methodNotImplemented);
    },
    async hashString() {
        throw createClientAuthError(methodNotImplemented);
    },
};

export { DEFAULT_CRYPTO_IMPLEMENTATION };
//# sourceMappingURL=ICrypto.mjs.map
