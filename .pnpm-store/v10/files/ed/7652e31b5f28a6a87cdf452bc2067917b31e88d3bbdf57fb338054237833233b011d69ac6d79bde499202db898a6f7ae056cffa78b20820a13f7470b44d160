"use strict";
/**
 * Shared helper functions for error handling.
 *
 * These functions are used to parse error responses and raise appropriate
 * exceptions. They contain no I/O operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTtl = validateTtl;
exports.parseErrorResponse = parseErrorResponse;
exports.parseValidationError = parseValidationError;
exports.extractQuotaType = extractQuotaType;
exports.handleSandboxCreationError = handleSandboxCreationError;
exports.handleVolumeCreationError = handleVolumeCreationError;
exports.handlePoolError = handlePoolError;
exports.handleClientHttpError = handleClientHttpError;
exports.handleSandboxHttpError = handleSandboxHttpError;
exports.handleConflictError = handleConflictError;
exports.handleResourceInUseError = handleResourceInUseError;
const errors_js_1 = require("./errors.cjs");
// =============================================================================
// Input validation
// =============================================================================
/**
 * Validate TTL values for sandbox create/update (minute resolution).
 *
 * @param value - TTL in seconds (`undefined` means unset; `0` disables).
 * @param name - Parameter name for error messages.
 * @throws LangSmithValidationError if negative or not a multiple of 60 (when non-zero).
 */
function validateTtl(value, name) {
    if (value === undefined) {
        return;
    }
    if (value < 0) {
        throw new errors_js_1.LangSmithValidationError(`${name} must be >= 0, got ${value}`, name);
    }
    if (value !== 0 && value % 60 !== 0) {
        throw new errors_js_1.LangSmithValidationError(`${name} must be a multiple of 60 seconds, got ${value}`, name);
    }
}
/**
 * Parse standardized error response.
 *
 * Expected format: {"detail": {"error": "...", "message": "..."}}
 */
async function parseErrorResponse(response) {
    try {
        const data = await response.json();
        const detail = data?.detail;
        // Standardized format: {"detail": {"error": "...", "message": "..."}}
        if (detail && typeof detail === "object" && !Array.isArray(detail)) {
            return {
                errorType: detail.error,
                message: detail.message || `HTTP ${response.status}: ${response.statusText}`,
            };
        }
        // Pydantic validation error format: {"detail": [{"loc": [...], "msg": "..."}]}
        if (Array.isArray(detail) && detail.length > 0) {
            const messages = detail
                .filter((d) => typeof d === "object" && d !== null)
                .map((d) => d.msg || String(d))
                .filter(Boolean);
            return {
                errorType: undefined,
                message: messages.length > 0
                    ? messages.join("; ")
                    : `HTTP ${response.status}: ${response.statusText}`,
            };
        }
        // Fallback for plain string detail
        return {
            errorType: undefined,
            message: detail || `HTTP ${response.status}: ${response.statusText}`,
        };
    }
    catch {
        return {
            errorType: undefined,
            message: `HTTP ${response.status}: ${response.statusText}`,
        };
    }
}
/**
 * Parse Pydantic validation error response.
 *
 * Returns a list of validation error details.
 */
async function parseValidationError(response) {
    try {
        const data = await response.json();
        const detail = data?.detail;
        if (Array.isArray(detail)) {
            return detail;
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * Extract quota type from error message.
 */
function extractQuotaType(message) {
    const messageLower = message.toLowerCase();
    // Check for sandbox count quota
    if (messageLower.includes("sandbox") &&
        (messageLower.includes("count") || messageLower.includes("limit"))) {
        return "sandbox_count";
    }
    else if (messageLower.includes("cpu")) {
        return "cpu";
    }
    else if (messageLower.includes("memory")) {
        return "memory";
    }
    // Check for volume count quota
    else if (messageLower.includes("volume") &&
        (messageLower.includes("count") || messageLower.includes("limit"))) {
        return "volume_count";
    }
    else if (messageLower.includes("storage")) {
        return "storage";
    }
    return undefined;
}
// =============================================================================
// Client Error Handlers
// =============================================================================
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
async function handleSandboxCreationError(response) {
    const status = response.status;
    const data = await parseErrorResponse(response);
    if (status === 408) {
        // Timeout - include the message which contains last known status
        throw new errors_js_1.LangSmithResourceTimeoutError(data.message, "sandbox");
    }
    else if (status === 422) {
        // Check if this is a Pydantic validation error (bad input) vs creation error
        const clonedResponse = response.clone();
        const details = await parseValidationError(clonedResponse);
        if (details.length > 0 && details.some((d) => d.type === "value_error")) {
            // Pydantic validation error (bad input - exceeds server limits)
            const field = details[0]?.loc?.slice(-1)[0];
            throw new errors_js_1.LangSmithValidationError(data.message, field, details);
        }
        else {
            // Sandbox creation failed (runtime error like image pull failure)
            throw new errors_js_1.LangSmithSandboxCreationError(data.message, data.errorType);
        }
    }
    else if (status === 429) {
        // Organization quota exceeded - extract type or default to sandbox_count
        const quotaType = extractQuotaType(data.message) ?? "unknown";
        throw new errors_js_1.LangSmithQuotaExceededError(data.message, quotaType);
    }
    else if (status === 503) {
        // Service Unavailable - scheduling failed
        throw new errors_js_1.LangSmithSandboxCreationError(data.message, data.errorType || "Unschedulable");
    }
    // Fall through to generic handling
    return handleClientHttpError(response);
}
/**
 * Handle HTTP errors specific to volume creation.
 *
 * Maps API error responses to specific exception types:
 * - 429: LangSmithQuotaExceededError (org limits exceeded)
 * - 503: LangSmithSandboxCreationError (provisioning failed)
 * - 504: LangSmithResourceTimeoutError (volume didn't become ready in time)
 * - Other: Falls through to generic error handling
 */
async function handleVolumeCreationError(response) {
    const status = response.status;
    const data = await parseErrorResponse(response);
    if (status === 429) {
        // Organization quota exceeded - extract type or default to volume_count
        const quotaType = extractQuotaType(data.message) ?? "unknown";
        throw new errors_js_1.LangSmithQuotaExceededError(data.message, quotaType);
    }
    else if (status === 503) {
        // Provisioning failed (invalid storage class, quota exceeded)
        throw new errors_js_1.LangSmithSandboxCreationError(data.message, "VolumeProvisioning");
    }
    else if (status === 504) {
        // Timeout - volume didn't become ready in time
        throw new errors_js_1.LangSmithResourceTimeoutError(data.message, "volume");
    }
    // Fall through to generic handling
    return handleClientHttpError(response);
}
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
async function handlePoolError(response) {
    const status = response.status;
    const data = await parseErrorResponse(response);
    const errorType = data.errorType;
    if (status === 400) {
        // Check the error type to determine the specific exception
        if (errorType === "TemplateNotFound") {
            throw new errors_js_1.LangSmithResourceNotFoundError(data.message, "template");
        }
        else if (errorType === "LangSmithValidationError") {
            // Template has volumes attached
            throw new errors_js_1.LangSmithValidationError(data.message, undefined, undefined, errorType);
        }
        // Generic bad request - fall through to generic handling
    }
    else if (status === 409) {
        // Pool already exists
        throw new errors_js_1.LangSmithResourceAlreadyExistsError(data.message, "pool");
    }
    else if (status === 429) {
        // Organization quota exceeded - extract type or default to pool_count
        const quotaType = extractQuotaType(data.message) ?? "unknown";
        throw new errors_js_1.LangSmithQuotaExceededError(data.message, quotaType);
    }
    else if (status === 504) {
        // Timeout waiting for pool to be ready
        throw new errors_js_1.LangSmithResourceTimeoutError(data.message, "pool");
    }
    // Fall through to generic handling
    return handleClientHttpError(response);
}
/**
 * Handle HTTP errors and raise appropriate exceptions (for client operations).
 */
async function handleClientHttpError(response) {
    const data = await parseErrorResponse(response);
    const message = data.message;
    const errorType = data.errorType;
    const status = response.status;
    if (status === 401 || status === 403) {
        throw new errors_js_1.LangSmithSandboxAuthenticationError(message);
    }
    if (status === 404) {
        throw new errors_js_1.LangSmithResourceNotFoundError(message);
    }
    // Handle validation errors (invalid resource values, formats, etc.)
    if (status === 422) {
        const clonedResponse = response.clone();
        const details = await parseValidationError(clonedResponse);
        const field = details[0]?.loc?.slice(-1)[0];
        throw new errors_js_1.LangSmithValidationError(message, field, details);
    }
    // Handle quota exceeded errors (org limits)
    if (status === 429) {
        const quotaType = extractQuotaType(message);
        throw new errors_js_1.LangSmithQuotaExceededError(message, quotaType);
    }
    if (status === 502 && errorType === "ConnectionError") {
        throw new errors_js_1.LangSmithSandboxConnectionError(message);
    }
    if (status === 500) {
        throw new errors_js_1.LangSmithSandboxAPIError(message);
    }
    throw new errors_js_1.LangSmithSandboxError(message);
}
// =============================================================================
// Sandbox Operation Error Handlers
// =============================================================================
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
async function handleSandboxHttpError(response) {
    const data = await parseErrorResponse(response);
    const message = data.message;
    const errorType = data.errorType;
    const status = response.status;
    // Operation-specific errors (from sandbox runtime)
    if (errorType === "WriteError") {
        throw new errors_js_1.LangSmithSandboxOperationError(message, "write", errorType);
    }
    if (errorType === "ReadError") {
        throw new errors_js_1.LangSmithSandboxOperationError(message, "read", errorType);
    }
    if (errorType === "CommandError") {
        throw new errors_js_1.LangSmithSandboxOperationError(message, "command", errorType);
    }
    // Permission denied
    if (status === 403) {
        throw new errors_js_1.LangSmithSandboxOperationError(message, undefined, "PermissionDenied");
    }
    // Connection to sandbox failed
    if (status === 502 && errorType === "ConnectionError") {
        throw new errors_js_1.LangSmithSandboxConnectionError(message);
    }
    // Not ready / not found
    if (status === 400 && errorType === "NotReady") {
        throw new errors_js_1.LangSmithSandboxNotReadyError(message);
    }
    if (status === 404 || errorType === "FileNotFound") {
        throw new errors_js_1.LangSmithResourceNotFoundError(message, "file");
    }
    throw new errors_js_1.LangSmithSandboxError(message);
}
/**
 * Handle 409 Conflict errors for resource name conflicts.
 */
async function handleConflictError(response, resourceType) {
    const data = await parseErrorResponse(response);
    throw new errors_js_1.LangSmithResourceNameConflictError(data.message, resourceType);
}
/**
 * Handle 409 Conflict errors for resources in use.
 */
async function handleResourceInUseError(response, resourceType) {
    const data = await parseErrorResponse(response);
    throw new errors_js_1.LangSmithResourceInUseError(data.message, resourceType);
}
