"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientPipeline = createClientPipeline;
const deserializationPolicy_js_1 = require("./deserializationPolicy.js");
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const serializationPolicy_js_1 = require("./serializationPolicy.js");
/**
 * Creates a new Pipeline for use with a Service Client.
 * Adds in deserializationPolicy by default.
 * Also adds in bearerTokenAuthenticationPolicy if passed a TokenCredential.
 * @param options - Options to customize the created pipeline.
 */
function createClientPipeline(options = {}) {
    const pipeline = (0, core_rest_pipeline_1.createPipelineFromOptions)(options ?? {});
    if (options.credentialOptions) {
        pipeline.addPolicy((0, core_rest_pipeline_1.bearerTokenAuthenticationPolicy)({
            credential: options.credentialOptions.credential,
            scopes: options.credentialOptions.credentialScopes,
        }));
    }
    pipeline.addPolicy((0, serializationPolicy_js_1.serializationPolicy)(options.serializationOptions), { phase: "Serialize" });
    pipeline.addPolicy((0, deserializationPolicy_js_1.deserializationPolicy)(options.deserializationOptions), {
        phase: "Deserialize",
    });
    return pipeline;
}
//# sourceMappingURL=pipeline.js.map