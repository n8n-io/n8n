"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPathStringFromParameter = exports.getStreamingResponseStatusCodes = void 0;
const serializer_js_1 = require("./serializer.js");
/**
 * Gets the list of status codes for streaming responses.
 * @internal
 */
function getStreamingResponseStatusCodes(operationSpec) {
    const result = new Set();
    for (const statusCode in operationSpec.responses) {
        const operationResponse = operationSpec.responses[statusCode];
        if (operationResponse.bodyMapper &&
            operationResponse.bodyMapper.type.name === serializer_js_1.MapperTypeNames.Stream) {
            result.add(Number(statusCode));
        }
    }
    return result;
}
exports.getStreamingResponseStatusCodes = getStreamingResponseStatusCodes;
/**
 * Get the path to this parameter's value as a dotted string (a.b.c).
 * @param parameter - The parameter to get the path string for.
 * @returns The path to this parameter's value as a dotted string.
 * @internal
 */
function getPathStringFromParameter(parameter) {
    const { parameterPath, mapper } = parameter;
    let result;
    if (typeof parameterPath === "string") {
        result = parameterPath;
    }
    else if (Array.isArray(parameterPath)) {
        result = parameterPath.join(".");
    }
    else {
        result = mapper.serializedName;
    }
    return result;
}
exports.getPathStringFromParameter = getPathStringFromParameter;
//# sourceMappingURL=interfaceHelpers.js.map