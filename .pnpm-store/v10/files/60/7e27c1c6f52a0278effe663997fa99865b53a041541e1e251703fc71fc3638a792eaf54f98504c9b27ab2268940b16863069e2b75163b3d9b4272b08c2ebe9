"use strict";
/**
 * Custom error classes for the sandbox module.
 *
 * All sandbox errors extend LangSmithSandboxError for unified error handling.
 * The errors are organized by type rather than resource type, with additional
 * properties for specific handling when needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangSmithSandboxServerReloadError = exports.LangSmithCommandTimeoutError = exports.LangSmithSandboxOperationError = exports.LangSmithSandboxNotReadyError = exports.LangSmithDataplaneNotConfiguredError = exports.LangSmithSandboxCreationError = exports.LangSmithResourceCreationError = exports.LangSmithQuotaExceededError = exports.LangSmithValidationError = exports.LangSmithResourceNameConflictError = exports.LangSmithResourceAlreadyExistsError = exports.LangSmithResourceInUseError = exports.LangSmithResourceTimeoutError = exports.LangSmithResourceNotFoundError = exports.LangSmithSandboxConnectionError = exports.LangSmithSandboxAuthenticationError = exports.LangSmithSandboxAPIError = exports.LangSmithSandboxError = void 0;
/**
 * Base exception for sandbox client errors.
 */
class LangSmithSandboxError extends Error {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxError";
    }
}
exports.LangSmithSandboxError = LangSmithSandboxError;
// =============================================================================
// Connection and Authentication Errors
// =============================================================================
/**
 * Raised when the API endpoint returns an unexpected error.
 *
 * For example, this is raised for wrong URL or path.
 */
class LangSmithSandboxAPIError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxAPIError";
    }
}
exports.LangSmithSandboxAPIError = LangSmithSandboxAPIError;
/**
 * Raised when authentication fails (invalid or missing API key).
 */
class LangSmithSandboxAuthenticationError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxAuthenticationError";
    }
}
exports.LangSmithSandboxAuthenticationError = LangSmithSandboxAuthenticationError;
/**
 * Raised when connection to the sandbox server fails.
 */
class LangSmithSandboxConnectionError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxConnectionError";
    }
}
exports.LangSmithSandboxConnectionError = LangSmithSandboxConnectionError;
// =============================================================================
// Resource Errors (type-based, with resourceType property)
// =============================================================================
/**
 * Raised when a resource is not found.
 */
class LangSmithResourceNotFoundError extends LangSmithSandboxError {
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
exports.LangSmithResourceNotFoundError = LangSmithResourceNotFoundError;
/**
 * Raised when an operation times out.
 */
class LangSmithResourceTimeoutError extends LangSmithSandboxError {
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
exports.LangSmithResourceTimeoutError = LangSmithResourceTimeoutError;
/**
 * Raised when deleting a resource that is still in use.
 */
class LangSmithResourceInUseError extends LangSmithSandboxError {
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
exports.LangSmithResourceInUseError = LangSmithResourceInUseError;
/**
 * Raised when creating a resource that already exists.
 */
class LangSmithResourceAlreadyExistsError extends LangSmithSandboxError {
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
exports.LangSmithResourceAlreadyExistsError = LangSmithResourceAlreadyExistsError;
/**
 * Raised when updating a resource name to one that already exists.
 */
class LangSmithResourceNameConflictError extends LangSmithSandboxError {
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
exports.LangSmithResourceNameConflictError = LangSmithResourceNameConflictError;
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
class LangSmithValidationError extends LangSmithSandboxError {
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
exports.LangSmithValidationError = LangSmithValidationError;
/**
 * Raised when organization quota limits are exceeded.
 *
 * Users should contact support@langchain.dev to increase quotas.
 */
class LangSmithQuotaExceededError extends LangSmithSandboxError {
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
exports.LangSmithQuotaExceededError = LangSmithQuotaExceededError;
// =============================================================================
// Resource Creation Errors
// =============================================================================
/**
 * Raised when resource provisioning fails (general-purpose).
 */
class LangSmithResourceCreationError extends LangSmithSandboxError {
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
exports.LangSmithResourceCreationError = LangSmithResourceCreationError;
/**
 * Raised when sandbox creation fails.
 */
class LangSmithSandboxCreationError extends LangSmithSandboxError {
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
exports.LangSmithSandboxCreationError = LangSmithSandboxCreationError;
// =============================================================================
// Sandbox Operation Errors (runtime errors during sandbox interaction)
// =============================================================================
/**
 * Raised when dataplane_url is not available for the sandbox.
 *
 * This occurs when the sandbox-router URL is not configured for the cluster.
 */
class LangSmithDataplaneNotConfiguredError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithDataplaneNotConfiguredError";
    }
}
exports.LangSmithDataplaneNotConfiguredError = LangSmithDataplaneNotConfiguredError;
/**
 * Raised when attempting to interact with a sandbox that is not ready.
 */
class LangSmithSandboxNotReadyError extends LangSmithSandboxError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxNotReadyError";
    }
}
exports.LangSmithSandboxNotReadyError = LangSmithSandboxNotReadyError;
/**
 * Raised when a sandbox operation fails (run, read, write).
 */
class LangSmithSandboxOperationError extends LangSmithSandboxError {
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
exports.LangSmithSandboxOperationError = LangSmithSandboxOperationError;
/**
 * Raised when a command exceeds its timeout.
 */
class LangSmithCommandTimeoutError extends LangSmithSandboxOperationError {
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
exports.LangSmithCommandTimeoutError = LangSmithCommandTimeoutError;
/**
 * Raised when the sandbox server is reloading (close code 1001).
 *
 * Subclass of connection error that signals immediate reconnect (no backoff).
 */
class LangSmithSandboxServerReloadError extends LangSmithSandboxConnectionError {
    constructor(message) {
        super(message);
        this.name = "LangSmithSandboxServerReloadError";
    }
}
exports.LangSmithSandboxServerReloadError = LangSmithSandboxServerReloadError;
