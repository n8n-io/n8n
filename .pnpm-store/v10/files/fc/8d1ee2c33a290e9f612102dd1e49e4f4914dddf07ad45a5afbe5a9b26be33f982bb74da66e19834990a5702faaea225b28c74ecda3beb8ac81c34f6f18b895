// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Encapsulates an error from an operation.
 */
export class OperationError {
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
//# sourceMappingURL=operation-error.js.map