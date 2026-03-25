/**
 * Experimental client task features for MCP SDK.
 * WARNING: These APIs are experimental and may change without notice.
 *
 * @experimental
 */
import type { Client } from '../../client/index.js';
import type { RequestOptions } from '../../shared/protocol.js';
import type { ResponseMessage } from '../../shared/responseMessage.js';
import type { AnyObjectSchema, SchemaOutput } from '../../server/zod-compat.js';
import type { CallToolRequest, ClientRequest, Notification, Request, Result } from '../../types.js';
import { CallToolResultSchema, type CompatibilityCallToolResultSchema } from '../../types.js';
import type { GetTaskResult, ListTasksResult, CancelTaskResult } from './types.js';
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
export declare class ExperimentalClientTasks<RequestT extends Request = Request, NotificationT extends Notification = Notification, ResultT extends Result = Result> {
    private readonly _client;
    constructor(_client: Client<RequestT, NotificationT, ResultT>);
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
    callToolStream<T extends typeof CallToolResultSchema | typeof CompatibilityCallToolResultSchema>(params: CallToolRequest['params'], resultSchema?: T, options?: RequestOptions): AsyncGenerator<ResponseMessage<SchemaOutput<T>>, void, void>;
    /**
     * Gets the current status of a task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     * @returns The task status
     *
     * @experimental
     */
    getTask(taskId: string, options?: RequestOptions): Promise<GetTaskResult>;
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
    getTaskResult<T extends AnyObjectSchema>(taskId: string, resultSchema?: T, options?: RequestOptions): Promise<SchemaOutput<T>>;
    /**
     * Lists tasks with optional pagination.
     *
     * @param cursor - Optional pagination cursor
     * @param options - Optional request options
     * @returns List of tasks with optional next cursor
     *
     * @experimental
     */
    listTasks(cursor?: string, options?: RequestOptions): Promise<ListTasksResult>;
    /**
     * Cancels a running task.
     *
     * @param taskId - The task identifier
     * @param options - Optional request options
     *
     * @experimental
     */
    cancelTask(taskId: string, options?: RequestOptions): Promise<CancelTaskResult>;
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
    requestStream<T extends AnyObjectSchema>(request: ClientRequest | RequestT, resultSchema: T, options?: RequestOptions): AsyncGenerator<ResponseMessage<SchemaOutput<T>>, void, void>;
}
//# sourceMappingURL=client.d.ts.map