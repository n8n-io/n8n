"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Protocol = exports.DEFAULT_REQUEST_TIMEOUT_MSEC = void 0;
exports.mergeCapabilities = mergeCapabilities;
const zod_compat_js_1 = require("../server/zod-compat.js");
const types_js_1 = require("../types.js");
const interfaces_js_1 = require("../experimental/tasks/interfaces.js");
const zod_json_schema_compat_js_1 = require("../server/zod-json-schema-compat.js");
/**
 * The default request timeout, in miliseconds.
 */
exports.DEFAULT_REQUEST_TIMEOUT_MSEC = 60000;
/**
 * Implements MCP protocol framing on top of a pluggable transport, including
 * features like request/response linking, notifications, and progress.
 */
class Protocol {
    constructor(_options) {
        this._options = _options;
        this._requestMessageId = 0;
        this._requestHandlers = new Map();
        this._requestHandlerAbortControllers = new Map();
        this._notificationHandlers = new Map();
        this._responseHandlers = new Map();
        this._progressHandlers = new Map();
        this._timeoutInfo = new Map();
        this._pendingDebouncedNotifications = new Set();
        // Maps task IDs to progress tokens to keep handlers alive after CreateTaskResult
        this._taskProgressTokens = new Map();
        this._requestResolvers = new Map();
        this.setNotificationHandler(types_js_1.CancelledNotificationSchema, notification => {
            this._oncancel(notification);
        });
        this.setNotificationHandler(types_js_1.ProgressNotificationSchema, notification => {
            this._onprogress(notification);
        });
        this.setRequestHandler(types_js_1.PingRequestSchema, 
        // Automatic pong by default.
        _request => ({}));
        // Install task handlers if TaskStore is provided
        this._taskStore = _options?.taskStore;
        this._taskMessageQueue = _options?.taskMessageQueue;
        if (this._taskStore) {
            this.setRequestHandler(types_js_1.GetTaskRequestSchema, async (request, extra) => {
                const task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
                if (!task) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Failed to retrieve task: Task not found');
                }
                // Per spec: tasks/get responses SHALL NOT include related-task metadata
                // as the taskId parameter is the source of truth
                // @ts-expect-error SendResultT cannot contain GetTaskResult, but we include it in our derived types everywhere else
                return {
                    ...task
                };
            });
            this.setRequestHandler(types_js_1.GetTaskPayloadRequestSchema, async (request, extra) => {
                const handleTaskResult = async () => {
                    const taskId = request.params.taskId;
                    // Deliver queued messages
                    if (this._taskMessageQueue) {
                        let queuedMessage;
                        while ((queuedMessage = await this._taskMessageQueue.dequeue(taskId, extra.sessionId))) {
                            // Handle response and error messages by routing them to the appropriate resolver
                            if (queuedMessage.type === 'response' || queuedMessage.type === 'error') {
                                const message = queuedMessage.message;
                                const requestId = message.id;
                                // Lookup resolver in _requestResolvers map
                                const resolver = this._requestResolvers.get(requestId);
                                if (resolver) {
                                    // Remove resolver from map after invocation
                                    this._requestResolvers.delete(requestId);
                                    // Invoke resolver with response or error
                                    if (queuedMessage.type === 'response') {
                                        resolver(message);
                                    }
                                    else {
                                        // Convert JSONRPCError to McpError
                                        const errorMessage = message;
                                        const error = new types_js_1.McpError(errorMessage.error.code, errorMessage.error.message, errorMessage.error.data);
                                        resolver(error);
                                    }
                                }
                                else {
                                    // Handle missing resolver gracefully with error logging
                                    const messageType = queuedMessage.type === 'response' ? 'Response' : 'Error';
                                    this._onerror(new Error(`${messageType} handler missing for request ${requestId}`));
                                }
                                // Continue to next message
                                continue;
                            }
                            // Send the message on the response stream by passing the relatedRequestId
                            // This tells the transport to write the message to the tasks/result response stream
                            await this._transport?.send(queuedMessage.message, { relatedRequestId: extra.requestId });
                        }
                    }
                    // Now check task status
                    const task = await this._taskStore.getTask(taskId, extra.sessionId);
                    if (!task) {
                        throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Task not found: ${taskId}`);
                    }
                    // Block if task is not terminal (we've already delivered all queued messages above)
                    if (!(0, interfaces_js_1.isTerminal)(task.status)) {
                        // Wait for status change or new messages
                        await this._waitForTaskUpdate(taskId, extra.signal);
                        // After waking up, recursively call to deliver any new messages or result
                        return await handleTaskResult();
                    }
                    // If task is terminal, return the result
                    if ((0, interfaces_js_1.isTerminal)(task.status)) {
                        const result = await this._taskStore.getTaskResult(taskId, extra.sessionId);
                        this._clearTaskQueue(taskId);
                        return {
                            ...result,
                            _meta: {
                                ...result._meta,
                                [types_js_1.RELATED_TASK_META_KEY]: {
                                    taskId: taskId
                                }
                            }
                        };
                    }
                    return await handleTaskResult();
                };
                return await handleTaskResult();
            });
            this.setRequestHandler(types_js_1.ListTasksRequestSchema, async (request, extra) => {
                try {
                    const { tasks, nextCursor } = await this._taskStore.listTasks(request.params?.cursor, extra.sessionId);
                    // @ts-expect-error SendResultT cannot contain ListTasksResult, but we include it in our derived types everywhere else
                    return {
                        tasks,
                        nextCursor,
                        _meta: {}
                    };
                }
                catch (error) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
                }
            });
            this.setRequestHandler(types_js_1.CancelTaskRequestSchema, async (request, extra) => {
                try {
                    // Get the current task to check if it's in a terminal state, in case the implementation is not atomic
                    const task = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
                    if (!task) {
                        throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Task not found: ${request.params.taskId}`);
                    }
                    // Reject cancellation of terminal tasks
                    if ((0, interfaces_js_1.isTerminal)(task.status)) {
                        throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Cannot cancel task in terminal status: ${task.status}`);
                    }
                    await this._taskStore.updateTaskStatus(request.params.taskId, 'cancelled', 'Client cancelled task execution.', extra.sessionId);
                    this._clearTaskQueue(request.params.taskId);
                    const cancelledTask = await this._taskStore.getTask(request.params.taskId, extra.sessionId);
                    if (!cancelledTask) {
                        // Task was deleted during cancellation (e.g., cleanup happened)
                        throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Task not found after cancellation: ${request.params.taskId}`);
                    }
                    return {
                        _meta: {},
                        ...cancelledTask
                    };
                }
                catch (error) {
                    // Re-throw McpError as-is
                    if (error instanceof types_js_1.McpError) {
                        throw error;
                    }
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `Failed to cancel task: ${error instanceof Error ? error.message : String(error)}`);
                }
            });
        }
    }
    async _oncancel(notification) {
        if (!notification.params.requestId) {
            return;
        }
        // Handle request cancellation
        const controller = this._requestHandlerAbortControllers.get(notification.params.requestId);
        controller?.abort(notification.params.reason);
    }
    _setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
        this._timeoutInfo.set(messageId, {
            timeoutId: setTimeout(onTimeout, timeout),
            startTime: Date.now(),
            timeout,
            maxTotalTimeout,
            resetTimeoutOnProgress,
            onTimeout
        });
    }
    _resetTimeout(messageId) {
        const info = this._timeoutInfo.get(messageId);
        if (!info)
            return false;
        const totalElapsed = Date.now() - info.startTime;
        if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
            this._timeoutInfo.delete(messageId);
            throw types_js_1.McpError.fromError(types_js_1.ErrorCode.RequestTimeout, 'Maximum total timeout exceeded', {
                maxTotalTimeout: info.maxTotalTimeout,
                totalElapsed
            });
        }
        clearTimeout(info.timeoutId);
        info.timeoutId = setTimeout(info.onTimeout, info.timeout);
        return true;
    }
    _cleanupTimeout(messageId) {
        const info = this._timeoutInfo.get(messageId);
        if (info) {
            clearTimeout(info.timeoutId);
            this._timeoutInfo.delete(messageId);
        }
    }
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The Protocol object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    async connect(transport) {
        if (this._transport) {
            throw new Error('Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.');
        }
        this._transport = transport;
        const _onclose = this.transport?.onclose;
        this._transport.onclose = () => {
            _onclose?.();
            this._onclose();
        };
        const _onerror = this.transport?.onerror;
        this._transport.onerror = (error) => {
            _onerror?.(error);
            this._onerror(error);
        };
        const _onmessage = this._transport?.onmessage;
        this._transport.onmessage = (message, extra) => {
            _onmessage?.(message, extra);
            if ((0, types_js_1.isJSONRPCResultResponse)(message) || (0, types_js_1.isJSONRPCErrorResponse)(message)) {
                this._onresponse(message);
            }
            else if ((0, types_js_1.isJSONRPCRequest)(message)) {
                this._onrequest(message, extra);
            }
            else if ((0, types_js_1.isJSONRPCNotification)(message)) {
                this._onnotification(message);
            }
            else {
                this._onerror(new Error(`Unknown message type: ${JSON.stringify(message)}`));
            }
        };
        await this._transport.start();
    }
    _onclose() {
        const responseHandlers = this._responseHandlers;
        this._responseHandlers = new Map();
        this._progressHandlers.clear();
        this._taskProgressTokens.clear();
        this._pendingDebouncedNotifications.clear();
        // Abort all in-flight request handlers so they stop sending messages
        for (const controller of this._requestHandlerAbortControllers.values()) {
            controller.abort();
        }
        this._requestHandlerAbortControllers.clear();
        const error = types_js_1.McpError.fromError(types_js_1.ErrorCode.ConnectionClosed, 'Connection closed');
        this._transport = undefined;
        this.onclose?.();
        for (const handler of responseHandlers.values()) {
            handler(error);
        }
    }
    _onerror(error) {
        this.onerror?.(error);
    }
    _onnotification(notification) {
        const handler = this._notificationHandlers.get(notification.method) ?? this.fallbackNotificationHandler;
        // Ignore notifications not being subscribed to.
        if (handler === undefined) {
            return;
        }
        // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
        Promise.resolve()
            .then(() => handler(notification))
            .catch(error => this._onerror(new Error(`Uncaught error in notification handler: ${error}`)));
    }
    _onrequest(request, extra) {
        const handler = this._requestHandlers.get(request.method) ?? this.fallbackRequestHandler;
        // Capture the current transport at request time to ensure responses go to the correct client
        const capturedTransport = this._transport;
        // Extract taskId from request metadata if present (needed early for method not found case)
        const relatedTaskId = request.params?._meta?.[types_js_1.RELATED_TASK_META_KEY]?.taskId;
        if (handler === undefined) {
            const errorResponse = {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: types_js_1.ErrorCode.MethodNotFound,
                    message: 'Method not found'
                }
            };
            // Queue or send the error response based on whether this is a task-related request
            if (relatedTaskId && this._taskMessageQueue) {
                this._enqueueTaskMessage(relatedTaskId, {
                    type: 'error',
                    message: errorResponse,
                    timestamp: Date.now()
                }, capturedTransport?.sessionId).catch(error => this._onerror(new Error(`Failed to enqueue error response: ${error}`)));
            }
            else {
                capturedTransport
                    ?.send(errorResponse)
                    .catch(error => this._onerror(new Error(`Failed to send an error response: ${error}`)));
            }
            return;
        }
        const abortController = new AbortController();
        this._requestHandlerAbortControllers.set(request.id, abortController);
        const taskCreationParams = (0, types_js_1.isTaskAugmentedRequestParams)(request.params) ? request.params.task : undefined;
        const taskStore = this._taskStore ? this.requestTaskStore(request, capturedTransport?.sessionId) : undefined;
        const fullExtra = {
            signal: abortController.signal,
            sessionId: capturedTransport?.sessionId,
            _meta: request.params?._meta,
            sendNotification: async (notification) => {
                if (abortController.signal.aborted)
                    return;
                // Include related-task metadata if this request is part of a task
                const notificationOptions = { relatedRequestId: request.id };
                if (relatedTaskId) {
                    notificationOptions.relatedTask = { taskId: relatedTaskId };
                }
                await this.notification(notification, notificationOptions);
            },
            sendRequest: async (r, resultSchema, options) => {
                if (abortController.signal.aborted) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.ConnectionClosed, 'Request was cancelled');
                }
                // Include related-task metadata if this request is part of a task
                const requestOptions = { ...options, relatedRequestId: request.id };
                if (relatedTaskId && !requestOptions.relatedTask) {
                    requestOptions.relatedTask = { taskId: relatedTaskId };
                }
                // Set task status to input_required when sending a request within a task context
                // Use the taskId from options (explicit) or fall back to relatedTaskId (inherited)
                const effectiveTaskId = requestOptions.relatedTask?.taskId ?? relatedTaskId;
                if (effectiveTaskId && taskStore) {
                    await taskStore.updateTaskStatus(effectiveTaskId, 'input_required');
                }
                return await this.request(r, resultSchema, requestOptions);
            },
            authInfo: extra?.authInfo,
            requestId: request.id,
            requestInfo: extra?.requestInfo,
            taskId: relatedTaskId,
            taskStore: taskStore,
            taskRequestedTtl: taskCreationParams?.ttl,
            closeSSEStream: extra?.closeSSEStream,
            closeStandaloneSSEStream: extra?.closeStandaloneSSEStream
        };
        // Starting with Promise.resolve() puts any synchronous errors into the monad as well.
        Promise.resolve()
            .then(() => {
            // If this request asked for task creation, check capability first
            if (taskCreationParams) {
                // Check if the request method supports task creation
                this.assertTaskHandlerCapability(request.method);
            }
        })
            .then(() => handler(request, fullExtra))
            .then(async (result) => {
            if (abortController.signal.aborted) {
                // Request was cancelled
                return;
            }
            const response = {
                result,
                jsonrpc: '2.0',
                id: request.id
            };
            // Queue or send the response based on whether this is a task-related request
            if (relatedTaskId && this._taskMessageQueue) {
                await this._enqueueTaskMessage(relatedTaskId, {
                    type: 'response',
                    message: response,
                    timestamp: Date.now()
                }, capturedTransport?.sessionId);
            }
            else {
                await capturedTransport?.send(response);
            }
        }, async (error) => {
            if (abortController.signal.aborted) {
                // Request was cancelled
                return;
            }
            const errorResponse = {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: Number.isSafeInteger(error['code']) ? error['code'] : types_js_1.ErrorCode.InternalError,
                    message: error.message ?? 'Internal error',
                    ...(error['data'] !== undefined && { data: error['data'] })
                }
            };
            // Queue or send the error response based on whether this is a task-related request
            if (relatedTaskId && this._taskMessageQueue) {
                await this._enqueueTaskMessage(relatedTaskId, {
                    type: 'error',
                    message: errorResponse,
                    timestamp: Date.now()
                }, capturedTransport?.sessionId);
            }
            else {
                await capturedTransport?.send(errorResponse);
            }
        })
            .catch(error => this._onerror(new Error(`Failed to send response: ${error}`)))
            .finally(() => {
            this._requestHandlerAbortControllers.delete(request.id);
        });
    }
    _onprogress(notification) {
        const { progressToken, ...params } = notification.params;
        const messageId = Number(progressToken);
        const handler = this._progressHandlers.get(messageId);
        if (!handler) {
            this._onerror(new Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`));
            return;
        }
        const responseHandler = this._responseHandlers.get(messageId);
        const timeoutInfo = this._timeoutInfo.get(messageId);
        if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress) {
            try {
                this._resetTimeout(messageId);
            }
            catch (error) {
                // Clean up if maxTotalTimeout was exceeded
                this._responseHandlers.delete(messageId);
                this._progressHandlers.delete(messageId);
                this._cleanupTimeout(messageId);
                responseHandler(error);
                return;
            }
        }
        handler(params);
    }
    _onresponse(response) {
        const messageId = Number(response.id);
        // Check if this is a response to a queued request
        const resolver = this._requestResolvers.get(messageId);
        if (resolver) {
            this._requestResolvers.delete(messageId);
            if ((0, types_js_1.isJSONRPCResultResponse)(response)) {
                resolver(response);
            }
            else {
                const error = new types_js_1.McpError(response.error.code, response.error.message, response.error.data);
                resolver(error);
            }
            return;
        }
        const handler = this._responseHandlers.get(messageId);
        if (handler === undefined) {
            this._onerror(new Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
            return;
        }
        this._responseHandlers.delete(messageId);
        this._cleanupTimeout(messageId);
        // Keep progress handler alive for CreateTaskResult responses
        let isTaskResponse = false;
        if ((0, types_js_1.isJSONRPCResultResponse)(response) && response.result && typeof response.result === 'object') {
            const result = response.result;
            if (result.task && typeof result.task === 'object') {
                const task = result.task;
                if (typeof task.taskId === 'string') {
                    isTaskResponse = true;
                    this._taskProgressTokens.set(task.taskId, messageId);
                }
            }
        }
        if (!isTaskResponse) {
            this._progressHandlers.delete(messageId);
        }
        if ((0, types_js_1.isJSONRPCResultResponse)(response)) {
            handler(response);
        }
        else {
            const error = types_js_1.McpError.fromError(response.error.code, response.error.message, response.error.data);
            handler(error);
        }
    }
    get transport() {
        return this._transport;
    }
    /**
     * Closes the connection.
     */
    async close() {
        await this._transport?.close();
    }
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
    async *requestStream(request, resultSchema, options) {
        const { task } = options ?? {};
        // For non-task requests, just yield the result
        if (!task) {
            try {
                const result = await this.request(request, resultSchema, options);
                yield { type: 'result', result };
            }
            catch (error) {
                yield {
                    type: 'error',
                    error: error instanceof types_js_1.McpError ? error : new types_js_1.McpError(types_js_1.ErrorCode.InternalError, String(error))
                };
            }
            return;
        }
        // For task-augmented requests, we need to poll for status
        // First, make the request to create the task
        let taskId;
        try {
            // Send the request and get the CreateTaskResult
            const createResult = await this.request(request, types_js_1.CreateTaskResultSchema, options);
            // Extract taskId from the result
            if (createResult.task) {
                taskId = createResult.task.taskId;
                yield { type: 'taskCreated', task: createResult.task };
            }
            else {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, 'Task creation did not return a task');
            }
            // Poll for task completion
            while (true) {
                // Get current task status
                const task = await this.getTask({ taskId }, options);
                yield { type: 'taskStatus', task };
                // Check if task is terminal
                if ((0, interfaces_js_1.isTerminal)(task.status)) {
                    if (task.status === 'completed') {
                        // Get the final result
                        const result = await this.getTaskResult({ taskId }, resultSchema, options);
                        yield { type: 'result', result };
                    }
                    else if (task.status === 'failed') {
                        yield {
                            type: 'error',
                            error: new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Task ${taskId} failed`)
                        };
                    }
                    else if (task.status === 'cancelled') {
                        yield {
                            type: 'error',
                            error: new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Task ${taskId} was cancelled`)
                        };
                    }
                    return;
                }
                // When input_required, call tasks/result to deliver queued messages
                // (elicitation, sampling) via SSE and block until terminal
                if (task.status === 'input_required') {
                    const result = await this.getTaskResult({ taskId }, resultSchema, options);
                    yield { type: 'result', result };
                    return;
                }
                // Wait before polling again
                const pollInterval = task.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1000;
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                // Check if cancelled
                options?.signal?.throwIfAborted();
            }
        }
        catch (error) {
            yield {
                type: 'error',
                error: error instanceof types_js_1.McpError ? error : new types_js_1.McpError(types_js_1.ErrorCode.InternalError, String(error))
            };
        }
    }
    /**
     * Sends a request and waits for a response.
     *
     * Do not use this method to emit notifications! Use notification() instead.
     */
    request(request, resultSchema, options) {
        const { relatedRequestId, resumptionToken, onresumptiontoken, task, relatedTask } = options ?? {};
        // Send the request
        return new Promise((resolve, reject) => {
            const earlyReject = (error) => {
                reject(error);
            };
            if (!this._transport) {
                earlyReject(new Error('Not connected'));
                return;
            }
            if (this._options?.enforceStrictCapabilities === true) {
                try {
                    this.assertCapabilityForMethod(request.method);
                    // If task creation is requested, also check task capabilities
                    if (task) {
                        this.assertTaskCapability(request.method);
                    }
                }
                catch (e) {
                    earlyReject(e);
                    return;
                }
            }
            options?.signal?.throwIfAborted();
            const messageId = this._requestMessageId++;
            const jsonrpcRequest = {
                ...request,
                jsonrpc: '2.0',
                id: messageId
            };
            if (options?.onprogress) {
                this._progressHandlers.set(messageId, options.onprogress);
                jsonrpcRequest.params = {
                    ...request.params,
                    _meta: {
                        ...(request.params?._meta || {}),
                        progressToken: messageId
                    }
                };
            }
            // Augment with task creation parameters if provided
            if (task) {
                jsonrpcRequest.params = {
                    ...jsonrpcRequest.params,
                    task: task
                };
            }
            // Augment with related task metadata if relatedTask is provided
            if (relatedTask) {
                jsonrpcRequest.params = {
                    ...jsonrpcRequest.params,
                    _meta: {
                        ...(jsonrpcRequest.params?._meta || {}),
                        [types_js_1.RELATED_TASK_META_KEY]: relatedTask
                    }
                };
            }
            const cancel = (reason) => {
                this._responseHandlers.delete(messageId);
                this._progressHandlers.delete(messageId);
                this._cleanupTimeout(messageId);
                this._transport
                    ?.send({
                    jsonrpc: '2.0',
                    method: 'notifications/cancelled',
                    params: {
                        requestId: messageId,
                        reason: String(reason)
                    }
                }, { relatedRequestId, resumptionToken, onresumptiontoken })
                    .catch(error => this._onerror(new Error(`Failed to send cancellation: ${error}`)));
                // Wrap the reason in an McpError if it isn't already
                const error = reason instanceof types_js_1.McpError ? reason : new types_js_1.McpError(types_js_1.ErrorCode.RequestTimeout, String(reason));
                reject(error);
            };
            this._responseHandlers.set(messageId, response => {
                if (options?.signal?.aborted) {
                    return;
                }
                if (response instanceof Error) {
                    return reject(response);
                }
                try {
                    const parseResult = (0, zod_compat_js_1.safeParse)(resultSchema, response.result);
                    if (!parseResult.success) {
                        // Type guard: if success is false, error is guaranteed to exist
                        reject(parseResult.error);
                    }
                    else {
                        resolve(parseResult.data);
                    }
                }
                catch (error) {
                    reject(error);
                }
            });
            options?.signal?.addEventListener('abort', () => {
                cancel(options?.signal?.reason);
            });
            const timeout = options?.timeout ?? exports.DEFAULT_REQUEST_TIMEOUT_MSEC;
            const timeoutHandler = () => cancel(types_js_1.McpError.fromError(types_js_1.ErrorCode.RequestTimeout, 'Request timed out', { timeout }));
            this._setupTimeout(messageId, timeout, options?.maxTotalTimeout, timeoutHandler, options?.resetTimeoutOnProgress ?? false);
            // Queue request if related to a task
            const relatedTaskId = relatedTask?.taskId;
            if (relatedTaskId) {
                // Store the response resolver for this request so responses can be routed back
                const responseResolver = (response) => {
                    const handler = this._responseHandlers.get(messageId);
                    if (handler) {
                        handler(response);
                    }
                    else {
                        // Log error when resolver is missing, but don't fail
                        this._onerror(new Error(`Response handler missing for side-channeled request ${messageId}`));
                    }
                };
                this._requestResolvers.set(messageId, responseResolver);
                this._enqueueTaskMessage(relatedTaskId, {
                    type: 'request',
                    message: jsonrpcRequest,
                    timestamp: Date.now()
                }).catch(error => {
                    this._cleanupTimeout(messageId);
                    reject(error);
                });
                // Don't send through transport - queued messages are delivered via tasks/result only
                // This prevents duplicate delivery for bidirectional transports
            }
            else {
                // No related task - send through transport normally
                this._transport.send(jsonrpcRequest, { relatedRequestId, resumptionToken, onresumptiontoken }).catch(error => {
                    this._cleanupTimeout(messageId);
                    reject(error);
                });
            }
        });
    }
    /**
     * Gets the current status of a task.
     *
     * @experimental Use `client.experimental.tasks.getTask()` to access this method.
     */
    async getTask(params, options) {
        // @ts-expect-error SendRequestT cannot directly contain GetTaskRequest, but we ensure all type instantiations contain it anyways
        return this.request({ method: 'tasks/get', params }, types_js_1.GetTaskResultSchema, options);
    }
    /**
     * Retrieves the result of a completed task.
     *
     * @experimental Use `client.experimental.tasks.getTaskResult()` to access this method.
     */
    async getTaskResult(params, resultSchema, options) {
        // @ts-expect-error SendRequestT cannot directly contain GetTaskPayloadRequest, but we ensure all type instantiations contain it anyways
        return this.request({ method: 'tasks/result', params }, resultSchema, options);
    }
    /**
     * Lists tasks, optionally starting from a pagination cursor.
     *
     * @experimental Use `client.experimental.tasks.listTasks()` to access this method.
     */
    async listTasks(params, options) {
        // @ts-expect-error SendRequestT cannot directly contain ListTasksRequest, but we ensure all type instantiations contain it anyways
        return this.request({ method: 'tasks/list', params }, types_js_1.ListTasksResultSchema, options);
    }
    /**
     * Cancels a specific task.
     *
     * @experimental Use `client.experimental.tasks.cancelTask()` to access this method.
     */
    async cancelTask(params, options) {
        // @ts-expect-error SendRequestT cannot directly contain CancelTaskRequest, but we ensure all type instantiations contain it anyways
        return this.request({ method: 'tasks/cancel', params }, types_js_1.CancelTaskResultSchema, options);
    }
    /**
     * Emits a notification, which is a one-way message that does not expect a response.
     */
    async notification(notification, options) {
        if (!this._transport) {
            throw new Error('Not connected');
        }
        this.assertNotificationCapability(notification.method);
        // Queue notification if related to a task
        const relatedTaskId = options?.relatedTask?.taskId;
        if (relatedTaskId) {
            // Build the JSONRPC notification with metadata
            const jsonrpcNotification = {
                ...notification,
                jsonrpc: '2.0',
                params: {
                    ...notification.params,
                    _meta: {
                        ...(notification.params?._meta || {}),
                        [types_js_1.RELATED_TASK_META_KEY]: options.relatedTask
                    }
                }
            };
            await this._enqueueTaskMessage(relatedTaskId, {
                type: 'notification',
                message: jsonrpcNotification,
                timestamp: Date.now()
            });
            // Don't send through transport - queued messages are delivered via tasks/result only
            // This prevents duplicate delivery for bidirectional transports
            return;
        }
        const debouncedMethods = this._options?.debouncedNotificationMethods ?? [];
        // A notification can only be debounced if it's in the list AND it's "simple"
        // (i.e., has no parameters and no related request ID or related task that could be lost).
        const canDebounce = debouncedMethods.includes(notification.method) && !notification.params && !options?.relatedRequestId && !options?.relatedTask;
        if (canDebounce) {
            // If a notification of this type is already scheduled, do nothing.
            if (this._pendingDebouncedNotifications.has(notification.method)) {
                return;
            }
            // Mark this notification type as pending.
            this._pendingDebouncedNotifications.add(notification.method);
            // Schedule the actual send to happen in the next microtask.
            // This allows all synchronous calls in the current event loop tick to be coalesced.
            Promise.resolve().then(() => {
                // Un-mark the notification so the next one can be scheduled.
                this._pendingDebouncedNotifications.delete(notification.method);
                // SAFETY CHECK: If the connection was closed while this was pending, abort.
                if (!this._transport) {
                    return;
                }
                let jsonrpcNotification = {
                    ...notification,
                    jsonrpc: '2.0'
                };
                // Augment with related task metadata if relatedTask is provided
                if (options?.relatedTask) {
                    jsonrpcNotification = {
                        ...jsonrpcNotification,
                        params: {
                            ...jsonrpcNotification.params,
                            _meta: {
                                ...(jsonrpcNotification.params?._meta || {}),
                                [types_js_1.RELATED_TASK_META_KEY]: options.relatedTask
                            }
                        }
                    };
                }
                // Send the notification, but don't await it here to avoid blocking.
                // Handle potential errors with a .catch().
                this._transport?.send(jsonrpcNotification, options).catch(error => this._onerror(error));
            });
            // Return immediately.
            return;
        }
        let jsonrpcNotification = {
            ...notification,
            jsonrpc: '2.0'
        };
        // Augment with related task metadata if relatedTask is provided
        if (options?.relatedTask) {
            jsonrpcNotification = {
                ...jsonrpcNotification,
                params: {
                    ...jsonrpcNotification.params,
                    _meta: {
                        ...(jsonrpcNotification.params?._meta || {}),
                        [types_js_1.RELATED_TASK_META_KEY]: options.relatedTask
                    }
                }
            };
        }
        await this._transport.send(jsonrpcNotification, options);
    }
    /**
     * Registers a handler to invoke when this protocol object receives a request with the given method.
     *
     * Note that this will replace any previous request handler for the same method.
     */
    setRequestHandler(requestSchema, handler) {
        const method = (0, zod_json_schema_compat_js_1.getMethodLiteral)(requestSchema);
        this.assertRequestHandlerCapability(method);
        this._requestHandlers.set(method, (request, extra) => {
            const parsed = (0, zod_json_schema_compat_js_1.parseWithCompat)(requestSchema, request);
            return Promise.resolve(handler(parsed, extra));
        });
    }
    /**
     * Removes the request handler for the given method.
     */
    removeRequestHandler(method) {
        this._requestHandlers.delete(method);
    }
    /**
     * Asserts that a request handler has not already been set for the given method, in preparation for a new one being automatically installed.
     */
    assertCanSetRequestHandler(method) {
        if (this._requestHandlers.has(method)) {
            throw new Error(`A request handler for ${method} already exists, which would be overridden`);
        }
    }
    /**
     * Registers a handler to invoke when this protocol object receives a notification with the given method.
     *
     * Note that this will replace any previous notification handler for the same method.
     */
    setNotificationHandler(notificationSchema, handler) {
        const method = (0, zod_json_schema_compat_js_1.getMethodLiteral)(notificationSchema);
        this._notificationHandlers.set(method, notification => {
            const parsed = (0, zod_json_schema_compat_js_1.parseWithCompat)(notificationSchema, notification);
            return Promise.resolve(handler(parsed));
        });
    }
    /**
     * Removes the notification handler for the given method.
     */
    removeNotificationHandler(method) {
        this._notificationHandlers.delete(method);
    }
    /**
     * Cleans up the progress handler associated with a task.
     * This should be called when a task reaches a terminal status.
     */
    _cleanupTaskProgressHandler(taskId) {
        const progressToken = this._taskProgressTokens.get(taskId);
        if (progressToken !== undefined) {
            this._progressHandlers.delete(progressToken);
            this._taskProgressTokens.delete(taskId);
        }
    }
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
    async _enqueueTaskMessage(taskId, message, sessionId) {
        // Task message queues are only used when taskStore is configured
        if (!this._taskStore || !this._taskMessageQueue) {
            throw new Error('Cannot enqueue task message: taskStore and taskMessageQueue are not configured');
        }
        const maxQueueSize = this._options?.maxTaskQueueSize;
        await this._taskMessageQueue.enqueue(taskId, message, sessionId, maxQueueSize);
    }
    /**
     * Clears the message queue for a task and rejects any pending request resolvers.
     * @param taskId The task ID whose queue should be cleared
     * @param sessionId Optional session ID for binding the operation to a specific session
     */
    async _clearTaskQueue(taskId, sessionId) {
        if (this._taskMessageQueue) {
            // Reject any pending request resolvers
            const messages = await this._taskMessageQueue.dequeueAll(taskId, sessionId);
            for (const message of messages) {
                if (message.type === 'request' && (0, types_js_1.isJSONRPCRequest)(message.message)) {
                    // Extract request ID from the message
                    const requestId = message.message.id;
                    const resolver = this._requestResolvers.get(requestId);
                    if (resolver) {
                        resolver(new types_js_1.McpError(types_js_1.ErrorCode.InternalError, 'Task cancelled or completed'));
                        this._requestResolvers.delete(requestId);
                    }
                    else {
                        // Log error when resolver is missing during cleanup for better observability
                        this._onerror(new Error(`Resolver missing for request ${requestId} during task ${taskId} cleanup`));
                    }
                }
            }
        }
    }
    /**
     * Waits for a task update (new messages or status change) with abort signal support.
     * Uses polling to check for updates at the task's configured poll interval.
     * @param taskId The task ID to wait for
     * @param signal Abort signal to cancel the wait
     * @returns Promise that resolves when an update occurs or rejects if aborted
     */
    async _waitForTaskUpdate(taskId, signal) {
        // Get the task's poll interval, falling back to default
        let interval = this._options?.defaultTaskPollInterval ?? 1000;
        try {
            const task = await this._taskStore?.getTask(taskId);
            if (task?.pollInterval) {
                interval = task.pollInterval;
            }
        }
        catch {
            // Use default interval if task lookup fails
        }
        return new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, 'Request cancelled'));
                return;
            }
            // Wait for the poll interval, then resolve so caller can check for updates
            const timeoutId = setTimeout(resolve, interval);
            // Clean up timeout and reject if aborted
            signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, 'Request cancelled'));
            }, { once: true });
        });
    }
    requestTaskStore(request, sessionId) {
        const taskStore = this._taskStore;
        if (!taskStore) {
            throw new Error('No task store configured');
        }
        return {
            createTask: async (taskParams) => {
                if (!request) {
                    throw new Error('No request provided');
                }
                return await taskStore.createTask(taskParams, request.id, {
                    method: request.method,
                    params: request.params
                }, sessionId);
            },
            getTask: async (taskId) => {
                const task = await taskStore.getTask(taskId, sessionId);
                if (!task) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Failed to retrieve task: Task not found');
                }
                return task;
            },
            storeTaskResult: async (taskId, status, result) => {
                await taskStore.storeTaskResult(taskId, status, result, sessionId);
                // Get updated task state and send notification
                const task = await taskStore.getTask(taskId, sessionId);
                if (task) {
                    const notification = types_js_1.TaskStatusNotificationSchema.parse({
                        method: 'notifications/tasks/status',
                        params: task
                    });
                    await this.notification(notification);
                    if ((0, interfaces_js_1.isTerminal)(task.status)) {
                        this._cleanupTaskProgressHandler(taskId);
                        // Don't clear queue here - it will be cleared after delivery via tasks/result
                    }
                }
            },
            getTaskResult: taskId => {
                return taskStore.getTaskResult(taskId, sessionId);
            },
            updateTaskStatus: async (taskId, status, statusMessage) => {
                // Check if task exists
                const task = await taskStore.getTask(taskId, sessionId);
                if (!task) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Task "${taskId}" not found - it may have been cleaned up`);
                }
                // Don't allow transitions from terminal states
                if ((0, interfaces_js_1.isTerminal)(task.status)) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Cannot update task "${taskId}" from terminal status "${task.status}" to "${status}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);
                }
                await taskStore.updateTaskStatus(taskId, status, statusMessage, sessionId);
                // Get updated task state and send notification
                const updatedTask = await taskStore.getTask(taskId, sessionId);
                if (updatedTask) {
                    const notification = types_js_1.TaskStatusNotificationSchema.parse({
                        method: 'notifications/tasks/status',
                        params: updatedTask
                    });
                    await this.notification(notification);
                    if ((0, interfaces_js_1.isTerminal)(updatedTask.status)) {
                        this._cleanupTaskProgressHandler(taskId);
                        // Don't clear queue here - it will be cleared after delivery via tasks/result
                    }
                }
            },
            listTasks: cursor => {
                return taskStore.listTasks(cursor, sessionId);
            }
        };
    }
}
exports.Protocol = Protocol;
function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function mergeCapabilities(base, additional) {
    const result = { ...base };
    for (const key in additional) {
        const k = key;
        const addValue = additional[k];
        if (addValue === undefined)
            continue;
        const baseValue = result[k];
        if (isPlainObject(baseValue) && isPlainObject(addValue)) {
            result[k] = { ...baseValue, ...addValue };
        }
        else {
            result[k] = addValue;
        }
    }
    return result;
}
//# sourceMappingURL=protocol.js.map