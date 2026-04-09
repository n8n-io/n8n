/**
 * LangSmith Sandbox Module.
 *
 * This module provides sandboxed code execution capabilities through the
 * LangSmith Sandbox API.
 *
 * @example
 * ```typescript
 * import { SandboxClient } from "langsmith/experimental/sandbox";
 *
 * // Uses LANGSMITH_ENDPOINT and LANGSMITH_API_KEY from environment
 * const client = new SandboxClient();
 *
 * const sandbox = await client.createSandbox("python-sandbox");
 * try {
 *   const result = await sandbox.run("python --version");
 *   console.log(result.stdout);
 * } finally {
 *   await sandbox.delete();
 * }
 * ```
 *
 * @packageDocumentation
 */
// Emit warning on import (alpha feature)
console.warn("langsmith/experimental/sandbox is in alpha. " +
    "This feature is experimental, and breaking changes are expected.");
// Main classes
export { SandboxClient } from "./client.js";
export { Sandbox } from "./sandbox.js";
export { CommandHandle } from "./command_handle.js";
// Errors
export { 
// Base and connection errors
LangSmithSandboxError, LangSmithSandboxAPIError, LangSmithSandboxAuthenticationError, LangSmithSandboxConnectionError, LangSmithSandboxServerReloadError, 
// Resource errors (type-based with resourceType attribute)
LangSmithResourceNotFoundError, LangSmithResourceTimeoutError, LangSmithResourceInUseError, LangSmithResourceAlreadyExistsError, LangSmithResourceNameConflictError, 
// Validation and quota errors
LangSmithValidationError, LangSmithQuotaExceededError, 
// Resource creation errors
LangSmithResourceCreationError, 
// Sandbox-specific errors
LangSmithSandboxCreationError, LangSmithSandboxNotReadyError, LangSmithSandboxOperationError, LangSmithCommandTimeoutError, LangSmithDataplaneNotConfiguredError, } from "./errors.js";
