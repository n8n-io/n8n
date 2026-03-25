import { ClientConfig, Connection, CustomHTTPTransportOptions, MCPResource, MCPResourceContent, MCPResourceTemplate } from "./types.cjs";
import { Client } from "./connection.cjs";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { LoggingLevel } from "@modelcontextprotocol/sdk/types.js";

//#region src/client.d.ts

/**
 * Client for connecting to multiple MCP servers and loading LangChain-compatible tools.
 */
declare class MultiServerMCPClient {
  #private;
  /**
   * Returns clone of server config for inspection purposes.
   *
   * Client does not support config modifications.
   */
  get config(): ClientConfig;
  /**
   * Create a new MultiServerMCPClient.
   *
   * @param config - Configuration object
   */
  constructor(config: ClientConfig | Record<string, Connection>);
  /**
   * Proactively initialize connections to all servers. This will be called automatically when
   * methods requiring an active connection (like {@link getTools} or {@link getClient}) are called,
   * but you can call it directly to ensure all connections are established before using the tools.
   *
   * When a server fails to connect, the client will throw an error if `onConnectionError` is "throw",
   * otherwise it will skip the server and continue with the remaining servers.
   *
   * @returns A map of server names to arrays of tools
   * @throws {MCPClientError} If initialization fails and `onConnectionError` is "throw" (default)
   */
  initializeConnections(customTransportOptions?: CustomHTTPTransportOptions): Promise<Record<string, DynamicStructuredTool[]>>;
  /**
   * Get tools from specified servers as a flattened array.
   *
   * @param servers - Optional array of server names to filter tools by.
   *                 If not provided, returns tools from all servers.
   * @param options - Optional connection options for the tool calls, e.g. custom auth provider or headers.
   * @returns A flattened array of tools from the specified servers (or all servers)
   *
   * @example
   * ```ts
   * // Get tools from all servers
   * const tools = await client.getTools();
   * ```
   *
   * @example
   * ```ts
   * // Get tools from specific servers
   * const tools = await client.getTools("server1", "server2");
   * ```
   *
   * @example
   * ```ts
   * // Get tools from specific servers with custom connection options
   * const tools = await client.getTools(["server1", "server2"], {
   *   authProvider: new OAuthClientProvider(),
   *   headers: { "X-Custom-Header": "value" },
   * });
   * ```
   */
  getTools(...servers: string[]): Promise<DynamicStructuredTool[]>;
  getTools(servers: string[], options?: CustomHTTPTransportOptions): Promise<DynamicStructuredTool[]>;
  /**
   * Set the logging level for all servers
   * @param level - The logging level
   *
   * @example
   * ```ts
   * await client.setLoggingLevel("debug");
   * ```
   */
  setLoggingLevel(level: LoggingLevel): Promise<void>;
  /**
   * Set the logging level for a specific server
   * @param serverName - The name of the server
   * @param level - The logging level
   *
   * @example
   * ```ts
   * await client.setLoggingLevel("server1", "debug");
   * ```
   */
  setLoggingLevel(serverName: string, level: LoggingLevel): Promise<void>;
  /**
   * Get a the MCP client for a specific server. Useful for fetching prompts or resources from that server.
   *
   * @param serverName - The name of the server
   * @returns The client for the server, or undefined if the server is not connected
   */
  getClient(serverName: string, options?: CustomHTTPTransportOptions): Promise<Client | undefined>;
  /**
   * List resources from specified servers.
   *
   * @param servers - Optional array of server names to filter resources by.
   *                 If not provided, returns resources from all servers.
   * @param options - Optional connection options for the resource listing, e.g. custom auth provider or headers.
   * @returns A map of server names to their resources
   *
   * @example
   * ```ts
   * // List resources from all servers
   * const resources = await client.listResources();
   * ```
   *
   * @example
   * ```ts
   * // List resources from specific servers
   * const resources = await client.listResources("server1", "server2");
   * ```
   */
  listResources(...servers: string[]): Promise<Record<string, MCPResource[]>>;
  listResources(servers: string[], options?: CustomHTTPTransportOptions): Promise<Record<string, MCPResource[]>>;
  /**
   * List resource templates from specified servers.
   *
   * Resource templates are used for dynamic resources with parameterized URIs.
   *
   * @param servers - Optional array of server names to filter resource templates by.
   *                 If not provided, returns resource templates from all servers.
   * @param options - Optional connection options for the resource template listing, e.g. custom auth provider or headers.
   * @returns A map of server names to their resource templates
   *
   * @example
   * ```ts
   * // List resource templates from all servers
   * const templates = await client.listResourceTemplates();
   * ```
   *
   * @example
   * ```ts
   * // List resource templates from specific servers
   * const templates = await client.listResourceTemplates("server1", "server2");
   * ```
   */
  listResourceTemplates(...servers: string[]): Promise<Record<string, MCPResourceTemplate[]>>;
  listResourceTemplates(servers: string[], options?: CustomHTTPTransportOptions): Promise<Record<string, MCPResourceTemplate[]>>;
  /**
   * Read a resource from a specific server.
   *
   * @param serverName - The name of the server to read the resource from
   * @param uri - The URI of the resource to read
   * @param options - Optional connection options for reading the resource, e.g. custom auth provider or headers.
   * @returns The resource contents
   *
   * @example
   * ```ts
   * const content = await client.readResource("server1", "file://path/to/resource");
   * ```
   */
  readResource(serverName: string, uri: string, options?: CustomHTTPTransportOptions): Promise<MCPResourceContent[]>;
  /**
   * Close all connections.
   */
  close(): Promise<void>;
  private _initializeConnection;
  private _initializeStdioConnection;
  /**
   * Set up stdio restart handling
   */
  private _setupStdioRestart;
  private _getHttpErrorCode;
  private _createAuthenticationErrorMessage;
  private _toSSEConnectionURL;
  private _initializeStreamableHTTPConnection;
  private _initializeSSEConnection;
  /**
   * Set up reconnect handling for SSE (Streamable HTTP reconnects are more complex and are handled internally by the SDK)
   */
  private _setupSSEReconnect;
  private _loadToolsForServer;
  private _attemptReconnect;
  /**
   * Get all tools from all servers as a flat array.
   *
   * @returns A flattened array of all tools
   */
  private _getAllToolsAsFlatArray;
  /**
   * Get tools from specific servers as a flat array.
   *
   * @param serverNames - Names of servers to get tools from
   * @returns A flattened array of tools from the specified servers
   */
  private _getToolsFromServers;
}
//#endregion
export { MultiServerMCPClient };
//# sourceMappingURL=client.d.cts.map