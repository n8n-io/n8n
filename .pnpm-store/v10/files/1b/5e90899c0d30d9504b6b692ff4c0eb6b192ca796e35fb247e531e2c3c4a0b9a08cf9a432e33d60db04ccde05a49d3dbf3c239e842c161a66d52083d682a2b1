"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRestError = createRestError;
const restError_js_1 = require("../restError.js");
const httpHeaders_js_1 = require("../httpHeaders.js");
function createRestError(messageOrResponse, response) {
    const resp = typeof messageOrResponse === "string" ? response : messageOrResponse;
    const internalError = resp.body?.error ?? resp.body;
    const message = typeof messageOrResponse === "string"
        ? messageOrResponse
        : (internalError?.message ?? `Unexpected status code: ${resp.status}`);
    return new restError_js_1.RestError(message, {
        statusCode: statusCodeToNumber(resp.status),
        code: internalError?.code,
        request: resp.request,
        response: toPipelineResponse(resp),
    });
}
function toPipelineResponse(response) {
    return {
        headers: (0, httpHeaders_js_1.createHttpHeaders)(response.headers),
        request: response.request,
        status: statusCodeToNumber(response.status) ?? -1,
    };
}
function statusCodeToNumber(statusCode) {
    const status = Number.parseInt(statusCode);
    return Number.isNaN(status) ? undefined : status;
}
//# sourceMappingURL=restError.js.map