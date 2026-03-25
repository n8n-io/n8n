const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
const require_utils = require('./utils.cjs');
const require_middleware = require('../middleware.cjs');
const require_constants = require('./constants.cjs');
const require_error = require('./error.cjs');
let _langchain_core_messages = require("@langchain/core/messages");
let zod_v3 = require("zod/v3");

//#region src/agents/middleware/modelRetry.ts
/**
* Model retry middleware for agents.
*/
/**
* Configuration options for the Model Retry Middleware.
*/
const ModelRetryMiddlewareOptionsSchema = zod_v3.z.object({ onFailure: zod_v3.z.union([
	zod_v3.z.literal("error"),
	zod_v3.z.literal("continue"),
	zod_v3.z.function().args(zod_v3.z.instanceof(Error)).returns(zod_v3.z.string())
]).default("continue") }).merge(require_constants.RetrySchema);
/**
* Middleware that automatically retries failed model calls with configurable backoff.
*
* Supports retrying on specific exceptions and exponential backoff.
*
* @example Basic usage with default settings (2 retries, exponential backoff)
* ```ts
* import { createAgent, modelRetryMiddleware } from "langchain";
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   tools: [searchTool],
*   middleware: [modelRetryMiddleware()],
* });
* ```
*
* @example Retry specific exceptions only
* ```ts
* import { modelRetryMiddleware } from "langchain";
*
* const retry = modelRetryMiddleware({
*   maxRetries: 4,
*   retryOn: [TimeoutError, NetworkError],
*   backoffFactor: 1.5,
* });
* ```
*
* @example Custom exception filtering
* ```ts
* function shouldRetry(error: Error): boolean {
*   // Only retry on rate limit errors
*   if (error.name === "RateLimitError") {
*     return true;
*   }
*   // Or check for specific HTTP status codes
*   if (error.name === "HTTPError" && "statusCode" in error) {
*     const statusCode = (error as any).statusCode;
*     return statusCode === 429 || statusCode === 503;
*   }
*   return false;
* }
*
* const retry = modelRetryMiddleware({
*   maxRetries: 3,
*   retryOn: shouldRetry,
* });
* ```
*
* @example Return error message instead of raising
* ```ts
* const retry = modelRetryMiddleware({
*   maxRetries: 4,
*   onFailure: "continue", // Return AIMessage with error instead of throwing
* });
* ```
*
* @example Custom error message formatting
* ```ts
* const formatError = (error: Error) =>
*   `Model call failed: ${error.message}. Please try again later.`;
*
* const retry = modelRetryMiddleware({
*   maxRetries: 4,
*   onFailure: formatError,
* });
* ```
*
* @example Constant backoff (no exponential growth)
* ```ts
* const retry = modelRetryMiddleware({
*   maxRetries: 5,
*   backoffFactor: 0.0, // No exponential growth
*   initialDelayMs: 2000, // Always wait 2 seconds
* });
* ```
*
* @example Raise exception on failure
* ```ts
* const retry = modelRetryMiddleware({
*   maxRetries: 2,
*   onFailure: "error", // Re-raise exception instead of returning message
* });
* ```
*
* @param config - Configuration options for the retry middleware
* @returns A middleware instance that handles model failures with retries
*/
function modelRetryMiddleware(config = {}) {
	const { success, error, data } = ModelRetryMiddlewareOptionsSchema.safeParse(config);
	if (!success) throw new require_error.InvalidRetryConfigError(error);
	const { maxRetries, retryOn, onFailure, backoffFactor, initialDelayMs, maxDelayMs, jitter } = data;
	/**
	* Check if the exception should trigger a retry.
	*/
	const shouldRetryException = (error) => {
		if (typeof retryOn === "function") return retryOn(error);
		return retryOn.some((ErrorConstructor) => error.constructor === ErrorConstructor);
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
	const formatFailureMessage = (error, attemptsMade) => {
		const errorType = error.constructor.name;
		return `Model call failed after ${attemptsMade} ${attemptsMade === 1 ? "attempt" : "attempts"} with ${errorType}: ${error.message}`;
	};
	/**
	* Handle failure when all retries are exhausted.
	*/
	const handleFailure = (error, attemptsMade) => {
		if (onFailure === "error") throw error;
		let content;
		if (typeof onFailure === "function") content = onFailure(error);
		else content = formatFailureMessage(error, attemptsMade);
		return new _langchain_core_messages.AIMessage({ content });
	};
	return require_middleware.createMiddleware({
		name: "modelRetryMiddleware",
		contextSchema: ModelRetryMiddlewareOptionsSchema,
		wrapModelCall: async (request, handler) => {
			for (let attempt = 0; attempt <= maxRetries; attempt++) try {
				return await handler(request);
			} catch (error) {
				const attemptsMade = attempt + 1;
				const err = error && typeof error === "object" && "message" in error ? error : new Error(String(error));
				if (!shouldRetryException(err)) return handleFailure(err, attemptsMade);
				if (attempt < maxRetries) {
					const delay = require_utils.calculateRetryDelay(delayConfig, attempt);
					if (delay > 0) await require_utils.sleep(delay);
				} else return handleFailure(err, attemptsMade);
			}
			throw new Error("Unexpected: retry loop completed without returning");
		}
	});
}

//#endregion
exports.modelRetryMiddleware = modelRetryMiddleware;
//# sourceMappingURL=modelRetry.cjs.map