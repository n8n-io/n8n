// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { toPipelineResponse } from "./response.js";
import { toWebResourceLike } from "./util.js";
/**
 * Converts a RequestPolicy based HttpClient to a PipelineRequest based HttpClient.
 * @param requestPolicyClient - A HttpClient compatible with core-http
 * @returns A HttpClient compatible with core-rest-pipeline
 */
export function convertHttpClient(requestPolicyClient) {
    return {
        sendRequest: async (request) => {
            const response = await requestPolicyClient.sendRequest(toWebResourceLike(request, { createProxy: true }));
            return toPipelineResponse(response);
        },
    };
}
//# sourceMappingURL=httpClientAdapter.js.map