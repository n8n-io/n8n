"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvokeException = void 0;
/**
 * Represents an exception that occurs during an invoke operation.
 */
class InvokeException extends Error {
    /**
     * Creates a new instance of InvokeException.
     * @param status The status code of the exception.
     * @param response The optional response body.
     */
    constructor(status, response) {
        super();
        this.status = status;
        this.response = response;
        this.name = 'InvokeException';
    }
    /**
     * Creates an invoke response from the exception.
     * @returns The invoke response.
     */
    createInvokeResponse() {
        return {
            status: this.status,
            body: this.response
        };
    }
}
exports.InvokeException = InvokeException;
//# sourceMappingURL=invokeException.js.map