import { TurnContext } from '@microsoft/agents-hosting';
import { IConfigurationProvider } from '@microsoft/agents-a365-runtime';
import { ToolOptions } from './contracts';
import { ToolingConfiguration } from './configuration';
export declare class Utility {
    static readonly HEADER_CHANNEL_ID = "x-ms-channel-id";
    static readonly HEADER_SUBCHANNEL_ID = "x-ms-subchannel-id";
    static readonly HEADER_USER_AGENT = "User-Agent";
    /** Header name for sending the agent identifier to MCP platform for logging/analytics. */
    static readonly HEADER_AGENT_ID = "x-ms-agentid";
    /**
     * Compose standard headers for MCP tooling requests.
     * Includes Authorization bearer token when provided, and optionally includes channel and subchannel identifiers for routing.
     *
     * @param authToken Bearer token for Authorization header.
     * @param turnContext Optional TurnContext object from which channel and subchannel IDs are extracted.
     * @param options Optional ToolOptions object for additional request configuration.
     * @returns A headers record suitable for HTTP requests.
     */
    static GetToolRequestHeaders(authToken?: string, turnContext?: TurnContext, options?: ToolOptions): Record<string, string>;
    /**
     * Resolves the best available agent identifier for the x-ms-agentid header.
     * Priority: TurnContext.agenticAppBlueprintId > token claims (xms_par_app_azp > appid > azp) > application name
     *
     * Note: This differs from RuntimeUtility.ResolveAgentIdentity() which resolves the agenticAppId
     * for URL construction. This method resolves the identifier specifically for the x-ms-agentid header.
     *
     * @param authToken The authentication token to extract claims from.
     * @param turnContext Optional TurnContext to extract agent blueprint ID from.
     * @returns Agent ID string or undefined if not available.
     */
    private static resolveAgentIdForHeader;
    /**
     * Validates a JWT authentication token.
     * Checks that the token is a valid JWT and is not expired.
     *
     * @param authToken - The JWT token to validate.
     * @throws Error if the token is invalid or expired.
     */
    static ValidateAuthToken(authToken: string | undefined): void;
    /**
     * Private helper to validate a JWT authentication token.
     * Checks that the token is a valid JWT and is not expired.
     *
     * @param authToken - The JWT token to validate.
     * @throws Error if the token is invalid or expired.
     */
    private static validateAuthToken;
    /**
     * Construct the tooling gateway URL for a given agent identity.
     * This endpoint is used to discover MCP servers associated with the specified agent identity.
     *
     * Example:
     *   Utility.GetToolingGatewayForDigitalWorker(agenticAppId)
     *   // => "https://agent365.svc.cloud.microsoft/agents/{agenticAppId}/mcpServers"
     *
     * @param agenticAppId - The unique identifier for the agent identity.
     * @param configProvider - Optional configuration provider. Defaults to defaultToolingConfigurationProvider.
     * @returns A fully-qualified URL pointing at the tooling gateway for the agent.
     * @deprecated This method is for internal use only. Use McpToolServerConfigurationService.listToolServers() instead.
     */
    static GetToolingGatewayForDigitalWorker(agenticAppId: string, configProvider?: IConfigurationProvider<ToolingConfiguration>): string;
    /**
     * Get the base URL used to query MCP environments.
     *
     * @param configProvider - Optional configuration provider. Defaults to defaultToolingConfigurationProvider.
     * @returns The base MCP environments URL.
     * @deprecated This method is for internal use only. Use McpToolServerConfigurationService instead.
     */
    static GetMcpBaseUrl(configProvider?: IConfigurationProvider<ToolingConfiguration>): string;
    /**
     * Build the full URL for accessing a specific MCP server.
     *
     * Example:
     *   Utility.BuildMcpServerUrl('MyServer')
     *   // => "https://agent365.svc.cloud.microsoft/agents/servers/MyServer/"
     *
     * @param serverName - The MCP server resource name.
     * @param configProvider - Optional configuration provider. Defaults to defaultToolingConfigurationProvider.
     * @returns The fully-qualified MCP server URL including trailing slash.
     * @deprecated This method is for internal use only. Use McpToolServerConfigurationService instead.
    */
    static BuildMcpServerUrl(serverName: string, configProvider?: IConfigurationProvider<ToolingConfiguration>): string;
    /**
     * Gets the base URL for MCP platform from configuration.
     *
     * @param configProvider - Optional configuration provider. Defaults to defaultToolingConfigurationProvider.
     * @returns The base URL for MCP platform.
     * @deprecated This method is for internal use only. Use ToolingConfiguration.mcpPlatformEndpoint instead.
     */
    private static getMcpPlatformBaseUrl;
    /**
     * Constructs the endpoint URL for sending chat history to the MCP platform for real-time threat protection.
     *
     * @param configProvider - Optional configuration provider. Defaults to defaultToolingConfigurationProvider.
     * @returns An absolute URL that tooling components can use to send or retrieve chat messages for
     * real-time threat protection scenarios.
     * @remarks
     * Call this method when constructing HTTP requests that need to access the chat-message history
     * for real-time threat protection. The returned URL already includes the MCP platform base address
     * and the fixed path segment `/agents/real-time-threat-protection/chat-message`.
     * @deprecated This method is for internal use only. Use McpToolServerConfigurationService.sendChatHistory() instead.
     */
    static GetChatHistoryEndpoint(configProvider?: IConfigurationProvider<ToolingConfiguration>): string;
}
//# sourceMappingURL=Utility.d.ts.map