// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createDisableKeepAlivePolicy, pipelineContainsDisableKeepAlivePolicy, } from "./policies/disableKeepAlivePolicy.js";
import { redirectPolicyName } from "@azure/core-rest-pipeline";
import { ServiceClient } from "@azure/core-client";
import { toCompatResponse } from "./response.js";
/**
 * Client to provide compatability between core V1 & V2.
 */
export class ExtendedServiceClient extends ServiceClient {
    constructor(options) {
        super(options);
        if (options.keepAliveOptions?.enable === false &&
            !pipelineContainsDisableKeepAlivePolicy(this.pipeline)) {
            this.pipeline.addPolicy(createDisableKeepAlivePolicy());
        }
        if (options.redirectOptions?.handleRedirects === false) {
            this.pipeline.removePolicy({
                name: redirectPolicyName,
            });
        }
    }
    /**
     * Compatible send operation request function.
     *
     * @param operationArguments - Operation arguments
     * @param operationSpec - Operation Spec
     * @returns
     */
    async sendOperationRequest(operationArguments, operationSpec) {
        const userProvidedCallBack = operationArguments?.options?.onResponse;
        let lastResponse;
        function onResponse(rawResponse, flatResponse, error) {
            lastResponse = rawResponse;
            if (userProvidedCallBack) {
                userProvidedCallBack(rawResponse, flatResponse, error);
            }
        }
        operationArguments.options = {
            ...operationArguments.options,
            onResponse,
        };
        const result = await super.sendOperationRequest(operationArguments, operationSpec);
        if (lastResponse) {
            Object.defineProperty(result, "_response", {
                value: toCompatResponse(lastResponse),
            });
        }
        return result;
    }
}
//# sourceMappingURL=extendedClient.js.map