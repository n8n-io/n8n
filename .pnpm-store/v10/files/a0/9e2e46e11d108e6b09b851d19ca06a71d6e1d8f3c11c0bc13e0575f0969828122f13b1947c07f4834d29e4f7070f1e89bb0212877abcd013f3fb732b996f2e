"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPipelineFromOptions = createPipelineFromOptions;
const logPolicy_js_1 = require("./policies/logPolicy.js");
const pipeline_js_1 = require("./pipeline.js");
const redirectPolicy_js_1 = require("./policies/redirectPolicy.js");
const userAgentPolicy_js_1 = require("./policies/userAgentPolicy.js");
const multipartPolicy_js_1 = require("./policies/multipartPolicy.js");
const decompressResponsePolicy_js_1 = require("./policies/decompressResponsePolicy.js");
const defaultRetryPolicy_js_1 = require("./policies/defaultRetryPolicy.js");
const formDataPolicy_js_1 = require("./policies/formDataPolicy.js");
const core_util_1 = require("@azure/core-util");
const proxyPolicy_js_1 = require("./policies/proxyPolicy.js");
const setClientRequestIdPolicy_js_1 = require("./policies/setClientRequestIdPolicy.js");
const agentPolicy_js_1 = require("./policies/agentPolicy.js");
const tlsPolicy_js_1 = require("./policies/tlsPolicy.js");
const tracingPolicy_js_1 = require("./policies/tracingPolicy.js");
const wrapAbortSignalLikePolicy_js_1 = require("./policies/wrapAbortSignalLikePolicy.js");
/**
 * Create a new pipeline with a default set of customizable policies.
 * @param options - Options to configure a custom pipeline.
 */
function createPipelineFromOptions(options) {
    var _a;
    const pipeline = (0, pipeline_js_1.createEmptyPipeline)();
    if (core_util_1.isNodeLike) {
        if (options.agent) {
            pipeline.addPolicy((0, agentPolicy_js_1.agentPolicy)(options.agent));
        }
        if (options.tlsOptions) {
            pipeline.addPolicy((0, tlsPolicy_js_1.tlsPolicy)(options.tlsOptions));
        }
        pipeline.addPolicy((0, proxyPolicy_js_1.proxyPolicy)(options.proxyOptions));
        pipeline.addPolicy((0, decompressResponsePolicy_js_1.decompressResponsePolicy)());
    }
    pipeline.addPolicy((0, wrapAbortSignalLikePolicy_js_1.wrapAbortSignalLikePolicy)());
    pipeline.addPolicy((0, formDataPolicy_js_1.formDataPolicy)(), { beforePolicies: [multipartPolicy_js_1.multipartPolicyName] });
    pipeline.addPolicy((0, userAgentPolicy_js_1.userAgentPolicy)(options.userAgentOptions));
    pipeline.addPolicy((0, setClientRequestIdPolicy_js_1.setClientRequestIdPolicy)((_a = options.telemetryOptions) === null || _a === void 0 ? void 0 : _a.clientRequestIdHeaderName));
    // The multipart policy is added after policies with no phase, so that
    // policies can be added between it and formDataPolicy to modify
    // properties (e.g., making the boundary constant in recorded tests).
    pipeline.addPolicy((0, multipartPolicy_js_1.multipartPolicy)(), { afterPhase: "Deserialize" });
    pipeline.addPolicy((0, defaultRetryPolicy_js_1.defaultRetryPolicy)(options.retryOptions), { phase: "Retry" });
    pipeline.addPolicy((0, tracingPolicy_js_1.tracingPolicy)(Object.assign(Object.assign({}, options.userAgentOptions), options.loggingOptions)), {
        afterPhase: "Retry",
    });
    if (core_util_1.isNodeLike) {
        // Both XHR and Fetch expect to handle redirects automatically,
        // so only include this policy when we're in Node.
        pipeline.addPolicy((0, redirectPolicy_js_1.redirectPolicy)(options.redirectOptions), { afterPhase: "Retry" });
    }
    pipeline.addPolicy((0, logPolicy_js_1.logPolicy)(options.loggingOptions), { afterPhase: "Sign" });
    return pipeline;
}
//# sourceMappingURL=createPipelineFromOptions.js.map