// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createDefaultHttpClient } from "../defaultHttpClient.js";
import { createPipelineFromOptions } from "../createPipelineFromOptions.js";
import { apiVersionPolicy } from "./apiVersionPolicy.js";
import { isApiKeyCredential, isBasicCredential, isBearerTokenCredential, isOAuth2TokenCredential, } from "../auth/credentials.js";
import { apiKeyAuthenticationPolicy } from "../policies/auth/apiKeyAuthenticationPolicy.js";
import { basicAuthenticationPolicy } from "../policies/auth/basicAuthenticationPolicy.js";
import { bearerAuthenticationPolicy } from "../policies/auth/bearerAuthenticationPolicy.js";
import { oauth2AuthenticationPolicy } from "../policies/auth/oauth2AuthenticationPolicy.js";
let cachedHttpClient;
/**
 * Creates a default rest pipeline to re-use accross Rest Level Clients
 */
export function createDefaultPipeline(options = {}) {
    const pipeline = createPipelineFromOptions(options);
    pipeline.addPolicy(apiVersionPolicy(options));
    const { credential, authSchemes, allowInsecureConnection } = options;
    if (credential) {
        if (isApiKeyCredential(credential)) {
            pipeline.addPolicy(apiKeyAuthenticationPolicy({ authSchemes, credential, allowInsecureConnection }));
        }
        else if (isBasicCredential(credential)) {
            pipeline.addPolicy(basicAuthenticationPolicy({ authSchemes, credential, allowInsecureConnection }));
        }
        else if (isBearerTokenCredential(credential)) {
            pipeline.addPolicy(bearerAuthenticationPolicy({ authSchemes, credential, allowInsecureConnection }));
        }
        else if (isOAuth2TokenCredential(credential)) {
            pipeline.addPolicy(oauth2AuthenticationPolicy({ authSchemes, credential, allowInsecureConnection }));
        }
    }
    return pipeline;
}
export function getCachedDefaultHttpsClient() {
    if (!cachedHttpClient) {
        cachedHttpClient = createDefaultHttpClient();
    }
    return cachedHttpClient;
}
//# sourceMappingURL=clientHelpers.js.map