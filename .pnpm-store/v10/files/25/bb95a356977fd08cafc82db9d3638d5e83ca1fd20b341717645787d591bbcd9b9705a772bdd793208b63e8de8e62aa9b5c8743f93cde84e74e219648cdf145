const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_types = require('./types.cjs');
const require_logging = require('./logging.cjs');
const require_tools = require('./tools.cjs');
const require_connection = require('./connection.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/client.ts
const debugLog = require_logging.getDebugLog();
/**
* Error class for MCP client operations
*/
var MCPClientError = class extends Error {
	constructor(message, serverName) {
		super(message);
		this.serverName = serverName;
		this.name = "MCPClientError";
	}
};
/**
* Checks if the connection configuration is for a stdio transport
* @param connection - The connection configuration
* @returns True if the connection configuration is for a stdio transport
*/
function isResolvedStdioConnection(connection) {
	if (typeof connection !== "object" || connection === null || Array.isArray(connection)) return false;
	if ("transport" in connection && connection.transport === "stdio") return true;
	if ("type" in connection && connection.type === "stdio") return true;
	if ("command" in connection && typeof connection.command === "string") return true;
	return false;
}
/**
* Checks if the connection configuration is for a streamable HTTP transport
* @param connection - The connection configuration
* @returns True if the connection configuration is for a streamable HTTP transport
*/
function isResolvedStreamableHTTPConnection(connection) {
	if (typeof connection !== "object" || connection === null || Array.isArray(connection)) return false;
	if ("transport" in connection && typeof connection.transport === "string" && ["http", "sse"].includes(connection.transport) || "type" in connection && typeof connection.type === "string" && ["http", "sse"].includes(connection.type)) return true;
	if ("url" in connection && typeof connection.url === "string") try {
		new URL(connection.url);
		return true;
	} catch {
		return false;
	}
	return false;
}
/**
* Client for connecting to multiple MCP servers and loading LangChain-compatible tools.
*/
var MultiServerMCPClient = class {
	/**
	* Cached map of server names to tools
	*/
	#serverNameToTools = {};
	/**
	* Configured MCP servers
	*/
	#mcpServers;
	/**
	* Cached map of server names to load tools options
	*/
	#loadToolsOptions = {};
	/**
	* Connection manager
	*/
	#clientConnections;
	/**
	* Resolved client config
	*/
	#config;
	/**
	* Behavior when a server fails to connect
	*/
	#onConnectionError;
	/**
	* Set of server names that have failed to connect (when onConnectionError is "ignore")
	*/
	#failedServers = /* @__PURE__ */ new Set();
	/**
	* Returns clone of server config for inspection purposes.
	*
	* Client does not support config modifications.
	*/
	get config() {
		return JSON.parse(JSON.stringify(this.#config));
	}
	/**
	* Create a new MultiServerMCPClient.
	*
	* @param config - Configuration object
	*/
	constructor(config) {
		let parsedServerConfig;
		const configSchema = require_types.clientConfigSchema;
		if ("mcpServers" in config) parsedServerConfig = configSchema.parse(config);
		else {
			const parsedMcpServers = zod_v3.z.record(require_types.connectionSchema).parse(config);
			parsedServerConfig = configSchema.parse({ mcpServers: parsedMcpServers });
		}
		if (Object.keys(parsedServerConfig.mcpServers).length === 0) throw new MCPClientError("No MCP servers provided");
		for (const [serverName, serverConfig] of Object.entries(parsedServerConfig.mcpServers)) {
			const outputHandling = require_types._resolveAndApplyOverrideHandlingOverrides(parsedServerConfig.outputHandling, serverConfig.outputHandling);
			const defaultToolTimeout = parsedServerConfig.defaultToolTimeout ?? serverConfig.defaultToolTimeout;
			this.#loadToolsOptions[serverName] = {
				throwOnLoadError: parsedServerConfig.throwOnLoadError,
				prefixToolNameWithServerName: parsedServerConfig.prefixToolNameWithServerName,
				additionalToolNamePrefix: parsedServerConfig.additionalToolNamePrefix,
				useStandardContentBlocks: parsedServerConfig.useStandardContentBlocks,
				...Object.keys(outputHandling).length > 0 ? { outputHandling } : {},
				...defaultToolTimeout ? { defaultToolTimeout } : {},
				onProgress: parsedServerConfig.onProgress,
				beforeToolCall: parsedServerConfig.beforeToolCall,
				afterToolCall: parsedServerConfig.afterToolCall
			};
		}
		this.#config = parsedServerConfig;
		this.#mcpServers = parsedServerConfig.mcpServers;
		this.#clientConnections = new require_connection.ConnectionManager(parsedServerConfig);
		this.#onConnectionError = parsedServerConfig.onConnectionError;
	}
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
	async initializeConnections(customTransportOptions) {
		if (!this.#mcpServers || Object.keys(this.#mcpServers).length === 0) throw new MCPClientError("No connections to initialize");
		for (const [serverName, connection] of Object.entries(this.#mcpServers)) {
			if ((this.#onConnectionError === "ignore" || typeof this.#onConnectionError === "function") && this.#failedServers.has(serverName)) continue;
			try {
				await this._initializeConnection(serverName, connection, customTransportOptions);
				this.#failedServers.delete(serverName);
			} catch (error) {
				if (this.#onConnectionError === "throw") throw error;
				if (typeof this.#onConnectionError === "function") {
					this.#onConnectionError({
						serverName,
						error
					});
					this.#failedServers.add(serverName);
					debugLog(`WARN: Failed to initialize connection to server "${serverName}": ${String(error)}`);
					continue;
				}
				this.#failedServers.add(serverName);
				debugLog(`WARN: Failed to initialize connection to server "${serverName}": ${String(error)}`);
				continue;
			}
		}
		if (this.#onConnectionError === "ignore" && Object.keys(this.#serverNameToTools).length === 0) debugLog(`WARN: No servers successfully connected. All connection attempts failed.`);
		return this.#serverNameToTools;
	}
	async getTools(...args) {
		if (args.length === 0 || args.every((arg) => typeof arg === "string")) {
			await this.initializeConnections();
			const servers$1 = args;
			return servers$1.length === 0 ? this._getAllToolsAsFlatArray() : this._getToolsFromServers(servers$1);
		}
		const [servers, options] = args;
		await this.initializeConnections(options);
		return servers.length === 0 ? this._getAllToolsAsFlatArray() : this._getToolsFromServers(servers);
	}
	async setLoggingLevel(...args) {
		if (args.length === 1 && typeof args[0] === "string") {
			const level$1 = args[0];
			await Promise.all(this.#clientConnections.getAllClients().map((client) => client.setLoggingLevel(level$1)));
			return;
		}
		const [serverName, level] = args;
		await this.#clientConnections.get(serverName)?.setLoggingLevel(level);
	}
	/**
	* Get a the MCP client for a specific server. Useful for fetching prompts or resources from that server.
	*
	* @param serverName - The name of the server
	* @returns The client for the server, or undefined if the server is not connected
	*/
	async getClient(serverName, options) {
		await this.initializeConnections(options);
		return this.#clientConnections.get({
			serverName,
			headers: options?.headers,
			authProvider: options?.authProvider
		});
	}
	async listResources(...args) {
		let servers;
		let options;
		if (args.length === 0 || args.every((arg) => typeof arg === "string")) {
			servers = args;
			await this.initializeConnections();
		} else {
			[servers, options] = args;
			await this.initializeConnections(options);
		}
		const targetServers = servers.length > 0 ? servers : Object.keys(this.#config.mcpServers);
		const result = {};
		for (const serverName of targetServers) {
			const client = await this.getClient(serverName, options);
			if (!client) {
				debugLog(`WARN: Server "${serverName}" not found or not connected`);
				continue;
			}
			try {
				const resourcesList = await client.listResources();
				result[serverName] = resourcesList.resources.map((resource) => ({
					uri: resource.uri,
					name: resource.title ?? resource.name,
					description: resource.description,
					mimeType: resource.mimeType
				}));
				debugLog(`INFO: Listed ${result[serverName].length} resources from server "${serverName}"`);
			} catch (error) {
				debugLog(`ERROR: Failed to list resources from server "${serverName}": ${error}`);
				result[serverName] = [];
			}
		}
		return result;
	}
	async listResourceTemplates(...args) {
		let servers;
		let options;
		if (args.length === 0 || args.every((arg) => typeof arg === "string")) {
			servers = args;
			await this.initializeConnections();
		} else {
			[servers, options] = args;
			await this.initializeConnections(options);
		}
		const targetServers = servers.length > 0 ? servers : Object.keys(this.#config.mcpServers);
		const result = {};
		for (const serverName of targetServers) {
			const client = await this.getClient(serverName, options);
			if (!client) {
				debugLog(`WARN: Server "${serverName}" not found or not connected`);
				continue;
			}
			try {
				const templatesList = await client.listResourceTemplates();
				result[serverName] = templatesList.resourceTemplates.map((template) => ({
					uriTemplate: template.uriTemplate,
					name: template.title ?? template.name,
					description: template.description,
					mimeType: template.mimeType
				}));
				debugLog(`INFO: Listed ${result[serverName].length} resource templates from server "${serverName}"`);
			} catch (error) {
				debugLog(`ERROR: Failed to list resource templates from server "${serverName}": ${error}`);
				result[serverName] = [];
			}
		}
		return result;
	}
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
	async readResource(serverName, uri, options) {
		await this.initializeConnections(options);
		const client = await this.getClient(serverName, options);
		if (!client) throw new MCPClientError(`Server "${serverName}" not found or not connected`, serverName);
		try {
			debugLog(`INFO: Reading resource "${uri}" from server "${serverName}"`);
			const result = await client.readResource({ uri });
			return result.contents.map((content) => ({
				uri: content.uri,
				mimeType: content.mimeType,
				text: "text" in content ? content.text : void 0,
				blob: "blob" in content ? content.blob : void 0
			}));
		} catch (error) {
			throw new MCPClientError(`Failed to read resource "${uri}" from server "${serverName}": ${error}`, serverName);
		}
	}
	/**
	* Close all connections.
	*/
	async close() {
		debugLog(`INFO: Closing all MCP connections...`);
		this.#serverNameToTools = {};
		this.#failedServers.clear();
		await this.#clientConnections.delete();
		debugLog(`INFO: All MCP connections closed`);
	}
	/**
	* Initialize a connection to a specific server
	*/
	async _initializeConnection(serverName, connection, customTransportOptions) {
		if (isResolvedStdioConnection(connection)) {
			debugLog(`INFO: Initializing stdio connection to server "${serverName}"...`);
			/**
			* check if we already initialized this stdio connection
			*/
			if (this.#clientConnections.has(serverName)) return;
			await this._initializeStdioConnection(serverName, connection);
		} else if (isResolvedStreamableHTTPConnection(connection)) {
			/**
			* Users may want to use different connection options for tool calls or tool discovery.
			*/
			const { authProvider, headers } = customTransportOptions ?? {};
			const updatedConnection = {
				...connection,
				authProvider: authProvider ?? connection.authProvider,
				headers: {
					...headers,
					...connection.headers
				}
			};
			/**
			* check if we already initialized this streamable HTTP connection
			*/
			const key = {
				serverName,
				headers: updatedConnection.headers,
				authProvider: updatedConnection.authProvider
			};
			if (this.#clientConnections.has(key)) return;
			if (connection.type === "sse" || connection.transport === "sse") await this._initializeSSEConnection(serverName, updatedConnection);
			else await this._initializeStreamableHTTPConnection(serverName, updatedConnection);
		} else throw new MCPClientError(`Unsupported transport type for server "${serverName}"`, serverName);
	}
	/**
	* Initialize a stdio connection
	*/
	async _initializeStdioConnection(serverName, connection) {
		const { command, args, restart } = connection;
		debugLog(`DEBUG: Creating stdio transport for server "${serverName}" with command: ${command} ${args.join(" ")}`);
		try {
			const client = await this.#clientConnections.createClient("stdio", serverName, connection);
			const transport = this.#clientConnections.getTransport({ serverName });
			if (restart?.enabled) this._setupStdioRestart(serverName, transport, connection, restart);
			await this._loadToolsForServer(serverName, client);
		} catch (error) {
			throw new MCPClientError(`Failed to connect to stdio server "${serverName}": ${error}`, serverName);
		}
	}
	/**
	* Set up stdio restart handling
	*/
	_setupStdioRestart(serverName, transport, connection, restart) {
		const originalOnClose = transport.onclose;
		transport.onclose = async () => {
			if (originalOnClose) await originalOnClose();
			if (this.#clientConnections.get(serverName)) {
				debugLog(`INFO: Process for server "${serverName}" exited, attempting to restart...`);
				await this._attemptReconnect(serverName, connection, restart.maxAttempts, restart.delayMs);
			}
		};
	}
	_getHttpErrorCode(error) {
		const streamableError = error;
		let { code } = streamableError;
		if (code == null) {
			const m = streamableError.message.match(/\(HTTP (\d\d\d)\)/);
			if (m && m.length > 1) code = parseInt(m[1], 10);
		}
		return code;
	}
	_createAuthenticationErrorMessage(serverName, url, transport, originalError) {
		return `Authentication failed for ${transport} server "${serverName}" at ${url}. Please check your credentials, authorization headers, or OAuth configuration. Original error: ${originalError}`;
	}
	_toSSEConnectionURL(url) {
		const urlObj = new URL(url);
		const pathnameParts = urlObj.pathname.split("/");
		const lastPart = pathnameParts.at(-1);
		if (lastPart && lastPart === "mcp") pathnameParts[pathnameParts.length - 1] = "sse";
		urlObj.pathname = pathnameParts.join("/");
		return urlObj.toString();
	}
	/**
	* Initialize a streamable HTTP connection
	*/
	async _initializeStreamableHTTPConnection(serverName, connection) {
		const { url, type: typeField, transport: transportField } = connection;
		const automaticSSEFallback = connection.automaticSSEFallback ?? true;
		const transportType = typeField || transportField;
		debugLog(`DEBUG: Creating Streamable HTTP transport for server "${serverName}" with URL: ${url}`);
		if (transportType === "http" || transportType == null) try {
			const client = await this.#clientConnections.createClient("http", serverName, connection);
			await this._loadToolsForServer(serverName, client);
		} catch (error) {
			const code = this._getHttpErrorCode(error);
			if (automaticSSEFallback && code != null && code >= 400 && code < 500) try {
				await this._initializeSSEConnection(serverName, connection);
			} catch (firstSSEError) {
				const sseUrl = this._toSSEConnectionURL(url);
				if (sseUrl !== url) try {
					await this._initializeSSEConnection(serverName, {
						...connection,
						url: sseUrl
					});
				} catch (secondSSEError) {
					if (code === 401) throw new MCPClientError(this._createAuthenticationErrorMessage(serverName, url, "HTTP", `${error}. Also tried SSE fallback at ${url} and ${sseUrl}, but both failed with authentication errors.`), serverName);
					throw new MCPClientError(`Failed to connect to streamable HTTP server "${serverName}, url: ${url}": ${error}. Additionally, tried falling back to SSE at ${url} and ${sseUrl}, but this also failed: ${secondSSEError}`, serverName);
				}
				else {
					if (code === 401) throw new MCPClientError(this._createAuthenticationErrorMessage(serverName, url, "HTTP", `${error}. Also tried SSE fallback at ${url}, but it failed with authentication error: ${firstSSEError}`), serverName);
					throw new MCPClientError(`Failed to connect to streamable HTTP server after trying to fall back to SSE: "${serverName}, url: ${url}": ${error} (SSE fallback failed with error ${firstSSEError})`, serverName);
				}
			}
			else {
				if (code === 401) throw new MCPClientError(this._createAuthenticationErrorMessage(serverName, url, "HTTP", `${error}`), serverName);
				throw new MCPClientError(`Failed to connect to streamable HTTP server "${serverName}, url: ${url}": ${error}`, serverName);
			}
		}
	}
	/**
	* Initialize an SSE connection
	*
	* Don't call this directly unless SSE transport is explicitly requested. Otherwise,
	* use _initializeStreamableHTTPConnection and it'll fall back to SSE if needed for
	* backwards compatibility.
	*
	* @param serverName - The name of the server
	* @param connection - The connection configuration
	*/
	async _initializeSSEConnection(serverName, connection) {
		const { url, headers, reconnect, authProvider } = connection;
		try {
			const client = await this.#clientConnections.createClient("sse", serverName, connection);
			const transport = this.#clientConnections.getTransport({
				serverName,
				headers,
				authProvider
			});
			if (reconnect?.enabled) this._setupSSEReconnect(serverName, transport, connection, reconnect);
			await this._loadToolsForServer(serverName, client);
		} catch (error) {
			if (error && error.name === "MCPClientError") throw error;
			const isAuthError = error && this._getHttpErrorCode(error) === 401;
			if (isAuthError) throw new MCPClientError(this._createAuthenticationErrorMessage(serverName, url, "SSE", `${error}`), serverName);
			throw new MCPClientError(`Failed to create SSE transport for server "${serverName}, url: ${url}": ${error}`, serverName);
		}
	}
	/**
	* Set up reconnect handling for SSE (Streamable HTTP reconnects are more complex and are handled internally by the SDK)
	*/
	_setupSSEReconnect(serverName, transport, connection, reconnect) {
		const originalOnClose = transport.onclose;
		transport.onclose = async () => {
			if (originalOnClose) await originalOnClose();
			if (this.#clientConnections.get({
				serverName,
				headers: connection.headers,
				authProvider: connection.authProvider
			})) {
				debugLog(`INFO: HTTP connection for server "${serverName}" closed, attempting to reconnect...`);
				await this._attemptReconnect(serverName, connection, reconnect.maxAttempts, reconnect.delayMs);
			}
		};
	}
	/**
	* Load tools for a specific server
	*/
	async _loadToolsForServer(serverName, client) {
		try {
			debugLog(`DEBUG: Loading tools for server "${serverName}"...`);
			const tools = await require_tools.loadMcpTools(serverName, client, this.#loadToolsOptions[serverName]);
			this.#serverNameToTools[serverName] = tools;
			debugLog(`INFO: Successfully loaded ${tools.length} tools from server "${serverName}"`);
		} catch (error) {
			throw new MCPClientError(`Failed to load tools from server "${serverName}": ${error}`);
		}
	}
	/**
	* Attempt to reconnect to a server after a connection failure.
	*
	* @param serverName - The name of the server to reconnect to
	* @param connection - The connection configuration
	* @param maxAttempts - Maximum number of reconnection attempts
	* @param delayMs - Delay in milliseconds between reconnection attempts
	* @private
	*/
	async _attemptReconnect(serverName, connection, maxAttempts = 3, delayMs = 1e3) {
		let connected = false;
		let attempts = 0;
		if ("headers" in connection || "authProvider" in connection) {
			const { headers, authProvider } = connection;
			await this.#cleanupServerResources({
				serverName,
				authProvider,
				headers
			});
		} else await this.#cleanupServerResources({ serverName });
		while (!connected && (maxAttempts === void 0 || attempts < maxAttempts)) {
			attempts += 1;
			debugLog(`INFO: Reconnection attempt ${attempts}${maxAttempts ? `/${maxAttempts}` : ""} for server "${serverName}"`);
			try {
				if (delayMs) await new Promise((resolve) => {
					setTimeout(resolve, delayMs);
				});
				if (isResolvedStdioConnection(connection)) await this._initializeStdioConnection(serverName, connection);
				else if (isResolvedStreamableHTTPConnection(connection)) if (connection.type === "sse" || connection.transport === "sse") await this._initializeSSEConnection(serverName, connection);
				else await this._initializeStreamableHTTPConnection(serverName, connection);
				const key = "headers" in connection ? {
					serverName,
					headers: connection.headers,
					authProvider: connection.authProvider
				} : { serverName };
				if (this.#clientConnections.has(key)) {
					connected = true;
					debugLog(`INFO: Successfully reconnected to server "${serverName}"`);
				}
			} catch (error) {
				debugLog(`ERROR: Failed to reconnect to server "${serverName}" (attempt ${attempts}): ${error}`);
			}
		}
		if (!connected) debugLog(`ERROR: Failed to reconnect to server "${serverName}" after ${attempts} attempts`);
	}
	/**
	* Clean up resources for a specific server
	*/
	async #cleanupServerResources(transportOptions) {
		const { serverName, authProvider, headers } = transportOptions;
		delete this.#serverNameToTools[serverName];
		await this.#clientConnections.delete({
			serverName,
			authProvider,
			headers
		});
	}
	/**
	* Get all tools from all servers as a flat array.
	*
	* @returns A flattened array of all tools
	*/
	_getAllToolsAsFlatArray() {
		const allTools = [];
		for (const tools of Object.values(this.#serverNameToTools)) allTools.push(...tools);
		return allTools;
	}
	/**
	* Get tools from specific servers as a flat array.
	*
	* @param serverNames - Names of servers to get tools from
	* @returns A flattened array of tools from the specified servers
	*/
	_getToolsFromServers(serverNames) {
		const allTools = [];
		for (const serverName of serverNames) {
			const tools = this.#serverNameToTools[serverName];
			if (tools) allTools.push(...tools);
		}
		return allTools;
	}
};

//#endregion
exports.MultiServerMCPClient = MultiServerMCPClient;
//# sourceMappingURL=client.cjs.map