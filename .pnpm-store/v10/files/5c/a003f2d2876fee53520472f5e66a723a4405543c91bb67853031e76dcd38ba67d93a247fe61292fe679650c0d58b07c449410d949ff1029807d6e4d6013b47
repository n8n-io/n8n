/**
 * Custom error classes for the sandbox module.
 *
 * All sandbox errors extend LangSmithSandboxError for unified error handling.
 * The errors are organized by type rather than resource type, with additional
 * properties for specific handling when needed.
 */
/**
 * Base exception for sandbox client errors.
 */
export declare class LangSmithSandboxError extends Error {
    constructor(message: string);
}
/**
 * Raised when the API endpoint returns an unexpected error.
 *
 * For example, this is raised for wrong URL or path.
 */
export declare class LangSmithSandboxAPIError extends LangSmithSandboxError {
    constructor(message: string);
}
/**
 * Raised when authentication fails (invalid or missing API key).
 */
export declare class LangSmithSandboxAuthenticationError extends LangSmithSandboxError {
    constructor(message: string);
}
/**
 * Raised when connection to the sandbox server fails.
 */
export declare class LangSmithSandboxConnectionError extends LangSmithSandboxError {
    constructor(message: string);
}
/**
 * Raised when a resource is not found.
 */
export declare class LangSmithResourceNotFoundError extends LangSmithSandboxError {
    resourceType?: string;
    constructor(message: string, resourceType?: string);
}
/**
 * Raised when an operation times out.
 */
export declare class LangSmithResourceTimeoutError extends LangSmithSandboxError {
    resourceType?: string;
    lastStatus?: string;
    constructor(message: string, resourceType?: string, lastStatus?: string);
    toString(): string;
}
/**
 * Raised when deleting a resource that is still in use.
 */
export declare class LangSmithResourceInUseError extends LangSmithSandboxError {
    resourceType?: string;
    constructor(message: string, resourceType?: string);
}
/**
 * Raised when creating a resource that already exists.
 */
export declare class LangSmithResourceAlreadyExistsError extends LangSmithSandboxError {
    resourceType?: string;
    constructor(message: string, resourceType?: string);
}
/**
 * Raised when updating a resource name to one that already exists.
 */
export declare class LangSmithResourceNameConflictError extends LangSmithSandboxError {
    resourceType?: string;
    constructor(message: string, resourceType?: string);
}
/**
 * Raised when request validation fails.
 *
 * This includes:
 * - Resource values exceeding server-defined limits (CPU, memory, storage)
 * - Invalid resource units
 * - Invalid name formats
 * - Pool validation failures (e.g., template has volumes)
 */
export declare class LangSmithValidationError extends LangSmithSandboxError {
    field?: string;
    details?: Array<Record<string, unknown>>;
    errorType?: string;
    constructor(message: string, field?: string, details?: Array<Record<string, unknown>>, errorType?: string);
}
/**
 * Raised when organization quota limits are exceeded.
 *
 * Users should contact support@langchain.dev to increase quotas.
 */
export declare class LangSmithQuotaExceededError extends LangSmithSandboxError {
    quotaType?: string;
    constructor(message: string, quotaType?: string);
}
/**
 * Raised when resource provisioning fails (general-purpose).
 */
export declare class LangSmithResourceCreationError extends LangSmithSandboxError {
    /**
     * Type of resource that failed (e.g., "sandbox", "volume").
     */
    resourceType?: string;
    /**
     * Machine-readable error type (ImagePull, CrashLoop, SandboxConfig, Unschedulable).
     */
    errorType?: string;
    constructor(message: string, resourceType?: string, errorType?: string);
    toString(): string;
}
/**
 * Raised when sandbox creation fails.
 */
export declare class LangSmithSandboxCreationError extends LangSmithSandboxError {
    /**
     * Machine-readable error type (ImagePull, CrashLoop, SandboxConfig, Unschedulable).
     */
    errorType?: string;
    constructor(message: string, errorType?: string);
    toString(): string;
}
/**
 * Raised when dataplane_url is not available for the sandbox.
 *
 * This occurs when the sandbox-router URL is not configured for the cluster.
 */
export declare class LangSmithDataplaneNotConfiguredError extends LangSmithSandboxError {
    constructor(message: string);
}
/**
 * Raised when attempting to interact with a sandbox that is not ready.
 */
export declare class LangSmithSandboxNotReadyError extends LangSmithSandboxError {
    constructor(message: string);
}
/**
 * Raised when a sandbox operation fails (run, read, write).
 */
export declare class LangSmithSandboxOperationError extends LangSmithSandboxError {
    /**
     * The operation that failed (command, read, write).
     */
    operation?: string;
    /**
     * Machine-readable error type from the API.
     */
    errorType?: string;
    constructor(message: string, operation?: string, errorType?: string);
    toString(): string;
}
/**
 * Raised when a command exceeds its timeout.
 */
export declare class LangSmithCommandTimeoutError extends LangSmithSandboxOperationError {
    timeout?: number;
    constructor(message: string, timeout?: number);
}
/**
 * Raised when the sandbox server is reloading (close code 1001).
 *
 * Subclass of connection error that signals immediate reconnect (no backoff).
 */
export declare class LangSmithSandboxServerReloadError extends LangSmithSandboxConnectionError {
    constructor(message: string);
}
