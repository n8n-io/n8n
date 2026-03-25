// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { RestError } from "../restError.js";
import { createHttpHeaders } from "../httpHeaders.js";
export function createRestError(messageOrResponse, response) {
    var _a, _b, _c;
    const resp = typeof messageOrResponse === "string" ? response : messageOrResponse;
    const internalError = (_b = (_a = resp.body) === null || _a === void 0 ? void 0 : _a.error) !== null && _b !== void 0 ? _b : resp.body;
    const message = typeof messageOrResponse === "string"
        ? messageOrResponse
        : ((_c = internalError === null || internalError === void 0 ? void 0 : internalError.message) !== null && _c !== void 0 ? _c : `Unexpected status code: ${resp.status}`);
    return new RestError(message, {
        statusCode: statusCodeToNumber(resp.status),
        code: internalError === null || internalError === void 0 ? void 0 : internalError.code,
        request: resp.request,
        response: toPipelineResponse(resp),
    });
}
function toPipelineResponse(response) {
    var _a;
    return {
        headers: createHttpHeaders(response.headers),
        request: response.request,
        status: (_a = statusCodeToNumber(response.status)) !== null && _a !== void 0 ? _a : -1,
    };
}
function statusCodeToNumber(statusCode) {
    const status = Number.parseInt(statusCode);
    return Number.isNaN(status) ? undefined : status;
}
//# sourceMappingURL=restError.js.map