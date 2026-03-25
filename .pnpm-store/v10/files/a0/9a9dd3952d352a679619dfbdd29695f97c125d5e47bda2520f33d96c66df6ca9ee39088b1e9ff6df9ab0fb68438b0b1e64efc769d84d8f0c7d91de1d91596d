import { AnySchema, AnyObjectSchema, SchemaOutput } from '../server/zod-compat.js';
import { ClientCapabilities, GetTaskRequest, GetTaskPayloadRequest, ListTasksResultSchema, CancelTaskResultSchema, JSONRPCRequest, Progress, RequestId, Result, ServerCapabilities, RequestMeta, RequestInfo, GetTaskResult, TaskCreationParams, RelatedTaskMetadata, Task, Request, Notification } from '../types.js';
import { Transport, TransportSendOptions } from './transport.js';
import { AuthInfo } from '../server/auth/types.js';
import { TaskStore, TaskMessageQueue, CreateTaskOptions } from '../experimental/tasks/interfaces.js';
import { ResponseMessage } from './responseMessage.js';
/**
 * Callback for progress notifications.
 */
export type ProgressCallback = (progress: Progress) => void;
/**
 * Additional initialization options.
 */
export type ProtocolOptions = {
    /**
     * Whether to restrict emitted requests to only those that the remote side has indicated that they can handle, through their advertised capabilities.
     *
     * Note that this DOES NOT affect checking of _local_ side capabilities, as it is considered a logic error to mis-specify those.
     *
     * Currently this defaults to false, for backwards compatibility with SDK versions that did not advertise capabilities correctly. In future, this will default to true.
     */
    enforceStrictCapabilities?: boolean;
    /**
     * An array of notification method names that should be automatically debounced.
     * Any notifications with a method in this list will be coalesced if they
     * occur in the same tick of the event loop.
     * e.g., ['notifications/tools/list_changed']
     */
    debouncedNotificationMethods?: string[];
    /**
     * Optional task storage implementation. If provided, enables task-related request handlers
     * and provides task storage capabilities to request handlers.
     */
    taskStore?: TaskStore;
    /**
     * Optional task message queue implementation for managing server-initiated messages
     * that will be delivered through the tasks/result response stream.
     */
    taskMessageQueue?: TaskMessageQueue;
    /**
     * Default polling interval (in milliseconds) for task status checks when no pollInterval
     * is provided by the server. Defaults to 5000ms if not specified.
     */
    defaultTaskPollInterval?: number;
    /**
     * Maximum number of messages that can be queued per task for side-channel delivery.
     * If undefined, the queue size is unbounded.
     * When the limit is exceeded, the TaskMessageQueue implementation's enqueue() method
     * will throw an error. It's the implementation's responsibility to handle overflow
     * appropriately (e.g., by failing the task, dropping messages, etc.).
     */
    maxTaskQueueSize?: number;
};
/**
 * The default request timeout, in miliseconds.
 */
export declare const DEFAULT_REQUEST_TIMEOUT_MSEC = 60000;
/**
 * Options that can be given per request.
 */
export type RequestOptions = {
    /**
     * If set, requests progress notifications from the remote end (if supported). When progress notifications are received, this callback will be invoked.
     *
     * For task-augmented requests: progress notifications continue after CreateTaskResult is returned and stop automatically when the task reaches a terminal status.
     */
    onprogress?: ProgressCallback;
    /**
     * Can be used to cancel an in-flight request. This will cause an AbortError to be raised from request().
     */
    signal?: AbortSignal;
    /**
     * A timeout (in milliseconds) for this request. If exceeded, an McpError with code `RequestTimeout` will be raised from request().
     *
     * If not specified, `DEFAULT_REQUEST_TIMEOUT_MSEC` will be used as the timeout.
     */
    timeout?: number;
    /**
     * If true, receiving a progress notification will reset the request timeout.
     * This is useful for long-running operations that send periodic progress updates.
     * Default: false
     */
    resetTimeoutOnProgress?: boolean;
    /**
     * Maximum total time (in milliseconds) to wait for a response.
     * If exceeded, an McpError with code `RequestTimeout` will be raised, regardless of progress notifications.
     * If not specified, there is no maximum total timeout.
     */
    maxTotalTimeout?: number;
    /**
     * If provided, augments the request with task creation parameters to enable call-now, fetch-later execution patterns.
     */
    task?: TaskCreationParams;
    /**
     * If provided, associates this request with a related task.
     */
    relatedTask?: RelatedTaskMetadata;
} & TransportSendOptions;
/**
 * Options that can be given per notification.
 */
export type NotificationOptions = {
    /**
     * May be used to indicate to the transport which incoming request to associate this outgoing notification with.
     */
    relatedRequestId?: RequestId;
    /**
     * If provided, associates this notification with a related task.
     */
    relatedTask?: RelatedTaskMetadata;
};
/**
 * Options that can be given per request.
 */
export type TaskRequestOptions = Omit<RequestOptions, 'relatedTask'>;
/**
 * Request-scoped TaskStore interface.
 */
export interface RequestTaskStore {
    /**
     * Creates a new task with the given creation parameters.
     * The implementation generates a unique taskId and createdAt timestamp.
     *
     * @param taskParams - The task creation parameters from the request
     * @returns The created task object
     */
    createTask(taskParams: CreateTaskOptions): Promise<Task>;
    /**
     * Gets the current status of a task.
     *
     * @param taskId - The task identifier
     * @returns The task object
     * @throws If the task does not exist
     */
    getTask(taskId: string): Promise<Task>;
    /**
     * Stores the result of a task and sets its final status.
     *
     * @param taskId - The task identifier
     * @param status - The final status: 'completed' for success, 'failed' for errors
     * @param result - The result to store
     */
    storeTaskResult(taskId: string, status: 'completed' | 'failed', result: Result): Promise<void>;
    /**
     * Retrieves the stored result of a task.
     *
     * @param taskId - The task identifier
     * @returns The stored result
     */
    getTaskResult(taskId: string): Promise<Result>;
    /**
     * Updates a task's status (e.g., to 'cancelled', 'failed', 'completed').
     *
     * @param taskId - The task identifier
     * @param status - The new status
     * @param statusMessage - Optional diagnostic message for failed tasks or other status information
     */
    updateTaskStatus(taskId: string, status: Task['status'], statusMessage?: string): Promise<void>;
    /**
     * Lists tasks, optionally starting from a pagination cursor.
     *
     * @param cursor - Optional cursor for pagination
     * @returns An object containing the tasks array and an optional nextCursor
     */
    listTasks(cursor?: string): Promise<{
        tasks: Task[];
        nextCursor?: string;
    }>;
}
/**
 * Extra data given to request handlers.
 */
export type RequestHandlerExtra<SendRequestT extends Request, SendNotificationT extends Notification> = {
    /**
     * An abort signal used to communicate if the request was cancelled from the sender's side.
     */
    signal: AbortSignal;
    /**
     * Information about a validated access token, provided to request handlers.
     */
    authInfo?: AuthInfo;
    /**
     * The session ID from the transport, if available.
     */
    sessionId?: string;
    /**
     * Metadata from the original request.
     */
    _meta?: RequestMeta;
    /**
     * The JSON-RPC ID of the request being handled.
     * This can be useful for tracking or logging purposes.
     */
    requestId: RequestId;
    taskId?: string;
    taskStore?: RequestTaskStore;
    taskRequestedTtl?: number | null;
    /**
     * The original HTTP request.
     */
    requestInfo?: RequestInfo;
    /**
     * Sends a notification that relates to the current request being handled.
     *
     * This is used by certain transports to correctly associate related messages.
     */
    sendNotification: (notification: SendNotificationT) => Promise<void>;
    /**
     * Sends a request that relates to the current request being handled.
     *
     * This is used by certain transports to correctly associate related messages.
     */
    sendRequest: <U extends AnySchema>(request: SendRequestT, resultSchema: U, options?: TaskRequestOptions) => Promise<SchemaOutput<U>>;
    /**
     * Closes the SSE stream for this request, triggering client reconnection.
     * Only available when using StreamableHTTPServerTransport with eventStore configured.
     * Use this to implement polling behavior during long-running operations.
     */
    closeSSEStream?: () => void;
    /**
     * Closes the standalone GET SSE stream, triggering client reconnection.
     * Only available when using StreamableHTTPServerTransport with eventStore configured.
     * Use this to implement polling behavior for server-initiated notifications.
     */
    closeStandaloneSSEStream?: () => void;
};
/**
 * Implements MCP protocol framing on top of a pluggable transport, including
 * features like request/response linking, notifications, and progress.
 */
export declare abstract class Protocol<SendRequestT extends Request, SendNotificationT extends Notification, SendResultT extends Result> {
    private _options?;
    private _transport?;
    private _requestMessageId;
    private _requestHandlers;
    private _requestHandlerAbortControllers;
    private _notificationHandlers;
    private _responseHandlers;
    private _progressHandlers;
    private _timeoutInfo;
    private _pendingDebouncedNotifications;
    private _taskProgressTokens;
    private _taskStore?;
    private _taskMessageQueue?;
    private _requestResolvers;
    /**
     * Callback for when the connection is closed for any reason.
     *
     * This is invoked when close() is called as well.
     */
    onclose?: () => void;
    /**
     * Callback for when an error occurs.
     *
     * Note that errors are not necessarily fatal; they are used for reporting any kind of exceptional condition out of band.
     */
    onerror?: (error: Error) => void;
    /**
     * A handler to invoke for any request types that do not have their own handler installed.
     */
    fallbackRequestHandler?: (request: JSONRPCRequest, extra: RequestHandlerExtra<SendRequestT, SendNotificationT>) => Promise<SendResultT>;
    /**
     * A handler to invoke for any notification types that do not have their own handler installed.
     */
    fallbackNotificationHandler?: (notification: Notification) => Promise<void>;
    constructor(_options?: ProtocolOptions | undefined);
    private _oncancel;
    private _setupTimeout;
    private _resetTimeout;
    private _cleanupTimeout;
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    connect(transport: Transport): Promise<void>;
    private _onclose;
    private _onerror;
    private _onnotification;
    private _onrequest;
    private _onprogress;
    private _onresponse;
    get transport(): Transport | undefined;
    /**
     * Closes the connection.
     */
    close(): Promise<void>;
    /**
     * A method to check if a capability is supported by the remote side, for the given method to be called.
     *
     * This should be implemented by subclasses.
     */
    protected abstract assertCapabilityForMethod(method: SendRequestT['method']): void;
    /**
     * A method to check if a notification is supported by the local side, for the given method to be sent.
     *
     * This should be implemented by subclasses.
     */
    protected abstract assertNotificationCapability(method: SendNotificationT['method']): void;
    /**
     * A method to check if a request handler is supported by the local side, for the given method to be handled.
     *
     * This should be implemented by subclasses.
     */
    protected abstract assertRequestHandlerCapability(method: string): void;
    /**
     * A method to check if task creation is supported for the given request method.
     *
     * This should be implemented by subclasses.
     */
    protected abstract assertTaskCapability(method: string): void;
    /**
     * A method to check if task handler is supported by the local side, for the given method to be handled.
     *
     * This should be implemented by subclasses.
     */
    protected abstract assertTaskHandlerCapability(method: string): void;
    /**
     * Sends a request and returns an AsyncGenerator that yields response messages.
     * The generator is guaranteed to end with either a 'result' or 'error' message.
     *
     * @example
     * ```typescript
     * const stream = protocol.requestStream(request, resultSchema, options);
     * for await (const message of stream) {
     *   switch (message.type) {
     *     case 'taskCreated':
     *       console.log('Task created:', message.task.taskId);
     *       break;
     *     case 'taskStatus':
     *       console.log('Task status:', message.task.status);
     *       break;
     *     case 'result':
     *       console.log('Final result:', message.result);
     *       break;
     *     case 'error':
     *       console.error('Error:', message.error);
     *       break;
     *   }
     * }
     * ```
     *
     * @experimental Use `client.experimental.tasks.requestStream()` to access this method.
     */
    protected requestStream<T extends AnySchema>(request: SendRequestT, resultSchema: T, options?: RequestOptions): AsyncGenerator<ResponseMessage<SchemaOutput<T>>, void, void>;
    /**
     * Sends a request and waits for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request<T extends AnySchema>(request: SendRequestT, resultSchema: T, options?: RequestOptions): Promise<SchemaOutput<T>>;
    /**
     * Gets the current status of a task.
     *
     * @experimental Use `client.experimental.tasks.getTask()` to access this method.
     */
    protected getTask(params: GetTaskRequest['params'], options?: RequestOptions): Promise<GetTaskResult>;
    /**
     * Retrieves the result of a completed task.
     *
     * @experimental Use `client.experimental.tasks.getTaskResult()` to access this method.
     */
    protected getTaskResult<T extends AnySchema>(params: GetTaskPayloadRequest['params'], resultSchema: T, options?: RequestOptions): Promise<SchemaOutput<T>>;
    /**
     * Lists tasks, optionally starting from a pagination cursor.
     *
     * @experimental Use `client.experimental.tasks.listTasks()` to access this method.
     */
    protected listTasks(params?: {
        cursor?: string;
    }, options?: RequestOptions): Promise<SchemaOutput<typeof ListTasksResultSchema>>;
    /**
     * Cancels a specific task.
     *
     * @experimental Use `client.experimental.tasks.cancelTask()` to access this method.
     */
    protected cancelTask(params: {
        taskId: string;
    }, options?: RequestOptions): Promise<SchemaOutput<typeof CancelTaskResultSchema>>;
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    notification(notification: SendNotificationT, options?: NotificationOptions): Promise<void>;
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler<T extends AnyObjectSchema>(requestSchema: T, handler: (request: SchemaOutput<T>, extra: RequestHandlerExtra<SendRequestT, SendNotificationT>) => SendResultT | Promise<SendResultT>): void;
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method: string): void;
    /**
     * Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
     */
    assertCanSetRequestHandler(method: string): void;
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler<T extends AnyObjectSchema>(notificationSchema: T, handler: (notification: SchemaOutput<T>) => void | Promise<void>): void;
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method: string): void;
    /**
     * Cleans up the progress handler associated with a task.
     * This should be called when a task reaches a terminal status.
     */
    private _cleanupTaskProgressHandler;
    /**
     * Enqueues a task-related message for side-channel delivery via tasks/result.
     * @param taskId The task ID to associate the message with
     * @param message The message to enqueue
     * @param sessionId Optional session ID for binding the operation to a specific session
     * @throws Error if taskStore is not configured or if enqueue fails (e.g., queue overflow)
     *
     * Note: If enqueue fails, it's the TaskMessageQueue implementation's responsibility to handle
     * the error appropriately (e.g., by failing the task, logging, etc.). The Protocol layer
     * simply propagates the error.
     */
    private _enqueueTaskMessage;
    /**
     * Clears the message queue for a task and rejects any pending request resolvers.
     * @param taskId The task ID whose queue should be cleared
     * @param sessionId Optional session ID for binding the operation to a specific session
     */
    private _clearTaskQueue;
    /**
     * Waits for a task update (new messages or status change) with abort signal support.
     * Uses polling to check for updates at the task's configured poll interval.
     * @param taskId The task ID to wait for
     * @param signal Abort signal to cancel the wait
     * @returns Promise that resolves when an update occurs or rejects if aborted
     */
    private _waitForTaskUpdate;
    private requestTaskStore;
}
export declare function mergeCapabilities(base: ServerCapabilities, additional: Partial<ServerCapabilities>): ServerCapabilities;
export declare function mergeCapabilities(base: ClientCapabilities, additional: Partial<ClientCapabilities>): ClientCapabilities;
//# sourceMappingURL=protocol.d.ts.map