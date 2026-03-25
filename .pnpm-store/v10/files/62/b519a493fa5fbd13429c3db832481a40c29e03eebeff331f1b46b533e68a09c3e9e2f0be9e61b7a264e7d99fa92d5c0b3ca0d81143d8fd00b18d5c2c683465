"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtendedServiceClient = void 0;
const disableKeepAlivePolicy_js_1 = require("./policies/disableKeepAlivePolicy.js");
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const core_client_1 = require("@azure/core-client");
const response_js_1 = require("./response.js");
/**
 * Client to provide compatability between core V1 & V2.
 */
class ExtendedServiceClient extends core_client_1.ServiceClient {
    constructor(options) {
        var _a, _b;
        super(options);
        if (((_a = options.keepAliveOptions) === null || _a === void 0 ? void 0 : _a.enable) === false &&
            !(0, disableKeepAlivePolicy_js_1.pipelineContainsDisableKeepAlivePolicy)(this.pipeline)) {
            this.pipeline.addPolicy((0, disableKeepAlivePolicy_js_1.createDisableKeepAlivePolicy)());
        }
        if (((_b = options.redirectOptions) === null || _b === void 0 ? void 0 : _b.handleRedirects) === false) {
            this.pipeline.removePolicy({
                name: core_rest_pipeline_1.redirectPolicyName,
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
                value: (0, response_js_1.toCompatResponse)(lastResponse),
            });
        }
        return result;
    }
}
exports.ExtendedServiceClient = ExtendedServiceClient;
//# sourceMappingURL=extendedClient.js.map