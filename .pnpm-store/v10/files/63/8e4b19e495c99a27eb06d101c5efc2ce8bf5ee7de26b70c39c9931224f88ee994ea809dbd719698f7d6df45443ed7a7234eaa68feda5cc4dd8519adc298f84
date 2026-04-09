"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRestError = createRestError;
const ts_http_runtime_1 = require("@typespec/ts-http-runtime");
function createRestError(messageOrResponse, response) {
    if (typeof messageOrResponse === "string") {
        return (0, ts_http_runtime_1.createRestError)(messageOrResponse, response);
    }
    else {
        return (0, ts_http_runtime_1.createRestError)(messageOrResponse);
    }
}
//# sourceMappingURL=restError.js.map