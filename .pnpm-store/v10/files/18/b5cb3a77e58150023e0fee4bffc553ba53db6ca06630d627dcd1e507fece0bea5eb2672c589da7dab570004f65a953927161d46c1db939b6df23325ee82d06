// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { isError } from "./util/error.js";
import { custom } from "./util/inspect.js";
import { Sanitizer } from "./util/sanitizer.js";
const errorSanitizer = new Sanitizer();
/**
 * A custom error type for failed pipeline requests.
 */
export class RestError extends Error {
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
        Object.defineProperty(this, custom, {
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
export function isRestError(e) {
    if (e instanceof RestError) {
        return true;
    }
    return isError(e) && e.name === "RestError";
}
//# sourceMappingURL=restError.js.map