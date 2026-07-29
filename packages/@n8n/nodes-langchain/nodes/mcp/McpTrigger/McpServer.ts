import type { Tool } from '@langchain/core/tools';
import { McpServerConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
	ServerRequest,
	ServerNotification,
	JSONRPCMessage,
	RequestId,
} from '@modelcontextprotocol/sdk/types.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import type * as express from 'express';
import type { IncomingMessage } from 'http';
import type { CredentialCheckResult, Logger } from 'n8n-workflow';
import { jsonParse, OperationalError } from 'n8n-workflow';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { PendingCallsManager } from './execution/PendingCallsManager';
import {
	MessageFormatter,
	type CredentialGateElicitationOutcome,
} from './protocol/MessageFormatter';
import { MessageParser } from './protocol/MessageParser';
import type { McpToolResult } from './protocol/types';
import { MCP_LIST_TOOLS_REQUEST_MARKER } from './protocol/types';
import { InMemorySessionStore } from './session/InMemorySessionStore';
import { SessionManager } from './session/SessionManager';
import type { SessionStore } from './session/SessionStore';
import type { SSETransport } from './transport/SSETransport';
import { StreamableHttpTransport } from './transport/StreamableHttpTransport';
import type { CompressionResponse, McpTransport } from './transport/Transport';
import { TransportFactory } from './transport/TransportFactory';

/**
 * How long to wait for the client to complete a URL-mode elicitation (open the
 * connection page and act on it) before giving up and falling back to the
 * plain-text response. Connecting a credential involves an out-of-band OAuth
 * flow, so this is generous relative to the SDK's default request timeout.
 */
const ELICITATION_TIMEOUT_MS = 300_000;

/** Safety net for a tool call whose execution never reports back, so the request cannot hang forever. */
const TOOL_CALL_TIMEOUT_MS = 300_000;

/**
 * Correlation key for one in-flight request. Both the request side (which reads
 * the id off the message) and the CallTool handler (which gets it from the SDK)
 * must derive the same key, so normalize here — `0` is a valid request id and
 * must not be mistaken for "no id".
 */
function buildCallId(sessionId: string, requestId?: RequestId): string {
	const messageId = requestId === undefined || requestId === '' ? undefined : String(requestId);
	return messageId ? `${sessionId}_${messageId}` : sessionId;
}

function isListToolsMarker(result: unknown): boolean {
	return typeof result === 'object' && result !== null && '_listToolsRequest' in result;
}

export interface HandlePostResult {
	wasToolCall: boolean;
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
	private pendingCallsManager: PendingCallsManager;
	private resolveFunctions: Record<string, () => void> = {};
	private pendingResponses: Record<string, PendingResponse> = {};
	/** Calls this instance has already answered, so a late result is dropped instead of re-sent. */
	private answeredCalls = new Set<string>();
	/**
	 * Request-scoped credential-gate results, keyed by callId. Set just before a
	 * tool call is driven through the transport and consumed (then deleted) by the
	 * CallTool handler. Plain serializable data, not a closure — set and read within
	 * a single `handlePostMessage` on the transport-holding main.
	 */
	private pendingGateResults: Record<string, CredentialCheckResult> = {};
	private logger: Logger;

	private idleTtlMs: number;
	private sweepIntervalMs: number;
	private sweepTimer?: ReturnType<typeof setInterval>;

	private constructor(logger: Logger) {
		this.logger = logger;
		this.sessionManager = new SessionManager(new InMemorySessionStore());
		this.transportFactory = new TransportFactory();
		this.pendingCallsManager = new PendingCallsManager();
		const config = Container.get(McpServerConfig);
		this.idleTtlMs = config.sessionIdleTtl;
		this.sweepIntervalMs = config.sessionSweepInterval;
		this.logger.debug('McpServer created');
	}

	/** The instance holding the sessions of this process, if it has any. */
	static current(): McpServer | undefined {
		return McpServer.instance_;
	}

	static instance(logger: Logger): McpServer {
		if (!McpServer.instance_) {
			McpServer.instance_ = new McpServer(logger);
			McpServer.instance_.startSweep();
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

	/** @param getTools Resolved only when the session has to be rebuilt on this instance. */
	async handlePostMessage(
		req: express.Request,
		resp: CompressionResponse,
		getTools: () => Promise<Tool[]>,
		serverName?: string,
		gateResult?: CredentialCheckResult,
	): Promise<HandlePostResult> {
		const sessionId = this.getSessionId(req);
		// A request on a known session counts as activity (no-op for unknown ids).
		if (sessionId) this.sessionManager.touch(sessionId);
		let transport = sessionId ? this.sessionManager.getTransport(sessionId) : undefined;
		const rawBody = req.rawBody.toString();

		if (sessionId && !transport && req.headers['mcp-session-id'] && serverName) {
			this.logger.debug(
				`Recreating StreamableHTTP transport for session ${sessionId} on this main instance`,
			);
			const recreated = await this.recreateStreamableHttpTransport(
				sessionId,
				serverName,
				await getTools(),
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

		// An SSE session belongs to the instance holding its stream. When that is not this
		// one, take the request and let that instance answer it.
		if (
			sessionId &&
			!transport &&
			req.query.sessionId &&
			(isToolCall || isListToolsRequest) &&
			(await this.sessionManager.isSessionValid(sessionId))
		) {
			this.logger.debug(
				`Forwarding ${isToolCall ? 'tool call' : 'list tools'} for session ${sessionId} to the instance holding it`,
			);
			resp.status(202).send('Accepted');
			return {
				wasToolCall: isToolCall,
				relaySessionId: isListToolsRequest ? sessionId : undefined,
				needsListToolsRelay: isListToolsRequest,
			};
		}

		if (sessionId && transport) {
			const message = jsonParse(rawBody);
			const callId = buildCallId(sessionId, MessageParser.getRequestId(message));

			// The tool definitions the client is about to be shown are the ones a call
			// will be matched against, so this is where the session's list is refreshed.
			if (isListToolsRequest) this.sessionManager.setTools(sessionId, await getTools());

			// Hand the gate result to the CallTool handler for this request only.
			if (gateResult) {
				this.pendingGateResults[callId] = gateResult;
			}

			try {
				// The CallTool handler resolves this before parking, so the webhook can
				// return and the execution that answers the call can start
				await new Promise<void>((resolve) => {
					this.resolveFunctions[callId] = resolve;
					void transport.handleRequest(req, resp, message as IncomingMessage).finally(resolve);
				});
			} finally {
				delete this.resolveFunctions[callId];
				delete this.pendingGateResults[callId];
			}
		} else {
			this.logger.warn(`No transport found for session ${sessionId}`);
			resp.status(401).send('No transport found for sessionId');
		}

		resp.flush?.();

		// A not-ready gate makes the CallTool handler short-circuit (returning the
		// actionable response over the transport instead of executing). Report it as
		// not a tool call so the node does not also trigger a workflow execution.
		const wasGated = !!gateResult && !gateResult.readyToExecute;

		return { wasToolCall: isToolCall && !wasGated };
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

		const callId = buildCallId(sessionId, messageId);
		this.pendingResponses[callId] = {
			sessionId,
			messageId,
			transport,
			createdAt: new Date(),
		};
	}

	/**
	 * Answers a tool call with the result of the execution that ran it. Returns whether
	 * this instance could: the request is parked on the one holding the session.
	 */
	deliverToolResult(sessionId: string, messageId: string, result: unknown): boolean {
		const callId = buildCallId(sessionId, messageId);
		delete this.pendingResponses[callId];

		if (isListToolsMarker(result)) return this.sendToolList(sessionId, messageId);
		if (this.pendingCallsManager.resolve(callId, result)) return true;
		if (this.answeredCalls.has(callId)) return true;

		// The call was never parked here, so it arrived while another instance held the
		// session: answer over the transport ourselves.
		return this.sendOverTransport(sessionId, messageId, {
			jsonrpc: '2.0',
			id: messageId,
			result: MessageFormatter.formatToolResult(result, MessageFormatter.isErrorResult(result)),
		});
	}

	/**
	 * Fails a call still parked on this instance, for when the execution that should
	 * have answered it ended without doing so (a tool that stops the workflow, a
	 * cancelled or failed execution). Returns whether a call was waiting.
	 */
	failPendingToolCall(sessionId: string, messageId: string, message: string): boolean {
		const callId = buildCallId(sessionId, messageId);
		if (this.answeredCalls.has(callId)) return false;

		delete this.pendingResponses[callId];
		return this.pendingCallsManager.reject(callId, new OperationalError(message));
	}

	private sendToolList(sessionId: string, messageId: string): boolean {
		const tools = this.sessionManager.getTools(sessionId) ?? [];
		return this.sendOverTransport(sessionId, messageId, {
			jsonrpc: '2.0',
			id: messageId,
			result: {
				tools: tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
					inputSchema: zodToJsonSchema(tool.schema as any, { removeAdditionalStrategy: 'strict' }),
				})),
			},
		});
	}

	private sendOverTransport(
		sessionId: string,
		messageId: string,
		message: JSONRPCMessage,
	): boolean {
		const transport = this.sessionManager.getTransport(sessionId);
		if (!transport || transport.transportType !== 'sse' || !messageId) return false;

		void transport.send(message);
		return true;
	}

	removePendingResponse(sessionId: string, messageId: string): void {
		const callId = buildCallId(sessionId, messageId);
		delete this.pendingResponses[callId];
	}

	hasPendingResponse(sessionId: string, messageId: string): boolean {
		const callId = buildCallId(sessionId, messageId);
		return callId in this.pendingResponses;
	}

	get pendingResponseCount(): number {
		return Object.keys(this.pendingResponses).length;
	}

	setSessionStore(store: SessionStore): void {
		this.sessionManager.setStore(store);
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
		const ownsSession = (callId: string) =>
			callId === sessionId || callId.startsWith(`${sessionId}_`);
		if (Object.keys(this.resolveFunctions).some(ownsSession)) return true;
		return Object.values(this.pendingResponses).some((pending) => pending.sessionId === sessionId);
	}

	getTransport(sessionId: string): McpTransport | undefined {
		return this.sessionManager.getTransport(sessionId);
	}

	getTools(sessionId: string): Tool[] | undefined {
		return this.sessionManager.getTools(sessionId);
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

		for (const callId of this.answeredCalls) {
			if (callId === sessionId || callId.startsWith(`${sessionId}_`)) {
				this.answeredCalls.delete(callId);
			}
		}

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

	/**
	 * Whether the connected client advertised URL-mode elicitation support during
	 * initialization (`clientCapabilities.elicitation.url`).
	 */
	private clientSupportsUrlElicitation(server: Server): boolean {
		const elicitation = server.getClientCapabilities()?.elicitation;
		return Boolean(elicitation && typeof elicitation === 'object' && 'url' in elicitation);
	}

	/**
	 * Handles a not-ready credential gate. When the client supports URL-mode
	 * elicitation and every missing credential has a connection URL, the
	 * connection page is driven through the client's native elicitation UI so the
	 * link is surfaced by the client rather than relayed as tool text (which chat
	 * clients tend to withhold). Otherwise — and on any elicitation failure — it
	 * falls back to the plain-text response carrying the raw URLs.
	 */
	private async handleCredentialGate(
		server: Server,
		gateResult: CredentialCheckResult,
		callId: string,
	): Promise<McpToolResult> {
		const missing = gateResult.credentials.filter((c) => c.status !== 'configured');
		const connectable = missing.filter((c) => !!c.authorizationUrl);
		const canElicit =
			connectable.length > 0 &&
			connectable.length === missing.length &&
			this.clientSupportsUrlElicitation(server);

		if (canElicit) {
			try {
				const outcomes: CredentialGateElicitationOutcome[] = [];
				for (const cred of connectable) {
					const { action } = await server.elicitInput(
						{
							mode: 'url',
							elicitationId: randomUUID(),
							url: cred.authorizationUrl!,
							message: `Connect ${cred.credentialName} (${cred.credentialType}) to run this tool.`,
						},
						{ timeout: ELICITATION_TIMEOUT_MS },
					);
					outcomes.push({
						credentialName: cred.credentialName,
						credentialType: cred.credentialType,
						action,
					});
				}
				if (this.resolveFunctions[callId]) this.resolveFunctions[callId]();
				return MessageFormatter.formatCredentialGateElicited(outcomes);
			} catch (error) {
				this.logger.warn(
					`Credential gate elicitation failed, falling back to text response: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}

		if (this.resolveFunctions[callId]) this.resolveFunctions[callId]();
		return MessageFormatter.formatCredentialGate(gateResult);
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
			if (!extra.sessionId) {
				// Nothing to correlate the call with, so no webhook can be waiting on it
				throw new OperationalError('Require a sessionId for the tool call');
			}
			const callId = buildCallId(extra.sessionId, extra.requestId);

			try {
				if (!request.params?.name || !request.params?.arguments) {
					throw new OperationalError('Require a name and arguments for the tool call');
				}

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

				// Eager pre-execution credential gate: if the caller has not connected a
				// required private credential, surface the actionable connection URLs
				// (via elicitation when supported, otherwise as text) instead of
				// executing (or enqueuing) the workflow.
				const gateResult = this.pendingGateResults[callId];
				if (gateResult && !gateResult.readyToExecute) {
					return await this.handleCredentialGate(server, gateResult, callId);
				}

				try {
					const messageId = extra.requestId?.toString() ?? '';
					this.storePendingResponse(extra.sessionId, messageId);

					// Let the webhook return so the execution that runs the tool can start;
					// this handler stays alive waiting for its result.
					this.resolveFunctions[callId]?.();

					const result = await this.pendingCallsManager.waitForResult(
						callId,
						requestedTool.name,
						toolArguments,
						TOOL_CALL_TIMEOUT_MS,
					);

					return MessageFormatter.formatToolResult(result, MessageFormatter.isErrorResult(result));
				} catch (error) {
					const errorObject = error instanceof Error ? error : new Error(String(error));
					this.logger.error(`Error while executing Tool ${toolName}: ${errorObject.message}`, {
						error: errorObject,
					});
					return MessageFormatter.formatError(errorObject);
				}
			} finally {
				// Whatever this returned is the client's answer, so a result arriving late
				// (after a timeout, say) must not be sent a second time.
				this.answeredCalls.add(callId);
				delete this.pendingResponses[callId];
				// The webhook that delivered this call waits for the tool to finish
				// (see handlePostMessage); resolve on every exit path so it never hangs.
				this.resolveFunctions[callId]?.();
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
