"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOAuth2TokenCredential = isOAuth2TokenCredential;
exports.isBearerTokenCredential = isBearerTokenCredential;
exports.isBasicCredential = isBasicCredential;
exports.isApiKeyCredential = isApiKeyCredential;
/**
 * Type guard to check if a credential is an OAuth2 token credential.
 */
function isOAuth2TokenCredential(credential) {
    return "getOAuth2Token" in credential;
}
/**
 * Type guard to check if a credential is a Bearer token credential.
 */
function isBearerTokenCredential(credential) {
    return "getBearerToken" in credential;
}
/**
 * Type guard to check if a credential is a Basic auth credential.
 */
function isBasicCredential(credential) {
    return "username" in credential && "password" in credential;
}
/**
 * Type guard to check if a credential is an API key credential.
 */
function isApiKeyCredential(credential) {
    return "key" in credential;
}
//# sourceMappingURL=credentials.js.map