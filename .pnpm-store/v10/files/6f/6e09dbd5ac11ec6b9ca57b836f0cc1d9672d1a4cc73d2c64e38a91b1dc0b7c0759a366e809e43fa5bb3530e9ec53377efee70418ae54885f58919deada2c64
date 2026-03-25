"use strict";
/**
 * Experimental client task features for MCP SDK.
 * WARNING: These APIs are experimental and may change without notice.
 *
 * @experimental
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperimentalClientTasks = void 0;
const types_js_1 = require("../../types.js");
/**
 * Experimental task features for MCP clients.
 *
 * Access via `client.experimental.tasks`:
 * ```typescript
 * const stream = client.experimental.tasks.callToolStream({ name: 'tool', arguments: {} });
 * const task = await client.experimental.tasks.getTask(taskId);
 * ```
 *
 * @experimental
 */
class ExperimentalClientTasks {
    constructor(_client) {
        this._client = _client;
    }
    /**
     * Calls a tool and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * This method provides streaming access to tool execution, allowing you to
     * observe intermediate task status updates for long-running tool calls.
     * Automatically validates structured output if the tool has an outputSchema.
     *
     * @example
     * ```typescript
     * const stream = client.experimental.tasks.callToolStream({ name: 'myTool', arguments: {} });
     * for await (const message of stream) {
     *   switch (message.type) {
     *     case 'taskCreated':
     *       console.log('Tool execution started:', message.task.taskId);
     *       break;
     *     case 'taskStatus':
     *       console.log('Tool status:', message.task.status);
     *       break;
     *     case 'result':
     *       console.log('Tool result:', message.result);
     *       break;
     *     case 'error':
     *       console.error('Tool error:', message.error);
     *       break;
     *   }
     * }
     * ```
     *
     * @param params - Tool call parameters (name and arguments)
     * @param resultSchema - Zod schema for validating the result (defaults to CallToolResultSchema)
     * @param options - Optional request options (timeout, signal, task creation params, etc.)
     * @returns AsyncGenerator that yields ResponseMessage objects
     *
     * @experimental
     */
    async *callToolStream(params, resultSchema = types_js_1.CallToolResultSchema, options) {
        // Access Client's internal methods
        const clientInternal = this._client;
        // Add task creation parameters if server supports it and not explicitly provided
        const optionsWithTask = {
            ...options,
            // We check if the tool is known to be a task during auto-configuration, but assume
            // the caller knows what they're doing if they pass this explicitly
            task: options?.task ?? (clientInternal.isToolTask(params.name) ? {} : undefined)
        };
        const stream = clientInternal.requestStream({ method: 'tools/call', params }, resultSchema, optionsWithTask);
        // Get the validator for this tool (if it has an output schema)
        const validator = clientInternal.getToolOutputValidator(params.name);
        // Iterate through the stream and validate the final result if needed
        for await (const message of stream) {
            // If this is a result message and the tool has an output schema, validate it
            if (message.type === 'result' && validator) {
                const result = message.result;
                // If tool has outputSchema, it MUST return structuredContent (unless it's an error)
                if (!result.structuredContent && !result.isError) {
                    yield {
                        type: 'error',
                        error: new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `Tool ${params.name} has an output schema but did not return structured content`)
                    };
                    return;
                }
                // Only validate structured content if present (not when there's an error)
                if (result.structuredContent) {
                    try {
                        // Validate the structured content against the schema
                        const validationResult = validator(result.structuredContent);
                        if (!validationResult.valid) {
                            yield {
                                type: 'error',
                                error: new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`)
                            };
                            return;
                        }
                    }
                    catch (error) {
                        if (error instanceof types_js_1.McpError) {
                            yield { type: 'error', error };
                            return;
                        }
                        yield {
                            type: 'error',
                            error: new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`)
                        };
                        return;
                    }
                }
            }
            // Yield the message (either validated result or any other message type)
            yield message;
        }
    }
    /**
     * Gets the current status of a task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     * @returns The task status
     *
     * @experimental
     */
    async getTask(taskId, options) {
        return this._client.getTask({ taskId }, options);
    }
    /**
     * Retrieves the result of a completed task.
     *
     * @param taskId - The task identifier
     * @param resultSchema - Zod schema for validating the result
     * @param options - Optional request options
     * @returns The task result
     *
     * @experimental
     */
    async getTaskResult(taskId, resultSchema, options) {
        // Delegate to the client's underlying Protocol method
        return this._client.getTaskResult({ taskId }, resultSchema, options);
    }
    /**
     * Lists tasks with optional pagination.
     *
     * @param cursor - Optional pagination cursor
     * @param options - Optional request options
     * @returns List of tasks with optional next cursor
     *
     * @experimental
     */
    async listTasks(cursor, options) {
        // Delegate to the client's underlying Protocol method
        return this._client.listTasks(cursor ? { cursor } : undefined, options);
    }
    /**
     * Cancels a running task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     *
     * @experimental
     */
    async cancelTask(taskId, options) {
        // Delegate to the client's underlying Protocol method
        return this._client.cancelTask({ taskId }, options);
    }
    /**
     * Sends a request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * This method provides streaming access to request processing, allowing you to
     * observe intermediate task status updates for task-augmented requests.
     *
     * @param request - The request to send
     * @param resultSchema - Zod schema for validating the result
     * @param options - Optional request options (timeout, signal, task creation params, etc.)
     * @returns AsyncGenerator that yields ResponseMessage objects
     *
     * @experimental
     */
    requestStream(request, resultSchema, options) {
        return this._client.requestStream(request, resultSchema, options);
    }
}
exports.ExperimentalClientTasks = ExperimentalClientTasks;
//# sourceMappingURL=client.js.map