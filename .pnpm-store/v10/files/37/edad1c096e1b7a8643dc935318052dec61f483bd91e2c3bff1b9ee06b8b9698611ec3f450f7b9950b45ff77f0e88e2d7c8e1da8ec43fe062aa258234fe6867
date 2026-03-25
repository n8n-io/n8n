import { TurnContext, Authorization } from '@microsoft/agents-hosting';
import { OperationResult, IConfigurationProvider } from '@microsoft/agents-a365-runtime';
import { MCPServerConfig, McpClientTool, ToolOptions } from './contracts';
import { ChatHistoryMessage } from './models/index';
import { ToolingConfiguration } from './configuration';
/**
 * Service responsible for discovering and normalizing MCP (Model Context Protocol)
 * tool servers and producing configuration objects consumable by the Claude SDK.
 */
export declare class McpToolServerConfigurationService {
    private readonly logger;
    private readonly configProvider;
    /**
     * Construct a McpToolServerConfigurationService.
     * @param configProvider Optional configuration provider. Defaults to defaultToolingConfigurationProvider if not specified.
     */
    constructor(configProvider?: IConfigurationProvider<ToolingConfiguration>);
    /**
     * Return MCP server definitions for the given agent. In development (NODE_ENV=Development) this reads the local ToolingManifest.json; otherwise it queries the remote tooling gateway.
     *
     * @deprecated Use the overload with TurnContext and Authorization parameters instead to enable x-ms-agentid header support and automatic token generation.
     * @param agenticAppId The agentic app id for which to discover servers.
     * @param authToken Bearer token used when querying the remote tooling gateway.
     * @returns A promise resolving to an array of normalized MCP server configuration objects.
     */
    listToolServers(agenticAppId: string, authToken: string): Promise<MCPServerConfig[]>;
    /**
     * Return MCP server definitions for the given agent. In development (NODE_ENV=Development) this reads the local ToolingManifest.json; otherwise it queries the remote tooling gateway.
     *
     * @deprecated Use the overload with TurnContext and Authorization parameters instead to enable x-ms-agentid header support and automatic token generation.
     * @param agenticAppId The agentic app id for which to discover servers.
     * @param authToken Bearer token used when querying the remote tooling gateway.
     * @param options Optional tool options when calling the gateway.
     * @returns A promise resolving to an array of normalized MCP server configuration objects.
     */
    listToolServers(agenticAppId: string, authToken: string, options?: ToolOptions): Promise<MCPServerConfig[]>;
    /**
     * Return MCP server definitions for the given agent. In development (NODE_ENV=Development) this reads the local ToolingManifest.json; otherwise it queries the remote tooling gateway.
     * This overload automatically resolves the agenticAppId from the TurnContext and generates the auth token if not provided.
     *
     * @param turnContext The TurnContext of the current request.
     * @param authorization Authorization object for token exchange.
     * @param authHandlerName The name of the auth handler to use for token exchange.
     * @param authToken Optional bearer token. If not provided, will be auto-generated via token exchange.
     * @param options Optional tool options when calling the gateway.
     * @returns A promise resolving to an array of normalized MCP server configuration objects.
     */
    listToolServers(turnContext: TurnContext, authorization: Authorization, authHandlerName: string, authToken?: string, options?: ToolOptions): Promise<MCPServerConfig[]>;
    /**
     * Connect to the MCP server and return tools with names prefixed by the server name.
     * Throws if the server URL is missing or the client fails to list tools.
     */
    getMcpClientTools(mcpServerName: string, mcpServerConfig: MCPServerConfig): Promise<McpClientTool[]>;
    /**
     * Sends chat history to the MCP platform for real-time threat protection.
     *
     * @param turnContext The turn context containing conversation information.
     * @param chatHistoryMessages The chat history messages to send.
     * @returns A Promise that resolves to an OperationResult indicating success or failure.
     * @throws Error if turnContext or chatHistoryMessages is null/undefined.
     * @throws Error if required turn context properties (Conversation.Id, Activity.Id, or Activity.Text) are null.
     * @remarks
     * HTTP exceptions (network errors, timeouts) are caught and logged but not rethrown.
     * Instead, the method returns an OperationResult indicating whether the operation succeeded or failed.
     * Callers can choose to inspect the result for error handling or ignore it if error details are not needed.
     */
    sendChatHistory(turnContext: TurnContext, chatHistoryMessages: ChatHistoryMessage[]): Promise<OperationResult>;
    /**
     * Sends chat history to the MCP platform for real-time threat protection.
     *
     * @param turnContext The turn context containing conversation information.
     * @param chatHistoryMessages The chat history messages to send.
     * @param options Optional tool options for sending chat history.
     * @returns A Promise that resolves to an OperationResult indicating success or failure.
     * @throws Error if turnContext or chatHistoryMessages is null/undefined.
     * @throws Error if required turn context properties (Conversation.Id, Activity.Id, or Activity.Text) are null.
     * @remarks
     * HTTP exceptions (network errors, timeouts) are caught and logged but not rethrown.
     * Instead, the method returns an OperationResult indicating whether the operation succeeded or failed.
     * Callers can choose to inspect the result for error handling or ignore it if error details are not needed.
     */
    sendChatHistory(turnContext: TurnContext, chatHistoryMessages: ChatHistoryMessage[], options?: ToolOptions): Promise<OperationResult>;
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
    private getMCPServerConfigsFromToolingGateway;
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
    private getMCPServerConfigsFromManifest;
    /**
     * Detect if the process is running in a development scenario based on configuration.
     *
     * @returns {boolean} True when running in a development environment (NODE_ENV=Development).
     */
    private isDevScenario;
    /**
     * Gets the base URL for MCP platform from configuration.
     */
    private getMcpPlatformBaseUrl;
    /**
     * Construct the tooling gateway URL for a given agent identity.
     */
    private getToolingGatewayUrl;
    /**
     * Build the full URL for accessing a specific MCP server.
     */
    private buildMcpServerUrl;
    /**
     * Constructs the endpoint URL for sending chat history.
     */
    private getChatHistoryEndpoint;
}
//# sourceMappingURL=McpToolServerConfigurationService.d.ts.map