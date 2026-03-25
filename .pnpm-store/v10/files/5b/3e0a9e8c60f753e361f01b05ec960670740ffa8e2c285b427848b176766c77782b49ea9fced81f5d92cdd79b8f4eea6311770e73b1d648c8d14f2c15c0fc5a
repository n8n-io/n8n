"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRestError = createRestError;
const restError_js_1 = require("../restError.js");
const httpHeaders_js_1 = require("../httpHeaders.js");
function createRestError(messageOrResponse, response) {
    var _a, _b, _c;
    const resp = typeof messageOrResponse === "string" ? response : messageOrResponse;
    const internalError = (_b = (_a = resp.body) === null || _a === void 0 ? void 0 : _a.error) !== null && _b !== void 0 ? _b : resp.body;
    const message = typeof messageOrResponse === "string"
        ? messageOrResponse
        : ((_c = internalError === null || internalError === void 0 ? void 0 : internalError.message) !== null && _c !== void 0 ? _c : `Unexpected status code: ${resp.status}`);
    return new restError_js_1.RestError(message, {
        statusCode: statusCodeToNumber(resp.status),
        code: internalError === null || internalError === void 0 ? void 0 : internalError.code,
        request: resp.request,
        response: toPipelineResponse(resp),
    });
}
function toPipelineResponse(response) {
    var _a;
    return {
        headers: (0, httpHeaders_js_1.createHttpHeaders)(response.headers),
        request: response.request,
        status: (_a = statusCodeToNumber(response.status)) !== null && _a !== void 0 ? _a : -1,
    };
}
function statusCodeToNumber(statusCode) {
    const status = Number.parseInt(statusCode);
    return Number.isNaN(status) ? undefined : status;
}
//# sourceMappingURL=restError.js.map