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
			const params = parsedMessage.params as { name?: string; arguments?: Record<string, unknown> };
			if (params.name && params.arguments) {
				return {
					toolName: params.name,
					arguments: params.arguments,
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

		resp.on('close', async () => {
			this.logger.debug(`Deleting transport for ${sessionId}`);
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
				onsessioninitialized: (sessionId) => {
					this.logger.debug(`New session initialized: ${sessionId}`);
					transport.onclose = () => {
						this.logger.debug(`Deleting transport for ${sessionId}`);
						this.cleanupSessionPendingResponses(sessionId);
						delete this.tools[sessionId];
						delete this.transports[sessionId];
						delete this.servers[sessionId];
					};
					this.transports[sessionId] = transport;
					this.servers[sessionId] = server;
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

	async handlePostMessage(
		req: express.Request,
		resp: CompressionResponse,
		connectedTools: Tool[],
	): Promise<{ wasToolCall: boolean; toolCallInfo?: McpToolCallInfo; messageId?: string }> {
		// Session ID can be passed either as a query parameter (SSE transport)
		// or in the header (StreamableHTTP transport).
		const sessionId = this.getSessionId(req);
		const transport = this.getTransport(sessionId as string);
		const rawBody = req.rawBody.toString();
		let toolCallInfo = extractToolCallInfo(rawBody);
		let messageId: string | undefined;

		// Enhance tool call info with sourceNodeName from the tool's metadata
		// This is needed for queue mode to identify which node to execute on the worker
		if (toolCallInfo) {
			const tool = connectedTools.find((t) => t.name === toolCallInfo!.toolName);
			if (tool?.metadata?.sourceNodeName) {
				toolCallInfo = {
					...toolCallInfo,
					sourceNodeName: tool.metadata.sourceNodeName as string,
				};
				this.logger.debug('MCP DEBUG: Enhanced toolCallInfo with sourceNodeName', {
					toolName: toolCallInfo.toolName,
					sourceNodeName: toolCallInfo.sourceNodeName,
				});
			}
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

			this.logger.debug('MCP DEBUG: handlePostMessage processing request', {
				sessionId,
				messageId,
				callId,
				isToolCall: !!toolCallInfo,
				toolName: toolCallInfo?.toolName,
				isQueueMode: this._isQueueMode,
			});

			try {
				this.logger.debug('MCP DEBUG: handlePostMessage awaiting promise', {
					callId,
					isQueueMode: this._isQueueMode,
				});
				await new Promise(async (resolve) => {
					this.resolveFunctions[callId] = resolve;
					await transport.handleRequest(req, resp, message as IncomingMessage);
				});
				this.logger.debug('MCP DEBUG: handlePostMessage promise resolved, continuing', {
					callId,
					isQueueMode: this._isQueueMode,
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
			// Clean up any pending responses for this session before deletion
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

	// #region Queue Mode Support

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

		this.logger.debug('MCP DEBUG: Stored pending response, waiting for worker', {
			callId,
			sessionId,
			messageId,
		});
	}

	/**
	 * Handle a response from a worker for an MCP Trigger execution.
	 * In queue mode, the tool executes on the worker and sends back the result.
	 * This resolves the pending tool call so the handler can return the result to the MCP client.
	 */
	handleWorkerResponse(sessionId: string, messageId: string, result: unknown): void {
		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		const pending = this.pendingResponses[callId];
		const pendingToolCall = this.pendingToolCalls[callId];

		this.logger.debug('MCP DEBUG: Received worker response for MCP Trigger', {
			callId,
			sessionId,
			messageId,
			hasPending: !!pending,
			hasPendingToolCall: !!pendingToolCall,
			hasResult: result !== undefined,
		});

		// Resolve the pending tool call with the worker's result
		if (pendingToolCall) {
			this.logger.debug('MCP DEBUG: Resolving pending tool call with worker result', {
				callId,
				toolName: pendingToolCall.toolName,
			});
			this.resolveToolCall(callId, result);
		}

		// Also resolve the handlePostMessage promise if it exists
		if (this.resolveFunctions[callId]) {
			this.logger.debug('MCP DEBUG: Resolving pending handlePostMessage promise', { callId });
			this.resolveFunctions[callId]();
			delete this.resolveFunctions[callId];
		}

		// Clean up the pending response
		if (pending) {
			delete this.pendingResponses[callId];
		}

		this.logger.debug('MCP DEBUG: Worker response handled, cleaned up pending', { callId });
	}

	/**
	 * Remove a pending response (e.g., on timeout or cancellation).
	 */
	removePendingResponse(sessionId: string, messageId: string): void {
		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		if (this.pendingResponses[callId]) {
			delete this.pendingResponses[callId];
			this.logger.debug('MCP DEBUG: Removed pending response (timeout/cancel)', { callId });
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
	 * Clean up all pending responses for a given session.
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
			// Also clean up any associated resolve functions
			if (this.resolveFunctions[callId]) {
				this.resolveFunctions[callId]();
				delete this.resolveFunctions[callId];
			}
			delete this.pendingResponses[callId];
		}

		if (keysToDelete.length > 0) {
			this.logger.debug('MCP DEBUG: Cleaned up pending responses for closed session', {
				sessionId,
				count: keysToDelete.length,
			});
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
		this.logger.debug('MCP DEBUG: Queue mode set', { isQueueMode });
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
			this.logger.debug('MCP DEBUG: Stored pending tool call, waiting for worker', {
				callId,
				toolName,
			});
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
			this.logger.debug('MCP DEBUG: Resolving pending tool call', {
				callId,
				toolName: pending.toolName,
			});
			pending.resolve(result);
			delete this.pendingToolCalls[callId];
		} else {
			this.logger.warn('MCP DEBUG: No pending tool call found to resolve', { callId });
		}
	}

	/**
	 * Reject a pending tool call with an error.
	 */
	rejectToolCall(callId: string, error: Error): void {
		const pending = this.pendingToolCalls[callId];
		if (pending) {
			this.logger.debug('MCP DEBUG: Rejecting pending tool call', {
				callId,
				toolName: pending.toolName,
			});
			pending.reject(error);
			delete this.pendingToolCalls[callId];
		}
	}

	// #endregion

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
				const toolArguments = request.params.arguments as Record<string, unknown>;

				this.logger.debug('MCP DEBUG: Tool call received', {
					toolName,
					sessionId: extra.sessionId,
					callId,
					isQueueMode: this._isQueueMode,
				});

				const requestedTool: Tool | undefined = this.tools[extra.sessionId].find(
					(tool) => tool.name === toolName,
				);
				if (!requestedTool) {
					throw new OperationalError('Tool not found');
				}

				// Get the source node name (the n8n node that provides this tool)
				const sourceNodeName = (requestedTool.metadata?.sourceNodeName as string) ?? undefined;

				try {
					// In queue mode, delegate tool execution to the worker:
					// 1. Resolve handlePostMessage so webhook can enqueue execution with tool info
					// 2. Worker executes the tool node via the execution engine
					// 3. Worker sends back the actual tool result via mcp-response
					// 4. This handler receives the result and returns it to MCP client
					if (this._isQueueMode) {
						this.logger.debug('MCP DEBUG: Queue mode - delegating tool execution to worker', {
							toolName,
							sourceNodeName,
							sessionId: extra.sessionId,
							callId,
						});

						// Store pending response for tracking
						this.storePendingResponse(extra.sessionId, extra.requestId?.toString() ?? '');

						// Store pending tool call - will be resolved when worker sends result
						const toolResultPromise = this.storePendingToolCall(callId, toolName, toolArguments);

						// IMPORTANT: Resolve handlePostMessage so webhook can return and enqueue execution.
						// The async handler keeps running, waiting for worker response.
						if (this.resolveFunctions[callId]) {
							this.resolveFunctions[callId]();
						}

						// Wait for worker to execute the tool and send back the result
						const WORKER_TIMEOUT_MS = 120000; // 2 minutes for tool execution
						const timeoutPromise = new Promise<never>((_, reject) => {
							setTimeout(
								() => reject(new Error('Worker tool execution timeout')),
								WORKER_TIMEOUT_MS,
							);
						});

						let result: unknown;
						try {
							result = await Promise.race([toolResultPromise, timeoutPromise]);
							this.logger.debug('MCP DEBUG: Queue mode - received tool result from worker', {
								toolName,
								sessionId: extra.sessionId,
								callId,
								hasResult: result !== undefined,
							});
						} catch (error) {
							this.logger.error('MCP DEBUG: Queue mode - tool execution failed', {
								callId,
								toolName,
								error: error instanceof Error ? error.message : String(error),
							});
							// Clean up pending state
							this.removePendingResponse(extra.sessionId, extra.requestId?.toString() ?? '');
							throw error;
						}

						// Format and return the result
						if (typeof result === 'object') {
							return { content: [{ type: 'text', text: JSON.stringify(result) }] };
						}
						if (typeof result === 'string') {
							return { content: [{ type: 'text', text: result }] };
						}
						return { content: [{ type: 'text', text: String(result) }] };
					}

					// Non-queue mode: invoke tool directly on main
					this.logger.debug('MCP DEBUG: Non-queue mode - invoking tool on main', {
						toolName,
						sessionId: extra.sessionId,
						callId,
					});

					const result = await requestedTool.invoke(toolArguments);

					this.logger.debug('MCP DEBUG: Tool execution completed', {
						toolName,
						sessionId: extra.sessionId,
						callId,
						hasResult: result !== undefined,
					});

					// Resolve the handlePostMessage promise
					if (this.resolveFunctions[callId]) {
						this.resolveFunctions[callId]();
					} else {
						this.logger.warn(`No resolve function found for ${callId}`);
					}

					this.logger.debug(`Got request for ${toolName}, and executed it.`);

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
