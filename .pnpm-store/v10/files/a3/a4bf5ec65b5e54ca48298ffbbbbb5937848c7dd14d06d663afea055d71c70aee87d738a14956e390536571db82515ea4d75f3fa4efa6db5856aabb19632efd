"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationError = void 0;
/**
 * Encapsulates an error from an operation.
 */
class OperationError {
    /**
     * Gets the message associated with the error.
     */
    get message() {
        return this.exception.message;
    }
    /**
     * Initializes a new instance of the OperationError class.
     * @param exception The exception associated with the error.
     */
    constructor(exception) {
        if (!exception) {
            throw new Error('exception is required');
        }
        this.exception = exception;
    }
    /**
     * Returns a string representation of the error.
     * @returns A string representation of the error.
     */
    toString() {
        return this.exception.toString();
    }
}
exports.OperationError = OperationError;
//# sourceMappingURL=operation-error.js.map