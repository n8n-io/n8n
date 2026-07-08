import {
	createMockLogger,
	createMockRequest,
	createMockRequestWithSessionId,
	createMockRequestWithHeaderSessionId,
	createMockResponse,
	createMockTool,
	createMockTransport,
	createValidToolCallMessage,
	createListToolsMessage,
	createMockServer,
	MCP_SESSION_ID_HEADER,
} from './helpers';
import type { McpServerConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { QueuedExecutionStrategy } from '../execution/QueuedExecutionStrategy';
import { McpServer } from '../McpServer';
import { InMemorySessionStore } from '../session/InMemorySessionStore';
import type { SessionManager } from '../session/SessionManager';

const setEvictionConfig = (sessionIdleTtl: number, sessionSweepInterval: number) =>
	vi
		.mocked(Container.get)
		.mockReturnValue({ sessionIdleTtl, sessionSweepInterval } as McpServerConfig);

describe('McpServer', () => {
	let mcpServer: McpServer;
	let mockLogger: ReturnType<typeof createMockLogger>;

	beforeEach(() => {
		// Reset singleton for testing
		(McpServer as unknown as { instance_: McpServer | undefined }).instance_ = undefined;
		setEvictionConfig(60 * 60 * 1000, 5 * 60 * 1000);
		mockLogger = createMockLogger();
		mcpServer = McpServer.instance(mockLogger);
	});

	afterEach(() => {
		mcpServer.stopSweep();
		// Clean up singleton
		(McpServer as unknown as { instance_: McpServer | undefined }).instance_ = undefined;
	});

	describe('singleton pattern', () => {
		it('should return same instance for subsequent calls', () => {
			const instance1 = McpServer.instance(mockLogger);
			const instance2 = McpServer.instance(mockLogger);
			expect(instance1).toBe(instance2);
		});

		it('should log debug message when creating singleton', () => {
			expect(mockLogger.debug).toHaveBeenCalledWith('McpServer created');
			expect(mockLogger.debug).toHaveBeenCalledWith('Created singleton McpServer');
		});
	});

	describe('getSessionId', () => {
		it('should extract sessionId from query parameters', () => {
			const req = createMockRequestWithSessionId('session-123', '{}');
			expect(mcpServer.getSessionId(req)).toBe('session-123');
		});

		it('should extract sessionId from mcp-session-id header', () => {
			const req = createMockRequestWithHeaderSessionId('header-session-456');

			expect(mcpServer.getSessionId(req)).toBe('header-session-456');
		});

		it('should prefer query parameter over header', () => {
			const req = createMockRequest({
				query: { sessionId: 'query-session' },
				headers: { [MCP_SESSION_ID_HEADER]: 'header-session' },
			});

			expect(mcpServer.getSessionId(req)).toBe('query-session');
		});

		it('should return undefined when no sessionId present', () => {
			const req = createMockRequest({ query: {}, headers: {} });

			expect(mcpServer.getSessionId(req)).toBeUndefined();
		});
	});

	describe('getMcpMetadata', () => {
		it('should extract sessionId and messageId from request', () => {
			const rawBody = '{"jsonrpc":"2.0","id":"msg-123","method":"test"}';
			const req = createMockRequestWithSessionId('session-1', rawBody);

			const metadata = mcpServer.getMcpMetadata(req);

			expect(metadata).toEqual({
				sessionId: 'session-1',
				messageId: 'msg-123',
			});
		});

		it('should return empty messageId when not present in body', () => {
			const rawBody = '{"jsonrpc":"2.0","method":"notification"}';
			const req = createMockRequestWithSessionId('session-1', rawBody);

			const metadata = mcpServer.getMcpMetadata(req);

			expect(metadata).toEqual({
				sessionId: 'session-1',
				messageId: '',
			});
		});

		it('should return undefined when no sessionId', () => {
			const req = createMockRequest({ query: {}, headers: {} });

			expect(mcpServer.getMcpMetadata(req)).toBeUndefined();
		});
	});

	describe('handlePostMessage', () => {
		it('should return 401 when no transport found for session', async () => {
			const response = createMockResponse();
			const request = createMockRequestWithSessionId('non-existent', '{}');

			await mcpServer.handlePostMessage(request, response, []);

			expect(response.status).toHaveBeenCalledWith(401);
			expect(response.send).toHaveBeenCalledWith('No transport found for sessionId');
		});

		it('should identify tool call messages', async () => {
			const response = createMockResponse();
			const toolCallBody = createValidToolCallMessage('get_weather', { city: 'London' });
			const request = createMockRequestWithSessionId('non-existent', toolCallBody);

			const result = await mcpServer.handlePostMessage(request, response, []);

			expect(result.wasToolCall).toBe(true);
			expect(result.toolCallInfo).toEqual({
				toolName: 'get_weather',
				arguments: { city: 'London' },
			});
		});

		it('should add sourceNodeName from tool metadata', async () => {
			const response = createMockResponse();
			const tools = [
				createMockTool('get_weather', {
					metadata: { sourceNodeName: 'Weather Node' },
				}),
			];
			const toolCallBody = createValidToolCallMessage('get_weather', { city: 'London' });
			const request = createMockRequestWithSessionId('non-existent', toolCallBody);

			const result = await mcpServer.handlePostMessage(request, response, tools);

			expect(result.toolCallInfo).toEqual({
				toolName: 'get_weather',
				arguments: { city: 'London' },
				sourceNodeName: 'Weather Node',
			});
		});

		it('should identify non-tool-call messages', async () => {
			const response = createMockResponse();
			const listToolsBody = createListToolsMessage();
			const request = createMockRequestWithSessionId('non-existent', listToolsBody);

			const result = await mcpServer.handlePostMessage(request, response, []);

			expect(result.wasToolCall).toBe(false);
		});
	});

	describe('handleDeleteRequest', () => {
		it('should return 400 when no sessionId provided', async () => {
			const response = createMockResponse();
			const request = {
				query: {},
				headers: {},
				rawBody: Buffer.from('{}'),
			} as unknown as Parameters<typeof mcpServer.handleDeleteRequest>[0];

			await mcpServer.handleDeleteRequest(request, response);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.send).toHaveBeenCalledWith('No sessionId provided');
		});

		it('should return 404 when session not found', async () => {
			const response = createMockResponse();
			const request = createMockRequestWithSessionId('non-existent', '{}');

			await mcpServer.handleDeleteRequest(request, response);

			expect(response.status).toHaveBeenCalledWith(404);
			expect(response.send).toHaveBeenCalledWith('Session not found');
		});
	});

	describe('configuration', () => {
		it('should allow setting custom session store', () => {
			const customStore = new InMemorySessionStore();
			mcpServer.setSessionStore(customStore);

			// Verify the store is used (indirect test)
			expect(mcpServer).toBeDefined();
		});

		it('should allow setting execution strategy', () => {
			const queuedStrategy = new QueuedExecutionStrategy(mcpServer.getPendingCallsManager());
			mcpServer.setExecutionStrategy(queuedStrategy);

			expect(mcpServer.isQueueMode()).toBe(true);
		});

		it('should not be in queue mode by default', () => {
			expect(mcpServer.isQueueMode()).toBe(false);
		});
	});

	describe('idle session eviction', () => {
		const TTL = 1_000;
		const INTERVAL = 500;

		const sessionManagerOf = (server: McpServer) =>
			(server as unknown as { sessionManager: SessionManager }).sessionManager;

		const registerSession = async (
			sessionId: string,
			transportType: 'sse' | 'streamableHttp' = 'streamableHttp',
		) =>
			await sessionManagerOf(mcpServer).registerSession(
				sessionId,
				createMockServer(),
				createMockTransport(sessionId, transportType),
			);

		const touch = (sessionId: string) => sessionManagerOf(mcpServer).touch(sessionId);

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(0);
			// Recreate the singleton with short timings registered under fake timers.
			setEvictionConfig(TTL, INTERVAL);
			(McpServer as unknown as { instance_: McpServer | undefined }).instance_ = undefined;
			mcpServer = McpServer.instance(mockLogger);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should evict a session idle past the ttl', async () => {
			await registerSession('idle-1');
			expect(mcpServer.getTransport('idle-1')).toBeDefined();

			await vi.advanceTimersByTimeAsync(TTL + INTERVAL);

			expect(mcpServer.getTransport('idle-1')).toBeUndefined();
		});

		it('should close the server when evicting a session', async () => {
			await registerSession('idle-3');
			const server = sessionManagerOf(mcpServer).getServer('idle-3');

			await vi.advanceTimersByTimeAsync(TTL + INTERVAL);

			expect(server?.close).toHaveBeenCalled();
		});

		it('should not evict an idle SSE session (cleaned up via connection close instead)', async () => {
			await registerSession('sse-1', 'sse');

			await vi.advanceTimersByTimeAsync(TTL * 2);

			expect(mcpServer.getTransport('sse-1')).toBeDefined();
		});

		it('should not evict a session that keeps being touched', async () => {
			await registerSession('active-1');

			// Stay active across more than a full idle window via periodic touches.
			await vi.advanceTimersByTimeAsync(TTL - INTERVAL);
			touch('active-1');
			await vi.advanceTimersByTimeAsync(TTL - INTERVAL);

			expect(mcpServer.getTransport('active-1')).toBeDefined();
		});

		it('should not evict a session with an in-flight pending response', async () => {
			await registerSession('busy-1');
			mcpServer.storePendingResponse('busy-1', 'msg-1');

			await vi.advanceTimersByTimeAsync(TTL + INTERVAL);
			expect(mcpServer.getTransport('busy-1')).toBeDefined();

			mcpServer.removePendingResponse('busy-1', 'msg-1');
			await vi.advanceTimersByTimeAsync(INTERVAL);
			expect(mcpServer.getTransport('busy-1')).toBeUndefined();
		});

		it('should not evict a session with an in-flight direct-mode tool call', async () => {
			await registerSession('busy-2');
			// Direct mode tracks the running call only via resolveFunctions.
			const resolveFunctions = (
				mcpServer as unknown as { resolveFunctions: Record<string, () => void> }
			).resolveFunctions;
			resolveFunctions['busy-2_msg-1'] = () => {};

			await vi.advanceTimersByTimeAsync(TTL + INTERVAL);
			expect(mcpServer.getTransport('busy-2')).toBeDefined();

			delete resolveFunctions['busy-2_msg-1'];
			await vi.advanceTimersByTimeAsync(INTERVAL);
			expect(mcpServer.getTransport('busy-2')).toBeUndefined();
		});

		it('should evict a session whose only traffic was a handshake (no in-flight tool call)', async () => {
			await registerSession('handshake-1');

			void mcpServer.handlePostMessage(
				createMockRequestWithSessionId('handshake-1', createListToolsMessage()),
				createMockResponse(),
				[],
			);

			await vi.advanceTimersByTimeAsync(TTL + INTERVAL);

			expect(mcpServer.getTransport('handshake-1')).toBeUndefined();
		});

		it('should stop evicting once the sweep is stopped', async () => {
			await registerSession('idle-2');
			mcpServer.stopSweep();

			await vi.advanceTimersByTimeAsync(TTL * 2);

			expect(mcpServer.getTransport('idle-2')).toBeDefined();
		});
	});

	describe('pending response management', () => {
		it('should track and check pending responses', async () => {
			// First register a session with transport
			const sessionId = 'test-session';
			const transport = createMockTransport(sessionId);
			const server = createMockServer();

			// Access private sessionManager to register session
			const sessionManager = (
				mcpServer as unknown as {
					sessionManager: {
						registerSession: (s: string, srv: unknown, tr: unknown) => Promise<void>;
					};
				}
			).sessionManager;
			await sessionManager.registerSession(sessionId, server, transport);

			mcpServer.storePendingResponse(sessionId, 'msg-1');

			expect(mcpServer.hasPendingResponse(sessionId, 'msg-1')).toBe(true);
			expect(mcpServer.hasPendingResponse(sessionId, 'msg-2')).toBe(false);
			expect(mcpServer.pendingResponseCount).toBe(1);
		});

		it('should remove pending responses', async () => {
			const sessionId = 'test-session';
			const transport = createMockTransport(sessionId);
			const server = createMockServer();

			const sessionManager = (
				mcpServer as unknown as {
					sessionManager: {
						registerSession: (s: string, srv: unknown, tr: unknown) => Promise<void>;
					};
				}
			).sessionManager;
			await sessionManager.registerSession(sessionId, server, transport);

			mcpServer.storePendingResponse(sessionId, 'msg-1');
			mcpServer.removePendingResponse(sessionId, 'msg-1');

			expect(mcpServer.hasPendingResponse(sessionId, 'msg-1')).toBe(false);
			expect(mcpServer.pendingResponseCount).toBe(0);
		});

		it('should handle pending response without messageId', async () => {
			const sessionId = 'test-session';
			const transport = createMockTransport(sessionId);
			const server = createMockServer();

			const sessionManager = (
				mcpServer as unknown as {
					sessionManager: {
						registerSession: (s: string, srv: unknown, tr: unknown) => Promise<void>;
					};
				}
			).sessionManager;
			await sessionManager.registerSession(sessionId, server, transport);

			mcpServer.storePendingResponse(sessionId, '');

			expect(mcpServer.hasPendingResponse(sessionId, '')).toBe(true);
		});

		it('should warn when storing pending response without transport', () => {
			mcpServer.storePendingResponse('no-transport-session', 'msg-1');

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Cannot store pending response'),
			);
		});
	});

	describe('getTransport', () => {
		it('should return undefined for unregistered session', () => {
			expect(mcpServer.getTransport('non-existent')).toBeUndefined();
		});

		it('should return transport for registered session', async () => {
			const sessionId = 'test-session';
			const transport = createMockTransport(sessionId);
			const server = createMockServer();

			const sessionManager = (
				mcpServer as unknown as {
					sessionManager: {
						registerSession: (s: string, srv: unknown, tr: unknown) => Promise<void>;
					};
				}
			).sessionManager;
			await sessionManager.registerSession(sessionId, server, transport);

			expect(mcpServer.getTransport(sessionId)).toBe(transport);
		});
	});

	describe('getTools', () => {
		it('should return undefined for session without tools', () => {
			expect(mcpServer.getTools('non-existent')).toBeUndefined();
		});
	});

	describe('getPendingCallsManager', () => {
		it('should return the pending calls manager', () => {
			const manager = mcpServer.getPendingCallsManager();
			expect(manager).toBeDefined();
			expect(typeof manager.waitForResult).toBe('function');
			expect(typeof manager.resolve).toBe('function');
			expect(typeof manager.reject).toBe('function');
		});
	});

	describe('handleWorkerResponse', () => {
		it('should set isError on error results sent via SSE transport', async () => {
			const sessionId = 'test-session';
			const transport = createMockTransport(sessionId, 'sse');
			const server = createMockServer();

			const sessionManager = (
				mcpServer as unknown as {
					sessionManager: {
						registerSession: (
							s: string,
							srv: unknown,
							tr: unknown,
							tools?: unknown[],
						) => Promise<void>;
					};
				}
			).sessionManager;
			await sessionManager.registerSession(sessionId, server, transport, [
				createMockTool('test-tool'),
			]);

			// Set up queue mode so handleWorkerResponse uses SSE fallback path
			const queuedStrategy = new QueuedExecutionStrategy(mcpServer.getPendingCallsManager());
			mcpServer.setExecutionStrategy(queuedStrategy);

			// Worker returns an error result (queue mode error format)
			const errorResult = { error: { message: 'Bad request', name: 'NodeApiError' } };
			mcpServer.handleWorkerResponse(sessionId, 'msg-1', errorResult);

			expect(transport.send).toHaveBeenCalledWith(
				expect.objectContaining({
					jsonrpc: '2.0',
					id: 'msg-1',
					result: expect.objectContaining({
						isError: true,
						content: [{ type: 'text', text: JSON.stringify(errorResult) }],
					}),
				}),
			);
		});

		it('should not set isError on successful results sent via SSE transport', async () => {
			const sessionId = 'test-session';
			const transport = createMockTransport(sessionId, 'sse');
			const server = createMockServer();

			const sessionManager = (
				mcpServer as unknown as {
					sessionManager: {
						registerSession: (
							s: string,
							srv: unknown,
							tr: unknown,
							tools?: unknown[],
						) => Promise<void>;
					};
				}
			).sessionManager;
			await sessionManager.registerSession(sessionId, server, transport, [
				createMockTool('test-tool'),
			]);

			const queuedStrategy = new QueuedExecutionStrategy(mcpServer.getPendingCallsManager());
			mcpServer.setExecutionStrategy(queuedStrategy);

			// Worker returns a successful result
			const successResult = { data: 'value', count: 42 };
			mcpServer.handleWorkerResponse(sessionId, 'msg-1', successResult);

			expect(transport.send).toHaveBeenCalledWith(
				expect.objectContaining({
					jsonrpc: '2.0',
					id: 'msg-1',
					result: expect.objectContaining({
						content: [{ type: 'text', text: JSON.stringify(successResult) }],
					}),
				}),
			);
			// Verify isError is NOT present
			const sentMessage = transport.send.mock.calls[0][0] as unknown as {
				result: { isError?: boolean };
			};
			expect(sentMessage.result.isError).toBeUndefined();
		});

		it('should handle list tools request marker', async () => {
			const sessionId = 'test-session';
			const transport = createMockTransport(sessionId, 'sse');
			const server = createMockServer();

			const sessionManager = (
				mcpServer as unknown as {
					sessionManager: {
						registerSession: (
							s: string,
							srv: unknown,
							tr: unknown,
							tools?: unknown[],
						) => Promise<void>;
					};
				}
			).sessionManager;
			await sessionManager.registerSession(sessionId, server, transport, [
				createMockTool('test-tool'),
			]);

			mcpServer.handleWorkerResponse(sessionId, 'msg-1', { _listToolsRequest: true });

			// Should have attempted to send tools list via transport
			expect(transport.send).toHaveBeenCalled();
		});
	});

	describe('credential gate', () => {
		const sessionId = 'gated-session';
		const requestId = 'req-1';
		const callId = `${sessionId}_${requestId}`;

		type CallToolHandler = (
			request: { params: { name: string; arguments: Record<string, unknown> } },
			extra: { sessionId?: string; requestId?: string },
		) => Promise<{ isError?: boolean; content: Array<{ text: string }>; [k: string]: unknown }>;

		// Capture the CallTool handler that setupHandlers registers on the server.
		function getCallToolHandler(): CallToolHandler {
			const server = createMockServer();
			(mcpServer as unknown as { setupHandlers(s: unknown): void }).setupHandlers(server);
			const calls = (server.setRequestHandler as unknown as { mock: { calls: unknown[][] } }).mock
				.calls;
			// [0] = ListTools handler, [1] = CallTool handler
			return calls[1][1] as CallToolHandler;
		}

		async function registerToolSession(tool: ReturnType<typeof createMockTool>): Promise<void> {
			const transport = createMockTransport(sessionId);
			await (
				mcpServer as unknown as {
					sessionManager: {
						registerSession: (
							s: string,
							srv: unknown,
							tr: unknown,
							tools?: unknown[],
						) => Promise<void>;
					};
				}
			).sessionManager.registerSession(sessionId, createMockServer(), transport, [tool]);
		}

		function setPendingGate(result: unknown): void {
			(mcpServer as unknown as { pendingGateResults: Record<string, unknown> }).pendingGateResults[
				callId
			] = result;
		}

		it('short-circuits with auth URLs and does not execute when not ready', async () => {
			const tool = createMockTool('get_weather');
			await registerToolSession(tool);
			setPendingGate({
				readyToExecute: false,
				credentials: [
					{
						credentialId: 'c1',
						credentialName: 'Slack',
						credentialType: 'slackOAuth2Api',
						resolverId: 'n8n',
						status: 'missing',
						authorizationUrl: 'https://n8n.test/authorize',
					},
				],
			});

			const handler = getCallToolHandler();
			const result = await handler(
				{ params: { name: 'get_weather', arguments: {} } },
				{ sessionId, requestId },
			);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('https://n8n.test/authorize');
			expect(tool.invoke).not.toHaveBeenCalled();
		});

		it('executes the tool when the gate result is ready', async () => {
			const tool = createMockTool('get_weather', { invokeReturn: { ok: true } });
			await registerToolSession(tool);
			setPendingGate({ readyToExecute: true, credentials: [] });

			const handler = getCallToolHandler();
			const result = await handler(
				{ params: { name: 'get_weather', arguments: { city: 'X' } } },
				{ sessionId, requestId },
			);

			expect(tool.invoke).toHaveBeenCalledWith({ city: 'X' });
			expect(result.isError).toBeUndefined();
			expect(result.content[0].text).toBe(JSON.stringify({ ok: true }));
		});

		it('executes normally when no gate result is present for the call', async () => {
			const tool = createMockTool('get_weather', { invokeReturn: { ok: true } });
			await registerToolSession(tool);

			const handler = getCallToolHandler();
			const result = await handler(
				{ params: { name: 'get_weather', arguments: {} } },
				{ sessionId, requestId },
			);

			expect(tool.invoke).toHaveBeenCalled();
			expect(result.content[0].text).toBe(JSON.stringify({ ok: true }));
		});
	});
});
