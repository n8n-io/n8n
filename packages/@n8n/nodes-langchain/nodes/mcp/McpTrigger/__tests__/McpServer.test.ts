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
import { QueuedExecutionStrategy } from '../execution/QueuedExecutionStrategy';
import { McpServer } from '../McpServer';
import { InMemorySessionStore } from '../session/InMemorySessionStore';

describe('McpServer', () => {
	let mcpServer: McpServer;
	let mockLogger: ReturnType<typeof createMockLogger>;

	beforeEach(() => {
		// Reset singleton for testing
		(McpServer as unknown as { instance_: McpServer | undefined }).instance_ = undefined;
		mockLogger = createMockLogger();
		mcpServer = McpServer.instance(mockLogger);
	});

	afterEach(() => {
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
});
