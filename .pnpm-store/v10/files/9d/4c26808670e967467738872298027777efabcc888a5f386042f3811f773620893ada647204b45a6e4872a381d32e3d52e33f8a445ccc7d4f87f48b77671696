"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestError = void 0;
exports.isRestError = isRestError;
const ts_http_runtime_1 = require("@typespec/ts-http-runtime");
/**
 * A custom error type for failed pipeline requests.
 */
class RestError extends Error {
    constructor(message, options = {}) {
        super(message);
        // what is this??
        // it turns out that you can return from a constructor and it causes
        // calling `new` to return the value you return.
        // this lets us wrap the TypeSpec RestError so that calling this constructor will give you the same type of object as calling the TypeSpec one,
        // even though the constructor signatures (through RestErrorOptions) are slightly different.
        return new ts_http_runtime_1.RestError(message, options);
    }
}
exports.RestError = RestError;
/**
 * Something went wrong when making the request.
 * This means the actual request failed for some reason,
 * such as a DNS issue or the connection being lost.
 */
RestError.REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR";
/**
 * This means that parsing the response from the server failed.
 * It may have been malformed.
 */
RestError.PARSE_ERROR = "PARSE_ERROR";
/**
 * Typeguard for RestError
 * @param e - Something caught by a catch clause.
 */
function isRestError(e) {
    return (0, ts_http_runtime_1.isRestError)(e);
}
//# sourceMappingURL=restError.js.map