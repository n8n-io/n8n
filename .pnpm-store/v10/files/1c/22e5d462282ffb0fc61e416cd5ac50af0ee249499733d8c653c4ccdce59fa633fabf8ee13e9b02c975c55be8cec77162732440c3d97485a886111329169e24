"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceTemplate = exports.McpServer = void 0;
const index_js_1 = require("./index.js");
const zod_compat_js_1 = require("./zod-compat.js");
const zod_json_schema_compat_js_1 = require("./zod-json-schema-compat.js");
const types_js_1 = require("../types.js");
const completable_js_1 = require("./completable.js");
const uriTemplate_js_1 = require("../shared/uriTemplate.js");
const toolNameValidation_js_1 = require("../shared/toolNameValidation.js");
const mcp_server_js_1 = require("../experimental/tasks/mcp-server.js");
const zod_1 = require("zod");
/**
 * High-level MCP server that provides a simpler API for working with resources, tools, and prompts.
 * For advanced usage (like sending notifications or setting custom request handlers), use the underlying
 * Server instance available via the `server` property.
 */
class McpServer {
    constructor(serverInfo, options) {
        this._registeredResources = {};
        this._registeredResourceTemplates = {};
        this._registeredTools = {};
        this._registeredPrompts = {};
        this._toolHandlersInitialized = false;
        this._completionHandlerInitialized = false;
        this._resourceHandlersInitialized = false;
        this._promptHandlersInitialized = false;
        this.server = new index_js_1.Server(serverInfo, options);
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
                tasks: new mcp_server_js_1.ExperimentalMcpServerTasks(this)
            };
        }
        return this._experimental;
    }
    /**
     * Attaches to the given transport, starts it, and starts listening for messages.
     *
     * The `server` object assumes ownership of the Transport, replacing any callbacks that have already been set, and expects that it is the only user of the Transport instance going forward.
     */
    async connect(transport) {
        return await this.server.connect(transport);
    }
    /**
     * Closes the connection.
     */
    async close() {
        await this.server.close();
    }
    setToolRequestHandlers() {
        if (this._toolHandlersInitialized) {
            return;
        }
        this.server.assertCanSetRequestHandler(getMethodValue(types_js_1.ListToolsRequestSchema));
        this.server.assertCanSetRequestHandler(getMethodValue(types_js_1.CallToolRequestSchema));
        this.server.registerCapabilities({
            tools: {
                listChanged: true
            }
        });
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, () => ({
            tools: Object.entries(this._registeredTools)
                .filter(([, tool]) => tool.enabled)
                .map(([name, tool]) => {
                const toolDefinition = {
                    name,
                    title: tool.title,
                    description: tool.description,
                    inputSchema: (() => {
                        const obj = (0, zod_compat_js_1.normalizeObjectSchema)(tool.inputSchema);
                        return obj
                            ? (0, zod_json_schema_compat_js_1.toJsonSchemaCompat)(obj, {
                                strictUnions: true,
                                pipeStrategy: 'input'
                            })
                            : EMPTY_OBJECT_JSON_SCHEMA;
                    })(),
                    annotations: tool.annotations,
                    execution: tool.execution,
                    _meta: tool._meta
                };
                if (tool.outputSchema) {
                    const obj = (0, zod_compat_js_1.normalizeObjectSchema)(tool.outputSchema);
                    if (obj) {
                        toolDefinition.outputSchema = (0, zod_json_schema_compat_js_1.toJsonSchemaCompat)(obj, {
                            strictUnions: true,
                            pipeStrategy: 'output'
                        });
                    }
                }
                return toolDefinition;
            })
        }));
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request, extra) => {
            try {
                const tool = this._registeredTools[request.params.name];
                if (!tool) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Tool ${request.params.name} not found`);
                }
                if (!tool.enabled) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Tool ${request.params.name} disabled`);
                }
                const isTaskRequest = !!request.params.task;
                const taskSupport = tool.execution?.taskSupport;
                const isTaskHandler = 'createTask' in tool.handler;
                // Validate task hint configuration
                if ((taskSupport === 'required' || taskSupport === 'optional') && !isTaskHandler) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Tool ${request.params.name} has taskSupport '${taskSupport}' but was not registered with registerToolTask`);
                }
                // Handle taskSupport 'required' without task augmentation
                if (taskSupport === 'required' && !isTaskRequest) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Tool ${request.params.name} requires task augmentation (taskSupport: 'required')`);
                }
                // Handle taskSupport 'optional' without task augmentation - automatic polling
                if (taskSupport === 'optional' && !isTaskRequest && isTaskHandler) {
                    return await this.handleAutomaticTaskPolling(tool, request, extra);
                }
                // Normal execution path
                const args = await this.validateToolInput(tool, request.params.arguments, request.params.name);
                const result = await this.executeToolHandler(tool, args, extra);
                // Return CreateTaskResult immediately for task requests
                if (isTaskRequest) {
                    return result;
                }
                // Validate output schema for non-task requests
                await this.validateToolOutput(tool, result, request.params.name);
                return result;
            }
            catch (error) {
                if (error instanceof types_js_1.McpError) {
                    if (error.code === types_js_1.ErrorCode.UrlElicitationRequired) {
                        throw error; // Return the error to the caller without wrapping in CallToolResult
                    }
                }
                return this.createToolError(error instanceof Error ? error.message : String(error));
            }
        });
        this._toolHandlersInitialized = true;
    }
    /**
     * Creates a tool error result.
     *
     * @param errorMessage - The error message.
     * @returns The tool error result.
     */
    createToolError(errorMessage) {
        return {
            content: [
                {
                    type: 'text',
                    text: errorMessage
                }
            ],
            isError: true
        };
    }
    /**
     * Validates tool input arguments against the tool's input schema.
     */
    async validateToolInput(tool, args, toolName) {
        if (!tool.inputSchema) {
            return undefined;
        }
        // Try to normalize to object schema first (for raw shapes and object schemas)
        // If that fails, use the schema directly (for union/intersection/etc)
        const inputObj = (0, zod_compat_js_1.normalizeObjectSchema)(tool.inputSchema);
        const schemaToParse = inputObj ?? tool.inputSchema;
        const parseResult = await (0, zod_compat_js_1.safeParseAsync)(schemaToParse, args);
        if (!parseResult.success) {
            const error = 'error' in parseResult ? parseResult.error : 'Unknown error';
            const errorMessage = (0, zod_compat_js_1.getParseErrorMessage)(error);
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Input validation error: Invalid arguments for tool ${toolName}: ${errorMessage}`);
        }
        return parseResult.data;
    }
    /**
     * Validates tool output against the tool's output schema.
     */
    async validateToolOutput(tool, result, toolName) {
        if (!tool.outputSchema) {
            return;
        }
        // Only validate CallToolResult, not CreateTaskResult
        if (!('content' in result)) {
            return;
        }
        if (result.isError) {
            return;
        }
        if (!result.structuredContent) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Output validation error: Tool ${toolName} has an output schema but no structured content was provided`);
        }
        // if the tool has an output schema, validate structured content
        const outputObj = (0, zod_compat_js_1.normalizeObjectSchema)(tool.outputSchema);
        const parseResult = await (0, zod_compat_js_1.safeParseAsync)(outputObj, result.structuredContent);
        if (!parseResult.success) {
            const error = 'error' in parseResult ? parseResult.error : 'Unknown error';
            const errorMessage = (0, zod_compat_js_1.getParseErrorMessage)(error);
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Output validation error: Invalid structured content for tool ${toolName}: ${errorMessage}`);
        }
    }
    /**
     * Executes a tool handler (either regular or task-based).
     */
    async executeToolHandler(tool, args, extra) {
        const handler = tool.handler;
        const isTaskHandler = 'createTask' in handler;
        if (isTaskHandler) {
            if (!extra.taskStore) {
                throw new Error('No task store provided.');
            }
            const taskExtra = { ...extra, taskStore: extra.taskStore };
            if (tool.inputSchema) {
                const typedHandler = handler;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return await Promise.resolve(typedHandler.createTask(args, taskExtra));
            }
            else {
                const typedHandler = handler;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return await Promise.resolve(typedHandler.createTask(taskExtra));
            }
        }
        if (tool.inputSchema) {
            const typedHandler = handler;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await Promise.resolve(typedHandler(args, extra));
        }
        else {
            const typedHandler = handler;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await Promise.resolve(typedHandler(extra));
        }
    }
    /**
     * Handles automatic task polling for tools with taskSupport 'optional'.
     */
    async handleAutomaticTaskPolling(tool, request, extra) {
        if (!extra.taskStore) {
            throw new Error('No task store provided for task-capable tool.');
        }
        // Validate input and create task
        const args = await this.validateToolInput(tool, request.params.arguments, request.params.name);
        const handler = tool.handler;
        const taskExtra = { ...extra, taskStore: extra.taskStore };
        const createTaskResult = args // undefined only if tool.inputSchema is undefined
            ? await Promise.resolve(handler.createTask(args, taskExtra))
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await Promise.resolve(handler.createTask(taskExtra));
        // Poll until completion
        const taskId = createTaskResult.task.taskId;
        let task = createTaskResult.task;
        const pollInterval = task.pollInterval ?? 5000;
        while (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            const updatedTask = await extra.taskStore.getTask(taskId);
            if (!updatedTask) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Task ${taskId} not found during polling`);
            }
            task = updatedTask;
        }
        // Return the final result
        return (await extra.taskStore.getTaskResult(taskId));
    }
    setCompletionRequestHandler() {
        if (this._completionHandlerInitialized) {
            return;
        }
        this.server.assertCanSetRequestHandler(getMethodValue(types_js_1.CompleteRequestSchema));
        this.server.registerCapabilities({
            completions: {}
        });
        this.server.setRequestHandler(types_js_1.CompleteRequestSchema, async (request) => {
            switch (request.params.ref.type) {
                case 'ref/prompt':
                    (0, types_js_1.assertCompleteRequestPrompt)(request);
                    return this.handlePromptCompletion(request, request.params.ref);
                case 'ref/resource':
                    (0, types_js_1.assertCompleteRequestResourceTemplate)(request);
                    return this.handleResourceCompletion(request, request.params.ref);
                default:
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Invalid completion reference: ${request.params.ref}`);
            }
        });
        this._completionHandlerInitialized = true;
    }
    async handlePromptCompletion(request, ref) {
        const prompt = this._registeredPrompts[ref.name];
        if (!prompt) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Prompt ${ref.name} not found`);
        }
        if (!prompt.enabled) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Prompt ${ref.name} disabled`);
        }
        if (!prompt.argsSchema) {
            return EMPTY_COMPLETION_RESULT;
        }
        const promptShape = (0, zod_compat_js_1.getObjectShape)(prompt.argsSchema);
        const field = promptShape?.[request.params.argument.name];
        if (!(0, completable_js_1.isCompletable)(field)) {
            return EMPTY_COMPLETION_RESULT;
        }
        const completer = (0, completable_js_1.getCompleter)(field);
        if (!completer) {
            return EMPTY_COMPLETION_RESULT;
        }
        const suggestions = await completer(request.params.argument.value, request.params.context);
        return createCompletionResult(suggestions);
    }
    async handleResourceCompletion(request, ref) {
        const template = Object.values(this._registeredResourceTemplates).find(t => t.resourceTemplate.uriTemplate.toString() === ref.uri);
        if (!template) {
            if (this._registeredResources[ref.uri]) {
                // Attempting to autocomplete a fixed resource URI is not an error in the spec (but probably should be).
                return EMPTY_COMPLETION_RESULT;
            }
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Resource template ${request.params.ref.uri} not found`);
        }
        const completer = template.resourceTemplate.completeCallback(request.params.argument.name);
        if (!completer) {
            return EMPTY_COMPLETION_RESULT;
        }
        const suggestions = await completer(request.params.argument.value, request.params.context);
        return createCompletionResult(suggestions);
    }
    setResourceRequestHandlers() {
        if (this._resourceHandlersInitialized) {
            return;
        }
        this.server.assertCanSetRequestHandler(getMethodValue(types_js_1.ListResourcesRequestSchema));
        this.server.assertCanSetRequestHandler(getMethodValue(types_js_1.ListResourceTemplatesRequestSchema));
        this.server.assertCanSetRequestHandler(getMethodValue(types_js_1.ReadResourceRequestSchema));
        this.server.registerCapabilities({
            resources: {
                listChanged: true
            }
        });
        this.server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async (request, extra) => {
            const resources = Object.entries(this._registeredResources)
                .filter(([_, resource]) => resource.enabled)
                .map(([uri, resource]) => ({
                uri,
                name: resource.name,
                ...resource.metadata
            }));
            const templateResources = [];
            for (const template of Object.values(this._registeredResourceTemplates)) {
                if (!template.resourceTemplate.listCallback) {
                    continue;
                }
                const result = await template.resourceTemplate.listCallback(extra);
                for (const resource of result.resources) {
                    templateResources.push({
                        ...template.metadata,
                        // the defined resource metadata should override the template metadata if present
                        ...resource
                    });
                }
            }
            return { resources: [...resources, ...templateResources] };
        });
        this.server.setRequestHandler(types_js_1.ListResourceTemplatesRequestSchema, async () => {
            const resourceTemplates = Object.entries(this._registeredResourceTemplates).map(([name, template]) => ({
                name,
                uriTemplate: template.resourceTemplate.uriTemplate.toString(),
                ...template.metadata
            }));
            return { resourceTemplates };
        });
        this.server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (request, extra) => {
            const uri = new URL(request.params.uri);
            // First check for exact resource match
            const resource = this._registeredResources[uri.toString()];
            if (resource) {
                if (!resource.enabled) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Resource ${uri} disabled`);
                }
                return resource.readCallback(uri, extra);
            }
            // Then check templates
            for (const template of Object.values(this._registeredResourceTemplates)) {
                const variables = template.resourceTemplate.uriTemplate.match(uri.toString());
                if (variables) {
                    return template.readCallback(uri, variables, extra);
                }
            }
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Resource ${uri} not found`);
        });
        this._resourceHandlersInitialized = true;
    }
    setPromptRequestHandlers() {
        if (this._promptHandlersInitialized) {
            return;
        }
        this.server.assertCanSetRequestHandler(getMethodValue(types_js_1.ListPromptsRequestSchema));
        this.server.assertCanSetRequestHandler(getMethodValue(types_js_1.GetPromptRequestSchema));
        this.server.registerCapabilities({
            prompts: {
                listChanged: true
            }
        });
        this.server.setRequestHandler(types_js_1.ListPromptsRequestSchema, () => ({
            prompts: Object.entries(this._registeredPrompts)
                .filter(([, prompt]) => prompt.enabled)
                .map(([name, prompt]) => {
                return {
                    name,
                    title: prompt.title,
                    description: prompt.description,
                    arguments: prompt.argsSchema ? promptArgumentsFromSchema(prompt.argsSchema) : undefined
                };
            })
        }));
        this.server.setRequestHandler(types_js_1.GetPromptRequestSchema, async (request, extra) => {
            const prompt = this._registeredPrompts[request.params.name];
            if (!prompt) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Prompt ${request.params.name} not found`);
            }
            if (!prompt.enabled) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Prompt ${request.params.name} disabled`);
            }
            if (prompt.argsSchema) {
                const argsObj = (0, zod_compat_js_1.normalizeObjectSchema)(prompt.argsSchema);
                const parseResult = await (0, zod_compat_js_1.safeParseAsync)(argsObj, request.params.arguments);
                if (!parseResult.success) {
                    const error = 'error' in parseResult ? parseResult.error : 'Unknown error';
                    const errorMessage = (0, zod_compat_js_1.getParseErrorMessage)(error);
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Invalid arguments for prompt ${request.params.name}: ${errorMessage}`);
                }
                const args = parseResult.data;
                const cb = prompt.callback;
                return await Promise.resolve(cb(args, extra));
            }
            else {
                const cb = prompt.callback;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return await Promise.resolve(cb(extra));
            }
        });
        this._promptHandlersInitialized = true;
    }
    resource(name, uriOrTemplate, ...rest) {
        let metadata;
        if (typeof rest[0] === 'object') {
            metadata = rest.shift();
        }
        const readCallback = rest[0];
        if (typeof uriOrTemplate === 'string') {
            if (this._registeredResources[uriOrTemplate]) {
                throw new Error(`Resource ${uriOrTemplate} is already registered`);
            }
            const registeredResource = this._createRegisteredResource(name, undefined, uriOrTemplate, metadata, readCallback);
            this.setResourceRequestHandlers();
            this.sendResourceListChanged();
            return registeredResource;
        }
        else {
            if (this._registeredResourceTemplates[name]) {
                throw new Error(`Resource template ${name} is already registered`);
            }
            const registeredResourceTemplate = this._createRegisteredResourceTemplate(name, undefined, uriOrTemplate, metadata, readCallback);
            this.setResourceRequestHandlers();
            this.sendResourceListChanged();
            return registeredResourceTemplate;
        }
    }
    registerResource(name, uriOrTemplate, config, readCallback) {
        if (typeof uriOrTemplate === 'string') {
            if (this._registeredResources[uriOrTemplate]) {
                throw new Error(`Resource ${uriOrTemplate} is already registered`);
            }
            const registeredResource = this._createRegisteredResource(name, config.title, uriOrTemplate, config, readCallback);
            this.setResourceRequestHandlers();
            this.sendResourceListChanged();
            return registeredResource;
        }
        else {
            if (this._registeredResourceTemplates[name]) {
                throw new Error(`Resource template ${name} is already registered`);
            }
            const registeredResourceTemplate = this._createRegisteredResourceTemplate(name, config.title, uriOrTemplate, config, readCallback);
            this.setResourceRequestHandlers();
            this.sendResourceListChanged();
            return registeredResourceTemplate;
        }
    }
    _createRegisteredResource(name, title, uri, metadata, readCallback) {
        const registeredResource = {
            name,
            title,
            metadata,
            readCallback,
            enabled: true,
            disable: () => registeredResource.update({ enabled: false }),
            enable: () => registeredResource.update({ enabled: true }),
            remove: () => registeredResource.update({ uri: null }),
            update: updates => {
                if (typeof updates.uri !== 'undefined' && updates.uri !== uri) {
                    delete this._registeredResources[uri];
                    if (updates.uri)
                        this._registeredResources[updates.uri] = registeredResource;
                }
                if (typeof updates.name !== 'undefined')
                    registeredResource.name = updates.name;
                if (typeof updates.title !== 'undefined')
                    registeredResource.title = updates.title;
                if (typeof updates.metadata !== 'undefined')
                    registeredResource.metadata = updates.metadata;
                if (typeof updates.callback !== 'undefined')
                    registeredResource.readCallback = updates.callback;
                if (typeof updates.enabled !== 'undefined')
                    registeredResource.enabled = updates.enabled;
                this.sendResourceListChanged();
            }
        };
        this._registeredResources[uri] = registeredResource;
        return registeredResource;
    }
    _createRegisteredResourceTemplate(name, title, template, metadata, readCallback) {
        const registeredResourceTemplate = {
            resourceTemplate: template,
            title,
            metadata,
            readCallback,
            enabled: true,
            disable: () => registeredResourceTemplate.update({ enabled: false }),
            enable: () => registeredResourceTemplate.update({ enabled: true }),
            remove: () => registeredResourceTemplate.update({ name: null }),
            update: updates => {
                if (typeof updates.name !== 'undefined' && updates.name !== name) {
                    delete this._registeredResourceTemplates[name];
                    if (updates.name)
                        this._registeredResourceTemplates[updates.name] = registeredResourceTemplate;
                }
                if (typeof updates.title !== 'undefined')
                    registeredResourceTemplate.title = updates.title;
                if (typeof updates.template !== 'undefined')
                    registeredResourceTemplate.resourceTemplate = updates.template;
                if (typeof updates.metadata !== 'undefined')
                    registeredResourceTemplate.metadata = updates.metadata;
                if (typeof updates.callback !== 'undefined')
                    registeredResourceTemplate.readCallback = updates.callback;
                if (typeof updates.enabled !== 'undefined')
                    registeredResourceTemplate.enabled = updates.enabled;
                this.sendResourceListChanged();
            }
        };
        this._registeredResourceTemplates[name] = registeredResourceTemplate;
        // If the resource template has any completion callbacks, enable completions capability
        const variableNames = template.uriTemplate.variableNames;
        const hasCompleter = Array.isArray(variableNames) && variableNames.some(v => !!template.completeCallback(v));
        if (hasCompleter) {
            this.setCompletionRequestHandler();
        }
        return registeredResourceTemplate;
    }
    _createRegisteredPrompt(name, title, description, argsSchema, callback) {
        const registeredPrompt = {
            title,
            description,
            argsSchema: argsSchema === undefined ? undefined : (0, zod_compat_js_1.objectFromShape)(argsSchema),
            callback,
            enabled: true,
            disable: () => registeredPrompt.update({ enabled: false }),
            enable: () => registeredPrompt.update({ enabled: true }),
            remove: () => registeredPrompt.update({ name: null }),
            update: updates => {
                if (typeof updates.name !== 'undefined' && updates.name !== name) {
                    delete this._registeredPrompts[name];
                    if (updates.name)
                        this._registeredPrompts[updates.name] = registeredPrompt;
                }
                if (typeof updates.title !== 'undefined')
                    registeredPrompt.title = updates.title;
                if (typeof updates.description !== 'undefined')
                    registeredPrompt.description = updates.description;
                if (typeof updates.argsSchema !== 'undefined')
                    registeredPrompt.argsSchema = (0, zod_compat_js_1.objectFromShape)(updates.argsSchema);
                if (typeof updates.callback !== 'undefined')
                    registeredPrompt.callback = updates.callback;
                if (typeof updates.enabled !== 'undefined')
                    registeredPrompt.enabled = updates.enabled;
                this.sendPromptListChanged();
            }
        };
        this._registeredPrompts[name] = registeredPrompt;
        // If any argument uses a Completable schema, enable completions capability
        if (argsSchema) {
            const hasCompletable = Object.values(argsSchema).some(field => {
                const inner = field instanceof zod_1.ZodOptional ? field._def?.innerType : field;
                return (0, completable_js_1.isCompletable)(inner);
            });
            if (hasCompletable) {
                this.setCompletionRequestHandler();
            }
        }
        return registeredPrompt;
    }
    _createRegisteredTool(name, title, description, inputSchema, outputSchema, annotations, execution, _meta, handler) {
        // Validate tool name according to SEP specification
        (0, toolNameValidation_js_1.validateAndWarnToolName)(name);
        const registeredTool = {
            title,
            description,
            inputSchema: getZodSchemaObject(inputSchema),
            outputSchema: getZodSchemaObject(outputSchema),
            annotations,
            execution,
            _meta,
            handler: handler,
            enabled: true,
            disable: () => registeredTool.update({ enabled: false }),
            enable: () => registeredTool.update({ enabled: true }),
            remove: () => registeredTool.update({ name: null }),
            update: updates => {
                if (typeof updates.name !== 'undefined' && updates.name !== name) {
                    if (typeof updates.name === 'string') {
                        (0, toolNameValidation_js_1.validateAndWarnToolName)(updates.name);
                    }
                    delete this._registeredTools[name];
                    if (updates.name)
                        this._registeredTools[updates.name] = registeredTool;
                }
                if (typeof updates.title !== 'undefined')
                    registeredTool.title = updates.title;
                if (typeof updates.description !== 'undefined')
                    registeredTool.description = updates.description;
                if (typeof updates.paramsSchema !== 'undefined')
                    registeredTool.inputSchema = (0, zod_compat_js_1.objectFromShape)(updates.paramsSchema);
                if (typeof updates.outputSchema !== 'undefined')
                    registeredTool.outputSchema = (0, zod_compat_js_1.objectFromShape)(updates.outputSchema);
                if (typeof updates.callback !== 'undefined')
                    registeredTool.handler = updates.callback;
                if (typeof updates.annotations !== 'undefined')
                    registeredTool.annotations = updates.annotations;
                if (typeof updates._meta !== 'undefined')
                    registeredTool._meta = updates._meta;
                if (typeof updates.enabled !== 'undefined')
                    registeredTool.enabled = updates.enabled;
                this.sendToolListChanged();
            }
        };
        this._registeredTools[name] = registeredTool;
        this.setToolRequestHandlers();
        this.sendToolListChanged();
        return registeredTool;
    }
    /**
     * tool() implementation. Parses arguments passed to overrides defined above.
     */
    tool(name, ...rest) {
        if (this._registeredTools[name]) {
            throw new Error(`Tool ${name} is already registered`);
        }
        let description;
        let inputSchema;
        let outputSchema;
        let annotations;
        // Tool properties are passed as separate arguments, with omissions allowed.
        // Support for this style is frozen as of protocol version 2025-03-26. Future additions
        // to tool definition should *NOT* be added.
        if (typeof rest[0] === 'string') {
            description = rest.shift();
        }
        // Handle the different overload combinations
        if (rest.length > 1) {
            // We have at least one more arg before the callback
            const firstArg = rest[0];
            if (isZodRawShapeCompat(firstArg)) {
                // We have a params schema as the first arg
                inputSchema = rest.shift();
                // Check if the next arg is potentially annotations
                if (rest.length > 1 && typeof rest[0] === 'object' && rest[0] !== null && !isZodRawShapeCompat(rest[0])) {
                    // Case: tool(name, paramsSchema, annotations, cb)
                    // Or: tool(name, description, paramsSchema, annotations, cb)
                    annotations = rest.shift();
                }
            }
            else if (typeof firstArg === 'object' && firstArg !== null) {
                // Not a ZodRawShapeCompat, so must be annotations in this position
                // Case: tool(name, annotations, cb)
                // Or: tool(name, description, annotations, cb)
                annotations = rest.shift();
            }
        }
        const callback = rest[0];
        return this._createRegisteredTool(name, undefined, description, inputSchema, outputSchema, annotations, { taskSupport: 'forbidden' }, undefined, callback);
    }
    /**
     * Registers a tool with a config object and callback.
     */
    registerTool(name, config, cb) {
        if (this._registeredTools[name]) {
            throw new Error(`Tool ${name} is already registered`);
        }
        const { title, description, inputSchema, outputSchema, annotations, _meta } = config;
        return this._createRegisteredTool(name, title, description, inputSchema, outputSchema, annotations, { taskSupport: 'forbidden' }, _meta, cb);
    }
    prompt(name, ...rest) {
        if (this._registeredPrompts[name]) {
            throw new Error(`Prompt ${name} is already registered`);
        }
        let description;
        if (typeof rest[0] === 'string') {
            description = rest.shift();
        }
        let argsSchema;
        if (rest.length > 1) {
            argsSchema = rest.shift();
        }
        const cb = rest[0];
        const registeredPrompt = this._createRegisteredPrompt(name, undefined, description, argsSchema, cb);
        this.setPromptRequestHandlers();
        this.sendPromptListChanged();
        return registeredPrompt;
    }
    /**
     * Registers a prompt with a config object and callback.
     */
    registerPrompt(name, config, cb) {
        if (this._registeredPrompts[name]) {
            throw new Error(`Prompt ${name} is already registered`);
        }
        const { title, description, argsSchema } = config;
        const registeredPrompt = this._createRegisteredPrompt(name, title, description, argsSchema, cb);
        this.setPromptRequestHandlers();
        this.sendPromptListChanged();
        return registeredPrompt;
    }
    /**
     * Checks if the server is connected to a transport.
     * @returns True if the server is connected
     */
    isConnected() {
        return this.server.transport !== undefined;
    }
    /**
     * Sends a logging message to the client, if connected.
     * Note: You only need to send the parameters object, not the entire JSON RPC message
     * @see LoggingMessageNotification
     * @param params
     * @param sessionId optional for stateless and backward compatibility
     */
    async sendLoggingMessage(params, sessionId) {
        return this.server.sendLoggingMessage(params, sessionId);
    }
    /**
     * Sends a resource list changed event to the client, if connected.
     */
    sendResourceListChanged() {
        if (this.isConnected()) {
            this.server.sendResourceListChanged();
        }
    }
    /**
     * Sends a tool list changed event to the client, if connected.
     */
    sendToolListChanged() {
        if (this.isConnected()) {
            this.server.sendToolListChanged();
        }
    }
    /**
     * Sends a prompt list changed event to the client, if connected.
     */
    sendPromptListChanged() {
        if (this.isConnected()) {
            this.server.sendPromptListChanged();
        }
    }
}
exports.McpServer = McpServer;
/**
 * A resource template combines a URI pattern with optional functionality to enumerate
 * all resources matching that pattern.
 */
class ResourceTemplate {
    constructor(uriTemplate, _callbacks) {
        this._callbacks = _callbacks;
        this._uriTemplate = typeof uriTemplate === 'string' ? new uriTemplate_js_1.UriTemplate(uriTemplate) : uriTemplate;
    }
    /**
     * Gets the URI template pattern.
     */
    get uriTemplate() {
        return this._uriTemplate;
    }
    /**
     * Gets the list callback, if one was provided.
     */
    get listCallback() {
        return this._callbacks.list;
    }
    /**
     * Gets the callback for completing a specific URI template variable, if one was provided.
     */
    completeCallback(variable) {
        return this._callbacks.complete?.[variable];
    }
}
exports.ResourceTemplate = ResourceTemplate;
const EMPTY_OBJECT_JSON_SCHEMA = {
    type: 'object',
    properties: {}
};
/**
 * Checks if a value looks like a Zod schema by checking for parse/safeParse methods.
 */
function isZodTypeLike(value) {
    return (value !== null &&
        typeof value === 'object' &&
        'parse' in value &&
        typeof value.parse === 'function' &&
        'safeParse' in value &&
        typeof value.safeParse === 'function');
}
/**
 * Checks if an object is a Zod schema instance (v3 or v4).
 *
 * Zod schemas have internal markers:
 * - v3: `_def` property
 * - v4: `_zod` property
 *
 * This includes transformed schemas like z.preprocess(), z.transform(), z.pipe().
 */
function isZodSchemaInstance(obj) {
    return '_def' in obj || '_zod' in obj || isZodTypeLike(obj);
}
/**
 * Checks if an object is a "raw shape" - a plain object where values are Zod schemas.
 *
 * Raw shapes are used as shorthand: `{ name: z.string() }` instead of `z.object({ name: z.string() })`.
 *
 * IMPORTANT: This must NOT match actual Zod schema instances (like z.preprocess, z.pipe),
 * which have internal properties that could be mistaken for schema values.
 */
function isZodRawShapeCompat(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    // If it's already a Zod schema instance, it's NOT a raw shape
    if (isZodSchemaInstance(obj)) {
        return false;
    }
    // Empty objects are valid raw shapes (tools with no parameters)
    if (Object.keys(obj).length === 0) {
        return true;
    }
    // A raw shape has at least one property that is a Zod schema
    return Object.values(obj).some(isZodTypeLike);
}
/**
 * Converts a provided Zod schema to a Zod object if it is a ZodRawShapeCompat,
 * otherwise returns the schema as is.
 */
function getZodSchemaObject(schema) {
    if (!schema) {
        return undefined;
    }
    if (isZodRawShapeCompat(schema)) {
        return (0, zod_compat_js_1.objectFromShape)(schema);
    }
    return schema;
}
function promptArgumentsFromSchema(schema) {
    const shape = (0, zod_compat_js_1.getObjectShape)(schema);
    if (!shape)
        return [];
    return Object.entries(shape).map(([name, field]) => {
        // Get description - works for both v3 and v4
        const description = (0, zod_compat_js_1.getSchemaDescription)(field);
        // Check if optional - works for both v3 and v4
        const isOptional = (0, zod_compat_js_1.isSchemaOptional)(field);
        return {
            name,
            description,
            required: !isOptional
        };
    });
}
function getMethodValue(schema) {
    const shape = (0, zod_compat_js_1.getObjectShape)(schema);
    const methodSchema = shape?.method;
    if (!methodSchema) {
        throw new Error('Schema is missing a method literal');
    }
    // Extract literal value - works for both v3 and v4
    const value = (0, zod_compat_js_1.getLiteralValue)(methodSchema);
    if (typeof value === 'string') {
        return value;
    }
    throw new Error('Schema method literal must be a string');
}
function createCompletionResult(suggestions) {
    return {
        completion: {
            values: suggestions.slice(0, 100),
            total: suggestions.length,
            hasMore: suggestions.length > 100
        }
    };
}
const EMPTY_COMPLETION_RESULT = {
    completion: {
        values: [],
        hasMore: false
    }
};
//# sourceMappingURL=mcp.js.map