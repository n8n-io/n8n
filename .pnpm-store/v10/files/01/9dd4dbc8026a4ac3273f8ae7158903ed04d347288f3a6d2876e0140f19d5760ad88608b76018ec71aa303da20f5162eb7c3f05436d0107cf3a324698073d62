// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Represents the result of an operation.
 */
export class OperationResult {
    /**
     * Gets an array of OperationError instances indicating errors that occurred during the operation.
     */
    get errors() {
        return this._errors || [];
    }
    /**
     * Private constructor for OperationResult.
     * @param succeeded Whether the operation succeeded.
     * @param errors Optional array of errors.
     */
    constructor(succeeded, errors) {
        this.succeeded = succeeded;
        this._errors = errors || [];
    }
    /**
     * Returns an OperationResult indicating a successful operation.
     */
    static get success() {
        return OperationResult._success;
    }
    /**
     * Creates an OperationResult indicating a failed operation, with a list of errors if applicable.
     * @param errors An optional array of OperationError which caused the operation to fail.
     * @returns An OperationResult indicating a failed operation, with a list of errors if applicable.
     */
    static failed(...errors) {
        return new OperationResult(false, errors.length > 0 ? errors : []);
    }
    /**
     * Converts the value of the current OperationResult object to its equivalent string representation.
     * @returns A string representation of the current OperationResult object.
     * @remarks
     * If the operation was successful the toString() will return "Succeeded" otherwise it will return
     * "Failed : " followed by a comma delimited list of error messages from its errors collection, if any.
     */
    toString() {
        if (this.succeeded) {
            return 'Succeeded';
        }
        const errorMessages = this.errors.map(e => e.message).join(', ');
        return `Failed : ${errorMessages}`;
    }
}
OperationResult._success = new OperationResult(true);
//# sourceMappingURL=operation-result.js.map