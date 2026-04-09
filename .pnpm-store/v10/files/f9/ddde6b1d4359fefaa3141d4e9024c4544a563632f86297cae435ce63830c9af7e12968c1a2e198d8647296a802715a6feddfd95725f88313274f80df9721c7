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
export class LangSmithSandboxError extends Error {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxError";
    }
}
// =============================================================================
// Connection and Authentication Errors
// =============================================================================
/**
 * Raised when the API endpoint returns an unexpected error.
 *
 * For example, this is raised for wrong URL or path.
 */
export class LangSmithSandboxAPIError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxAPIError";
    }
}
/**
 * Raised when authentication fails (invalid or missing API key).
 */
export class LangSmithSandboxAuthenticationError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxAuthenticationError";
    }
}
/**
 * Raised when connection to the sandbox server fails.
 */
export class LangSmithSandboxConnectionError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxConnectionError";
    }
}
// =============================================================================
// Resource Errors (type-based, with resourceType property)
// =============================================================================
/**
 * Raised when a resource is not found.
 */
export class LangSmithResourceNotFoundError extends LangSmithSandboxError {
    constructor(message, resourceType) {
        super(message);
        Object.defineProperty(this, "resourceType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithResourceNotFoundError";
        this.resourceType = resourceType;
    }
}
/**
 * Raised when an operation times out.
 */
export class LangSmithResourceTimeoutError extends LangSmithSandboxError {
    constructor(message, resourceType, lastStatus) {
        super(message);
        Object.defineProperty(this, "resourceType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "lastStatus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithResourceTimeoutError";
        this.resourceType = resourceType;
        this.lastStatus = lastStatus;
    }
    toString() {
        const base = super.toString();
        if (this.lastStatus) {
            return `${base} (last_status: ${this.lastStatus})`;
        }
        return base;
    }
}
/**
 * Raised when deleting a resource that is still in use.
 */
export class LangSmithResourceInUseError extends LangSmithSandboxError {
    constructor(message, resourceType) {
        super(message);
        Object.defineProperty(this, "resourceType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithResourceInUseError";
        this.resourceType = resourceType;
    }
}
/**
 * Raised when creating a resource that already exists.
 */
export class LangSmithResourceAlreadyExistsError extends LangSmithSandboxError {
    constructor(message, resourceType) {
        super(message);
        Object.defineProperty(this, "resourceType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithResourceAlreadyExistsError";
        this.resourceType = resourceType;
    }
}
/**
 * Raised when updating a resource name to one that already exists.
 */
export class LangSmithResourceNameConflictError extends LangSmithSandboxError {
    constructor(message, resourceType) {
        super(message);
        Object.defineProperty(this, "resourceType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithResourceNameConflictError";
        this.resourceType = resourceType;
    }
}
// =============================================================================
// Validation and Quota Errors
// =============================================================================
/**
 * Raised when request validation fails.
 *
 * This includes:
 * - Resource values exceeding server-defined limits (CPU, memory, storage)
 * - Invalid resource units
 * - Invalid name formats
 * - Pool validation failures (e.g., template has volumes)
 */
export class LangSmithValidationError extends LangSmithSandboxError {
    constructor(message, field, details, errorType) {
        super(message);
        Object.defineProperty(this, "field", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "details", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "errorType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithValidationError";
        this.field = field;
        this.details = details;
        this.errorType = errorType;
    }
}
/**
 * Raised when organization quota limits are exceeded.
 *
 * Users should contact support@langchain.dev to increase quotas.
 */
export class LangSmithQuotaExceededError extends LangSmithSandboxError {
    constructor(message, quotaType) {
        super(message);
        Object.defineProperty(this, "quotaType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithQuotaExceededError";
        this.quotaType = quotaType;
    }
}
// =============================================================================
// Resource Creation Errors
// =============================================================================
/**
 * Raised when resource provisioning fails (general-purpose).
 */
export class LangSmithResourceCreationError extends LangSmithSandboxError {
    constructor(message, resourceType, errorType) {
        super(message);
        /**
         * Type of resource that failed (e.g., "sandbox", "volume").
         */
        Object.defineProperty(this, "resourceType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Machine-readable error type (ImagePull, CrashLoop, SandboxConfig, Unschedulable).
         */
        Object.defineProperty(this, "errorType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithResourceCreationError";
        this.resourceType = resourceType;
        this.errorType = errorType;
    }
    toString() {
        if (this.errorType) {
            return `${super.toString()} [${this.errorType}]`;
        }
        return super.toString();
    }
}
/**
 * Raised when sandbox creation fails.
 */
export class LangSmithSandboxCreationError extends LangSmithSandboxError {
    constructor(message, errorType) {
        super(message);
        /**
         * Machine-readable error type (ImagePull, CrashLoop, SandboxConfig, Unschedulable).
         */
        Object.defineProperty(this, "errorType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithSandboxCreationError";
        this.errorType = errorType;
    }
    toString() {
        if (this.errorType) {
            return `${super.toString()} [${this.errorType}]`;
        }
        return super.toString();
    }
}
// =============================================================================
// Sandbox Operation Errors (runtime errors during sandbox interaction)
// =============================================================================
/**
 * Raised when dataplane_url is not available for the sandbox.
 *
 * This occurs when the sandbox-router URL is not configured for the cluster.
 */
export class LangSmithDataplaneNotConfiguredError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithDataplaneNotConfiguredError";
    }
}
/**
 * Raised when attempting to interact with a sandbox that is not ready.
 */
export class LangSmithSandboxNotReadyError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxNotReadyError";
    }
}
/**
 * Raised when a sandbox operation fails (run, read, write).
 */
export class LangSmithSandboxOperationError extends LangSmithSandboxError {
    constructor(message, operation, errorType) {
        super(message);
        /**
         * The operation that failed (command, read, write).
         */
        Object.defineProperty(this, "operation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Machine-readable error type from the API.
         */
        Object.defineProperty(this, "errorType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithSandboxOperationError";
        this.operation = operation;
        this.errorType = errorType;
    }
    toString() {
        if (this.errorType) {
            return `${super.toString()} [${this.errorType}]`;
        }
        return super.toString();
    }
}
/**
 * Raised when a command exceeds its timeout.
 */
export class LangSmithCommandTimeoutError extends LangSmithSandboxOperationError {
    constructor(message, timeout) {
        super(message, "command", "CommandTimeout");
        Object.defineProperty(this, "timeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithCommandTimeoutError";
        this.timeout = timeout;
    }
}
/**
 * Raised when the sandbox server is reloading (close code 1001).
 *
 * Subclass of connection error that signals immediate reconnect (no backoff).
 */
export class LangSmithSandboxServerReloadError extends LangSmithSandboxConnectionError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxServerReloadError";
    }
}
