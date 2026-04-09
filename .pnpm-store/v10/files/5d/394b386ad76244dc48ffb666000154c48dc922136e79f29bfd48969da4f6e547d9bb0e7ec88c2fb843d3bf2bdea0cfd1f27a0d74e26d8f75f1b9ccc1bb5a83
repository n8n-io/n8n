"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSearchApiKeyCredentialPolicy = createSearchApiKeyCredentialPolicy;
const API_KEY_HEADER_NAME = "api-key";
const searchApiKeyCredentialPolicy = "SearchApiKeyCredentialPolicy";
/**
 * Create an HTTP pipeline policy to authenticate a request
 * using an `AzureKeyCredential` for Azure Cognitive Search
 */
function createSearchApiKeyCredentialPolicy(credential) {
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