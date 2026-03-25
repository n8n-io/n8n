import { mergeCapabilities, Protocol } from '../shared/protocol.js';
import { CallToolResultSchema, CompleteResultSchema, EmptyResultSchema, ErrorCode, GetPromptResultSchema, InitializeResultSchema, LATEST_PROTOCOL_VERSION, ListPromptsResultSchema, ListResourcesResultSchema, ListResourceTemplatesResultSchema, ListToolsResultSchema, McpError, ReadResourceResultSchema, SUPPORTED_PROTOCOL_VERSIONS, ElicitResultSchema, ElicitRequestSchema, CreateTaskResultSchema, CreateMessageRequestSchema, CreateMessageResultSchema, CreateMessageResultWithToolsSchema, ToolListChangedNotificationSchema, PromptListChangedNotificationSchema, ResourceListChangedNotificationSchema, ListChangedOptionsBaseSchema } from '../types.js';
import { AjvJsonSchemaValidator } from '../validation/ajv-provider.js';
import { getObjectShape, isZ4Schema, safeParse } from '../server/zod-compat.js';
import { ExperimentalClientTasks } from '../experimental/tasks/client.js';
import { assertToolsCallTaskCapability, assertClientRequestTaskCapability } from '../experimental/tasks/helpers.js';
/**
 * Elicitation default application helper. Applies defaults to the data based on the schema.
 *
 * @param schema - The schema to apply defaults to.
 * @param data - The data to apply defaults to.
 */
function applyElicitationDefaults(schema, data) {
    if (!schema || data === null || typeof data !== 'object')
        return;
    // Handle object properties
    if (schema.type === 'object' && schema.properties && typeof schema.properties === 'object') {
        const obj = data;
        const props = schema.properties;
        for (const key of Object.keys(props)) {
            const propSchema = props[key];
            // If missing or explicitly undefined, apply default if present
            if (obj[key] === undefined && Object.prototype.hasOwnProperty.call(propSchema, 'default')) {
                obj[key] = propSchema.default;
            }
            // Recurse into existing nested objects/arrays
            if (obj[key] !== undefined) {
                applyElicitationDefaults(propSchema, obj[key]);
            }
        }
    }
    if (Array.isArray(schema.anyOf)) {
        for (const sub of schema.anyOf) {
            // Skip boolean schemas (true/false are valid JSON Schemas but have no defaults)
            if (typeof sub !== 'boolean') {
                applyElicitationDefaults(sub, data);
            }
        }
    }
    // Combine schemas
    if (Array.isArray(schema.oneOf)) {
        for (const sub of schema.oneOf) {
            // Skip boolean schemas (true/false are valid JSON Schemas but have no defaults)
            if (typeof sub !== 'boolean') {
                applyElicitationDefaults(sub, data);
            }
        }
    }
}
/**
 * Determines which elicitation modes are supported based on declared client capabilities.
 *
 * According to the spec:
 * - An empty elicitation capability object defaults to form mode support (backwards compatibility)
 * - URL mode is only supported if explicitly declared
 *
 * @param capabilities - The client's elicitation capabilities
 * @returns An object indicating which modes are supported
 */
export function getSupportedElicitationModes(capabilities) {
    if (!capabilities) {
        return { supportsFormMode: false, supportsUrlMode: false };
    }
    const hasFormCapability = capabilities.form !== undefined;
    const hasUrlCapability = capabilities.url !== undefined;
    // If neither form nor url are explicitly declared, form mode is supported (backwards compatibility)
    const supportsFormMode = hasFormCapability || (!hasFormCapability && !hasUrlCapability);
    const supportsUrlMode = hasUrlCapability;
    return { supportsFormMode, supportsUrlMode };
}
/**
 * An MCP client on top of a pluggable transport.
 *
 * The client will automatically begin the initialization flow with the server when connect() is called.
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
 * // Create typed client
 * const client = new Client<CustomRequest, CustomNotification, CustomResult>({
 *   name: "CustomClient",
 *   version: "1.0.0"
 * })
 * ```
 */
export class Client extends Protocol {
    /**
     * Initializes this client with the given name and version information.
     */
    constructor(_clientInfo, options) {
        super(options);
        this._clientInfo = _clientInfo;
        this._cachedToolOutputValidators = new Map();
        this._cachedKnownTaskTools = new Set();
        this._cachedRequiredTaskTools = new Set();
        this._listChangedDebounceTimers = new Map();
        this._capabilities = options?.capabilities ?? {};
        this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new AjvJsonSchemaValidator();
        // Store list changed config for setup after connection (when we know server capabilities)
        if (options?.listChanged) {
            this._pendingListChangedConfig = options.listChanged;
        }
    }
    /**
     * Set up handlers for list changed notifications based on config and server capabilities.
     * This should only be called after initialization when server capabilities are known.
     * Handlers are silently skipped if the server doesn't advertise the corresponding listChanged capability.
     * @internal
     */
    _setupListChangedHandlers(config) {
        if (config.tools && this._serverCapabilities?.tools?.listChanged) {
            this._setupListChangedHandler('tools', ToolListChangedNotificationSchema, config.tools, async () => {
                const result = await this.listTools();
                return result.tools;
            });
        }
        if (config.prompts && this._serverCapabilities?.prompts?.listChanged) {
            this._setupListChangedHandler('prompts', PromptListChangedNotificationSchema, config.prompts, async () => {
                const result = await this.listPrompts();
                return result.prompts;
            });
        }
        if (config.resources && this._serverCapabilities?.resources?.listChanged) {
            this._setupListChangedHandler('resources', ResourceListChangedNotificationSchema, config.resources, async () => {
                const result = await this.listResources();
                return result.resources;
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
                tasks: new ExperimentalClientTasks(this)
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
     * Override request handler registration to enforce client-side validation for elicitation.
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
        if (method === 'elicitation/create') {
            const wrappedHandler = async (request, extra) => {
                const validatedRequest = safeParse(ElicitRequestSchema, request);
                if (!validatedRequest.success) {
                    // Type guard: if success is false, error is guaranteed to exist
                    const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
                    throw new McpError(ErrorCode.InvalidParams, `Invalid elicitation request: ${errorMessage}`);
                }
                const { params } = validatedRequest.data;
                params.mode = params.mode ?? 'form';
                const { supportsFormMode, supportsUrlMode } = getSupportedElicitationModes(this._capabilities.elicitation);
                if (params.mode === 'form' && !supportsFormMode) {
                    throw new McpError(ErrorCode.InvalidParams, 'Client does not support form-mode elicitation requests');
                }
                if (params.mode === 'url' && !supportsUrlMode) {
                    throw new McpError(ErrorCode.InvalidParams, 'Client does not support URL-mode elicitation requests');
                }
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
                // For non-task requests, validate against ElicitResultSchema
                const validationResult = safeParse(ElicitResultSchema, result);
                if (!validationResult.success) {
                    // Type guard: if success is false, error is guaranteed to exist
                    const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
                    throw new McpError(ErrorCode.InvalidParams, `Invalid elicitation result: ${errorMessage}`);
                }
                const validatedResult = validationResult.data;
                const requestedSchema = params.mode === 'form' ? params.requestedSchema : undefined;
                if (params.mode === 'form' && validatedResult.action === 'accept' && validatedResult.content && requestedSchema) {
                    if (this._capabilities.elicitation?.form?.applyDefaults) {
                        try {
                            applyElicitationDefaults(requestedSchema, validatedResult.content);
                        }
                        catch {
                            // gracefully ignore errors in default application
                        }
                    }
                }
                return validatedResult;
            };
            // Install the wrapped handler
            return super.setRequestHandler(requestSchema, wrappedHandler);
        }
        if (method === 'sampling/createMessage') {
            const wrappedHandler = async (request, extra) => {
                const validatedRequest = safeParse(CreateMessageRequestSchema, request);
                if (!validatedRequest.success) {
                    const errorMessage = validatedRequest.error instanceof Error ? validatedRequest.error.message : String(validatedRequest.error);
                    throw new McpError(ErrorCode.InvalidParams, `Invalid sampling request: ${errorMessage}`);
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
                // For non-task requests, validate against appropriate schema based on tools presence
                const hasTools = params.tools || params.toolChoice;
                const resultSchema = hasTools ? CreateMessageResultWithToolsSchema : CreateMessageResultSchema;
                const validationResult = safeParse(resultSchema, result);
                if (!validationResult.success) {
                    const errorMessage = validationResult.error instanceof Error ? validationResult.error.message : String(validationResult.error);
                    throw new McpError(ErrorCode.InvalidParams, `Invalid sampling result: ${errorMessage}`);
                }
                return validationResult.data;
            };
            // Install the wrapped handler
            return super.setRequestHandler(requestSchema, wrappedHandler);
        }
        // Other handlers use default behavior
        return super.setRequestHandler(requestSchema, handler);
    }
    assertCapability(capability, method) {
        if (!this._serverCapabilities?.[capability]) {
            throw new Error(`Server does not support ${capability} (required for ${method})`);
        }
    }
    async connect(transport, options) {
        await super.connect(transport);
        // When transport sessionId is already set this means we are trying to reconnect.
        // In this case we don't need to initialize again.
        if (transport.sessionId !== undefined) {
            return;
        }
        try {
            const result = await this.request({
                method: 'initialize',
                params: {
                    protocolVersion: LATEST_PROTOCOL_VERSION,
                    capabilities: this._capabilities,
                    clientInfo: this._clientInfo
                }
            }, InitializeResultSchema, options);
            if (result === undefined) {
                throw new Error(`Server sent invalid initialize result: ${result}`);
            }
            if (!SUPPORTED_PROTOCOL_VERSIONS.includes(result.protocolVersion)) {
                throw new Error(`Server's protocol version is not supported: ${result.protocolVersion}`);
            }
            this._serverCapabilities = result.capabilities;
            this._serverVersion = result.serverInfo;
            // HTTP transports must set the protocol version in each header after initialization.
            if (transport.setProtocolVersion) {
                transport.setProtocolVersion(result.protocolVersion);
            }
            this._instructions = result.instructions;
            await this.notification({
                method: 'notifications/initialized'
            });
            // Set up list changed handlers now that we know server capabilities
            if (this._pendingListChangedConfig) {
                this._setupListChangedHandlers(this._pendingListChangedConfig);
                this._pendingListChangedConfig = undefined;
            }
        }
        catch (error) {
            // Disconnect if initialization fails.
            void this.close();
            throw error;
        }
    }
    /**
     * After initialization has completed, this will be populated with the server's reported capabilities.
     */
    getServerCapabilities() {
        return this._serverCapabilities;
    }
    /**
     * After initialization has completed, this will be populated with information about the server's name and version.
     */
    getServerVersion() {
        return this._serverVersion;
    }
    /**
     * After initialization has completed, this may be populated with information about the server's instructions.
     */
    getInstructions() {
        return this._instructions;
    }
    assertCapabilityForMethod(method) {
        switch (method) {
            case 'logging/setLevel':
                if (!this._serverCapabilities?.logging) {
                    throw new Error(`Server does not support logging (required for ${method})`);
                }
                break;
            case 'prompts/get':
            case 'prompts/list':
                if (!this._serverCapabilities?.prompts) {
                    throw new Error(`Server does not support prompts (required for ${method})`);
                }
                break;
            case 'resources/list':
            case 'resources/templates/list':
            case 'resources/read':
            case 'resources/subscribe':
            case 'resources/unsubscribe':
                if (!this._serverCapabilities?.resources) {
                    throw new Error(`Server does not support resources (required for ${method})`);
                }
                if (method === 'resources/subscribe' && !this._serverCapabilities.resources.subscribe) {
                    throw new Error(`Server does not support resource subscriptions (required for ${method})`);
                }
                break;
            case 'tools/call':
            case 'tools/list':
                if (!this._serverCapabilities?.tools) {
                    throw new Error(`Server does not support tools (required for ${method})`);
                }
                break;
            case 'completion/complete':
                if (!this._serverCapabilities?.completions) {
                    throw new Error(`Server does not support completions (required for ${method})`);
                }
                break;
            case 'initialize':
                // No specific capability required for initialize
                break;
            case 'ping':
                // No specific capability required for ping
                break;
        }
    }
    assertNotificationCapability(method) {
        switch (method) {
            case 'notifications/roots/list_changed':
                if (!this._capabilities.roots?.listChanged) {
                    throw new Error(`Client does not support roots list changed notifications (required for ${method})`);
                }
                break;
            case 'notifications/initialized':
                // No specific capability required for initialized
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
            case 'sampling/createMessage':
                if (!this._capabilities.sampling) {
                    throw new Error(`Client does not support sampling capability (required for ${method})`);
                }
                break;
            case 'elicitation/create':
                if (!this._capabilities.elicitation) {
                    throw new Error(`Client does not support elicitation capability (required for ${method})`);
                }
                break;
            case 'roots/list':
                if (!this._capabilities.roots) {
                    throw new Error(`Client does not support roots capability (required for ${method})`);
                }
                break;
            case 'tasks/get':
            case 'tasks/list':
            case 'tasks/result':
            case 'tasks/cancel':
                if (!this._capabilities.tasks) {
                    throw new Error(`Client does not support tasks capability (required for ${method})`);
                }
                break;
            case 'ping':
                // No specific capability required for ping
                break;
        }
    }
    assertTaskCapability(method) {
        assertToolsCallTaskCapability(this._serverCapabilities?.tasks?.requests, method, 'Server');
    }
    assertTaskHandlerCapability(method) {
        // Task handlers are registered in Protocol constructor before _capabilities is initialized
        // Skip capability check for task methods during initialization
        if (!this._capabilities) {
            return;
        }
        assertClientRequestTaskCapability(this._capabilities.tasks?.requests, method, 'Client');
    }
    async ping(options) {
        return this.request({ method: 'ping' }, EmptyResultSchema, options);
    }
    async complete(params, options) {
        return this.request({ method: 'completion/complete', params }, CompleteResultSchema, options);
    }
    async setLoggingLevel(level, options) {
        return this.request({ method: 'logging/setLevel', params: { level } }, EmptyResultSchema, options);
    }
    async getPrompt(params, options) {
        return this.request({ method: 'prompts/get', params }, GetPromptResultSchema, options);
    }
    async listPrompts(params, options) {
        return this.request({ method: 'prompts/list', params }, ListPromptsResultSchema, options);
    }
    async listResources(params, options) {
        return this.request({ method: 'resources/list', params }, ListResourcesResultSchema, options);
    }
    async listResourceTemplates(params, options) {
        return this.request({ method: 'resources/templates/list', params }, ListResourceTemplatesResultSchema, options);
    }
    async readResource(params, options) {
        return this.request({ method: 'resources/read', params }, ReadResourceResultSchema, options);
    }
    async subscribeResource(params, options) {
        return this.request({ method: 'resources/subscribe', params }, EmptyResultSchema, options);
    }
    async unsubscribeResource(params, options) {
        return this.request({ method: 'resources/unsubscribe', params }, EmptyResultSchema, options);
    }
    /**
     * Calls a tool and waits for the result. Automatically validates structured output if the tool has an outputSchema.
     *
     * For task-based execution with streaming behavior, use client.experimental.tasks.callToolStream() instead.
     */
    async callTool(params, resultSchema = CallToolResultSchema, options) {
        // Guard: required-task tools need experimental API
        if (this.isToolTaskRequired(params.name)) {
            throw new McpError(ErrorCode.InvalidRequest, `Tool "${params.name}" requires task-based execution. Use client.experimental.tasks.callToolStream() instead.`);
        }
        const result = await this.request({ method: 'tools/call', params }, resultSchema, options);
        // Check if the tool has an outputSchema
        const validator = this.getToolOutputValidator(params.name);
        if (validator) {
            // If tool has outputSchema, it MUST return structuredContent (unless it's an error)
            if (!result.structuredContent && !result.isError) {
                throw new McpError(ErrorCode.InvalidRequest, `Tool ${params.name} has an output schema but did not return structured content`);
            }
            // Only validate structured content if present (not when there's an error)
            if (result.structuredContent) {
                try {
                    // Validate the structured content against the schema
                    const validationResult = validator(result.structuredContent);
                    if (!validationResult.valid) {
                        throw new McpError(ErrorCode.InvalidParams, `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`);
                    }
                }
                catch (error) {
                    if (error instanceof McpError) {
                        throw error;
                    }
                    throw new McpError(ErrorCode.InvalidParams, `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        return result;
    }
    isToolTask(toolName) {
        if (!this._serverCapabilities?.tasks?.requests?.tools?.call) {
            return false;
        }
        return this._cachedKnownTaskTools.has(toolName);
    }
    /**
     * Check if a tool requires task-based execution.
     * Unlike isToolTask which includes 'optional' tools, this only checks for 'required'.
     */
    isToolTaskRequired(toolName) {
        return this._cachedRequiredTaskTools.has(toolName);
    }
    /**
     * Cache validators for tool output schemas.
     * Called after listTools() to pre-compile validators for better performance.
     */
    cacheToolMetadata(tools) {
        this._cachedToolOutputValidators.clear();
        this._cachedKnownTaskTools.clear();
        this._cachedRequiredTaskTools.clear();
        for (const tool of tools) {
            // If the tool has an outputSchema, create and cache the validator
            if (tool.outputSchema) {
                const toolValidator = this._jsonSchemaValidator.getValidator(tool.outputSchema);
                this._cachedToolOutputValidators.set(tool.name, toolValidator);
            }
            // If the tool supports task-based execution, cache that information
            const taskSupport = tool.execution?.taskSupport;
            if (taskSupport === 'required' || taskSupport === 'optional') {
                this._cachedKnownTaskTools.add(tool.name);
            }
            if (taskSupport === 'required') {
                this._cachedRequiredTaskTools.add(tool.name);
            }
        }
    }
    /**
     * Get cached validator for a tool
     */
    getToolOutputValidator(toolName) {
        return this._cachedToolOutputValidators.get(toolName);
    }
    async listTools(params, options) {
        const result = await this.request({ method: 'tools/list', params }, ListToolsResultSchema, options);
        // Cache the tools and their output schemas for future validation
        this.cacheToolMetadata(result.tools);
        return result;
    }
    /**
     * Set up a single list changed handler.
     * @internal
     */
    _setupListChangedHandler(listType, notificationSchema, options, fetcher) {
        // Validate options using Zod schema (validates autoRefresh and debounceMs)
        const parseResult = ListChangedOptionsBaseSchema.safeParse(options);
        if (!parseResult.success) {
            throw new Error(`Invalid ${listType} listChanged options: ${parseResult.error.message}`);
        }
        // Validate callback
        if (typeof options.onChanged !== 'function') {
            throw new Error(`Invalid ${listType} listChanged options: onChanged must be a function`);
        }
        const { autoRefresh, debounceMs } = parseResult.data;
        const { onChanged } = options;
        const refresh = async () => {
            if (!autoRefresh) {
                onChanged(null, null);
                return;
            }
            try {
                const items = await fetcher();
                onChanged(null, items);
            }
            catch (e) {
                const error = e instanceof Error ? e : new Error(String(e));
                onChanged(error, null);
            }
        };
        const handler = () => {
            if (debounceMs) {
                // Clear any pending debounce timer for this list type
                const existingTimer = this._listChangedDebounceTimers.get(listType);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                }
                // Set up debounced refresh
                const timer = setTimeout(refresh, debounceMs);
                this._listChangedDebounceTimers.set(listType, timer);
            }
            else {
                // No debounce, refresh immediately
                refresh();
            }
        };
        // Register notification handler
        this.setNotificationHandler(notificationSchema, handler);
    }
    async sendRootsListChanged() {
        return this.notification({ method: 'notifications/roots/list_changed' });
    }
}
//# sourceMappingURL=index.js.map