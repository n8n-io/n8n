"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPipelineRequest = createPipelineRequest;
const ts_http_runtime_1 = require("@typespec/ts-http-runtime");
/**
 * Creates a new pipeline request with the given options.
 * This method is to allow for the easy setting of default values and not required.
 * @param options - The options to create the request with.
 */
function createPipelineRequest(options) {
    // Cast required due to difference between ts-http-runtime requiring AbortSignal while core-rest-pipeline allows
    // the more generic AbortSignalLike. The wrapAbortSignalLike pipeline policy will take care of ensuring that any AbortSignalLike in the request
    // is converted into a true AbortSignal.
    return (0, ts_http_runtime_1.createPipelineRequest)(options);
}
//# sourceMappingURL=pipelineRequest.js.map