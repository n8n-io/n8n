import type { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
	ServerRequest,
	ServerNotification,
	JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import type * as express from 'express';
import type { IncomingMessage } from 'http';
import type { Logger } from 'n8n-workflow';
import { jsonParse, OperationalError } from 'n8n-workflow';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { ExecutionCoordinator } from './execution/ExecutionCoordinator';
import type { ExecutionStrategy } from './execution/ExecutionStrategy';
import { PendingCallsManager } from './execution/PendingCallsManager';
import { QueuedExecutionStrategy } from './execution/QueuedExecutionStrategy';
import { MessageFormatter } from './protocol/MessageFormatter';
import { MessageParser } from './protocol/MessageParser';
import type { McpToolCallInfo } from './protocol/types';
import { MCP_LIST_TOOLS_REQUEST_MARKER } from './protocol/types';
import { InMemorySessionStore } from './session/InMemorySessionStore';
import { SessionManager } from './session/SessionManager';
import type { SessionStore } from './session/SessionStore';
import type { SSETransport } from './transport/SSETransport';
import { StreamableHttpTransport } from './transport/StreamableHttpTransport';
import type { CompressionResponse, McpTransport } from './transport/Transport';
import { TransportFactory } from './transport/TransportFactory';

export interface HandlePostResult {
	wasToolCall: boolean;
	toolCallInfo?: McpToolCallInfo;
	messageId?: string;
	relaySessionId?: string;
	needsListToolsRelay?: boolean;
}

interface PendingResponse {
	sessionId: string;
	messageId: string;
	transport: McpTransport;
	createdAt: Date;
}

export class McpServer {
	private static instance_: McpServer;

	private sessionManager: SessionManager;
	private transportFactory: TransportFactory;
	private executionCoordinator: ExecutionCoordinator;
	private pendingCallsManager: PendingCallsManager;
	private resolveFunctions: Record<string, () => void> = {};
	private pendingResponses: Record<string, PendingResponse> = {};
	private logger: Logger;

	private constructor(logger: Logger) {
		this.logger = logger;
		this.sessionManager = new SessionManager(new InMemorySessionStore());
		this.transportFactory = new TransportFactory();
		this.pendingCallsManager = new PendingCallsManager();
		this.executionCoordinator = new ExecutionCoordinator();
		this.logger.debug('McpServer created');
	}

	static instance(logger: Logger): McpServer {
		if (!McpServer.instance_) {
			McpServer.instance_ = new McpServer(logger);
			logger.debug('Created singleton McpServer');
		}
		return McpServer.instance_;
	}

	async handleSetupRequest(
		_req: express.Request,
		resp: CompressionResponse,
		serverName: string,
		postUrl: string,
		tools: Tool[],
	): Promise<void> {
		const server = this.createServer(serverName);
		const transport = this.transportFactory.createSSE(postUrl, resp);

		await this.setupSession(server, transport, tools, resp);
	}

	async handleStreamableHttpSetup(
		req: express.Request,
		resp: CompressionResponse,
		serverName: string,
		tools: Tool[],
	): Promise<void> {
		const server = this.createServer(serverName);
		const transport = this.transportFactory.createStreamableHttp(
			{
				sessionIdGenerator: () => randomUUID(),
				onsessioninitialized: async (sessionId) => {
					this.logger.debug(`New session initialized: ${sessionId}`);
					await this.sessionManager.registerSession(sessionId, server, transport, tools);
					transport.onclose = async () => {
						this.logger.debug(`Deleting transport for ${sessionId}`);
						await this.cleanupSession(sessionId);
					};
				},
			},
			resp,
		);

		this.setupHandlers(server);
		await server.connect(transport);
		await transport.handleRequest(req as IncomingMessage, resp, req.body);
		resp.flush?.();
	}

	async handlePostMessage(
		req: express.Request,
		resp: CompressionResponse,
		tools: Tool[],
		serverName?: string,
	): Promise<HandlePostResult> {
		const sessionId = this.getSessionId(req);
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

		if (sessionId && transport) {
			const message = jsonParse(rawBody);
			messageId = MessageParser.getRequestId(message);
			const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
			this.sessionManager.setTools(sessionId, tools);

			try {
				await new Promise<void>((resolve) => {
					this.resolveFunctions[callId] = resolve;
					void transport.handleRequest(req, resp, message as IncomingMessage);
				});
			} finally {
				delete this.resolveFunctions[callId];
			}
		} else {
			this.logger.warn(`No transport found for session ${sessionId}`);
			resp.status(401).send('No transport found for sessionId');
		}

		resp.flush?.();

		return {
			wasToolCall: MessageParser.isToolCall(rawBody),
			toolCallInfo,
			messageId,
		};
	}

	async handleDeleteRequest(req: express.Request, resp: CompressionResponse): Promise<void> {
		const sessionId = this.getSessionId(req);

		if (!sessionId) {
			resp.status(400).send('No sessionId provided');
			return;
		}

		const transport = this.sessionManager.getTransport(sessionId);

		if (transport) {
			this.pendingCallsManager.cleanupBySessionId(sessionId);

			if (transport instanceof StreamableHttpTransport) {
				await transport.handleRequest(req, resp);
				return;
			}
			resp.status(405).send('Method Not Allowed');
			return;
		}

		resp.status(404).send('Session not found');
	}

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

					const formattedResult = MessageFormatter.formatToolResult(result);
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
		server.setRequestHandler(
			ListToolsRequestSchema,
			(_, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
				if (!extra.sessionId) {
					throw new OperationalError('Require a sessionId for the listing of tools');
				}

				const tools = this.sessionManager.getTools(extra.sessionId) ?? [];
				return {
					tools: tools.map((tool) => ({
						name: tool.name,
						description: tool.description,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
						inputSchema: zodToJsonSchema(tool.schema as any, {
							removeAdditionalStrategy: 'strict',
						}),
					})),
				};
			},
		);

		server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
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

			const tools = this.sessionManager.getTools(extra.sessionId) ?? [];
			const requestedTool = tools.find((tool) => tool.name === toolName);
			if (!requestedTool) {
				throw new OperationalError('Tool not found');
			}

			try {
				if (this.executionCoordinator.isQueueMode()) {
					const requestId = extra.requestId?.toString() ?? '';
					this.storePendingResponse(extra.sessionId, requestId);

					// Resolve handlePostMessage so webhook can return and enqueue execution.
					// The handler continues running asynchronously, waiting for worker response.
					if (this.resolveFunctions[callId]) {
						this.resolveFunctions[callId]();
					}

					const strategy = this.executionCoordinator.getStrategy() as QueuedExecutionStrategy;
					const result = await strategy.executeTool(requestedTool, toolArguments, {
						sessionId: extra.sessionId,
						messageId: requestId,
					});

					return MessageFormatter.formatToolResult(result);
				}

				const result = await this.executionCoordinator.executeTool(requestedTool, toolArguments, {
					sessionId: extra.sessionId,
					messageId: extra.requestId?.toString(),
				});

				if (this.resolveFunctions[callId]) {
					this.resolveFunctions[callId]();
				} else {
					this.logger.warn(`No resolve function found for ${callId}`);
				}

				return MessageFormatter.formatToolResult(result);
			} catch (error) {
				this.logger.error(
					`Error while executing Tool ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
				);
				const errorObject = error instanceof Error ? error : new Error(String(error));
				return MessageFormatter.formatError(errorObject);
			}
		});

		server.onclose = () => {
			this.logger.debug('Closing MCP Server');
		};
		server.onerror = (error: unknown) => {
			this.logger.error(`MCP Error: ${error instanceof Error ? error.message : String(error)}`);
		};
	}
}

export { MCP_LIST_TOOLS_REQUEST_MARKER };
