// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createPipelineRequest as tspCreatePipelineRequest, } from "@typespec/ts-http-runtime";
/**
 * Creates a new pipeline request with the given options.
 * This method is to allow for the easy setting of default values and not required.
 * @param options - The options to create the request with.
 */
export function createPipelineRequest(options) {
    // Cast required due to difference between ts-http-runtime requiring AbortSignal while core-rest-pipeline allows
    // the more generic AbortSignalLike. The wrapAbortSignalLike pipeline policy will take care of ensuring that any AbortSignalLike in the request
    // is converted into a true AbortSignal.
    return tspCreatePipelineRequest(options);
}
//# sourceMappingURL=pipelineRequest.js.map