"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultPipeline = createDefaultPipeline;
exports.getCachedDefaultHttpsClient = getCachedDefaultHttpsClient;
const defaultHttpClient_js_1 = require("../defaultHttpClient.js");
const createPipelineFromOptions_js_1 = require("../createPipelineFromOptions.js");
const apiVersionPolicy_js_1 = require("./apiVersionPolicy.js");
const credentials_js_1 = require("../auth/credentials.js");
const apiKeyAuthenticationPolicy_js_1 = require("../policies/auth/apiKeyAuthenticationPolicy.js");
const basicAuthenticationPolicy_js_1 = require("../policies/auth/basicAuthenticationPolicy.js");
const bearerAuthenticationPolicy_js_1 = require("../policies/auth/bearerAuthenticationPolicy.js");
const oauth2AuthenticationPolicy_js_1 = require("../policies/auth/oauth2AuthenticationPolicy.js");
let cachedHttpClient;
/**
 * Creates a default rest pipeline to re-use accross Rest Level Clients
 */
function createDefaultPipeline(options = {}) {
    const pipeline = (0, createPipelineFromOptions_js_1.createPipelineFromOptions)(options);
    pipeline.addPolicy((0, apiVersionPolicy_js_1.apiVersionPolicy)(options));
    const { credential, authSchemes, allowInsecureConnection } = options;
    if (credential) {
        if ((0, credentials_js_1.isApiKeyCredential)(credential)) {
            pipeline.addPolicy((0, apiKeyAuthenticationPolicy_js_1.apiKeyAuthenticationPolicy)({ authSchemes, credential, allowInsecureConnection }));
        }
        else if ((0, credentials_js_1.isBasicCredential)(credential)) {
            pipeline.addPolicy((0, basicAuthenticationPolicy_js_1.basicAuthenticationPolicy)({ authSchemes, credential, allowInsecureConnection }));
        }
        else if ((0, credentials_js_1.isBearerTokenCredential)(credential)) {
            pipeline.addPolicy((0, bearerAuthenticationPolicy_js_1.bearerAuthenticationPolicy)({ authSchemes, credential, allowInsecureConnection }));
        }
        else if ((0, credentials_js_1.isOAuth2TokenCredential)(credential)) {
            pipeline.addPolicy((0, oauth2AuthenticationPolicy_js_1.oauth2AuthenticationPolicy)({ authSchemes, credential, allowInsecureConnection }));
        }
    }
    return pipeline;
}
function getCachedDefaultHttpsClient() {
    if (!cachedHttpClient) {
        cachedHttpClient = (0, defaultHttpClient_js_1.createDefaultHttpClient)();
    }
    return cachedHttpClient;
}
//# sourceMappingURL=clientHelpers.js.map