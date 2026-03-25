// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { createDisableKeepAlivePolicy, pipelineContainsDisableKeepAlivePolicy, } from "./policies/disableKeepAlivePolicy.js";
import { redirectPolicyName } from "@azure/core-rest-pipeline";
import { ServiceClient, } from "@azure/core-client";
import { toCompatResponse } from "./response.js";
/**
 * Client to provide compatability between core V1 & V2.
 */
export class ExtendedServiceClient extends ServiceClient {
    constructor(options) {
        var _a, _b;
        super(options);
        if (((_a = options.keepAliveOptions) === null || _a === void 0 ? void 0 : _a.enable) === false &&
            !pipelineContainsDisableKeepAlivePolicy(this.pipeline)) {
            this.pipeline.addPolicy(createDisableKeepAlivePolicy());
        }
        if (((_b = options.redirectOptions) === null || _b === void 0 ? void 0 : _b.handleRedirects) === false) {
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
        var _a;
        const userProvidedCallBack = (_a = operationArguments === null || operationArguments === void 0 ? void 0 : operationArguments.options) === null || _a === void 0 ? void 0 : _a.onResponse;
        let lastResponse;
        function onResponse(rawResponse, flatResponse, error) {
            lastResponse = rawResponse;
            if (userProvidedCallBack) {
                userProvidedCallBack(rawResponse, flatResponse, error);
            }
        }
        operationArguments.options = Object.assign(Object.assign({}, operationArguments.options), { onResponse });
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