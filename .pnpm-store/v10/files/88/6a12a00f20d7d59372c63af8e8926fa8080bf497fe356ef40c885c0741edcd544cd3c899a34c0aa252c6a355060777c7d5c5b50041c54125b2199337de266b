// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const API_KEY_HEADER_NAME = "api-key";
const searchApiKeyCredentialPolicy = "SearchApiKeyCredentialPolicy";
/**
 * Create an HTTP pipeline policy to authenticate a request
 * using an `AzureKeyCredential` for Azure Cognitive Search
 */
export function createSearchApiKeyCredentialPolicy(credential) {
    return {
        name: searchApiKeyCredentialPolicy,
        async sendRequest(request, next) {
            if (!request.headers.has(API_KEY_HEADER_NAME)) {
                request.headers.set(API_KEY_HEADER_NAME, credential.key);
            }
            return next(request);
        },
    };
}
//# sourceMappingURL=searchApiKeyCredentialPolicy.js.map