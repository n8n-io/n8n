import type { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
	JSONRPCMessage,
	ServerRequest,
	ServerNotification,
} from '@modelcontextprotocol/sdk/types.js';
import {
	JSONRPCMessageSchema,
	ListToolsRequestSchema,
	CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import type * as express from 'express';
import type { IncomingMessage } from 'http';
import { jsonParse, OperationalError, type Logger } from 'n8n-workflow';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { FlushingSSEServerTransport, FlushingStreamableHTTPTransport } from './FlushingTransport';
import type { CompressionResponse } from './FlushingTransport';

/**
 * Marker object used in pub/sub to indicate a list tools request should be handled.
 * When Main2 receives a tools/list request without local transport, it publishes
 * this marker via mcp-response. Main1 (with the SSE transport) sees this marker
 * and responds with the tools list.
 */
export const MCP_LIST_TOOLS_REQUEST_MARKER = { _listToolsRequest: true } as const;

/**
 * Pending MCP response for queue mode support.
 * Stores the transport reference and resolve function to send results when worker responds.
 */
interface PendingMcpTriggerResponse {
	sessionId: string;
	messageId: string;
	transport: FlushingSSEServerTransport | FlushingStreamableHTTPTransport;
	createdAt: Date;
}

/**
 * Pending tool call waiting for worker execution in queue mode.
 * The resolve function receives the tool result from the worker.
 */
interface PendingToolCall {
	toolName: string;
	arguments: Record<string, unknown>;
	resolve: (result: unknown) => void;
	reject: (error: Error) => void;
}

/**
 * Parses the JSONRPC message and checks whether the method used was a tool
 * call. This is necessary in order to not have executions for listing tools
 * and other commands sent by the MCP client
 */
function wasToolCall(body: string) {
	try {
		const message: unknown = JSON.parse(body);
		const parsedMessage: JSONRPCMessage = JSONRPCMessageSchema.parse(message);
		return (
			'method' in parsedMessage &&
			'id' in parsedMessage &&
			parsedMessage?.method === CallToolRequestSchema.shape.method.value
		);
	} catch {
		return false;
	}
}

/**
 * Parses the JSONRPC message and checks whether the method used was a tools/list request.
 */
function wasListToolsRequest(body: string): boolean {
	try {
		const message: unknown = JSON.parse(body);
		const parsedMessage: JSONRPCMessage = JSONRPCMessageSchema.parse(message);
		return (
			'method' in parsedMessage &&
			'id' in parsedMessage &&
			parsedMessage?.method === ListToolsRequestSchema.shape.method.value
		);
	} catch {
		return false;
	}
}

/**
 * Extracts the request ID from a JSONRPC message (for example for tool calls).
 * Returns undefined if the message doesn't have an ID (for example on a tool list request)
 *
 */
function getRequestId(message: unknown): string | undefined {
	try {
		const parsedMessage: JSONRPCMessage = JSONRPCMessageSchema.parse(message);
		return 'id' in parsedMessage ? String(parsedMessage.id) : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Tool call info extracted from an MCP message.
 */
export interface McpToolCallInfo {
	toolName: string;
	arguments: Record<string, unknown>;
	/** The n8n node name that provides this tool (for worker execution in queue mode) */
	sourceNodeName?: string;
}

/**
 * Extracts tool call info from an MCP message if it's a tool call.
 * Returns undefined if the message is not a tool call.
 */
function extractToolCallInfo(body: string): McpToolCallInfo | undefined {
	try {
		const message: unknown = JSON.parse(body);
		const parsedMessage: JSONRPCMessage = JSONRPCMessageSchema.parse(message);
		if (
			'method' in parsedMessage &&
			'params' in parsedMessage &&
			parsedMessage.method === CallToolRequestSchema.shape.method.value
		) {
			const params = parsedMessage.params;
			if (
				typeof params === 'object' &&
				params !== null &&
				'name' in params &&
				typeof params.name === 'string' &&
				'arguments' in params &&
				typeof params.arguments === 'object' &&
				params.arguments !== null
			) {
				return {
					toolName: params.name,
					arguments: params.arguments as Record<string, unknown>,
				};
			}
		}
		return undefined;
	} catch {
		return undefined;
	}
}

/**
 * This singleton is shared across the instance, making sure it is the one
 * keeping account of MCP servers.
 * It needs to stay in memory to keep track of the long-lived connections.
 * It requires a logger at first creation to set everything up.
 */
export class McpServerManager {
	static #instance: McpServerManager;

	servers: { [sessionId: string]: Server } = {};

	transports: {
		[sessionId: string]: FlushingSSEServerTransport | FlushingStreamableHTTPTransport;
	} = {};

	private tools: { [sessionId: string]: Tool[] } = {};

	private resolveFunctions: { [callId: string]: CallableFunction } = {};

	/**
	 * Pending responses for queue mode support.
	 * Key is `${sessionId}_${messageId}` (callId).
	 */
	private pendingResponses: { [callId: string]: PendingMcpTriggerResponse } = {};

	/**
	 * Pending tool calls waiting for worker execution in queue mode.
	 * Key is `${sessionId}_${messageId}` (callId).
	 */
	private pendingToolCalls: { [callId: string]: PendingToolCall } = {};

	/**
	 * Whether the instance is running in queue mode.
	 * In queue mode, tool executions are delegated to workers.
	 */
	private _isQueueMode = false;

	/**
	 * Callback to register a newly created session in shared storage.
	 * Set by CLI in queue mode to enable session validation across main instances.
	 */
	private sessionRegistrationCallback?: (sessionId: string) => Promise<void>;

	/**
	 * Callback to validate a session ID exists in shared storage.
	 * Set by CLI in queue mode to prevent session fixation attacks.
	 */
	private sessionValidationCallback?: (sessionId: string) => Promise<boolean>;

	/**
	 * Callback to unregister a session from shared storage when it's closed.
	 * Set by CLI in queue mode to cleanup session registry.
	 */
	private sessionUnregistrationCallback?: (sessionId: string) => Promise<void>;

	logger: Logger;

	private constructor(logger: Logger) {
		this.logger = logger;
		this.logger.debug('MCP Server created');
	}

	static instance(logger: Logger): McpServerManager {
		if (!McpServerManager.#instance) {
			McpServerManager.#instance = new McpServerManager(logger);
			logger.debug('Created singleton MCP manager');
		}

		return McpServerManager.#instance;
	}

	async createServerWithSSETransport(
		serverName: string,
		postUrl: string,
		resp: CompressionResponse,
		connectedTools?: Tool[],
	): Promise<void> {
		const server = new Server(
			{
				name: serverName,
				version: '0.1.0',
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		const transport = new FlushingSSEServerTransport(postUrl, resp);

		this.setUpHandlers(server);

		const sessionId = transport.sessionId;
		this.transports[sessionId] = transport;
		this.servers[sessionId] = server;

		// Register session in shared store for multi-main validation
		await this.registerSession(sessionId);

		// Register tools for this session
		if (connectedTools) {
			this.tools[sessionId] = connectedTools;
		}

		resp.on('close', async () => {
			this.logger.debug(`Deleting transport for ${sessionId}`);
			await this.unregisterSession(sessionId);
			this.cleanupSessionPendingResponses(sessionId);
			delete this.tools[sessionId];
			delete this.transports[sessionId];
			delete this.servers[sessionId];
		});
		await server.connect(transport);

		// Make sure we flush the compression middleware, so that it's not waiting for more content to be added to the buffer
		if (resp.flush) {
			resp.flush();
		}
	}

	getSessionId(req: express.Request): string | undefined {
		// Session ID can be passed either as a query parameter (SSE transport)
		// or in the header (StreamableHTTP transport).
		return (req.query.sessionId ?? req.headers['mcp-session-id']) as string | undefined;
	}

	getTransport(
		sessionId: string,
	): FlushingSSEServerTransport | FlushingStreamableHTTPTransport | undefined {
		return this.transports[sessionId];
	}

	async createServerWithStreamableHTTPTransport(
		serverName: string,
		resp: CompressionResponse,
		req?: express.Request,
		connectedTools?: Tool[],
	): Promise<void> {
		const server = new Server(
			{
				name: serverName,
				version: '0.1.0',
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		const transport = new FlushingStreamableHTTPTransport(
			{
				sessionIdGenerator: () => randomUUID(),
				onsessioninitialized: async (sessionId) => {
					this.logger.debug(`New session initialized: ${sessionId}`);
					// Register session in shared store for multi-main validation
					await this.registerSession(sessionId);
					transport.onclose = async () => {
						this.logger.debug(`Deleting transport for ${sessionId}`);
						await this.unregisterSession(sessionId);
						this.cleanupSessionPendingResponses(sessionId);
						delete this.tools[sessionId];
						delete this.transports[sessionId];
						delete this.servers[sessionId];
					};
					this.transports[sessionId] = transport;
					this.servers[sessionId] = server;
					// Register tools for this session
					if (connectedTools) {
						this.tools[sessionId] = connectedTools;
					}
				},
			},
			resp,
		);

		this.setUpHandlers(server);

		await server.connect(transport);

		await transport.handleRequest(req as IncomingMessage, resp, req?.body);
		if (resp.flush) {
			resp.flush();
		}
	}

	/**
	 * Recreate a StreamableHTTP transport for an existing session on a different main instance.
	 * This enables multi-main support where POST requests can be load-balanced to any main.
	 * The transport is recreated with the same session ID, allowing the request to be handled locally.
	 *
	 * @returns true if the transport was recreated successfully, false if session validation failed.
	 */
	private async recreateStreamableHTTPTransport(
		sessionId: string,
		serverName: string,
		connectedTools: Tool[],
		resp: CompressionResponse,
	): Promise<boolean> {
		// Validate the session ID exists in the shared store before recreating
		// This prevents session fixation attacks where a client sends a fabricated session ID
		const isValid = await this.isSessionValid(sessionId);
		if (!isValid) {
			this.logger.warn(`Rejecting recreate request for invalid session: ${sessionId}`);
			return false;
		}

		const server = new Server(
			{
				name: serverName,
				version: '0.1.0',
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		// Create transport with the EXISTING session ID (not generating a new one)
		const transport = new FlushingStreamableHTTPTransport(
			{
				sessionIdGenerator: () => sessionId,
			},
			resp,
		);

		// Mark transport as initialized and set the session ID since this session was already
		// initialized on another main. Without this, the SDK would reject requests with either
		// "Bad Request: Server not initialized" or "Session not found" (404).
		transport.markAsInitialized(sessionId);

		this.transports[sessionId] = transport;
		this.servers[sessionId] = server;
		this.tools[sessionId] = connectedTools;

		transport.onclose = async () => {
			this.logger.debug(`Deleting recreated transport for ${sessionId}`);
			this.cleanupSessionPendingResponses(sessionId);
			delete this.tools[sessionId];
			delete this.transports[sessionId];
			delete this.servers[sessionId];
		};

		this.setUpHandlers(server);
		await server.connect(transport);
		return true;
	}

	async handlePostMessage(
		req: express.Request,
		resp: CompressionResponse,
		connectedTools: Tool[],
		serverName?: string,
	): Promise<{
		wasToolCall: boolean;
		toolCallInfo?: McpToolCallInfo;
		messageId?: string;
		/** Session ID when request needs to be relayed via pub/sub */
		relaySessionId?: string;
		/** True when this is a list tools request that needs to be relayed to another main */
		needsListToolsRelay?: boolean;
	}> {
		// Session ID can be passed either as a query parameter (SSE transport)
		// or in the header (StreamableHTTP transport).
		const sessionId = this.getSessionId(req);
		let transport = this.getTransport(sessionId as string);
		const rawBody = req.rawBody.toString();
		let toolCallInfo = extractToolCallInfo(rawBody);
		let messageId: string | undefined;

		// Enhance tool call info with sourceNodeName from the tool's metadata
		// This is needed for queue mode to identify which node to execute on the worker
		if (toolCallInfo) {
			const tool = connectedTools.find((t) => t.name === toolCallInfo!.toolName);
			if (tool?.metadata?.sourceNodeName && typeof tool.metadata.sourceNodeName === 'string') {
				toolCallInfo = {
					...toolCallInfo,
					sourceNodeName: tool.metadata.sourceNodeName,
				};
			}
		}

		// For StreamableHTTP: If no transport exists locally but we have a session ID from header,
		// recreate the transport on this main instance. This enables multi-main support where
		// requests can be load-balanced to any main.
		// SSE is not affected as it uses query parameter for session ID and requires sticky sessions.
		if (sessionId && !transport && req.headers['mcp-session-id'] && serverName) {
			this.logger.debug(
				`Recreating StreamableHTTP transport for session ${sessionId} on this main instance`,
			);
			const recreateSuccess = await this.recreateStreamableHTTPTransport(
				sessionId,
				serverName,
				connectedTools,
				resp,
			);
			if (!recreateSuccess) {
				// Session validation failed - reject the request
				resp.status(404).send('Session not found');
				return { wasToolCall: false };
			}
			transport = this.getTransport(sessionId);
		}

		// For SSE in queue mode: If no transport exists locally but we have a session ID from query,
		// the SSE connection is on a different main. Tool calls and tools/list can be forwarded via pub/sub.
		// Other messages (initialize, etc.) require the actual MCP server on the main with the transport.
		const isToolCall = wasToolCall(rawBody);
		const isListToolsRequest = wasListToolsRequest(rawBody);
		if (
			sessionId &&
			!transport &&
			req.query.sessionId &&
			this._isQueueMode &&
			(isToolCall || isListToolsRequest)
		) {
			this.logger.debug(
				`SSE queue mode: forwarding ${isToolCall ? 'tool call' : 'list tools'} for session ${sessionId} via pub/sub`,
			);
			const message = jsonParse(rawBody);
			messageId = getRequestId(message);
			// Return 202 Accepted like the SSE SDK does for async operations
			// The response will be sent via pub/sub to the main with the SSE transport
			resp.status(202).send('Accepted');
			return {
				wasToolCall: isToolCall,
				toolCallInfo,
				messageId,
				// For list tools requests, include relay info so CLI can publish mcp-response
				relaySessionId: isListToolsRequest ? sessionId : undefined,
				needsListToolsRelay: isListToolsRequest,
			};
		}

		if (sessionId && transport) {
			// We need to add a promise here because the `handlePostMessage` will send something to the
			// MCP Server, that will run in a different context. This means that the return will happen
			// almost immediately, and will lead to marking the sub-node as "running" in the final execution
			const message = jsonParse(rawBody);
			messageId = getRequestId(message);
			// Use session & message ID if available, otherwise fall back to sessionId
			const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
			this.tools[sessionId] = connectedTools;

			try {
				await new Promise(async (resolve) => {
					this.resolveFunctions[callId] = resolve;
					await transport.handleRequest(req, resp, message as IncomingMessage);
				});
			} finally {
				delete this.resolveFunctions[callId];
			}
		} else {
			this.logger.warn(`No transport found for session ${sessionId}`);
			resp.status(401).send('No transport found for sessionId');
		}

		if (resp.flush) {
			resp.flush();
		}

		return {
			wasToolCall: wasToolCall(rawBody),
			toolCallInfo,
			messageId,
		};
	}

	async handleDeleteRequest(req: express.Request, resp: CompressionResponse) {
		const sessionId = this.getSessionId(req);

		if (!sessionId) {
			resp.status(400).send('No sessionId provided');
			return;
		}

		const transport = this.getTransport(sessionId);

		if (transport) {
			this.cleanupSessionPendingResponses(sessionId);

			if (transport instanceof FlushingStreamableHTTPTransport) {
				await transport.handleRequest(req, resp);
				return;
			} else {
				// For SSE transport, we don't support DELETE requests
				resp.status(405).send('Method Not Allowed');
				return;
			}
		}

		resp.status(404).send('Session not found');
	}

	/**
	 * Get MCP metadata for a request. Used to pass MCP context to job data in queue mode.
	 */
	getMcpMetadata(req: express.Request): { sessionId: string; messageId: string } | undefined {
		const sessionId = this.getSessionId(req);
		if (!sessionId) return undefined;

		const message = jsonParse(req.rawBody.toString());
		const messageId = getRequestId(message);

		return {
			sessionId,
			messageId: messageId ?? '',
		};
	}

	/**
	 * Store a pending response for queue mode.
	 * Called when the workflow execution is enqueued to a worker.
	 */
	storePendingResponse(sessionId: string, messageId: string): void {
		const transport = this.getTransport(sessionId);
		if (!transport) {
			this.logger.warn(`Cannot store pending response: no transport for session ${sessionId}`);
			return;
		}

		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		this.pendingResponses[callId] = {
			sessionId,
			messageId,
			transport,
			createdAt: new Date(),
		};
	}

	/**
	 * Handle a response from a worker for an MCP Trigger execution.
	 * In queue mode, the tool executes on the worker and sends back the result.
	 * This resolves the pending tool call so the handler can return the result to the MCP client.
	 *
	 * Also handles relayed requests (like tools/list) that come from another main via pub/sub.
	 * These are identified by a special marker in the result: { _listToolsRequest: true }
	 */
	handleWorkerResponse(sessionId: string, messageId: string, result: unknown): void {
		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		const pending = this.pendingResponses[callId];
		const pendingToolCall = this.pendingToolCalls[callId];

		// Check if this is a relayed list tools request from another main
		const isListToolsRequest =
			typeof result === 'object' &&
			result !== null &&
			'_listToolsRequest' in result &&
			(result as { _listToolsRequest: boolean })._listToolsRequest;

		if (isListToolsRequest) {
			// Handle list tools request - send the tools list directly via SSE transport
			const transport = this.getTransport(sessionId);
			if (transport && transport.transportType === 'sse' && messageId) {
				this.logger.debug(
					`SSE queue mode: handling relayed list tools request for session ${sessionId}`,
				);

				const tools = this.tools[sessionId] ?? [];
				const toolsList = tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					inputSchema: zodToJsonSchema(tool.schema, { removeAdditionalStrategy: 'strict' }),
				}));

				const response: JSONRPCMessage = {
					jsonrpc: '2.0',
					id: messageId,
					result: { tools: toolsList },
				};
				void transport.send(response);
			}
			return;
		}

		// Resolve the pending tool call with the worker's result
		if (pendingToolCall) {
			this.resolveToolCall(callId, result);
		} else {
			// SSE queue mode: POST was on a different main, send directly via SSE transport.
			// The pending tool call doesn't exist because the CallToolRequestSchema handler
			// never ran on this main - the POST went to a different main which returned 202.
			const transport = this.getTransport(sessionId);
			if (transport && transport.transportType === 'sse' && messageId) {
				this.logger.debug(
					`SSE queue mode: sending response directly via transport for session ${sessionId}`,
				);

				// Format result the same way MCP Server handler does
				const formattedResult = this.formatToolResult(result);

				// Construct and send JSON-RPC response directly
				const response: JSONRPCMessage = {
					jsonrpc: '2.0',
					id: messageId,
					result: formattedResult,
				};
				void transport.send(response);
			}
		}

		// Also resolve the handlePostMessage promise if it exists
		if (this.resolveFunctions[callId]) {
			this.resolveFunctions[callId]();
			delete this.resolveFunctions[callId];
		}

		// Clean up the pending response
		if (pending) {
			delete this.pendingResponses[callId];
		}
	}

	/**
	 * Format a tool result for MCP response.
	 * Converts raw results into the MCP content format.
	 */
	private formatToolResult(result: unknown): { content: Array<{ type: string; text: string }> } {
		if (typeof result === 'object') {
			return { content: [{ type: 'text', text: JSON.stringify(result) }] };
		}
		if (typeof result === 'string') {
			return { content: [{ type: 'text', text: result }] };
		}
		return { content: [{ type: 'text', text: String(result) }] };
	}

	/**
	 * Remove a pending response (e.g., on timeout or cancellation).
	 */
	removePendingResponse(sessionId: string, messageId: string): void {
		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		if (this.pendingResponses[callId]) {
			delete this.pendingResponses[callId];
		}
	}

	/**
	 * Check if there's a pending response for a given session/message.
	 */
	hasPendingResponse(sessionId: string, messageId: string): boolean {
		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		return callId in this.pendingResponses;
	}

	/**
	 * Clean up all pending responses and tool calls for a given session.
	 * Called when a session is deleted or closed.
	 */
	cleanupSessionPendingResponses(sessionId: string): void {
		const keysToDelete: string[] = [];

		for (const callId of Object.keys(this.pendingResponses)) {
			if (this.pendingResponses[callId].sessionId === sessionId) {
				keysToDelete.push(callId);
			}
		}

		for (const callId of keysToDelete) {
			if (this.resolveFunctions[callId]) {
				this.resolveFunctions[callId]();
				delete this.resolveFunctions[callId];
			}
			delete this.pendingResponses[callId];
			delete this.pendingToolCalls[callId];
		}
	}

	/**
	 * Get the count of pending responses.
	 */
	get pendingResponseCount(): number {
		return Object.keys(this.pendingResponses).length;
	}

	/**
	 * Get whether the instance is running in queue mode.
	 */
	get isQueueMode(): boolean {
		return this._isQueueMode;
	}

	/**
	 * Set whether the instance is running in queue mode.
	 * Should be called during initialization based on execution config.
	 */
	setQueueMode(isQueueMode: boolean): void {
		this._isQueueMode = isQueueMode;
	}

	/**
	 * Set callbacks for session management in multi-main queue mode.
	 * These callbacks allow the CLI to manage session IDs in Redis to prevent
	 * session fixation attacks when recreating transports on different main instances.
	 *
	 * @param onRegister - Called when a new session is created. Should store the session ID in Redis.
	 * @param onValidate - Called before recreating a transport. Should check if session exists in Redis.
	 * @param onUnregister - Called when a session is closed. Should remove the session ID from Redis.
	 */
	setSessionCallbacks(
		onRegister: (sessionId: string) => Promise<void>,
		onValidate: (sessionId: string) => Promise<boolean>,
		onUnregister: (sessionId: string) => Promise<void>,
	): void {
		this.sessionRegistrationCallback = onRegister;
		this.sessionValidationCallback = onValidate;
		this.sessionUnregistrationCallback = onUnregister;
	}

	/**
	 * Register a session ID in the shared store (if callback is set).
	 * Called when a new session is legitimately created.
	 */
	private async registerSession(sessionId: string): Promise<void> {
		if (this.sessionRegistrationCallback) {
			await this.sessionRegistrationCallback(sessionId);
			this.logger.debug(`Registered session in shared store: ${sessionId}`);
		}
	}

	/**
	 * Validate a session ID exists in the shared store.
	 * Returns true if no callback is set (backwards compatibility for non-queue mode).
	 */
	private async isSessionValid(sessionId: string): Promise<boolean> {
		if (!this.sessionValidationCallback) {
			// No validation callback set - allow for backwards compatibility
			return true;
		}
		const isValid = await this.sessionValidationCallback(sessionId);
		if (!isValid) {
			this.logger.warn(`Session validation failed for: ${sessionId}`);
		}
		return isValid;
	}

	/**
	 * Unregister a session ID from the shared store (if callback is set).
	 * Called when a session is closed.
	 */
	private async unregisterSession(sessionId: string): Promise<void> {
		if (this.sessionUnregistrationCallback) {
			await this.sessionUnregistrationCallback(sessionId);
			this.logger.debug(`Unregistered session from shared store: ${sessionId}`);
		}
	}

	/**
	 * Store a pending tool call for queue mode.
	 * Called by the CallToolRequestSchema handler when in queue mode.
	 */
	async storePendingToolCall(
		callId: string,
		toolName: string,
		toolArguments: Record<string, unknown>,
	): Promise<unknown> {
		return await new Promise((resolve, reject) => {
			this.pendingToolCalls[callId] = {
				toolName,
				arguments: toolArguments,
				resolve,
				reject,
			};
		});
	}

	/**
	 * Get the pending tool call info for a given callId.
	 * Used by the worker to know which tool to execute.
	 */
	getPendingToolCall(callId: string): PendingToolCall | undefined {
		return this.pendingToolCalls[callId];
	}

	/**
	 * Resolve a pending tool call with the result from the worker.
	 */
	resolveToolCall(callId: string, result: unknown): void {
		const pending = this.pendingToolCalls[callId];
		if (pending) {
			pending.resolve(result);
			delete this.pendingToolCalls[callId];
		} else {
			this.logger.warn('No pending tool call found to resolve', { callId });
		}
	}

	/**
	 * Reject a pending tool call with an error.
	 */
	rejectToolCall(callId: string, error: Error): void {
		const pending = this.pendingToolCalls[callId];
		if (pending) {
			pending.reject(error);
			delete this.pendingToolCalls[callId];
		}
	}

	setUpHandlers(server: Server) {
		server.setRequestHandler(
			ListToolsRequestSchema,
			async (_, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
				if (!extra.sessionId) {
					throw new OperationalError('Require a sessionId for the listing of tools');
				}

				return {
					tools: this.tools[extra.sessionId].map((tool) => {
						return {
							name: tool.name,
							description: tool.description,
							// Allow additional properties on tool call input
							inputSchema: zodToJsonSchema(tool.schema, { removeAdditionalStrategy: 'strict' }),
						};
					}),
				};
			},
		);

		server.setRequestHandler(
			CallToolRequestSchema,
			async (request, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
				if (!request.params?.name || !request.params?.arguments) {
					throw new OperationalError('Require a name and arguments for the tool call');
				}
				if (!extra.sessionId) {
					throw new OperationalError('Require a sessionId for the tool call');
				}

				const callId = extra.requestId ? `${extra.sessionId}_${extra.requestId}` : extra.sessionId;
				const toolName = request.params.name;
				const toolArguments =
					typeof request.params.arguments === 'object' && request.params.arguments !== null
						? request.params.arguments
						: {};

				const requestedTool: Tool | undefined = this.tools[extra.sessionId].find(
					(tool) => tool.name === toolName,
				);
				if (!requestedTool) {
					throw new OperationalError('Tool not found');
				}

				try {
					if (this._isQueueMode) {
						const requestId = extra.requestId?.toString() ?? '';

						// Store pending response for tracking
						this.storePendingResponse(extra.sessionId, requestId);

						// Resolve handlePostMessage so webhook can return and enqueue execution.
						if (this.resolveFunctions[callId]) {
							this.resolveFunctions[callId]();
						}

						// Queue mode: Wait for worker to execute and return the result.
						// The async handler keeps running, waiting for worker response.
						const toolResultPromise = this.storePendingToolCall(callId, toolName, toolArguments);

						const WORKER_TIMEOUT_MS = 120000;
						const timeoutPromise = new Promise<never>((_, reject) => {
							setTimeout(
								() => reject(new Error('Worker tool execution timeout')),
								WORKER_TIMEOUT_MS,
							);
						});

						let result: unknown;
						try {
							result = await Promise.race([toolResultPromise, timeoutPromise]);
						} catch (error) {
							this.logger.error('Queue mode tool execution failed', {
								callId,
								toolName,
								error: error instanceof Error ? error.message : String(error),
							});
							this.removePendingResponse(extra.sessionId, requestId);
							delete this.pendingToolCalls[callId];
							throw error;
						}

						if (typeof result === 'object') {
							return { content: [{ type: 'text', text: JSON.stringify(result) }] };
						}
						if (typeof result === 'string') {
							return { content: [{ type: 'text', text: result }] };
						}
						return { content: [{ type: 'text', text: String(result) }] };
					}

					// Non-queue mode: invoke tool directly on main
					const result = await requestedTool.invoke(toolArguments);

					// Resolve the handlePostMessage promise
					if (this.resolveFunctions[callId]) {
						this.resolveFunctions[callId]();
					} else {
						this.logger.warn(`No resolve function found for ${callId}`);
					}

					if (typeof result === 'object') {
						return { content: [{ type: 'text', text: JSON.stringify(result) }] };
					}
					if (typeof result === 'string') {
						return { content: [{ type: 'text', text: result }] };
					}
					return { content: [{ type: 'text', text: String(result) }] };
				} catch (error) {
					this.logger.error(`Error while executing Tool ${toolName}: ${error}`);
					return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
				}
			},
		);

		server.onclose = () => {
			this.logger.debug('Closing MCP Server');
		};
		server.onerror = (error: unknown) => {
			this.logger.error(`MCP Error: ${error}`);
		};
	}
}
