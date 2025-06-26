import type { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StreamableHTTPServerTransportOptions } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request } from 'express';
import { captor, mock } from 'jest-mock-extended';

import type { CompressionResponse } from '../FlushingTransport';
import { FlushingSSEServerTransport, FlushingStreamableHTTPTransport } from '../FlushingTransport';
import { McpServerManager } from '../McpServer';

const sessionId = 'mock-session-id';
const mockServer = mock<Server>();
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
	return {
		Server: jest.fn().mockImplementation(() => mockServer),
	};
});

const mockTransport = mock<FlushingSSEServerTransport>({ sessionId });
mockTransport.handleRequest.mockImplementation(jest.fn());
const mockStreamableTransport = mock<FlushingStreamableHTTPTransport>();
mockStreamableTransport.onclose = jest.fn();

jest.mock('../FlushingTransport', () => {
	return {
		FlushingSSEServerTransport: jest.fn().mockImplementation(() => mockTransport),
		FlushingStreamableHTTPTransport: jest.fn().mockImplementation(() => mockStreamableTransport),
	};
});

describe('McpServer', () => {
	const mockRequest = mock<Request>({ query: { sessionId }, path: '/sse' });
	const mockResponse = mock<CompressionResponse>();
	const mockTool = mock<Tool>({ name: 'mockTool' });

	const mcpServerManager = McpServerManager.instance(mock());

	beforeEach(() => {
		jest.clearAllMocks();
		mockResponse.status.mockReturnThis();
	});

	describe('connectTransport', () => {
		const postUrl = '/post-url';

		it('should set up a transport and server', async () => {
			await mcpServerManager.createServerWithSSETransport('mcpServer', postUrl, mockResponse);

			// Check that FlushingSSEServerTransport was initialized with correct params
			expect(FlushingSSEServerTransport).toHaveBeenCalledWith(postUrl, mockResponse);

			// Check that Server was initialized
			expect(Server).toHaveBeenCalled();

			// Check that transport and server are stored
			expect(mcpServerManager.transports[sessionId]).toBeDefined();
			expect(mcpServerManager.servers[sessionId]).toBeDefined();

			// Check that connect was called on the server
			expect(mcpServerManager.servers[sessionId].connect).toHaveBeenCalled();

			// Check that flush was called if available
			expect(mockResponse.flush).toHaveBeenCalled();
		});

		it('should set up close handler that cleans up resources', async () => {
			await mcpServerManager.createServerWithSSETransport('mcpServer', postUrl, mockResponse);

			// Get the close callback and execute it
			const closeCallbackCaptor = captor<() => Promise<void>>();
			expect(mockResponse.on).toHaveBeenCalledWith('close', closeCallbackCaptor);
			await closeCallbackCaptor.value();

			// Check that resources were cleaned up
			expect(mcpServerManager.transports[sessionId]).toBeUndefined();
			expect(mcpServerManager.servers[sessionId]).toBeUndefined();
		});
	});

	describe('handlePostMessage', () => {
		it('should call transport.handleRequest when transport exists', async () => {
			mockTransport.handleRequest.mockImplementation(async () => {
				// @ts-expect-error private property `resolveFunctions`
				mcpServerManager.resolveFunctions[`${sessionId}_123`]();
			});

			// Add the transport directly
			mcpServerManager.transports[sessionId] = mockTransport;

			mockRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 123,
					params: { name: 'mockTool' },
				}),
			);

			// Call the method
			const result = await mcpServerManager.handlePostMessage(mockRequest, mockResponse, [
				mockTool,
			]);

			// Verify that transport's handleRequest was called
			expect(mockTransport.handleRequest).toHaveBeenCalledWith(
				mockRequest,
				mockResponse,
				expect.any(Object),
			);

			// Verify that we check if it was a tool call
			expect(result).toBe(true);

			// Verify flush was called
			expect(mockResponse.flush).toHaveBeenCalled();
		});

		it('should handle multiple tool calls with different ids', async () => {
			const firstId = 123;
			const secondId = 456;

			mockTransport.handleRequest.mockImplementation(async () => {
				const requestKey = mockRequest.rawBody?.toString().includes(`"id":${firstId}`)
					? `${sessionId}_${firstId}`
					: `${sessionId}_${secondId}`;
				// @ts-expect-error private property `resolveFunctions`
				mcpServerManager.resolveFunctions[requestKey]();
			});

			// Add the transport directly
			mcpServerManager.transports[sessionId] = mockTransport;

			// First tool call
			mockRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: firstId,
					params: { name: 'mockTool', arguments: { param: 'first call' } },
				}),
			);

			// Handle first tool call
			const firstResult = await mcpServerManager.handlePostMessage(mockRequest, mockResponse, [
				mockTool,
			]);
			expect(firstResult).toBe(true);
			expect(mockTransport.handleRequest).toHaveBeenCalledWith(
				mockRequest,
				mockResponse,
				expect.any(Object),
			);

			// Second tool call with different id
			mockRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: secondId,
					params: { name: 'mockTool', arguments: { param: 'second call' } },
				}),
			);

			// Handle second tool call
			const secondResult = await mcpServerManager.handlePostMessage(mockRequest, mockResponse, [
				mockTool,
			]);
			expect(secondResult).toBe(true);

			// Verify transport's handleRequest was called twice
			expect(mockTransport.handleRequest).toHaveBeenCalledTimes(2);

			// Verify flush was called for both requests
			expect(mockResponse.flush).toHaveBeenCalledTimes(2);
		});

		it('should return 401 when transport does not exist', async () => {
			// Set up request with rawBody and ensure sessionId is properly set
			const testRequest = mock<Request>({
				query: { sessionId: 'non-existent-session' },
				path: '/sse',
			});
			testRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 123,
					params: { name: 'mockTool' },
				}),
			);

			// Call without setting up transport for this sessionId
			await mcpServerManager.handlePostMessage(testRequest, mockResponse, [mockTool]);

			// Verify error status was set
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('No transport found'));
		});
	});

	describe('createServerWithStreamableHTTPTransport', () => {
		it('should set up a transport and server with StreamableHTTPServerTransport', async () => {
			const mockStreamableRequest = mock<Request>({
				headers: { 'mcp-session-id': sessionId },
				path: '/mcp',
				body: {},
			});

			mockStreamableTransport.handleRequest.mockResolvedValue(undefined);

			await mcpServerManager.createServerWithStreamableHTTPTransport(
				'mcpServer',
				mockResponse,
				mockStreamableRequest,
			);

			// Check that FlushingStreamableHTTPTransport was initialized with correct params
			expect(FlushingStreamableHTTPTransport).toHaveBeenCalledWith(
				{
					sessionIdGenerator: expect.any(Function),
					onsessioninitialized: expect.any(Function),
				},
				mockResponse,
			);

			// Check that Server was initialized
			expect(Server).toHaveBeenCalled();

			// Check that handleRequest was called
			expect(mockStreamableTransport.handleRequest).toHaveBeenCalled();
		});

		it('should handle session initialization callback', async () => {
			const mockStreamableRequest = mock<Request>({
				headers: { 'mcp-session-id': sessionId },
				path: '/mcp',
				body: {},
			});

			// Set up the mock to simulate session initialization
			mockStreamableTransport.onclose = jest.fn();
			mockStreamableTransport.handleRequest.mockResolvedValue(undefined);

			jest
				.mocked(FlushingStreamableHTTPTransport)
				.mockImplementationOnce((options: StreamableHTTPServerTransportOptions) => {
					// Simulate session initialization asynchronously using queueMicrotask instead of setTimeout
					queueMicrotask(() => {
						if (options.onsessioninitialized) {
							options.onsessioninitialized(sessionId);
						}
					});
					return mockStreamableTransport;
				});

			await mcpServerManager.createServerWithStreamableHTTPTransport(
				'mcpServer',
				mockResponse,
				mockStreamableRequest,
			);

			// Wait for microtask to complete
			await Promise.resolve();

			// Check that transport and server are stored after session init
			expect(mcpServerManager.transports[sessionId]).toBeDefined();
			expect(mcpServerManager.servers[sessionId]).toBeDefined();
		});

		it('should handle transport close callback for StreamableHTTPServerTransport', async () => {
			const mockStreamableRequest = mock<Request>({
				headers: { 'mcp-session-id': sessionId },
				path: '/mcp',
				body: {},
			});

			let onCloseCallback: (() => void) | undefined;
			mockStreamableTransport.handleRequest.mockResolvedValue(undefined);

			jest
				.mocked(FlushingStreamableHTTPTransport)
				.mockImplementationOnce((options: StreamableHTTPServerTransportOptions) => {
					// Simulate session initialization and capture onclose callback asynchronously using queueMicrotask
					queueMicrotask(() => {
						if (options.onsessioninitialized) {
							options.onsessioninitialized(sessionId);
							onCloseCallback = mockStreamableTransport.onclose;
						}
					});
					return mockStreamableTransport;
				});

			await mcpServerManager.createServerWithStreamableHTTPTransport(
				'mcpServer',
				mockResponse,
				mockStreamableRequest,
			);

			// Wait for microtask to complete
			await Promise.resolve();

			// Simulate transport close
			if (onCloseCallback) {
				onCloseCallback();
			}

			// Check that resources were cleaned up
			expect(mcpServerManager.transports[sessionId]).toBeUndefined();
			expect(mcpServerManager.servers[sessionId]).toBeUndefined();
		});
	});

	describe('handlePostMessage with StreamableHTTPServerTransport', () => {
		it('should handle StreamableHTTPServerTransport with session ID in header', async () => {
			const mockStreamableRequest = mock<Request>({
				headers: { 'mcp-session-id': sessionId },
				path: '/mcp',
			});

			mockStreamableTransport.handleRequest.mockImplementation(async () => {
				// @ts-expect-error private property `resolveFunctions`
				mcpServerManager.resolveFunctions[`${sessionId}_123`]();
			});

			// Add the transport directly
			mcpServerManager.transports[sessionId] = mockStreamableTransport;

			mockStreamableRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 123,
					params: { name: 'mockTool' },
				}),
			);

			// Call the method
			const result = await mcpServerManager.handlePostMessage(mockStreamableRequest, mockResponse, [
				mockTool,
			]);

			// Verify that transport's handleRequest was called
			expect(mockStreamableTransport.handleRequest).toHaveBeenCalledWith(
				mockStreamableRequest,
				mockResponse,
				expect.any(Object),
			);

			// Verify that we check if it was a tool call
			expect(result).toBe(true);

			// Verify flush was called
			expect(mockResponse.flush).toHaveBeenCalled();
		});

		it('should return 401 when StreamableHTTPServerTransport does not exist', async () => {
			const testRequest = mock<Request>({
				headers: { 'mcp-session-id': 'non-existent-session' },
				path: '/mcp',
			});
			testRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 123,
					params: { name: 'mockTool' },
				}),
			);

			// Call without setting up transport for this sessionId
			await mcpServerManager.handlePostMessage(testRequest, mockResponse, [mockTool]);

			// Verify error status was set
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('No transport found'));
		});
	});

	describe('getSessionId', () => {
		it('should return session ID from query parameter', () => {
			const request = mock<Request>();
			request.query = { sessionId: 'test-session-query' };
			request.headers = {};

			const result = mcpServerManager.getSessionId(request);

			expect(result).toBe('test-session-query');
		});

		it('should return session ID from header when query is not present', () => {
			const request = mock<Request>();
			request.query = {};
			request.headers = { 'mcp-session-id': 'test-session-header' };

			const result = mcpServerManager.getSessionId(request);

			expect(result).toBe('test-session-header');
		});

		it('should return undefined when neither query parameter nor header is present', () => {
			const request = mock<Request>();
			request.query = {};
			request.headers = {};

			const result = mcpServerManager.getSessionId(request);

			expect(result).toBeUndefined();
		});
	});

	describe('getTransport', () => {
		const testSessionId = 'test-session-transport';

		beforeEach(() => {
			// Clear transports before each test
			mcpServerManager.transports = {};
		});

		it('should return transport when it exists for the session', () => {
			const mockTransportInstance = mock<FlushingSSEServerTransport>();
			mcpServerManager.transports[testSessionId] = mockTransportInstance;

			const result = mcpServerManager.getTransport(testSessionId);

			expect(result).toBe(mockTransportInstance);
		});

		it('should return undefined when transport does not exist for the session', () => {
			const result = mcpServerManager.getTransport('non-existent-session');

			expect(result).toBeUndefined();
		});

		it('should return correct transport when multiple transports exist', () => {
			const mockTransport1 = mock<FlushingSSEServerTransport>();
			const mockTransport2 = mock<FlushingStreamableHTTPTransport>();

			mcpServerManager.transports['session-1'] = mockTransport1;
			mcpServerManager.transports['session-2'] = mockTransport2;

			const result1 = mcpServerManager.getTransport('session-1');
			const result2 = mcpServerManager.getTransport('session-2');

			expect(result1).toBe(mockTransport1);
			expect(result2).toBe(mockTransport2);
		});
	});

	describe('handleDeleteRequest', () => {
		beforeEach(() => {
			// Clear transports and servers before each test
			mcpServerManager.transports = {};
			mcpServerManager.servers = {};
		});

		it('should handle DELETE request for StreamableHTTP transport', async () => {
			const deleteSessionId = 'delete-session-id';
			const mockDeleteRequest = mock<Request>({
				headers: { 'mcp-session-id': deleteSessionId },
			});
			const mockDeleteResponse = mock<CompressionResponse>();
			mockDeleteResponse.status.mockReturnThis();

			// Create a mock transport that passes instanceof check
			const mockHttpTransport = Object.create(FlushingStreamableHTTPTransport.prototype);
			mockHttpTransport.handleRequest = jest.fn();

			// Set up the transport
			mcpServerManager.transports[deleteSessionId] = mockHttpTransport;

			// Call handleDeleteRequest
			await mcpServerManager.handleDeleteRequest(mockDeleteRequest, mockDeleteResponse);

			// Verify transport.handleRequest was called
			expect(mockHttpTransport.handleRequest).toHaveBeenCalledWith(
				mockDeleteRequest,
				mockDeleteResponse,
			);
		});

		it('should return 400 when no sessionId provided', async () => {
			const mockDeleteRequest = mock<Request>({
				query: {},
				headers: {},
			});
			const mockDeleteResponse = mock<CompressionResponse>();
			mockDeleteResponse.status.mockReturnThis();

			// Mock getSessionId to return undefined
			jest.spyOn(mcpServerManager, 'getSessionId').mockReturnValueOnce(undefined);

			// Call handleDeleteRequest without sessionId
			await mcpServerManager.handleDeleteRequest(mockDeleteRequest, mockDeleteResponse);

			// Verify 400 response
			expect(mockDeleteResponse.status).toHaveBeenCalledWith(400);
		});

		it('should return 404 for non-existent session', async () => {
			const mockDeleteRequest = mock<Request>({
				headers: { 'mcp-session-id': 'non-existent-session' },
			});
			const mockDeleteResponse = mock<CompressionResponse>();
			mockDeleteResponse.status.mockReturnThis();

			// Call handleDeleteRequest with non-existent sessionId
			await mcpServerManager.handleDeleteRequest(mockDeleteRequest, mockDeleteResponse);

			// Verify 404 response (session not found)
			expect(mockDeleteResponse.status).toHaveBeenCalledWith(404);
		});

		it('should return 405 for SSE transport session', async () => {
			const sseSessionId = 'sse-session-id';
			const mockDeleteRequest = mock<Request>({
				query: { sessionId: sseSessionId },
			});
			const mockDeleteResponse = mock<CompressionResponse>();
			mockDeleteResponse.status.mockReturnThis();
			const mockSSETransport = mock<FlushingSSEServerTransport>();

			// Set up SSE transport
			mcpServerManager.transports[sseSessionId] = mockSSETransport;

			// Call handleDeleteRequest
			await mcpServerManager.handleDeleteRequest(mockDeleteRequest, mockDeleteResponse);

			// Verify 405 response (DELETE not supported for SSE)
			expect(mockDeleteResponse.status).toHaveBeenCalledWith(405);
		});
	});
});
