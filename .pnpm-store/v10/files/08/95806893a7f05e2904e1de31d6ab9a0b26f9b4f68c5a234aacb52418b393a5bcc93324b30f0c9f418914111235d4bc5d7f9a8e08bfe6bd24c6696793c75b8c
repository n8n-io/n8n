"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertHttpClient = convertHttpClient;
const response_js_1 = require("./response.js");
const util_js_1 = require("./util.js");
/**
 * Converts a RequestPolicy based HttpClient to a PipelineRequest based HttpClient.
 * @param requestPolicyClient - A HttpClient compatible with core-http
 * @returns A HttpClient compatible with core-rest-pipeline
 */
function convertHttpClient(requestPolicyClient) {
    return {
        sendRequest: async (request) => {
            const response = await requestPolicyClient.sendRequest((0, util_js_1.toWebResourceLike)(request, { createProxy: true }));
            return (0, response_js_1.toPipelineResponse)(response);
        },
    };
}
//# sourceMappingURL=httpClientAdapter.js.map