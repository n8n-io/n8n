// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { logPolicy } from "./policies/logPolicy.js";
import { createEmptyPipeline } from "./pipeline.js";
import { redirectPolicy } from "./policies/redirectPolicy.js";
import { userAgentPolicy } from "./policies/userAgentPolicy.js";
import { decompressResponsePolicy } from "./policies/decompressResponsePolicy.js";
import { defaultRetryPolicy } from "./policies/defaultRetryPolicy.js";
import { formDataPolicy } from "./policies/formDataPolicy.js";
import { isNodeLike } from "./util/checkEnvironment.js";
import { proxyPolicy } from "./policies/proxyPolicy.js";
import { agentPolicy } from "./policies/agentPolicy.js";
import { tlsPolicy } from "./policies/tlsPolicy.js";
import { multipartPolicy, multipartPolicyName } from "./policies/multipartPolicy.js";
/**
 * Create a new pipeline with a default set of customizable policies.
 * @param options - Options to configure a custom pipeline.
 */
export function createPipelineFromOptions(options) {
    const pipeline = createEmptyPipeline();
    if (isNodeLike) {
        if (options.agent) {
            pipeline.addPolicy(agentPolicy(options.agent));
        }
        if (options.tlsOptions) {
            pipeline.addPolicy(tlsPolicy(options.tlsOptions));
        }
        pipeline.addPolicy(proxyPolicy(options.proxyOptions));
        pipeline.addPolicy(decompressResponsePolicy());
    }
    pipeline.addPolicy(formDataPolicy(), { beforePolicies: [multipartPolicyName] });
    pipeline.addPolicy(userAgentPolicy(options.userAgentOptions));
    // The multipart policy is added after policies with no phase, so that
    // policies can be added between it and formDataPolicy to modify
    // properties (e.g., making the boundary constant in recorded tests).
    pipeline.addPolicy(multipartPolicy(), { afterPhase: "Deserialize" });
    pipeline.addPolicy(defaultRetryPolicy(options.retryOptions), { phase: "Retry" });
    if (isNodeLike) {
        // Both XHR and Fetch expect to handle redirects automatically,
        // so only include this policy when we're in Node.
        pipeline.addPolicy(redirectPolicy(options.redirectOptions), { afterPhase: "Retry" });
    }
    pipeline.addPolicy(logPolicy(options.loggingOptions), { afterPhase: "Sign" });
    return pipeline;
}
//# sourceMappingURL=createPipelineFromOptions.js.map