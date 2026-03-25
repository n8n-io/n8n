/**
 * Experimental task interfaces for MCP SDK.
 * WARNING: These APIs are experimental and may change without notice.
 */
import { Task, RequestId, Result, JSONRPCRequest, JSONRPCNotification, JSONRPCResultResponse, JSONRPCErrorResponse, ServerRequest, ServerNotification, CallToolResult, GetTaskResult, ToolExecution, Request } from '../../types.js';
import { CreateTaskResult } from './types.js';
import type { RequestHandlerExtra, RequestTaskStore } from '../../shared/protocol.js';
import type { ZodRawShapeCompat, AnySchema, ShapeOutput } from '../../server/zod-compat.js';
/**
 * Extended handler extra with task store for task creation.
 * @experimental
 */
export interface CreateTaskRequestHandlerExtra extends RequestHandlerExtra<ServerRequest, ServerNotification> {
    taskStore: RequestTaskStore;
}
/**
 * Extended handler extra with task ID and store for task operations.
 * @experimental
 */
export interface TaskRequestHandlerExtra extends RequestHandlerExtra<ServerRequest, ServerNotification> {
    taskId: string;
    taskStore: RequestTaskStore;
}
/**
 * Base callback type for tool handlers.
 * @experimental
 */
export type BaseToolCallback<SendResultT extends Result, ExtraT extends RequestHandlerExtra<ServerRequest, ServerNotification>, Args extends undefined | ZodRawShapeCompat | AnySchema = undefined> = Args extends ZodRawShapeCompat ? (args: ShapeOutput<Args>, extra: ExtraT) => SendResultT | Promise<SendResultT> : Args extends AnySchema ? (args: unknown, extra: ExtraT) => SendResultT | Promise<SendResultT> : (extra: ExtraT) => SendResultT | Promise<SendResultT>;
/**
 * Handler for creating a task.
 * @experimental
 */
export type CreateTaskRequestHandler<SendResultT extends Result, Args extends undefined | ZodRawShapeCompat | AnySchema = undefined> = BaseToolCallback<SendResultT, CreateTaskRequestHandlerExtra, Args>;
/**
 * Handler for task operations (get, getResult).
 * @experimental
 */
export type TaskRequestHandler<SendResultT extends Result, Args extends undefined | ZodRawShapeCompat | AnySchema = undefined> = BaseToolCallback<SendResultT, TaskRequestHandlerExtra, Args>;
/**
 * Interface for task-based tool handlers.
 * @experimental
 */
export interface ToolTaskHandler<Args extends undefined | ZodRawShapeCompat | AnySchema = undefined> {
    createTask: CreateTaskRequestHandler<CreateTaskResult, Args>;
    getTask: TaskRequestHandler<GetTaskResult, Args>;
    getTaskResult: TaskRequestHandler<CallToolResult, Args>;
}
/**
 * Task-specific execution configuration.
 * taskSupport cannot be 'forbidden' for task-based tools.
 * @experimental
 */
export type TaskToolExecution<TaskSupport = ToolExecution['taskSupport']> = Omit<ToolExecution, 'taskSupport'> & {
    taskSupport: TaskSupport extends 'forbidden' | undefined ? never : TaskSupport;
};
/**
 * Represents a message queued for side-channel delivery via tasks/result.
 *
 * This is a serializable data structure that can be stored in external systems.
 * All fields are JSON-serializable.
 */
export type QueuedMessage = QueuedRequest | QueuedNotification | QueuedResponse | QueuedError;
export interface BaseQueuedMessage {
    /** Type of message */
    type: string;
    /** When the message was queued (milliseconds since epoch) */
    timestamp: number;
}
export interface QueuedRequest extends BaseQueuedMessage {
    type: 'request';
    /** The actual JSONRPC request */
    message: JSONRPCRequest;
}
export interface QueuedNotification extends BaseQueuedMessage {
    type: 'notification';
    /** The actual JSONRPC notification */
    message: JSONRPCNotification;
}
export interface QueuedResponse extends BaseQueuedMessage {
    type: 'response';
    /** The actual JSONRPC response */
    message: JSONRPCResultResponse;
}
export interface QueuedError extends BaseQueuedMessage {
    type: 'error';
    /** The actual JSONRPC error */
    message: JSONRPCErrorResponse;
}
/**
 * Interface for managing per-task FIFO message queues.
 *
 * Similar to TaskStore, this allows pluggable queue implementations
 * (in-memory, Redis, other distributed queues, etc.).
 *
 * Each method accepts taskId and optional sessionId parameters to enable
 * a single queue instance to manage messages for multiple tasks, with
 * isolation based on task ID and session ID.
 *
 * All methods are async to support external storage implementations.
 * All data in QueuedMessage must be JSON-serializable.
 *
 * @experimental
 */
export interface TaskMessageQueue {
    /**
     * Adds a message to the end of the queue for a specific task.
     * Atomically checks queue size and throws if maxSize would be exceeded.
     * @param taskId The task identifier
     * @param message The message to enqueue
     * @param sessionId Optional session ID for binding the operation to a specific session
     * @param maxSize Optional maximum queue size - if specified and queue is full, throws an error
     * @throws Error if maxSize is specified and would be exceeded
     */
    enqueue(taskId: string, message: QueuedMessage, sessionId?: string, maxSize?: number): Promise<void>;
    /**
     * Removes and returns the first message from the queue for a specific task.
     * @param taskId The task identifier
     * @param sessionId Optional session ID for binding the query to a specific session
     * @returns The first message, or undefined if the queue is empty
     */
    dequeue(taskId: string, sessionId?: string): Promise<QueuedMessage | undefined>;
    /**
     * Removes and returns all messages from the queue for a specific task.
     * Used when tasks are cancelled or failed to clean up pending messages.
     * @param taskId The task identifier
     * @param sessionId Optional session ID for binding the query to a specific session
     * @returns Array of all messages that were in the queue
     */
    dequeueAll(taskId: string, sessionId?: string): Promise<QueuedMessage[]>;
}
/**
 * Task creation options.
 * @experimental
 */
export interface CreateTaskOptions {
    /**
     * Time in milliseconds to keep task results available after completion.
     * If null, the task has unlimited lifetime until manually cleaned up.
     */
    ttl?: number | null;
    /**
     * Time in milliseconds to wait between task status requests.
     */
    pollInterval?: number;
    /**
     * Additional context to pass to the task store.
     */
    context?: Record<string, unknown>;
}
/**
 * Interface for storing and retrieving task state and results.
 *
 * Similar to Transport, this allows pluggable task storage implementations
 * (in-memory, database, distributed cache, etc.).
 *
 * @experimental
 */
export interface TaskStore {
    /**
     * Creates a new task with the given creation parameters and original request.
     * The implementation must generate a unique taskId and createdAt timestamp.
     *
     * TTL Management:
     * - The implementation receives the TTL suggested by the requestor via taskParams.ttl
     * - The implementation MAY override the requested TTL (e.g., to enforce limits)
     * - The actual TTL used MUST be returned in the Task object
     * - Null TTL indicates unlimited task lifetime (no automatic cleanup)
     * - Cleanup SHOULD occur automatically after TTL expires, regardless of task status
     *
     * @param taskParams - The task creation parameters from the request (ttl, pollInterval)
     * @param requestId - The JSON-RPC request ID
     * @param request - The original request that triggered task creation
     * @param sessionId - Optional session ID for binding the task to a specific session
     * @returns The created task object
     */
    createTask(taskParams: CreateTaskOptions, requestId: RequestId, request: Request, sessionId?: string): Promise<Task>;
    /**
     * Gets the current status of a task.
     *
     * @param taskId - The task identifier
     * @param sessionId - Optional session ID for binding the query to a specific session
     * @returns The task object, or null if it does not exist
     */
    getTask(taskId: string, sessionId?: string): Promise<Task | null>;
    /**
     * Stores the result of a task and sets its final status.
     *
     * @param taskId - The task identifier
     * @param status - The final status: 'completed' for success, 'failed' for errors
     * @param result - The result to store
     * @param sessionId - Optional session ID for binding the operation to a specific session
     */
    storeTaskResult(taskId: string, status: 'completed' | 'failed', result: Result, sessionId?: string): Promise<void>;
    /**
     * Retrieves the stored result of a task.
     *
     * @param taskId - The task identifier
     * @param sessionId - Optional session ID for binding the query to a specific session
     * @returns The stored result
     */
    getTaskResult(taskId: string, sessionId?: string): Promise<Result>;
    /**
     * Updates a task's status (e.g., to 'cancelled', 'failed', 'completed').
     *
     * @param taskId - The task identifier
     * @param status - The new status
     * @param statusMessage - Optional diagnostic message for failed tasks or other status information
     * @param sessionId - Optional session ID for binding the operation to a specific session
     */
    updateTaskStatus(taskId: string, status: Task['status'], statusMessage?: string, sessionId?: string): Promise<void>;
    /**
     * Lists tasks, optionally starting from a pagination cursor.
     *
     * @param cursor - Optional cursor for pagination
     * @param sessionId - Optional session ID for binding the query to a specific session
     * @returns An object containing the tasks array and an optional nextCursor
     */
    listTasks(cursor?: string, sessionId?: string): Promise<{
        tasks: Task[];
        nextCursor?: string;
    }>;
}
/**
 * Checks if a task status represents a terminal state.
 * Terminal states are those where the task has finished and will not change.
 *
 * @param status - The task status to check
 * @returns True if the status is terminal (completed, failed, or cancelled)
 * @experimental
 */
export declare function isTerminal(status: Task['status']): boolean;
//# sourceMappingURL=interfaces.d.ts.map