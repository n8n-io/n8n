const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
const require_utils = require('./utils.cjs');
const require_middleware = require('../middleware.cjs');
const require_constants = require('./constants.cjs');
const require_error = require('./error.cjs');
let _langchain_core_messages = require("@langchain/core/messages");
let zod_v3 = require("zod/v3");

//#region src/agents/middleware/toolRetry.ts
/**
* Tool retry middleware for agents.
*/
/**
* Configuration options for the Tool Retry Middleware.
*/
const ToolRetryMiddlewareOptionsSchema = zod_v3.z.object({
	tools: zod_v3.z.array(zod_v3.z.union([
		zod_v3.z.custom(),
		zod_v3.z.custom(),
		zod_v3.z.string()
	])).optional(),
	onFailure: zod_v3.z.union([
		zod_v3.z.literal("error"),
		zod_v3.z.literal("continue"),
		zod_v3.z.literal("raise"),
		zod_v3.z.literal("return_message"),
		zod_v3.z.function().args(zod_v3.z.instanceof(Error)).returns(zod_v3.z.string())
	]).default("continue")
}).merge(require_constants.RetrySchema);
/**
* Middleware that automatically retries failed tool calls with configurable backoff.
*
* Supports retrying on specific exceptions and exponential backoff.
*
* @example Basic usage with default settings (2 retries, exponential backoff)
* ```ts
* import { createAgent, toolRetryMiddleware } from "langchain";
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   tools: [searchTool],
*   middleware: [toolRetryMiddleware()],
* });
* ```
*
* @example Retry specific exceptions only
* ```ts
* import { toolRetryMiddleware } from "langchain";
*
* const retry = toolRetryMiddleware({
*   maxRetries: 4,
*   retryOn: [TimeoutError, NetworkError],
*   backoffFactor: 1.5,
* });
* ```
*
* @example Custom exception filtering
* ```ts
* function shouldRetry(error: Error): boolean {
*   // Only retry on 5xx errors
*   if (error.name === "HTTPError" && "statusCode" in error) {
*     const statusCode = (error as any).statusCode;
*     return 500 <= statusCode && statusCode < 600;
*   }
*   return false;
* }
*
* const retry = toolRetryMiddleware({
*   maxRetries: 3,
*   retryOn: shouldRetry,
* });
* ```
*
* @example Apply to specific tools with custom error handling
* ```ts
* const formatError = (error: Error) =>
*   "Database temporarily unavailable. Please try again later.";
*
* const retry = toolRetryMiddleware({
*   maxRetries: 4,
*   tools: ["search_database"],
*   onFailure: formatError,
* });
* ```
*
* @example Apply to specific tools using BaseTool instances
* ```ts
* import { tool } from "@langchain/core/tools";
* import { z } from "zod";
*
* const searchDatabase = tool(
*   async ({ query }) => {
*     // Search implementation
*     return results;
*   },
*   {
*     name: "search_database",
*     description: "Search the database",
*     schema: z.object({ query: z.string() }),
*   }
* );
*
* const retry = toolRetryMiddleware({
*   maxRetries: 4,
*   tools: [searchDatabase], // Pass BaseTool instance
* });
* ```
*
* @example Constant backoff (no exponential growth)
* ```ts
* const retry = toolRetryMiddleware({
*   maxRetries: 5,
*   backoffFactor: 0.0, // No exponential growth
*   initialDelayMs: 2000, // Always wait 2 seconds
* });
* ```
*
* @example Raise exception on failure
* ```ts
* const retry = toolRetryMiddleware({
*   maxRetries: 2,
*   onFailure: "raise", // Re-raise exception instead of returning message
* });
* ```
*
* @param config - Configuration options for the retry middleware
* @returns A middleware instance that handles tool failures with retries
*/
function toolRetryMiddleware(config = {}) {
	const { success, error, data } = ToolRetryMiddlewareOptionsSchema.safeParse(config);
	if (!success) throw new require_error.InvalidRetryConfigError(error);
	const { maxRetries, tools, retryOn, onFailure: onFailureConfig, backoffFactor, initialDelayMs, maxDelayMs, jitter } = data;
	let onFailure = onFailureConfig;
	if (onFailureConfig === "raise") {
		console.warn("⚠️ `onFailure: 'raise'` is deprecated. Use `onFailure: 'error'` instead.");
		onFailure = "error";
	} else if (onFailureConfig === "return_message") {
		console.warn("⚠️ `onFailure: 'return_message'` is deprecated. Use `onFailure: 'continue'` instead.");
		onFailure = "continue";
	}
	const toolFilter = [];
	for (const tool of tools ?? []) if (typeof tool === "string") toolFilter.push(tool);
	else if ("name" in tool && typeof tool.name === "string") toolFilter.push(tool.name);
	else throw new TypeError("Expected a tool name string or tool instance to be passed to toolRetryMiddleware");
	/**
	* Check if retry logic should apply to this tool.
	*/
	const shouldRetryTool = (toolName) => {
		if (toolFilter.length === 0) return true;
		return toolFilter.includes(toolName);
	};
	/**
	* Check if the exception should trigger a retry.
	*/
	const shouldRetryException = (error) => {
		if (typeof retryOn === "function") return retryOn(error);
		return retryOn.some((ErrorConstructor) => {
			return error instanceof ErrorConstructor;
		});
	};
	const delayConfig = {
		backoffFactor,
		initialDelayMs,
		maxDelayMs,
		jitter
	};
	/**
	* Format the failure message when retries are exhausted.
	*/
	const formatFailureMessage = (toolName, error, attemptsMade) => {
		const errorType = error.constructor.name;
		return `Tool '${toolName}' failed after ${attemptsMade} ${attemptsMade === 1 ? "attempt" : "attempts"} with ${errorType}`;
	};
	/**
	* Handle failure when all retries are exhausted.
	*/
	const handleFailure = (toolName, toolCallId, error, attemptsMade) => {
		if (onFailure === "error") throw error;
		let content;
		if (typeof onFailure === "function") content = onFailure(error);
		else content = formatFailureMessage(toolName, error, attemptsMade);
		return new _langchain_core_messages.ToolMessage({
			content,
			tool_call_id: toolCallId,
			name: toolName,
			status: "error"
		});
	};
	return require_middleware.createMiddleware({
		name: "toolRetryMiddleware",
		contextSchema: ToolRetryMiddlewareOptionsSchema,
		wrapToolCall: async (request, handler) => {
			const toolName = request.tool?.name ?? request.toolCall.name;
			if (!shouldRetryTool(toolName)) return handler(request);
			const toolCallId = request.toolCall.id ?? "";
			for (let attempt = 0; attempt <= maxRetries; attempt++) try {
				return await handler(request);
			} catch (error) {
				const attemptsMade = attempt + 1;
				const err = error && typeof error === "object" && "message" in error ? error : new Error(String(error));
				if (!shouldRetryException(err)) return handleFailure(toolName, toolCallId, err, attemptsMade);
				if (attempt < maxRetries) {
					const delay = require_utils.calculateRetryDelay(delayConfig, attempt);
					if (delay > 0) await require_utils.sleep(delay);
				} else return handleFailure(toolName, toolCallId, err, attemptsMade);
			}
			throw new Error("Unexpected: retry loop completed without returning");
		}
	});
}

//#endregion
exports.toolRetryMiddleware = toolRetryMiddleware;
//# sourceMappingURL=toolRetry.cjs.map