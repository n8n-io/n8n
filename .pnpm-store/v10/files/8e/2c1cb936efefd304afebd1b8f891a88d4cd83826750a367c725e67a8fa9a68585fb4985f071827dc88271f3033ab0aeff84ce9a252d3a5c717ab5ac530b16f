// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { isError } from "@azure/core-util";
import { custom } from "./util/inspect";
import { Sanitizer } from "./util/sanitizer";
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
        this.request = options.request;
        this.response = options.response;
        Object.setPrototypeOf(this, RestError.prototype);
    }
    /**
     * Logging method for util.inspect in Node
     */
    [custom]() {
        return `RestError: ${this.message} \n ${errorSanitizer.sanitize(this)}`;
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