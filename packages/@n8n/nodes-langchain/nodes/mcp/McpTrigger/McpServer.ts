import type { Tool } from '@langchain/core/tools';
import { McpServerConfig } from '@n8n/config';
import { Container } from '@n8n/di';
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

	logger: Logger;

	private idleTtlMs: number;
	private sweepIntervalMs: number;
	private sweepTimer?: ReturnType<typeof setInterval>;

	private constructor(logger: Logger) {
		this.logger = logger;
<<<<<<< HEAD
		this.logger.debug('MCP Server created');
	}

	static instance(logger: Logger): McpServerManager {
		if (!McpServerManager.#instance) {
			McpServerManager.#instance = new McpServerManager(logger);
			logger.debug('Created singleton MCP manager');
=======
		this.sessionManager = new SessionManager(new InMemorySessionStore());
		this.transportFactory = new TransportFactory();
		this.pendingCallsManager = new PendingCallsManager();
		this.executionCoordinator = new ExecutionCoordinator();
		const config = Container.get(McpServerConfig);
		this.idleTtlMs = config.sessionIdleTtl;
		this.sweepIntervalMs = config.sessionSweepInterval;
		this.logger.debug('McpServer created');
	}

	static instance(logger: Logger): McpServer {
		if (!McpServer.instance_) {
			McpServer.instance_ = new McpServer(logger);
			McpServer.instance_.startSweep();
			logger.debug('Created singleton McpServer');
>>>>>>> c3ce96110 (fix(MCP Server Trigger Node): Evict idle sessions to prevent memory leak (#33201))
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

	async handlePostMessage(req: express.Request, resp: CompressionResponse, connectedTools: Tool[]) {
		// Session ID can be passed either as a query parameter (SSE transport)
		// or in the header (StreamableHTTP transport).
		const sessionId = this.getSessionId(req);
<<<<<<< HEAD
		const transport = this.getTransport(sessionId as string);
=======
		// A request on a known session counts as activity (no-op for unknown ids).
		if (sessionId) this.sessionManager.touch(sessionId);
		let transport = sessionId ? this.sessionManager.getTransport(sessionId) : undefined;
		const rawBody = req.rawBody.toString();
		let toolCallInfo = MessageParser.extractToolCallInfo(rawBody);
		let messageId: string | undefined;

		if (toolCallInfo) {
			const tool = tools.find((t) => t.name === toolCallInfo!.toolName);
			if (tool?.metadata?.sourceNodeName && typeof tool.metadata.sourceNodeName === 'string') {
				toolCallInfo = { ...toolCallInfo, sourceNodeName: tool.metadata.sourceNodeName };
			}
		}

		if (sessionId && !transport && req.headers['mcp-session-id'] && serverName) {
			this.logger.debug(
				`Recreating StreamableHTTP transport for session ${sessionId} on this main instance`,
			);
			const recreated = await this.recreateStreamableHttpTransport(
				sessionId,
				serverName,
				tools,
				resp,
			);
			if (!recreated) {
				resp.status(404).send('Session not found');
				return { wasToolCall: false };
			}
			transport = this.sessionManager.getTransport(sessionId);
		}

		const isToolCall = MessageParser.isToolCall(rawBody);
		const isListToolsRequest = MessageParser.isListToolsRequest(rawBody);

		if (
			sessionId &&
			!transport &&
			req.query.sessionId &&
			this.executionCoordinator.isQueueMode() &&
			(isToolCall || isListToolsRequest)
		) {
			this.logger.debug(
				`SSE queue mode: forwarding ${isToolCall ? 'tool call' : 'list tools'} for session ${sessionId} via pub/sub`,
			);
			const message = jsonParse(rawBody);
			messageId = MessageParser.getRequestId(message);
			resp.status(202).send('Accepted');
			return {
				wasToolCall: isToolCall,
				toolCallInfo,
				messageId,
				relaySessionId: isListToolsRequest ? sessionId : undefined,
				needsListToolsRelay: isListToolsRequest,
			};
		}

>>>>>>> c3ce96110 (fix(MCP Server Trigger Node): Evict idle sessions to prevent memory leak (#33201))
		if (sessionId && transport) {
			// We need to add a promise here because the `handlePostMessage` will send something to the
			// MCP Server, that will run in a different context. This means that the return will happen
			// almost immediately, and will lead to marking the sub-node as "running" in the final execution
			const message = jsonParse(req.rawBody.toString());
			const messageId = getRequestId(message);
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

		return wasToolCall(req.rawBody.toString());
	}

	async handleDeleteRequest(req: express.Request, resp: CompressionResponse) {
		const sessionId = this.getSessionId(req);

		if (!sessionId) {
			resp.status(400).send('No sessionId provided');
			return;
		}

		const transport = this.getTransport(sessionId);

		if (transport) {
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

<<<<<<< HEAD
	setUpHandlers(server: Server) {
=======
	getSessionId(req: express.Request): string | undefined {
		return (req.query.sessionId ?? req.headers['mcp-session-id']) as string | undefined;
	}

	getMcpMetadata(req: express.Request): { sessionId: string; messageId: string } | undefined {
		const sessionId = this.getSessionId(req);
		if (!sessionId) return undefined;

		const message = jsonParse(req.rawBody.toString());
		const messageId = MessageParser.getRequestId(message);

		return { sessionId, messageId: messageId ?? '' };
	}

	storePendingResponse(sessionId: string, messageId: string): void {
		const transport = this.sessionManager.getTransport(sessionId);
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

	handleWorkerResponse(sessionId: string, messageId: string, result: unknown): void {
		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		const pending = this.pendingResponses[callId];

		const isListToolsRequest =
			typeof result === 'object' &&
			result !== null &&
			'_listToolsRequest' in result &&
			(result as { _listToolsRequest: boolean })._listToolsRequest;

		if (isListToolsRequest) {
			const transport = this.sessionManager.getTransport(sessionId);
			if (transport && transport.transportType === 'sse' && messageId) {
				this.logger.debug(
					`SSE queue mode: handling relayed list tools request for session ${sessionId}`,
				);

				const tools = this.sessionManager.getTools(sessionId) ?? [];
				const toolsList = tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
					inputSchema: zodToJsonSchema(tool.schema as any, { removeAdditionalStrategy: 'strict' }),
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

		const strategy = this.executionCoordinator.getStrategy();
		if (strategy instanceof QueuedExecutionStrategy) {
			if (strategy.resolveToolCall(callId, result)) {
				// Resolved via pending tool call
			} else {
				const transport = this.sessionManager.getTransport(sessionId);
				if (transport && transport.transportType === 'sse' && messageId) {
					this.logger.debug(
						`SSE queue mode: sending response directly via transport for session ${sessionId}`,
					);

					const formattedResult = MessageFormatter.formatToolResult(
						result,
						MessageFormatter.isErrorResult(result),
					);
					const response: JSONRPCMessage = {
						jsonrpc: '2.0',
						id: messageId,
						result: formattedResult,
					};
					void transport.send(response);
				}
			}
		}

		if (this.resolveFunctions[callId]) {
			this.resolveFunctions[callId]();
			delete this.resolveFunctions[callId];
		}

		if (pending) {
			delete this.pendingResponses[callId];
		}
	}

	removePendingResponse(sessionId: string, messageId: string): void {
		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		delete this.pendingResponses[callId];
	}

	hasPendingResponse(sessionId: string, messageId: string): boolean {
		const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
		return callId in this.pendingResponses;
	}

	get pendingResponseCount(): number {
		return Object.keys(this.pendingResponses).length;
	}

	setSessionStore(store: SessionStore): void {
		this.sessionManager.setStore(store);
	}

	setExecutionStrategy(strategy: ExecutionStrategy): void {
		this.executionCoordinator.setStrategy(strategy);
	}

	private startSweep(): void {
		if (this.sweepTimer) return;
		this.sweepTimer = setInterval(() => {
			void this.runSweep();
		}, this.sweepIntervalMs);
		this.sweepTimer.unref?.();
	}

	stopSweep(): void {
		if (this.sweepTimer) {
			clearInterval(this.sweepTimer);
			this.sweepTimer = undefined;
		}
	}

	private async runSweep(): Promise<void> {
		for (const sessionId of this.sessionManager.getIdleSessions(this.idleTtlMs)) {
			// SSE sessions are released reliably via the connection's close handler.
			// Only Streamable HTTP sessions (stateless clients that never DELETE) leak.
			if (this.sessionManager.getTransport(sessionId)?.transportType !== 'streamableHttp') continue;
			// Don't evict a session whose tool call is still awaiting a result.
			if (this.hasInFlightWork(sessionId)) continue;
			try {
				this.logger.debug(`Evicting idle MCP session ${sessionId}`);
				await this.cleanupSession(sessionId);
			} catch (error) {
				this.logger.error(
					`Failed to evict idle MCP session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	private hasInFlightWork(sessionId: string): boolean {
		if (this.pendingCallsManager.hasForSession(sessionId)) return true;
		// Direct-mode tool calls are tracked only by resolveFunctions for their whole
		// duration; queue-mode also uses pendingResponses below.
		const ownsSession = (callId: string) =>
			callId === sessionId || callId.startsWith(`${sessionId}_`);
		if (Object.keys(this.resolveFunctions).some(ownsSession)) return true;
		return Object.values(this.pendingResponses).some((pending) => pending.sessionId === sessionId);
	}

	isQueueMode(): boolean {
		return this.executionCoordinator.isQueueMode();
	}

	getTransport(sessionId: string): McpTransport | undefined {
		return this.sessionManager.getTransport(sessionId);
	}

	getTools(sessionId: string): Tool[] | undefined {
		return this.sessionManager.getTools(sessionId);
	}

	getPendingCallsManager(): PendingCallsManager {
		return this.pendingCallsManager;
	}

	private createServer(serverName: string): Server {
		return new Server({ name: serverName, version: '0.1.0' }, { capabilities: { tools: {} } });
	}

	private async setupSession(
		server: Server,
		transport: SSETransport | StreamableHttpTransport,
		tools: Tool[],
		resp: CompressionResponse,
	): Promise<void> {
		this.setupHandlers(server);

		const sessionId = transport.sessionId!;
		await this.sessionManager.registerSession(sessionId, server, transport, tools);

		resp.on('close', async () => {
			this.logger.debug(`Deleting transport for ${sessionId}`);
			await this.cleanupSession(sessionId);
		});

		await server.connect(transport);
		resp.flush?.();
	}

	private async cleanupSession(sessionId: string): Promise<void> {
		this.pendingCallsManager.cleanupBySessionId(sessionId);

		for (const callId of Object.keys(this.pendingResponses)) {
			if (this.pendingResponses[callId].sessionId === sessionId) {
				if (this.resolveFunctions[callId]) {
					this.resolveFunctions[callId]();
					delete this.resolveFunctions[callId];
				}
				delete this.pendingResponses[callId];
			}
		}

		await this.sessionManager.destroySession(sessionId);
	}

	private async recreateStreamableHttpTransport(
		sessionId: string,
		serverName: string,
		tools: Tool[],
		resp: CompressionResponse,
	): Promise<boolean> {
		const isValid = await this.sessionManager.isSessionValid(sessionId);
		if (!isValid) {
			this.logger.warn(`Rejecting recreate request for invalid session: ${sessionId}`);
			return false;
		}

		const server = this.createServer(serverName);
		const transport = this.transportFactory.recreateStreamableHttp(sessionId, resp);

		await this.sessionManager.registerSession(sessionId, server, transport, tools);

		transport.onclose = async () => {
			this.logger.debug(`Deleting recreated transport for ${sessionId}`);
			await this.cleanupSession(sessionId);
		};

		this.setupHandlers(server);
		await server.connect(transport);
		return true;
	}

	private setupHandlers(server: Server): void {
>>>>>>> c3ce96110 (fix(MCP Server Trigger Node): Evict idle sessions to prevent memory leak (#33201))
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

				const requestedTool: Tool | undefined = this.tools[extra.sessionId].find(
					(tool) => tool.name === request.params.name,
				);
				if (!requestedTool) {
					throw new OperationalError('Tool not found');
				}

				try {
					const result = await requestedTool.invoke(request.params.arguments);
					if (this.resolveFunctions[callId]) {
						this.resolveFunctions[callId]();
					} else {
						this.logger.warn(`No resolve function found for ${callId}`);
					}

					this.logger.debug(`Got request for ${requestedTool.name}, and executed it.`);

					if (typeof result === 'object') {
						return { content: [{ type: 'text', text: JSON.stringify(result) }] };
					}
					if (typeof result === 'string') {
						return { content: [{ type: 'text', text: result }] };
					}
					return { content: [{ type: 'text', text: String(result) }] };
				} catch (error) {
					this.logger.error(`Error while executing Tool ${requestedTool.name}: ${error}`);
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
