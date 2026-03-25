// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Type guard to check if a credential is an OAuth2 token credential.
 */
export function isOAuth2TokenCredential(credential) {
    return "getOAuth2Token" in credential;
}
/**
 * Type guard to check if a credential is a Bearer token credential.
 */
export function isBearerTokenCredential(credential) {
    return "getBearerToken" in credential;
}
/**
 * Type guard to check if a credential is a Basic auth credential.
 */
export function isBasicCredential(credential) {
    return "username" in credential && "password" in credential;
}
/**
 * Type guard to check if a credential is an API key credential.
 */
export function isApiKeyCredential(credential) {
    return "key" in credential;
}
//# sourceMappingURL=credentials.js.map