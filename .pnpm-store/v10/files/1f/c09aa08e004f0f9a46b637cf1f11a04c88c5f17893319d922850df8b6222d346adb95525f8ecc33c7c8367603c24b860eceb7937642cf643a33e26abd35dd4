import { mergeCapabilities, Protocol } from '../shared/protocol.js';
import { CreateMessageResultSchema, CreateMessageResultWithToolsSchema, ElicitResultSchema, EmptyResultSchema, ErrorCode, InitializedNotificationSchema, InitializeRequestSchema, LATEST_PROTOCOL_VERSION, ListRootsResultSchema, LoggingLevelSchema, McpError, SetLevelRequestSchema, SUPPORTED_PROTOCOL_VERSIONS, CallToolRequestSchema, CallToolResultSchema, CreateTaskResultSchema } from '../types.js';
import { AjvJsonSchemaValidator } from '../validation/ajv-provider.js';
import { getObjectShape, isZ4Schema, safeParse } from './zod-compat.js';
import { ExperimentalServerTasks } from '../experimental/tasks/server.js';
import { assertToolsCallTaskCapability, assertClientRequestTaskCapability } from '../experimental/tasks/helpers.js';
/**
 * An MCP server on top of a pluggable transport.
 *
 * This server will automatically respond to the initialization flow as initiated from the client.
 *
 * To use with custom types, extend the base Request/Notification/Result types and pass them as type parameters:
 *
 * ```typescript
 * // Custom schemas
 * const CustomRequestSchema = RequestSchema.extend({...})
 * const CustomNotificationSchema = NotificationSchema.extend({...})
 * const CustomResultSchema = ResultSchema.extend({...})
 *
 * // Type aliases
 * type CustomRequest = z.infer<typeof CustomRequestSchema>
 * type CustomNotification = z.infer<typeof CustomNotificationSchema>
 * type CustomResult = z.infer<typeof CustomResultSchema>
 *
 * // Create typed server
 * const server = new Server<CustomRequest, CustomNotification, CustomResult>({
 *   name: "CustomServer",
 *   version: "1.0.0"
 * })
 * ```
 * @deprecated Use `McpServer` instead for the high-level API. Only use `Server` for advanced use cases.
 */
export class Server extends Protocol {
    /**
     * Initializes this server with the given name and version information.
     */
    constructor(_serverInfo, options) {
        super(options);
        this._serverInfo = _serverInfo;
        // Map log levels by session id
        this._loggingLevels = new Map();
        // Map LogLevelSchema to severity index
        this.LOG_LEVEL_SEVERITY = new Map(LoggingLevelSchema.options.map((level, index) => [level, index]));
        // Is a message with the given level ignored in the log level set for the given session id?
        this.isMessageIgnored = (level, sessionId) => {
            const currentLevel = this._loggingLevels.get(sessionId);
            return currentLevel ? this.LOG_LEVEL_SEVERITY.get(level) < this.LOG_LEVEL_SEVERITY.get(currentLevel) : false;
        };
        this._capabilities = options?.capabilities ?? {};
        this._instructions = options?.instructions;
        this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new AjvJsonSchemaValidator();
        this.setRequestHandler(InitializeRequestSchema, request => this._oninitialize(request));
        this.setNotificationHandler(InitializedNotificationSchema, () => this.oninitialized?.());
        if (this._capabilities.logging) {
            this.setRequestHandler(SetLevelRequestSchema, async (request, extra) => {
                const transportSessionId = extra.sessionId || extra.requestInfo?.headers['mcp-session-id'] || undefined;
                const { level } = request.params;
                const parseResult = LoggingLevelSchema.safeParse(level);
                if (parseResult.success) {
                    this._loggingLevels.set(transportSessionId, parseResult.data);
                }
                return {};
            });
        }
    }
    /**
     * Access experimental features.
     *
     * WARNING: These APIs are experimental and may change without notice.
     *
     * @experimental
     */
    get experimental() {
        if (!this._experimental) {
            this._experimental = {
                tasks: new ExperimentalServerTasks(this)
            };
        }
        return this._experimental;
    }
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities) {
        if (this.transport) {
            throw new Error('Cannot register capabilities after connecting to transport');
        }
        this._capabilities = mergeCapabilities(this._capabilities, capabilities);
    }
    /**
     * Override request handler registration to enforce server-side validation for tools/call.
     */
    setRequestHandler(requestSchema, handler) {
        const shape = getObjectShape(requestSchema);
        const methodSchema = shape?.method;
        if (!methodSchema) {
            throw new Error('Schema is missing a method literal');
        }
        // Extract literal value using type-safe property access
        let methodValue;
        if (isZ4Schema(methodSchema)) {
            const v4Schema = methodSchema;
            const v4Def = v4Schema._zod?.def;
            methodValue = v4Def?.value ?? v4Schema.value;
        }
        else {
            const v3Schema = methodSchema;
            const legacyDef = v3Schema._def;
            methodValue = legacyDef?.value ?? v3Schema.value;
        }
        if (typeof methodValue !== 'string') {
            throw new Error('Schema method literal must be a string');
        }
        const method = methodValue;
        if (method === 'tools/call') {
            const wrappedHandler = async (request, extra) => {
                const validatedRequest = safeParse(CallToolRequestSchema, request);
                if (!validatedRequest.success) {
                    const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
                    throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call request: ${errorMessage}`);
                }
                const { params } = validatedRequest.data;
                const result = await Promise.resolve(handler(request, extra));
                // When task creation is requested, validate and return CreateTaskResult
                if (params.task) {
                    const taskValidationResult = safeParse(CreateTaskResultSchema, result);
                    if (!taskValidationResult.success) {
                        const errorMessage = taskValidationResult.error instanceof Error
                            ? taskValidationResult.error.message
                            : String(taskValidationResult.error);
                        throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
                    }
                    return taskValidationResult.data;
                }
                // For non-task requests, validate against CallToolResultSchema
                const validationResult = safeParse(CallToolResultSchema, result);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
                    throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call result: ${errorMessage}`);
                }
                return validationResult.data;
            };
            // Install the wrapped handler
            return super.setRequestHandler(requestSchema, wrappedHandler);
        }
        // Other handlers use default behavior
        return super.setRequestHandler(requestSchema, handler);
    }
    assertCapabilityForMethod(method) {
        switch (method) {
            case 'sampling/createMessage':
                if (!this._clientCapabilities?.sampling) {
                    throw new Error(`Client does not support sampling (required for ${method})`);
                }
                break;
            case 'elicitation/create':
                if (!this._clientCapabilities?.elicitation) {
                    throw new Error(`Client does not support elicitation (required for ${method})`);
                }
                break;
            case 'roots/list':
                if (!this._clientCapabilities?.roots) {
                    throw new Error(`Client does not support listing roots (required for ${method})`);
                }
                break;
            case 'ping':
                // No specific capability required for ping
                break;
        }
    }
    assertNotificationCapability(method) {
        switch (method) {
            case 'notifications/message':
                if (!this._capabilities.logging) {
                    throw new Error(`Server does not support logging (required for ${method})`);
                }
                break;
            case 'notifications/resources/updated':
            case 'notifications/resources/list_changed':
                if (!this._capabilities.resources) {
                    throw new Error(`Server does not support notifying about resources (required for ${method})`);
                }
                break;
            case 'notifications/tools/list_changed':
                if (!this._capabilities.tools) {
                    throw new Error(`Server does not support notifying of tool list changes (required for ${method})`);
                }
                break;
            case 'notifications/prompts/list_changed':
                if (!this._capabilities.prompts) {
                    throw new Error(`Server does not support notifying of prompt list changes (required for ${method})`);
                }
                break;
            case 'notifications/elicitation/complete':
                if (!this._clientCapabilities?.elicitation?.url) {
                    throw new Error(`Client does not support URL elicitation (required for ${method})`);
                }
                break;
            case 'notifications/cancelled':
                // Cancellation notifications are always allowed
                break;
            case 'notifications/progress':
                // Progress notifications are always allowed
                break;
        }
    }
    assertRequestHandlerCapability(method) {
        // Task handlers are registered in Protocol constructor before _capabilities is initialized
        // Skip capability check for task methods during initialization
        if (!this._capabilities) {
            return;
        }
        switch (method) {
            case 'completion/complete':
                if (!this._capabilities.completions) {
                    throw new Error(`Server does not support completions (required for ${method})`);
                }
                break;
            case 'logging/setLevel':
                if (!this._capabilities.logging) {
                    throw new Error(`Server does not support logging (required for ${method})`);
                }
                break;
            case 'prompts/get':
            case 'prompts/list':
                if (!this._capabilities.prompts) {
                    throw new Error(`Server does not support prompts (required for ${method})`);
                }
                break;
            case 'resources/list':
            case 'resources/templates/list':
            case 'resources/read':
                if (!this._capabilities.resources) {
                    throw new Error(`Server does not support resources (required for ${method})`);
                }
                break;
            case 'tools/call':
            case 'tools/list':
                if (!this._capabilities.tools) {
                    throw new Error(`Server does not support tools (required for ${method})`);
                }
                break;
            case 'tasks/get':
            case 'tasks/list':
            case 'tasks/result':
            case 'tasks/cancel':
                if (!this._capabilities.tasks) {
                    throw new Error(`Server does not support tasks capability (required for ${method})`);
                }
                break;
            case 'ping':
            case 'initialize':
                // No specific capability required for these methods
                break;
        }
    }
    assertTaskCapability(method) {
        assertClientRequestTaskCapability(this._clientCapabilities?.tasks?.requests, method, 'Client');
    }
    assertTaskHandlerCapability(method) {
        // Task handlers are registered in Protocol constructor before _capabilities is initialized
        // Skip capability check for task methods during initialization
        if (!this._capabilities) {
            return;
        }
        assertToolsCallTaskCapability(this._capabilities.tasks?.requests, method, 'Server');
    }
    async _oninitialize(request) {
        const requestedVersion = request.params.protocolVersion;
        this._clientCapabilities = request.params.capabilities;
        this._clientVersion = request.params.clientInfo;
        const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion) ? requestedVersion : LATEST_PROTOCOL_VERSION;
        return {
            protocolVersion,
            capabilities: this.getCapabilities(),
            serverInfo: this._serverInfo,
            ...(this._instructions && { instructions: this._instructions })
        };
    }
    /**
     * After initialization has completed, this will be populated with the client's reported capabilities.
     */
    getClientCapabilities() {
        return this._clientCapabilities;
    }
    /**
     * After initialization has completed, this will be populated with information about the client's name and version.
     */
    getClientVersion() {
        return this._clientVersion;
    }
    getCapabilities() {
        return this._capabilities;
    }
    async ping() {
        return this.request({ method: 'ping' }, EmptyResultSchema);
    }
    // Implementation
    async createMessage(params, options) {
        // Capability check - only required when tools/toolChoice are provided
        if (params.tools || params.toolChoice) {
            if (!this._clientCapabilities?.sampling?.tools) {
                throw new Error('Client does not support sampling tools capability.');
            }
        }
        // Message structure validation - always validate tool_use/tool_result pairs.
        // These may appear even without tools/toolChoice in the current request when
        // a previous sampling request returned tool_use and this is a follow-up with results.
        if (params.messages.length > 0) {
            const lastMessage = params.messages[params.messages.length - 1];
            const lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
            const hasToolResults = lastContent.some(c => c.type === 'tool_result');
            const previousMessage = params.messages.length > 1 ? params.messages[params.messages.length - 2] : undefined;
            const previousContent = previousMessage
                ? Array.isArray(previousMessage.content)
                    ? previousMessage.content
                    : [previousMessage.content]
                : [];
            const hasPreviousToolUse = previousContent.some(c => c.type === 'tool_use');
            if (hasToolResults) {
                if (lastContent.some(c => c.type !== 'tool_result')) {
                    throw new Error('The last message must contain only tool_result content if any is present');
                }
                if (!hasPreviousToolUse) {
                    throw new Error('tool_result blocks are not matching any tool_use from the previous message');
                }
            }
            if (hasPreviousToolUse) {
                const toolUseIds = new Set(previousContent.filter(c => c.type === 'tool_use').map(c => c.id));
                const toolResultIds = new Set(lastContent.filter(c => c.type === 'tool_result').map(c => c.toolUseId));
                if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every(id => toolResultIds.has(id))) {
                    throw new Error('ids of tool_result blocks and tool_use blocks from previous message do not match');
                }
            }
        }
        // Use different schemas based on whether tools are provided
        if (params.tools) {
            return this.request({ method: 'sampling/createMessage', params }, CreateMessageResultWithToolsSchema, options);
        }
        return this.request({ method: 'sampling/createMessage', params }, CreateMessageResultSchema, options);
    }
    /**
     * Creates an elicitation request for the given parameters.
     * For backwards compatibility, `mode` may be omitted for form requests and will default to `'form'`.
     * @param params The parameters for the elicitation request.
     * @param options Optional request options.
     * @returns The result of the elicitation request.
     */
    async elicitInput(params, options) {
        const mode = (params.mode ?? 'form');
        switch (mode) {
            case 'url': {
                if (!this._clientCapabilities?.elicitation?.url) {
                    throw new Error('Client does not support url elicitation.');
                }
                const urlParams = params;
                return this.request({ method: 'elicitation/create', params: urlParams }, ElicitResultSchema, options);
            }
            case 'form': {
                if (!this._clientCapabilities?.elicitation?.form) {
                    throw new Error('Client does not support form elicitation.');
                }
                const formParams = params.mode === 'form' ? params : { ...params, mode: 'form' };
                const result = await this.request({ method: 'elicitation/create', params: formParams }, ElicitResultSchema, options);
                if (result.action === 'accept' && result.content && formParams.requestedSchema) {
                    try {
                        const validator = this._jsonSchemaValidator.getValidator(formParams.requestedSchema);
                        const validationResult = validator(result.content);
                        if (!validationResult.valid) {
                            throw new McpError(ErrorCode.InvalidParams, `Elicitation response content does not match requested schema: ${validationResult.errorMessage}`);
                        }
                    }
                    catch (error) {
                        if (error instanceof McpError) {
                            throw error;
                        }
                        throw new McpError(ErrorCode.InternalError, `Error validating elicitation response: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
                return result;
            }
        }
    }
    /**
     * Creates a reusable callback that, when invoked, will send a `notifications/elicitation/complete`
     * notification for the specified elicitation ID.
     *
     * @param elicitationId The ID of the elicitation to mark as complete.
     * @param options Optional notification options. Useful when the completion notification should be related to a prior request.
     * @returns A function that emits the completion notification when awaited.
     */
    createElicitationCompletionNotifier(elicitationId, options) {
        if (!this._clientCapabilities?.elicitation?.url) {
            throw new Error('Client does not support URL elicitation (required for notifications/elicitation/complete)');
        }
        return () => this.notification({
            method: 'notifications/elicitation/complete',
            params: {
                elicitationId
            }
        }, options);
    }
    async listRoots(params, options) {
        return this.request({ method: 'roots/list', params }, ListRootsResultSchema, options);
    }
    /**
     * Sends a logging message to the client, if connected.
     * Note: You only need to send the parameters object, not the entire JSON RPC message
     * @see LoggingMessageNotification
     * @param params
     * @param sessionId optional for stateless and backward compatibility
     */
    async sendLoggingMessage(params, sessionId) {
        if (this._capabilities.logging) {
            if (!this.isMessageIgnored(params.level, sessionId)) {
                return this.notification({ method: 'notifications/message', params });
            }
        }
    }
    async sendResourceUpdated(params) {
        return this.notification({
            method: 'notifications/resources/updated',
            params
        });
    }
    async sendResourceListChanged() {
        return this.notification({
            method: 'notifications/resources/list_changed'
        });
    }
    async sendToolListChanged() {
        return this.notification({ method: 'notifications/tools/list_changed' });
    }
    async sendPromptListChanged() {
        return this.notification({ method: 'notifications/prompts/list_changed' });
    }
}
//# sourceMappingURL=index.js.map