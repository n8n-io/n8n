"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBearerTokenProvider = getBearerTokenProvider;
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
/**
 * Returns a callback that provides a bearer token.
 * For example, the bearer token can be used to authenticate a request as follows:
 * ```ts snippet:token_provider_example
 * import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
 * import { createPipelineRequest } from "@azure/core-rest-pipeline";
 *
 * const credential = new DefaultAzureCredential();
 * const scope = "https://cognitiveservices.azure.com/.default";
 * const getAccessToken = getBearerTokenProvider(credential, scope);
 * const token = await getAccessToken();
 *
 * // usage
 * const request = createPipelineRequest({ url: "https://example.com" });
 * request.headers.set("Authorization", `Bearer ${token}`);
 * ```
 *
 * @param credential - The credential used to authenticate the request.
 * @param scopes - The scopes required for the bearer token.
 * @param options - Options to configure the token provider.
 * @returns a callback that provides a bearer token.
 */
function getBearerTokenProvider(credential, scopes, options) {
    const { abortSignal, tracingOptions } = options || {};
    const pipeline = (0, core_rest_pipeline_1.createEmptyPipeline)();
    pipeline.addPolicy((0, core_rest_pipeline_1.bearerTokenAuthenticationPolicy)({ credential, scopes }));
    async function getRefreshedToken() {
        // Create a pipeline with just the bearer token policy
        // and run a dummy request through it to get the token
        const res = await pipeline.sendRequest({
            sendRequest: (request) => Promise.resolve({
                request,
                status: 200,
                headers: request.headers,
            }),
        }, (0, core_rest_pipeline_1.createPipelineRequest)({
            url: "https://example.com",
            abortSignal,
            tracingOptions,
        }));
        const accessToken = res.headers.get("authorization")?.split(" ")[1];
        if (!accessToken) {
            throw new Error("Failed to get access token");
        }
        return accessToken;
    }
    return getRefreshedToken;
}
//# sourceMappingURL=tokenProvider.js.map