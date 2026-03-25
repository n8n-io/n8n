const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_logging = require('./logging.cjs');
const require_package = require('./package.cjs');
const __modelcontextprotocol_sdk_client_sse_js = require_rolldown_runtime.__toESM(require("@modelcontextprotocol/sdk/client/sse.js"));
const __modelcontextprotocol_sdk_client_streamableHttp_js = require_rolldown_runtime.__toESM(require("@modelcontextprotocol/sdk/client/streamableHttp.js"));
const __modelcontextprotocol_sdk_client_index_js = require_rolldown_runtime.__toESM(require("@modelcontextprotocol/sdk/client/index.js"));
const __modelcontextprotocol_sdk_client_stdio_js = require_rolldown_runtime.__toESM(require("@modelcontextprotocol/sdk/client/stdio.js"));
const __modelcontextprotocol_sdk_types_js = require_rolldown_runtime.__toESM(require("@modelcontextprotocol/sdk/types.js"));

//#region src/connection.ts
const debugLog = require_logging.getDebugLog("connection");
const transportTypes = [
	"http",
	"sse",
	"stdio"
];
/**
* Manages a pool of MCP clients with different transport, server name and connection configurations.
* This ensures we don't create multiple connections for the same server with the same configuration.
*/
var ConnectionManager = class {
	#connections = /* @__PURE__ */ new Map();
	#hooks;
	constructor(hooks = {}) {
		this.#hooks = hooks;
	}
	async createClient(...args) {
		const [type, serverName, options] = args;
		if (!transportTypes.includes(type)) throw new Error(`Invalid transport type: ${type}`);
		const transport = type === "http" ? await this.#createStreamableHTTPTransport(serverName, options) : type === "sse" ? await this.#createSSETransport(serverName, options) : await this.#createStdioTransport(options);
		const mcpClient = new __modelcontextprotocol_sdk_client_index_js.Client({
			name: require_package.default.name,
			version: require_package.default.version
		});
		await mcpClient.connect(transport);
		if (this.#hooks.onMessage) mcpClient.setNotificationHandler(__modelcontextprotocol_sdk_types_js.LoggingMessageNotificationSchema, (notification) => this.#hooks.onMessage?.(notification.params, {
			server: serverName,
			options
		}));
		if (this.#hooks.onInitialized) mcpClient.setNotificationHandler(__modelcontextprotocol_sdk_types_js.InitializedNotificationSchema, () => this.#hooks.onInitialized?.({
			server: serverName,
			options
		}));
		if (this.#hooks.onCancelled) mcpClient.setNotificationHandler(__modelcontextprotocol_sdk_types_js.CancelledNotificationSchema, (notification) => {
			const { requestId, reason } = notification.params;
			if (requestId == null) return;
			const result = this.#hooks.onCancelled?.({
				requestId,
				reason
			}, {
				server: serverName,
				options
			});
			if (result && typeof result.catch === "function") result.catch(() => {});
		});
		if (this.#hooks.onPromptsListChanged) mcpClient.setNotificationHandler(__modelcontextprotocol_sdk_types_js.PromptListChangedNotificationSchema, () => this.#hooks.onPromptsListChanged?.({
			server: serverName,
			options
		}));
		if (this.#hooks.onResourcesListChanged) mcpClient.setNotificationHandler(__modelcontextprotocol_sdk_types_js.ResourceListChangedNotificationSchema, () => this.#hooks.onResourcesListChanged?.({
			server: serverName,
			options
		}));
		if (this.#hooks.onResourcesUpdated) mcpClient.setNotificationHandler(__modelcontextprotocol_sdk_types_js.ResourceUpdatedNotificationSchema, (notification) => this.#hooks.onResourcesUpdated?.(notification.params, {
			server: serverName,
			options
		}));
		if (this.#hooks.onRootsListChanged) mcpClient.setNotificationHandler(__modelcontextprotocol_sdk_types_js.RootsListChangedNotificationSchema, () => this.#hooks.onRootsListChanged?.({
			server: serverName,
			options
		}));
		if (this.#hooks.onToolsListChanged) mcpClient.setNotificationHandler(__modelcontextprotocol_sdk_types_js.ToolListChangedNotificationSchema, () => this.#hooks.onToolsListChanged?.({
			server: serverName,
			options
		}));
		const key = type === "stdio" ? { serverName } : {
			serverName,
			headers: serializeHeaders(options.headers),
			authProvider: options.authProvider
		};
		const forkClient = (headers) => {
			return this.#forkClient(key, headers);
		};
		const client = new Proxy(mcpClient, { get(target, prop) {
			if (prop === "fork") return forkClient.bind(this);
			return target[prop];
		} });
		this.#connections.set(key, {
			transport,
			client,
			transportOptions: options,
			closeCallback: async () => client.close()
		});
		return client;
	}
	/**
	* Allows to fork a client with a new set of headers
	*/
	#forkClient(key, headers) {
		const [, connection] = [...this.#connections.entries()].find(([k]) => key === k) ?? [];
		if (!connection) throw new Error("Transport not found");
		const type = connection.transportOptions.type ?? connection.transportOptions.transport;
		if (type === "stdio") throw new Error("Forking stdio transport is not supported");
		return this.createClient(type, key.serverName, {
			...connection.transportOptions,
			headers
		});
	}
	get(options) {
		if (typeof options === "string") return this.#queryConnection({ serverName: options })?.connection.client;
		return this.#queryConnection(options)?.connection.client;
	}
	/**
	* Get all clients
	* @returns All clients
	*/
	getAllClients() {
		return Array.from(this.#connections.values()).map((connection) => connection.client);
	}
	/**
	* Find the connection based on the parameter provided. This approach makes sure
	* that `this.get({ serverName })` and `this.get({ serverName, headers: undefined, authProvider: undefined })`
	* will return the same connection.
	*
	* @param options - The options for the transport
	* @returns The connection and the key
	*/
	#queryConnection(options) {
		const headers = serializeHeaders(options.headers);
		const [key, connection] = [...this.#connections.entries()].find(([key$1]) => {
			if (options.headers && options.authProvider) return key$1.serverName === options.serverName && key$1.headers === headers && key$1.authProvider === options.authProvider;
			if (options.headers && !options.authProvider) return key$1.serverName === options.serverName && key$1.headers === headers;
			if (options.authProvider && !options.headers) return key$1.serverName === options.serverName && key$1.authProvider === options.authProvider;
			return key$1.serverName === options.serverName;
		}) ?? [];
		if (key && connection) return {
			key,
			connection
		};
		return void 0;
	}
	has(options) {
		return Boolean(typeof options === "string" ? this.get(options) : this.get(options));
	}
	/**
	* Delete the transport based on server name and connection configuration.
	* @param options - The options for the transport, if not provided, all transports are deleted
	*/
	async delete(options) {
		if (!options) {
			await Promise.all(Array.from(this.#connections.values()).map((connection) => connection.closeCallback()));
			this.#connections.clear();
			return;
		}
		const result = this.#queryConnection(options);
		if (result) {
			await result.connection.closeCallback();
			this.#connections.delete(result.key);
		}
	}
	getTransport(opts) {
		/**
		* if a client instance is passed in
		*/
		if ("listTools" in opts) {
			const connection = [...this.#connections.values()].find((connection$1) => connection$1.client === opts);
			return connection?.transport;
		}
		const result = this.#queryConnection(opts);
		if (result) return result.connection.transport;
		return void 0;
	}
	async #createStreamableHTTPTransport(serverName, args) {
		const { url, headers, reconnect, authProvider } = args;
		const options = {
			...authProvider ? { authProvider } : {},
			...headers ? { requestInit: { headers } } : {}
		};
		if (reconnect != null) {
			const reconnectionOptions = {
				initialReconnectionDelay: reconnect?.delayMs ?? 1e3,
				maxReconnectionDelay: reconnect?.delayMs ?? 3e4,
				maxRetries: reconnect?.maxAttempts ?? 2,
				reconnectionDelayGrowFactor: 1.5
			};
			if (reconnect.enabled === false) reconnectionOptions.maxRetries = 0;
			options.reconnectionOptions = reconnectionOptions;
		}
		if (options.requestInit?.headers) debugLog(`DEBUG: Using custom headers for SSE transport to server "${serverName}"`);
		if (options.authProvider) debugLog(`DEBUG: Using OAuth authentication for Streamable HTTP transport to server "${serverName}"`);
		if (options.reconnectionOptions) if (options.reconnectionOptions.maxRetries === 0) debugLog(`DEBUG: Disabling reconnection for Streamable HTTP transport to server "${serverName}"`);
		else debugLog(`DEBUG: Using custom reconnection options for Streamable HTTP transport to server "${serverName}"`);
		return Object.keys(options).length > 0 ? new __modelcontextprotocol_sdk_client_streamableHttp_js.StreamableHTTPClientTransport(new URL(url), options) : new __modelcontextprotocol_sdk_client_streamableHttp_js.StreamableHTTPClientTransport(new URL(url));
	}
	/**
	* Create an SSE transport with appropriate EventSource implementation
	*
	* @param serverName - The name of the server
	* @param url - The URL of the server
	* @param headers - The headers to send with the request
	* @param authProvider - The OAuth client provider to use for authentication
	* @returns The SSE transport
	*/
	async #createSSETransport(serverName, args) {
		const { url, headers, authProvider } = args;
		const options = {};
		if (authProvider) {
			options.authProvider = authProvider;
			debugLog(`DEBUG: Using OAuth authentication for SSE transport to server "${serverName}"`);
		}
		if (headers) {
			options.eventSourceInit = { fetch: async (url$1, init) => {
				const requestHeaders = new Headers(init?.headers);
				if (authProvider) {
					const tokens = await authProvider.tokens();
					if (tokens) requestHeaders.set("Authorization", `Bearer ${tokens.access_token}`);
				}
				Object.entries(headers).forEach(([key, value]) => {
					requestHeaders.set(key, value);
				});
				requestHeaders.set("Accept", "text/event-stream");
				return fetch(url$1, {
					...init,
					headers: requestHeaders
				});
			} };
			options.requestInit = { headers };
			debugLog(`DEBUG: Using custom headers for SSE transport to server "${serverName}"`);
		}
		return new __modelcontextprotocol_sdk_client_sse_js.SSEClientTransport(new URL(url), options);
	}
	#createStdioTransport(options) {
		const { command, args, env, stderr, cwd } = options;
		return new __modelcontextprotocol_sdk_client_stdio_js.StdioClientTransport({
			command,
			args,
			stderr,
			cwd,
			...env ? { env: {
				PATH: process.env.PATH,
				...env
			} } : {}
		});
	}
};
/**
* A utility function that serializes the headers object to a string
* and orders the keys alphabetically so that the same headers object
* will always produce the same string.
* @param headers - The headers object to serialize
* @returns The serialized headers object
*/
function serializeHeaders(headers) {
	if (!headers) return;
	return Object.entries(headers).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}: ${value}`).join("\n");
}

//#endregion
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=connection.cjs.map