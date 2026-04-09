// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { bearerTokenAuthenticationPolicy, createDefaultHttpClient, createPipelineFromOptions, } from "@azure/core-rest-pipeline";
import { isTokenCredential } from "@azure/core-auth";
import { apiVersionPolicy } from "./apiVersionPolicy.js";
import { keyCredentialAuthenticationPolicy } from "./keyCredentialAuthenticationPolicy.js";
let cachedHttpClient;
/**
 * Adds a credential policy to the pipeline if a credential is provided. If none is provided, no policy is added.
 */
export function addCredentialPipelinePolicy(pipeline, endpoint, options = {}) {
    const { credential, clientOptions } = options;
    if (!credential) {
        return;
    }
    if (isTokenCredential(credential)) {
        const tokenPolicy = bearerTokenAuthenticationPolicy({
            credential,
            scopes: clientOptions?.credentials?.scopes ?? `${endpoint}/.default`,
        });
        pipeline.addPolicy(tokenPolicy);
    }
    else if (isKeyCredential(credential)) {
        if (!clientOptions?.credentials?.apiKeyHeaderName) {
            throw new Error(`Missing API Key Header Name`);
        }
        const keyPolicy = keyCredentialAuthenticationPolicy(credential, clientOptions?.credentials?.apiKeyHeaderName);
        pipeline.addPolicy(keyPolicy);
    }
}
/**
 * Creates a default rest pipeline to re-use accross Rest Level Clients
 */
export function createDefaultPipeline(endpoint, credential, options = {}) {
    const pipeline = createPipelineFromOptions(options);
    pipeline.addPolicy(apiVersionPolicy(options));
    addCredentialPipelinePolicy(pipeline, endpoint, { credential, clientOptions: options });
    return pipeline;
}
function isKeyCredential(credential) {
    return credential.key !== undefined;
}
export function getCachedDefaultHttpsClient() {
    if (!cachedHttpClient) {
        cachedHttpClient = createDefaultHttpClient();
    }
    return cachedHttpClient;
}
//# sourceMappingURL=clientHelpers.js.map