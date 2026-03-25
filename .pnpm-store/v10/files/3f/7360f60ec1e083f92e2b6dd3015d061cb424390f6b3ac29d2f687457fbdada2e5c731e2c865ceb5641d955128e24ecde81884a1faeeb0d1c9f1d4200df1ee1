"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpToolServerConfigurationService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const agents_a365_runtime_1 = require("@microsoft/agents-a365-runtime");
const Utility_1 = require("./Utility");
const configuration_1 = require("./configuration");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
/**
 * Service responsible for discovering and normalizing MCP (Model Context Protocol)
 * tool servers and producing configuration objects consumable by the Claude SDK.
 */
class McpToolServerConfigurationService {
    /**
     * Construct a McpToolServerConfigurationService.
     * @param configProvider Optional configuration provider. Defaults to defaultToolingConfigurationProvider if not specified.
     */
    constructor(configProvider) {
        this.logger = console;
        this.configProvider = configProvider ?? configuration_1.defaultToolingConfigurationProvider;
    }
    async listToolServers(agenticAppIdOrTurnContext, authTokenOrAuthorization, optionsOrAuthHandlerName, authTokenOrOptions, options) {
        // Detect which signature is being used based on the type of the first parameter
        if (typeof agenticAppIdOrTurnContext === 'string') {
            // LEGACY PATH: listToolServers(agenticAppId, authToken, options?)
            const agenticAppId = agenticAppIdOrTurnContext;
            // Runtime validation for legacy signature parameters
            if (typeof authTokenOrAuthorization !== 'string') {
                throw new Error('authToken must be a string when using the legacy listToolServers(agenticAppId, authToken) signature');
            }
            const authToken = authTokenOrAuthorization;
            const toolOptions = optionsOrAuthHandlerName;
            return await (this.isDevScenario()
                ? this.getMCPServerConfigsFromManifest()
                : this.getMCPServerConfigsFromToolingGateway(agenticAppId, authToken, undefined, toolOptions));
        }
        else {
            // NEW PATH: listToolServers(turnContext, authorization, authHandlerName, authToken?, options?)
            const turnContext = agenticAppIdOrTurnContext;
            // Runtime validation for new signature parameters
            if (typeof authTokenOrAuthorization === 'string') {
                throw new Error('authorization must be an Authorization object when using the new listToolServers(turnContext, authorization, authHandlerName) signature');
            }
            if (typeof optionsOrAuthHandlerName !== 'string') {
                throw new Error('authHandlerName must be a string when using the new listToolServers(turnContext, authorization, authHandlerName) signature');
            }
            const authorization = authTokenOrAuthorization;
            const authHandlerName = optionsOrAuthHandlerName;
            let authToken = authTokenOrOptions;
            const toolOptions = options;
            // Auto-generate token if not provided
            if (!authToken) {
                const scopes = [this.configProvider.getConfiguration().mcpPlatformAuthenticationScope];
                authToken = await agents_a365_runtime_1.AgenticAuthenticationService.GetAgenticUserToken(authorization, authHandlerName, turnContext, scopes);
                if (!authToken) {
                    throw new Error('Failed to obtain authentication token from token exchange');
                }
            }
            // Note: Token validation (format/expiration) is performed inside getMCPServerConfigsFromToolingGateway()
            // to avoid duplicate validation (it's also called by the legacy path)
            // Resolve agenticAppId from TurnContext
            const agenticAppId = agents_a365_runtime_1.Utility.ResolveAgentIdentity(turnContext, authToken);
            return await (this.isDevScenario()
                ? this.getMCPServerConfigsFromManifest()
                : this.getMCPServerConfigsFromToolingGateway(agenticAppId, authToken, turnContext, toolOptions));
        }
    }
    /**
     * Connect to the MCP server and return tools with names prefixed by the server name.
     * Throws if the server URL is missing or the client fails to list tools.
     */
    async getMcpClientTools(mcpServerName, mcpServerConfig) {
        if (!mcpServerConfig) {
            throw new Error('Invalid MCP Server Configuration');
        }
        if (!mcpServerConfig.url) {
            throw new Error('MCP Server URL cannot be null or empty');
        }
        const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(mcpServerConfig.url), {
            requestInit: {
                headers: mcpServerConfig.headers
            }
        });
        const mcpClient = new index_js_1.Client({
            name: mcpServerName + ' Client',
            version: '1.0',
        });
        await mcpClient.connect(transport);
        const toolsObj = await mcpClient.listTools();
        await mcpClient.close();
        return toolsObj.tools;
    }
    async sendChatHistory(turnContext, chatHistoryMessages, options) {
        if (!turnContext) {
            throw new Error('turnContext is required');
        }
        if (!chatHistoryMessages) {
            throw new Error('chatHistoryMessages is required');
        }
        // Extract required information from turn context
        const conversationId = turnContext.activity?.conversation?.id;
        if (!conversationId) {
            throw new Error('Conversation ID is required but not found in turn context');
        }
        const messageId = turnContext.activity?.id;
        if (!messageId) {
            throw new Error('Message ID is required but not found in turn context');
        }
        const userMessage = turnContext.activity?.text;
        if (!userMessage) {
            throw new Error('User message is required but not found in turn context');
        }
        // Get the endpoint URL
        const endpoint = this.getChatHistoryEndpoint();
        this.logger.info(`Sending chat history to endpoint: ${endpoint}`);
        // Create the request payload
        const request = {
            conversationId,
            messageId,
            userMessage,
            chatHistory: chatHistoryMessages
        };
        try {
            const headers = Utility_1.Utility.GetToolRequestHeaders(undefined, turnContext, options);
            await axios_1.default.post(endpoint, request, {
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 seconds timeout
            });
            this.logger.info('Successfully sent chat history to MCP platform');
            return agents_a365_runtime_1.OperationResult.success;
        }
        catch (err) {
            const error = err;
            if (axios_1.default.isAxiosError(err)) {
                if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
                    this.logger.error(`Request timeout sending chat history to '${endpoint}': ${error.message}`);
                }
                else {
                    this.logger.error(`HTTP error sending chat history to '${endpoint}': ${error.message}`);
                }
            }
            else {
                this.logger.error(`Failed to send chat history to '${endpoint}': ${error.message}`);
            }
            return agents_a365_runtime_1.OperationResult.failed(new agents_a365_runtime_1.OperationError(error));
        }
    }
    /**
     * Query the tooling gateway for MCP servers for the specified agent and normalize each entry's mcpServerUniqueName into a full URL using Utility.BuildMcpServerUrl.
     * Throws an error if the gateway call fails.
     *
     * @param agenticAppId The agentic app id used by the tooling gateway to scope results.
     * @param authToken Optional Bearer token to include in the Authorization header when calling the gateway.
     * @param turnContext Optional TurnContext for extracting agent blueprint ID for request headers.
     * @param options Optional tool options when calling the gateway.
     * @throws Error when the gateway call fails or returns an unexpected payload.
     */
    async getMCPServerConfigsFromToolingGateway(agenticAppId, authToken, turnContext, options) {
        // Validate the authentication token
        Utility_1.Utility.ValidateAuthToken(authToken);
        const configEndpoint = this.getToolingGatewayUrl(agenticAppId);
        try {
            const response = await axios_1.default.get(configEndpoint, {
                headers: Utility_1.Utility.GetToolRequestHeaders(authToken, turnContext, options),
                timeout: 10000 // 10 seconds timeout
            });
            return (response.data) || [];
        }
        catch (err) {
            const error = err;
            throw new Error(`Failed to read MCP servers from endpoint: ${error.code || 'UNKNOWN'} ${error.message || 'Unknown error'}`);
        }
    }
    /**
     * Read MCP servers from a local ToolingManifest.json file (development only).
     * Searches process.cwd() and process.argv[1] for the manifest file.
     *
     * Reads MCP server configurations from ToolingManifest.json in the application's content root.
     * The file should be located at: [ProjectRoot]/ToolingManifest.json
     *
     * Example ToolingManifest.json:
     * {
     *   "mcpServers": [
     *     {
     *       "mcpServerName": "mailMCPServerConfig",
     *       "mcpServerUniqueName": "mcp_MailTools"
     *     },
     *     {
     *       "mcpServerName": "sharePointMCPServerConfig",
     *       "mcpServerUniqueName": "mcp_SharePointTools"
     *     }
     *   ]
     * }
     *
     * Each server entry can optionally include a "url" field to specify a custom MCP server URL.
     * If the "url" field is not provided, the URL will be automatically constructed using the server name.
     * The server name is determined by using "mcpServerName" if present, otherwise "mcpServerUniqueName".
     */
    async getMCPServerConfigsFromManifest() {
        let manifestPath = path_1.default.join(process.cwd(), 'ToolingManifest.json');
        if (!fs_1.default.existsSync(manifestPath)) {
            this.logger.warn(`ToolingManifest.json not found at ${manifestPath}, checking argv[1] location.`);
            manifestPath = path_1.default.join(path_1.default.dirname(process.argv[1] || ''), 'ToolingManifest.json');
        }
        if (!fs_1.default.existsSync(manifestPath)) {
            this.logger.warn(`ToolingManifest.json not found at ${manifestPath}`);
            return [];
        }
        try {
            const jsonContent = fs_1.default.readFileSync(manifestPath, 'utf-8');
            const manifestData = JSON.parse(jsonContent);
            const mcpServers = manifestData.mcpServers || [];
            return mcpServers.map((s) => {
                // Use mcpServerName if available, otherwise fall back to mcpServerUniqueName
                const serverName = s.mcpServerName || s.mcpServerUniqueName;
                if (!serverName) {
                    throw new Error('Either mcpServerName or mcpServerUniqueName must be provided in manifest entry');
                }
                return {
                    mcpServerName: serverName,
                    url: s.url || this.buildMcpServerUrl(serverName),
                    headers: s.headers
                };
            });
        }
        catch (err) {
            const error = err;
            this.logger.error(`Error reading or parsing ToolingManifest.json: ${error.message || 'Unknown error'}`);
            return [];
        }
    }
    /**
     * Detect if the process is running in a development scenario based on configuration.
     *
     * @returns {boolean} True when running in a development environment (NODE_ENV=Development).
     */
    isDevScenario() {
        return this.configProvider.getConfiguration().useToolingManifest;
    }
    /**
     * Gets the base URL for MCP platform from configuration.
     */
    getMcpPlatformBaseUrl() {
        return this.configProvider.getConfiguration().mcpPlatformEndpoint;
    }
    /**
     * Construct the tooling gateway URL for a given agent identity.
     */
    getToolingGatewayUrl(agenticAppId) {
        return `${this.getMcpPlatformBaseUrl()}/agents/${agenticAppId}/mcpServers`;
    }
    /**
     * Build the full URL for accessing a specific MCP server.
     */
    buildMcpServerUrl(serverName) {
        return `${this.getMcpPlatformBaseUrl()}/agents/servers/${serverName}/`;
    }
    /**
     * Constructs the endpoint URL for sending chat history.
     */
    getChatHistoryEndpoint() {
        return `${this.getMcpPlatformBaseUrl()}/agents/real-time-threat-protection/chat-message`;
    }
}
exports.McpToolServerConfigurationService = McpToolServerConfigurationService;
//# sourceMappingURL=McpToolServerConfigurationService.js.map