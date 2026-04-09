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
export { SandboxClient } from "./client.js";
export { Sandbox } from "./sandbox.js";
export { CommandHandle } from "./command_handle.js";
export type { ExecutionResult, OutputChunk, WsMessage, WsRunOptions, ResourceSpec, ResourceStatus, VolumeMountSpec, Volume, SandboxTemplate, Pool, SandboxData, SandboxClientConfig, RunOptions, CreateSandboxOptions, UpdateSandboxOptions, WaitForSandboxOptions, CreateVolumeOptions, CreateTemplateOptions, UpdateTemplateOptions, CreatePoolOptions, UpdateVolumeOptions, UpdatePoolOptions, } from "./types.js";
export { LangSmithSandboxError, LangSmithSandboxAPIError, LangSmithSandboxAuthenticationError, LangSmithSandboxConnectionError, LangSmithSandboxServerReloadError, LangSmithResourceNotFoundError, LangSmithResourceTimeoutError, LangSmithResourceInUseError, LangSmithResourceAlreadyExistsError, LangSmithResourceNameConflictError, LangSmithValidationError, LangSmithQuotaExceededError, LangSmithResourceCreationError, LangSmithSandboxCreationError, LangSmithSandboxNotReadyError, LangSmithSandboxOperationError, LangSmithCommandTimeoutError, LangSmithDataplaneNotConfiguredError, } from "./errors.js";
