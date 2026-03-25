"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestError = void 0;
exports.isRestError = isRestError;
const error_js_1 = require("./util/error.js");
const inspect_js_1 = require("./util/inspect.js");
const sanitizer_js_1 = require("./util/sanitizer.js");
const errorSanitizer = new sanitizer_js_1.Sanitizer();
/**
 * A custom error type for failed pipeline requests.
 */
class RestError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = "RestError";
        this.code = options.code;
        this.statusCode = options.statusCode;
        // The request and response may contain sensitive information in the headers or body.
        // To help prevent this sensitive information being accidentally logged, the request and response
        // properties are marked as non-enumerable here. This prevents them showing up in the output of
        // JSON.stringify and console.log.
        Object.defineProperty(this, "request", { value: options.request, enumerable: false });
        Object.defineProperty(this, "response", { value: options.response, enumerable: false });
        // Logging method for util.inspect in Node
        Object.defineProperty(this, inspect_js_1.custom, {
            value: () => {
                // Extract non-enumerable properties and add them back. This is OK since in this output the request and
                // response get sanitized.
                return `RestError: ${this.message} \n ${errorSanitizer.sanitize(Object.assign(Object.assign({}, this), { request: this.request, response: this.response }))}`;
            },
            enumerable: false,
        });
        Object.setPrototypeOf(this, RestError.prototype);
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
    if (e instanceof RestError) {
        return true;
    }
    return (0, error_js_1.isError)(e) && e.name === "RestError";
}
//# sourceMappingURL=restError.js.map