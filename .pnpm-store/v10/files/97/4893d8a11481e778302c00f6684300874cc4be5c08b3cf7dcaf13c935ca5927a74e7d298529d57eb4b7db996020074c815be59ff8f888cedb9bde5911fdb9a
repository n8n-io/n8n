import { OperationError } from './operation-error';
/**
 * Represents the result of an operation.
 */
export declare class OperationResult {
    private static readonly _success;
    private readonly _errors;
    /**
     * Gets a flag indicating whether the operation succeeded.
     */
    readonly succeeded: boolean;
    /**
     * Gets an array of OperationError instances indicating errors that occurred during the operation.
     */
    get errors(): OperationError[];
    /**
     * Private constructor for OperationResult.
     * @param succeeded Whether the operation succeeded.
     * @param errors Optional array of errors.
     */
    private constructor();
    /**
     * Returns an OperationResult indicating a successful operation.
     */
    static get success(): OperationResult;
    /**
     * Creates an OperationResult indicating a failed operation, with a list of errors if applicable.
     * @param errors An optional array of OperationError which caused the operation to fail.
     * @returns An OperationResult indicating a failed operation, with a list of errors if applicable.
     */
    static failed(...errors: OperationError[]): OperationResult;
    /**
     * Converts the value of the current OperationResult object to its equivalent string representation.
     * @returns A string representation of the current OperationResult object.
     * @remarks
     * If the operation was successful the toString() will return "Succeeded" otherwise it will return
     * "Failed : " followed by a comma delimited list of error messages from its errors collection, if any.
     */
    toString(): string;
}
//# sourceMappingURL=operation-result.d.ts.map