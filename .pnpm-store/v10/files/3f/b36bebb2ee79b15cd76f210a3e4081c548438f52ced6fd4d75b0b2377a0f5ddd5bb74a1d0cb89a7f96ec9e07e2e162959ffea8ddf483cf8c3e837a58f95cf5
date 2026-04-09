// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { deserializationPolicy } from "./deserializationPolicy.js";
import { bearerTokenAuthenticationPolicy, createPipelineFromOptions, } from "@azure/core-rest-pipeline";
import { serializationPolicy } from "./serializationPolicy.js";
/**
 * Creates a new Pipeline for use with a Service Client.
 * Adds in deserializationPolicy by default.
 * Also adds in bearerTokenAuthenticationPolicy if passed a TokenCredential.
 * @param options - Options to customize the created pipeline.
 */
export function createClientPipeline(options = {}) {
    const pipeline = createPipelineFromOptions(options ?? {});
    if (options.credentialOptions) {
        pipeline.addPolicy(bearerTokenAuthenticationPolicy({
            credential: options.credentialOptions.credential,
            scopes: options.credentialOptions.credentialScopes,
        }));
    }
    pipeline.addPolicy(serializationPolicy(options.serializationOptions), { phase: "Serialize" });
    pipeline.addPolicy(deserializationPolicy(options.deserializationOptions), {
        phase: "Deserialize",
    });
    return pipeline;
}
//# sourceMappingURL=pipeline.js.map