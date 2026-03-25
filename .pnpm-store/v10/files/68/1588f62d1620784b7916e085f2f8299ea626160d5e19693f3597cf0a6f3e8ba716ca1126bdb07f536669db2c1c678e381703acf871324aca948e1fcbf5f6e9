// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { logPolicy } from "./policies/logPolicy";
import { createEmptyPipeline } from "./pipeline";
import { redirectPolicy } from "./policies/redirectPolicy";
import { userAgentPolicy } from "./policies/userAgentPolicy";
import { decompressResponsePolicy } from "./policies/decompressResponsePolicy";
import { defaultRetryPolicy } from "./policies/defaultRetryPolicy";
import { formDataPolicy } from "./policies/formDataPolicy";
import { isNode } from "@azure/core-util";
import { proxyPolicy } from "./policies/proxyPolicy";
import { setClientRequestIdPolicy } from "./policies/setClientRequestIdPolicy";
import { tlsPolicy } from "./policies/tlsPolicy";
import { tracingPolicy } from "./policies/tracingPolicy";
/**
 * Create a new pipeline with a default set of customizable policies.
 * @param options - Options to configure a custom pipeline.
 */
export function createPipelineFromOptions(options) {
    const pipeline = createEmptyPipeline();
    if (isNode) {
        if (options.tlsOptions) {
            pipeline.addPolicy(tlsPolicy(options.tlsOptions));
        }
        pipeline.addPolicy(proxyPolicy(options.proxyOptions));
        pipeline.addPolicy(decompressResponsePolicy());
    }
    pipeline.addPolicy(formDataPolicy());
    pipeline.addPolicy(userAgentPolicy(options.userAgentOptions));
    pipeline.addPolicy(setClientRequestIdPolicy());
    pipeline.addPolicy(defaultRetryPolicy(options.retryOptions), { phase: "Retry" });
    pipeline.addPolicy(tracingPolicy(options.userAgentOptions), { afterPhase: "Retry" });
    if (isNode) {
        // Both XHR and Fetch expect to handle redirects automatically,
        // so only include this policy when we're in Node.
        pipeline.addPolicy(redirectPolicy(options.redirectOptions), { afterPhase: "Retry" });
    }
    pipeline.addPolicy(logPolicy(options.loggingOptions), { afterPhase: "Sign" });
    return pipeline;
}
//# sourceMappingURL=createPipelineFromOptions.js.map