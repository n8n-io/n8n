"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangSmithDataplaneNotConfiguredError = exports.LangSmithCommandTimeoutError = exports.LangSmithSandboxOperationError = exports.LangSmithSandboxNotReadyError = exports.LangSmithSandboxCreationError = exports.LangSmithResourceCreationError = exports.LangSmithQuotaExceededError = exports.LangSmithValidationError = exports.LangSmithResourceNameConflictError = exports.LangSmithResourceAlreadyExistsError = exports.LangSmithResourceInUseError = exports.LangSmithResourceTimeoutError = exports.LangSmithResourceNotFoundError = exports.LangSmithSandboxServerReloadError = exports.LangSmithSandboxConnectionError = exports.LangSmithSandboxAuthenticationError = exports.LangSmithSandboxAPIError = exports.LangSmithSandboxError = exports.CommandHandle = exports.Sandbox = exports.SandboxClient = void 0;
// Emit warning on import (alpha feature)
console.warn("langsmith/experimental/sandbox is in alpha. " +
    "This feature is experimental, and breaking changes are expected.");
// Main classes
var client_js_1 = require("./client.cjs");
Object.defineProperty(exports, "SandboxClient", { enumerable: true, get: function () { return client_js_1.SandboxClient; } });
var sandbox_js_1 = require("./sandbox.cjs");
Object.defineProperty(exports, "Sandbox", { enumerable: true, get: function () { return sandbox_js_1.Sandbox; } });
var command_handle_js_1 = require("./command_handle.cjs");
Object.defineProperty(exports, "CommandHandle", { enumerable: true, get: function () { return command_handle_js_1.CommandHandle; } });
// Errors
var errors_js_1 = require("./errors.cjs");
// Base and connection errors
Object.defineProperty(exports, "LangSmithSandboxError", { enumerable: true, get: function () { return errors_js_1.LangSmithSandboxError; } });
Object.defineProperty(exports, "LangSmithSandboxAPIError", { enumerable: true, get: function () { return errors_js_1.LangSmithSandboxAPIError; } });
Object.defineProperty(exports, "LangSmithSandboxAuthenticationError", { enumerable: true, get: function () { return errors_js_1.LangSmithSandboxAuthenticationError; } });
Object.defineProperty(exports, "LangSmithSandboxConnectionError", { enumerable: true, get: function () { return errors_js_1.LangSmithSandboxConnectionError; } });
Object.defineProperty(exports, "LangSmithSandboxServerReloadError", { enumerable: true, get: function () { return errors_js_1.LangSmithSandboxServerReloadError; } });
// Resource errors (type-based with resourceType attribute)
Object.defineProperty(exports, "LangSmithResourceNotFoundError", { enumerable: true, get: function () { return errors_js_1.LangSmithResourceNotFoundError; } });
Object.defineProperty(exports, "LangSmithResourceTimeoutError", { enumerable: true, get: function () { return errors_js_1.LangSmithResourceTimeoutError; } });
Object.defineProperty(exports, "LangSmithResourceInUseError", { enumerable: true, get: function () { return errors_js_1.LangSmithResourceInUseError; } });
Object.defineProperty(exports, "LangSmithResourceAlreadyExistsError", { enumerable: true, get: function () { return errors_js_1.LangSmithResourceAlreadyExistsError; } });
Object.defineProperty(exports, "LangSmithResourceNameConflictError", { enumerable: true, get: function () { return errors_js_1.LangSmithResourceNameConflictError; } });
// Validation and quota errors
Object.defineProperty(exports, "LangSmithValidationError", { enumerable: true, get: function () { return errors_js_1.LangSmithValidationError; } });
Object.defineProperty(exports, "LangSmithQuotaExceededError", { enumerable: true, get: function () { return errors_js_1.LangSmithQuotaExceededError; } });
// Resource creation errors
Object.defineProperty(exports, "LangSmithResourceCreationError", { enumerable: true, get: function () { return errors_js_1.LangSmithResourceCreationError; } });
// Sandbox-specific errors
Object.defineProperty(exports, "LangSmithSandboxCreationError", { enumerable: true, get: function () { return errors_js_1.LangSmithSandboxCreationError; } });
Object.defineProperty(exports, "LangSmithSandboxNotReadyError", { enumerable: true, get: function () { return errors_js_1.LangSmithSandboxNotReadyError; } });
Object.defineProperty(exports, "LangSmithSandboxOperationError", { enumerable: true, get: function () { return errors_js_1.LangSmithSandboxOperationError; } });
Object.defineProperty(exports, "LangSmithCommandTimeoutError", { enumerable: true, get: function () { return errors_js_1.LangSmithCommandTimeoutError; } });
Object.defineProperty(exports, "LangSmithDataplaneNotConfiguredError", { enumerable: true, get: function () { return errors_js_1.LangSmithDataplaneNotConfiguredError; } });
