// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { RestError as TspRestError, isRestError as tspIsRestError, } from "@typespec/ts-http-runtime";
/**
 * A custom error type for failed pipeline requests.
 */
export class RestError extends Error {
    constructor(message, options = {}) {
        super(message);
        // what is this??
        // it turns out that you can return from a constructor and it causes
        // calling `new` to return the value you return.
        // this lets us wrap the TypeSpec RestError so that calling this constructor will give you the same type of object as calling the TypeSpec one,
        // even though the constructor signatures (through RestErrorOptions) are slightly different.
        return new TspRestError(message, options);
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
    return tspIsRestError(e);
}
//# sourceMappingURL=restError.js.map