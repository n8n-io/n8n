/**
 * Shared helper functions for error handling.
 *
 * These functions are used to parse error responses and raise appropriate
 * exceptions. They contain no I/O operations.
 */
/**
 * Validate TTL values for sandbox create/update (minute resolution).
 *
 * @param value - TTL in seconds (`undefined` means unset; `0` disables).
 * @param name - Parameter name for error messages.
 * @throws LangSmithValidationError if negative or not a multiple of 60 (when non-zero).
 */
export declare function validateTtl(value: number | undefined, name: string): void;
interface ParsedError {
    errorType?: string;
    message: string;
}
interface ValidationDetail {
    loc?: unknown[];
    msg?: string;
    type?: string;
    [key: string]: unknown;
}
/**
 * Parse standardized error response.
 *
 * Expected format: {"detail": {"error": "...", "message": "..."}}
 */
export declare function parseErrorResponse(response: Response): Promise<ParsedError>;
/**
 * Parse Pydantic validation error response.
 *
 * Returns a list of validation error details.
 */
export declare function parseValidationError(response: Response): Promise<ValidationDetail[]>;
/**
 * Extract quota type from error message.
 */
export declare function extractQuotaType(message: string): string | undefined;
/**
 * Handle HTTP errors specific to sandbox creation.
 *
 * Maps API error responses to specific exception types:
 * - 408: LangSmithResourceTimeoutError (sandbox didn't become ready in time)
 * - 422: LangSmithValidationError (bad input) or LangSmithSandboxCreationError (runtime)
 * - 429: LangSmithQuotaExceededError (org limits exceeded)
 * - 503: LangSmithSandboxCreationError (no resources available)
 * - Other: Falls through to generic error handling
 */
export declare function handleSandboxCreationError(response: Response): Promise<never>;
/**
 * Handle HTTP errors specific to volume creation.
 *
 * Maps API error responses to specific exception types:
 * - 429: LangSmithQuotaExceededError (org limits exceeded)
 * - 503: LangSmithSandboxCreationError (provisioning failed)
 * - 504: LangSmithResourceTimeoutError (volume didn't become ready in time)
 * - Other: Falls through to generic error handling
 */
export declare function handleVolumeCreationError(response: Response): Promise<never>;
/**
 * Handle HTTP errors specific to pool creation/update.
 *
 * Maps API error responses to specific exception types:
 * - 400: LangSmithResourceNotFoundError or LangSmithValidationError (template has volumes)
 * - 409: LangSmithResourceAlreadyExistsError
 * - 429: LangSmithQuotaExceededError (org limits exceeded)
 * - 504: LangSmithResourceTimeoutError (timeout waiting for ready replicas)
 * - Other: Falls through to generic error handling
 */
export declare function handlePoolError(response: Response): Promise<never>;
/**
 * Handle HTTP errors and raise appropriate exceptions (for client operations).
 */
export declare function handleClientHttpError(response: Response): Promise<never>;
/**
 * Handle HTTP errors for sandbox operations (run, read, write).
 *
 * Maps API error types to specific exceptions:
 * - WriteError -> LangSmithSandboxOperationError (operation="write")
 * - ReadError -> LangSmithSandboxOperationError (operation="read")
 * - CommandError -> LangSmithSandboxOperationError (operation="command")
 * - ConnectionError (502) -> LangSmithSandboxConnectionError
 * - FileNotFound / 404 -> LangSmithResourceNotFoundError (resourceType="file")
 * - NotReady (400) -> LangSmithSandboxNotReadyError
 * - 403 -> LangSmithSandboxOperationError (permission denied)
 */
export declare function handleSandboxHttpError(response: Response): Promise<never>;
/**
 * Handle 409 Conflict errors for resource name conflicts.
 */
export declare function handleConflictError(response: Response, resourceType: string): Promise<never>;
/**
 * Handle 409 Conflict errors for resources in use.
 */
export declare function handleResourceInUseError(response: Response, resourceType: string): Promise<never>;
export {};
