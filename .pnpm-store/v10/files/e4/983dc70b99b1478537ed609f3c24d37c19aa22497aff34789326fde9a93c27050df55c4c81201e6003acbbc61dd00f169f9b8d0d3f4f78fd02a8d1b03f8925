"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpToolRegistrationService = void 0;
// Microsoft Agent 365 SDK
const agents_a365_tooling_1 = require("@microsoft/agents-a365-tooling");
const agents_a365_runtime_1 = require("@microsoft/agents-a365-runtime");
const configuration_1 = require("./configuration");
// LangChain SDKs
const langchain_1 = require("langchain");
const mcp_adapters_1 = require("@langchain/mcp-adapters");
// UUID for generating message IDs
const uuid_1 = require("uuid");
/**
 * Discover MCP servers and list tools formatted for the LangChain Orchestrator.
 * Uses listToolServers to fetch server configs and getTools to enumerate tools.
 *
 * Also provides methods to send chat history to the MCP platform for
 * real-time threat protection (RTP) analysis.
 */
class McpToolRegistrationService {
    /**
     * Construct a McpToolRegistrationService.
     * @param configProvider Optional configuration provider. Defaults to defaultLangChainToolingConfigurationProvider if not specified.
     */
    constructor(configProvider) {
        this.orchestratorName = "LangChain";
        this.configProvider = configProvider ?? configuration_1.defaultLangChainToolingConfigurationProvider;
        this.configService = new agents_a365_tooling_1.McpToolServerConfigurationService(this.configProvider);
    }
    /**
     * Registers MCP tool servers and updates agent options with discovered tools and server configs.
     * Call this to enable dynamic LangChain tool access based on the current MCP environment.
     * @param agent The LangChain Agent instance to which MCP servers will be added.
     * @param authorization Authorization object for token exchange.
     * @param authHandlerName The name of the auth handler to use for token exchange.
     * @param turnContext The TurnContext of the current request.
     * @param authToken Optional bearer token for MCP server access.
     * @returns The updated Agent instance with registered MCP servers.
     */
    async addToolServersToAgent(agent, authorization, authHandlerName, turnContext, authToken) {
        if (!agent) {
            throw new Error('Langchain Agent is Required');
        }
        if (!authToken) {
            const scope = this.configProvider.getConfiguration().mcpPlatformAuthenticationScope;
            authToken = await agents_a365_runtime_1.AgenticAuthenticationService.GetAgenticUserToken(authorization, authHandlerName, turnContext, [scope]);
        }
        // Validate the authentication token
        agents_a365_tooling_1.Utility.ValidateAuthToken(authToken);
        const options = { orchestratorName: this.orchestratorName };
        const servers = await this.configService.listToolServers(turnContext, authorization, authHandlerName, authToken, options);
        const mcpServers = {};
        for (const server of servers) {
            // Compose headers if values are available
            const headers = agents_a365_tooling_1.Utility.GetToolRequestHeaders(authToken, turnContext, options);
            // Create Connection instance for LangChain agents
            mcpServers[server.mcpServerName] = {
                type: 'http',
                url: server.url,
                headers: headers
            };
        }
        const mcpClientConfig = {};
        mcpClientConfig.mcpServers = Object.assign(mcpClientConfig.mcpServers ?? {}, mcpServers);
        const multiServerMcpClient = new mcp_adapters_1.MultiServerMCPClient(mcpClientConfig);
        const mcpTools = await multiServerMcpClient.getTools();
        // Merge existing agent tools with MCP tools
        const existingTools = agent.options.tools ?? [];
        const allTools = [...existingTools, ...mcpTools];
        // Create the agent with existing options and combined tools
        return (0, langchain_1.createAgent)({
            ...agent.options,
            tools: allTools,
        });
    }
    // ============================================================================
    // Send Chat History API Methods
    // ============================================================================
    /**
     * Sends chat history from a LangGraph CompiledStateGraph to the MCP platform.
     *
     * This is the highest-level and easiest-to-use API. It retrieves the current state
     * from the graph, extracts messages, converts them to ChatHistoryMessage format,
     * and sends them to the MCP platform for real-time threat protection.
     *
     * @param turnContext - The turn context containing conversation information.
     * @param graph - The LangGraph CompiledStateGraph instance. The graph state must contain a 'messages' array.
     * @param config - The RunnableConfig containing thread_id and other configuration.
     * @param limit - Optional limit on the number of messages to send.
     * @param toolOptions - Optional tool options for customization.
     * @returns A Promise resolving to an OperationResult indicating success or failure.
     * @throws Error if turnContext is null/undefined.
     * @throws Error if graph is null/undefined.
     * @throws Error if config is null/undefined.
     *
     * @example
     * ```typescript
     * const config = { configurable: { thread_id: '1' } };
     * const result = await service.sendChatHistoryAsync(turnContext, graph, config);
     * if (result.succeeded) {
     *   console.log('Chat history sent successfully');
     * }
     * ```
     */
    async sendChatHistoryAsync(turnContext, graph, config, limit, toolOptions) {
        // Validate inputs
        if (!turnContext) {
            throw new Error('turnContext is required');
        }
        if (!graph) {
            throw new Error('graph is required');
        }
        if (!config) {
            throw new Error('config is required');
        }
        // Get state from graph - wrap in try-catch as this is an external call
        let stateSnapshot;
        try {
            stateSnapshot = await graph.getState(config);
        }
        catch (err) {
            return agents_a365_runtime_1.OperationResult.failed(new agents_a365_runtime_1.OperationError(err));
        }
        // Delegate to state-based method
        return this.sendChatHistoryFromStateAsync(turnContext, stateSnapshot, limit, toolOptions);
    }
    /**
     * Extracts messages from a LangGraph StateSnapshot and sends them to the MCP platform.
     *
     * Use this API when you already have a StateSnapshot (e.g., from a previous
     * `graph.getState()` call) and want to avoid fetching state again.
     *
     * @param turnContext - The turn context containing conversation information.
     * @param stateSnapshot - The LangGraph StateSnapshot containing message state.
     * @param limit - Optional limit on the number of messages to send.
     * @param toolOptions - Optional tool options for customization.
     * @returns A Promise resolving to an OperationResult indicating success or failure.
     * @throws Error if turnContext is null/undefined.
     * @throws Error if stateSnapshot is null/undefined.
     * @throws Error if stateSnapshot does not contain a messages array.
     *
     * @example
     * ```typescript
     * const config = { configurable: { thread_id: '1' } };
     * const stateSnapshot = await graph.getState(config);
     * const result = await service.sendChatHistoryFromStateAsync(turnContext, stateSnapshot);
     * ```
     */
    async sendChatHistoryFromStateAsync(turnContext, stateSnapshot, limit, toolOptions) {
        if (!turnContext) {
            throw new Error('turnContext is required');
        }
        if (!stateSnapshot) {
            throw new Error('stateSnapshot is required');
        }
        const values = stateSnapshot.values;
        const messages = values?.messages;
        if (!messages || !Array.isArray(messages)) {
            throw new Error('stateSnapshot must contain messages array in values');
        }
        return this.sendChatHistoryFromMessagesAsync(turnContext, messages, limit, toolOptions);
    }
    /**
     * Retrieves messages from a BaseChatMessageHistory instance and sends them to the MCP platform.
     *
     * Use this API when working with LangChain's memory abstractions (e.g., InMemoryChatMessageHistory,
     * RedisChatMessageHistory, etc.).
     *
     * @param turnContext - The turn context containing conversation information.
     * @param chatHistory - The BaseChatMessageHistory instance to retrieve messages from.
     * @param limit - Optional limit on the number of messages to send.
     * @param toolOptions - Optional tool options for customization.
     * @returns A Promise resolving to an OperationResult indicating success or failure.
     * @throws Error if turnContext is null/undefined.
     * @throws Error if chatHistory is null/undefined.
     *
     * @example
     * ```typescript
     * const chatHistory = new InMemoryChatMessageHistory();
     * // ... add messages to history ...
     * const result = await service.sendChatHistoryFromChatHistoryAsync(turnContext, chatHistory);
     * ```
     */
    async sendChatHistoryFromChatHistoryAsync(turnContext, chatHistory, limit, toolOptions) {
        if (!turnContext) {
            throw new Error('turnContext is required');
        }
        if (!chatHistory) {
            throw new Error('chatHistory is required');
        }
        // Retrieve messages from the chat history - wrap in try-catch as this is an external call
        let messages;
        try {
            messages = await chatHistory.getMessages();
        }
        catch (err) {
            return agents_a365_runtime_1.OperationResult.failed(new agents_a365_runtime_1.OperationError(err));
        }
        // Delegate to messages-based method
        return this.sendChatHistoryFromMessagesAsync(turnContext, messages, limit, toolOptions);
    }
    /**
     * Sends an array of LangChain messages to the MCP platform for real-time threat protection.
     *
     * This is the lowest-level API that accepts raw BaseMessage arrays. Use this when you
     * have already extracted messages or have a custom message source not covered by the
     * higher-level APIs.
     *
     * This method converts the provided BaseMessage array to ChatHistoryMessage format
     * and sends them to the MCP platform. Empty arrays are sent as-is to register the
     * user message with the platform.
     *
     * @param turnContext - The turn context containing conversation information.
     * @param messages - Array of LangChain BaseMessage objects to send.
     * @param limit - Optional limit on the number of messages to send.
     * @param toolOptions - Optional tool options for customization.
     * @returns A Promise resolving to an OperationResult indicating success or failure.
     * @throws Error if turnContext is null/undefined.
     * @throws Error if messages is null/undefined.
     * @throws Error if required turn context properties are missing.
     *
     * @example
     * ```typescript
     * const messages = await messageHistory.getMessages();
     * const result = await service.sendChatHistoryFromMessagesAsync(turnContext, messages, 50);
     * if (result.succeeded) {
     *   console.log('Chat history sent successfully');
     * } else {
     *   console.error('Failed to send chat history:', result.errors);
     * }
     * ```
     */
    async sendChatHistoryFromMessagesAsync(turnContext, messages, limit, toolOptions) {
        // Validate inputs
        if (!turnContext) {
            throw new Error('turnContext is required');
        }
        if (!messages) {
            throw new Error('messages is required');
        }
        // Apply limit if specified
        const messagesToProcess = limit !== undefined && limit >= 0 ? messages.slice(0, limit) : messages;
        // Set default options, preserving any additional properties from toolOptions
        const effectiveOptions = {
            orchestratorName: this.orchestratorName,
            ...toolOptions
        };
        // Convert messages (may result in empty array - that's OK)
        // convertToChatHistoryMessages handles errors internally and never throws
        const chatHistoryMessages = this.convertToChatHistoryMessages(messagesToProcess);
        // IMPORTANT: Always send to API, even if empty array
        // Empty array is required to register the user message with RTP
        return this.configService.sendChatHistory(turnContext, chatHistoryMessages, effectiveOptions);
    }
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    /**
     * Converts an array of BaseMessage to ChatHistoryMessage format.
     * Messages that fail conversion are silently skipped.
     *
     * @param messages - Array of LangChain BaseMessage objects to convert.
     * @returns Array of ChatHistoryMessage objects.
     */
    convertToChatHistoryMessages(messages) {
        return messages
            .map(msg => this.convertSingleMessage(msg))
            .filter((msg) => msg !== null);
    }
    /**
     * Converts a single BaseMessage to ChatHistoryMessage format.
     *
     * @param message - The LangChain BaseMessage to convert.
     * @returns ChatHistoryMessage or null if conversion fails.
     */
    convertSingleMessage(message) {
        try {
            const content = this.extractContent(message);
            if (!content || content.trim().length === 0) {
                return null;
            }
            return {
                id: message.id ?? (0, uuid_1.v4)(),
                role: this.mapRole(message),
                content: content,
                timestamp: new Date()
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Maps a LangChain message type to a standard role string.
     *
     * @param message - The LangChain BaseMessage to map.
     * @returns The mapped role string.
     */
    mapRole(message) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- LangChain API deprecation, not our code
        const type = message.getType();
        switch (type) {
            case 'human':
                return 'user';
            case 'ai':
                return 'assistant';
            case 'system':
                return 'system';
            case 'tool':
                return 'tool';
            case 'function':
                return 'function';
            case 'chat':
                // ChatMessage has a role property
                return message.role ?? 'user';
            default:
                return 'user';
        }
    }
    /**
     * Extracts text content from a LangChain message.
     * Handles both string content and ContentPart arrays.
     *
     * @param message - The LangChain BaseMessage to extract content from.
     * @returns The extracted text content as a string.
     */
    extractContent(message) {
        // Try the text accessor first (handles ContentPart arrays)
        try {
            const text = message.text;
            if (text && text.trim().length > 0) {
                return text;
            }
        }
        catch {
            // text accessor might throw for non-text content
        }
        // Fallback to content property
        if (typeof message.content === 'string') {
            return message.content;
        }
        // Handle ContentPart array
        if (Array.isArray(message.content)) {
            const textParts = message.content
                .filter((part) => typeof part === 'object' && part !== null && 'text' in part)
                .map(part => part.text)
                .filter(text => text && text.length > 0);
            if (textParts.length > 0) {
                return textParts.join(' ');
            }
        }
        return '';
    }
}
exports.McpToolRegistrationService = McpToolRegistrationService;
//# sourceMappingURL=McpToolRegistrationService.js.map