"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCredentialPipelinePolicy = addCredentialPipelinePolicy;
exports.createDefaultPipeline = createDefaultPipeline;
exports.getCachedDefaultHttpsClient = getCachedDefaultHttpsClient;
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const core_auth_1 = require("@azure/core-auth");
const apiVersionPolicy_js_1 = require("./apiVersionPolicy.js");
const keyCredentialAuthenticationPolicy_js_1 = require("./keyCredentialAuthenticationPolicy.js");
let cachedHttpClient;
/**
 * Adds a credential policy to the pipeline if a credential is provided. If none is provided, no policy is added.
 */
function addCredentialPipelinePolicy(pipeline, endpoint, options = {}) {
    const { credential, clientOptions } = options;
    if (!credential) {
        return;
    }
    if ((0, core_auth_1.isTokenCredential)(credential)) {
        const tokenPolicy = (0, core_rest_pipeline_1.bearerTokenAuthenticationPolicy)({
            credential,
            scopes: clientOptions?.credentials?.scopes ?? `${endpoint}/.default`,
        });
        pipeline.addPolicy(tokenPolicy);
    }
    else if (isKeyCredential(credential)) {
        if (!clientOptions?.credentials?.apiKeyHeaderName) {
            throw new Error(`Missing API Key Header Name`);
        }
        const keyPolicy = (0, keyCredentialAuthenticationPolicy_js_1.keyCredentialAuthenticationPolicy)(credential, clientOptions?.credentials?.apiKeyHeaderName);
        pipeline.addPolicy(keyPolicy);
    }
}
/**
 * Creates a default rest pipeline to re-use accross Rest Level Clients
 */
function createDefaultPipeline(endpoint, credential, options = {}) {
    const pipeline = (0, core_rest_pipeline_1.createPipelineFromOptions)(options);
    pipeline.addPolicy((0, apiVersionPolicy_js_1.apiVersionPolicy)(options));
    addCredentialPipelinePolicy(pipeline, endpoint, { credential, clientOptions: options });
    return pipeline;
}
function isKeyCredential(credential) {
    return credential.key !== undefined;
}
function getCachedDefaultHttpsClient() {
    if (!cachedHttpClient) {
        cachedHttpClient = (0, core_rest_pipeline_1.createDefaultHttpClient)();
    }
    return cachedHttpClient;
}
//# sourceMappingURL=clientHelpers.js.map