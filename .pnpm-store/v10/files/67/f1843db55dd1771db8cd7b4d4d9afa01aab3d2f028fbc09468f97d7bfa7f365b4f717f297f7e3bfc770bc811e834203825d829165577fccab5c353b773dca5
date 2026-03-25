export declare function printErrorStackTrace(e: unknown): void;
/**
 * LangSmithConflictError
 *
 * Represents an error that occurs when there's a conflict during an operation,
 * typically corresponding to HTTP 409 status code responses.
 *
 * This error is thrown when an attempt to create or modify a resource conflicts
 * with the current state of the resource on the server. Common scenarios include:
 * - Attempting to create a resource that already exists
 * - Trying to update a resource that has been modified by another process
 * - Violating a uniqueness constraint in the data
 *
 * @extends Error
 *
 * @example
 * try {
 *   await createProject("existingProject");
 * } catch (error) {
 *   if (error instanceof ConflictError) {
 *     console.log("A conflict occurred:", error.message);
 *     // Handle the conflict, e.g., by suggesting a different project name
 *   } else {
 *     // Handle other types of errors
 *   }
 * }
 *
 * @property {string} name - Always set to 'ConflictError' for easy identification
 * @property {string} message - Detailed error message including server response
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409
 */
export declare class LangSmithConflictError extends Error {
    status: number;
    constructor(message: string);
}
/**
 * LangSmithNotFoundError
 *
 * Represents an error that occurs when a requested resource is not found,
 * typically corresponding to HTTP 404 status code responses.
 *
 * @extends Error
 */
export declare class LangSmithNotFoundError extends Error {
    status: number;
    constructor(message: string);
}
export declare function isLangSmithNotFoundError(error: unknown): error is LangSmithNotFoundError;
/**
 * Throws an appropriate error based on the response status and body.
 *
 * @param response - The fetch Response object
 * @param context - Additional context to include in the error message (e.g., operation being performed)
 * @throws {LangSmithConflictError} When the response status is 409
 * @throws {Error} For all other non-ok responses
 */
export declare function raiseForStatus(response: Response, context: string, consumeOnSuccess?: boolean): Promise<void>;
export declare class ConflictingEndpointsError extends Error {
    readonly code = "ERR_CONFLICTING_ENDPOINTS";
    constructor();
}
export declare function isConflictingEndpointsError(err: unknown): err is ConflictingEndpointsError;
