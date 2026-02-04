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
			expect(result.wasToolCall).toBe(true);

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
			expect(firstResult.wasToolCall).toBe(true);
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
			expect(secondResult.wasToolCall).toBe(true);

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
					// The onsessioninitialized callback is async (contains await registerSession), so we need to await it
					queueMicrotask(async () => {
						if (options.onsessioninitialized) {
							await options.onsessioninitialized(sessionId);
						}
					});
					return mockStreamableTransport;
				});

			await mcpServerManager.createServerWithStreamableHTTPTransport(
				'mcpServer',
				mockResponse,
				mockStreamableRequest,
			);

			// Wait for microtask and async callback to complete
			await new Promise((resolve) => setImmediate(resolve));

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

			let onCloseCallback: (() => void | Promise<void>) | undefined;
			mockStreamableTransport.handleRequest.mockResolvedValue(undefined);

			jest
				.mocked(FlushingStreamableHTTPTransport)
				.mockImplementationOnce((options: StreamableHTTPServerTransportOptions) => {
					// Simulate session initialization and capture onclose callback asynchronously using queueMicrotask
					// The onsessioninitialized callback is async (contains await registerSession), so we need to
					// wait for it to complete before capturing onclose
					queueMicrotask(async () => {
						if (options.onsessioninitialized) {
							await options.onsessioninitialized(sessionId);
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

			// Wait for microtask and async callback to complete
			await new Promise((resolve) => setImmediate(resolve));

			// Simulate transport close - await it since the callback is async
			if (onCloseCallback) {
				await onCloseCallback();
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
			expect(result.wasToolCall).toBe(true);

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

	describe('Queue Mode Support', () => {
		const queueSessionId = 'queue-session-id';
		const queueMessageId = 'queue-message-id';
		const callId = `${queueSessionId}_${queueMessageId}`;

		beforeEach(() => {
			mcpServerManager.transports = {};
			mcpServerManager.setQueueMode(false);
			// Clean up any pending responses from previous tests
			mcpServerManager.cleanupSessionPendingResponses(queueSessionId);
			mcpServerManager.cleanupSessionPendingResponses('other-session-id');
		});

		describe('setQueueMode', () => {
			it('should set queue mode to true', () => {
				mcpServerManager.setQueueMode(true);

				expect(mcpServerManager.isQueueMode).toBe(true);
			});

			it('should set queue mode to false', () => {
				mcpServerManager.setQueueMode(true);
				mcpServerManager.setQueueMode(false);

				expect(mcpServerManager.isQueueMode).toBe(false);
			});
		});

		describe('storePendingResponse', () => {
			it('should store a pending response when transport exists', () => {
				mcpServerManager.transports[queueSessionId] = mockTransport;

				mcpServerManager.storePendingResponse(queueSessionId, queueMessageId);

				expect(mcpServerManager.hasPendingResponse(queueSessionId, queueMessageId)).toBe(true);
			});

			it('should not store pending response when transport does not exist', () => {
				mcpServerManager.storePendingResponse(queueSessionId, queueMessageId);

				expect(mcpServerManager.hasPendingResponse(queueSessionId, queueMessageId)).toBe(false);
			});

			it('should increment pending response count', () => {
				mcpServerManager.transports[queueSessionId] = mockTransport;
				const initialCount = mcpServerManager.pendingResponseCount;

				mcpServerManager.storePendingResponse(queueSessionId, queueMessageId);

				expect(mcpServerManager.pendingResponseCount).toBe(initialCount + 1);
			});
		});

		describe('removePendingResponse', () => {
			it('should remove a pending response', () => {
				mcpServerManager.transports[queueSessionId] = mockTransport;
				mcpServerManager.storePendingResponse(queueSessionId, queueMessageId);

				mcpServerManager.removePendingResponse(queueSessionId, queueMessageId);

				expect(mcpServerManager.hasPendingResponse(queueSessionId, queueMessageId)).toBe(false);
			});

			it('should handle removing non-existent response gracefully', () => {
				expect(() => {
					mcpServerManager.removePendingResponse('non-existent', 'non-existent');
				}).not.toThrow();
			});
		});

		describe('storePendingToolCall and resolveToolCall', () => {
			it('should store and resolve a pending tool call', async () => {
				const toolName = 'testTool';
				const toolArgs = { param: 'value' };
				const expectedResult = { result: 'success' };

				const resultPromise = mcpServerManager.storePendingToolCall(callId, toolName, toolArgs);

				// Resolve the tool call
				mcpServerManager.resolveToolCall(callId, expectedResult);

				const result = await resultPromise;
				expect(result).toEqual(expectedResult);
			});

			it('should get pending tool call info', async () => {
				const toolName = 'testTool';
				const toolArgs = { param: 'value' };

				// Start storing (this creates the pending tool call)
				void mcpServerManager.storePendingToolCall(callId, toolName, toolArgs);

				const pendingCall = mcpServerManager.getPendingToolCall(callId);

				expect(pendingCall).toBeDefined();
				expect(pendingCall?.toolName).toBe(toolName);
				expect(pendingCall?.arguments).toEqual(toolArgs);

				// Clean up by resolving
				mcpServerManager.resolveToolCall(callId, {});
			});

			it('should handle resolving non-existent tool call gracefully', () => {
				expect(() => {
					mcpServerManager.resolveToolCall('non-existent-call', { result: 'test' });
				}).not.toThrow();
			});
		});

		describe('rejectToolCall', () => {
			it('should reject a pending tool call with an error', async () => {
				const toolName = 'testTool';
				const toolArgs = { param: 'value' };
				const expectedError = new Error('Test error');

				const resultPromise = mcpServerManager.storePendingToolCall(callId, toolName, toolArgs);

				// Reject the tool call
				mcpServerManager.rejectToolCall(callId, expectedError);

				await expect(resultPromise).rejects.toThrow('Test error');
			});

			it('should handle rejecting non-existent tool call gracefully', () => {
				expect(() => {
					mcpServerManager.rejectToolCall('non-existent-call', new Error('Test'));
				}).not.toThrow();
			});
		});

		describe('handleWorkerResponse', () => {
			it('should resolve pending tool call with worker result', async () => {
				const toolName = 'testTool';
				const toolArgs = { param: 'value' };
				const workerResult = { output: 'worker response' };

				mcpServerManager.transports[queueSessionId] = mockTransport;
				mcpServerManager.storePendingResponse(queueSessionId, queueMessageId);

				const resultPromise = mcpServerManager.storePendingToolCall(callId, toolName, toolArgs);

				// Simulate worker response
				mcpServerManager.handleWorkerResponse(queueSessionId, queueMessageId, workerResult);

				const result = await resultPromise;
				expect(result).toEqual(workerResult);
			});

			it('should clean up pending response after handling', () => {
				mcpServerManager.transports[queueSessionId] = mockTransport;
				mcpServerManager.storePendingResponse(queueSessionId, queueMessageId);

				mcpServerManager.handleWorkerResponse(queueSessionId, queueMessageId, { result: 'test' });

				expect(mcpServerManager.hasPendingResponse(queueSessionId, queueMessageId)).toBe(false);
			});
		});

		describe('cleanupSessionPendingResponses', () => {
			it('should clean up all pending responses for a session', () => {
				mcpServerManager.transports[queueSessionId] = mockTransport;
				mcpServerManager.storePendingResponse(queueSessionId, 'msg1');
				mcpServerManager.storePendingResponse(queueSessionId, 'msg2');
				mcpServerManager.storePendingResponse(queueSessionId, 'msg3');

				mcpServerManager.cleanupSessionPendingResponses(queueSessionId);

				expect(mcpServerManager.hasPendingResponse(queueSessionId, 'msg1')).toBe(false);
				expect(mcpServerManager.hasPendingResponse(queueSessionId, 'msg2')).toBe(false);
				expect(mcpServerManager.hasPendingResponse(queueSessionId, 'msg3')).toBe(false);
			});

			it('should not affect pending responses from other sessions', () => {
				const otherSessionId = 'other-session-id';

				mcpServerManager.transports[queueSessionId] = mockTransport;
				mcpServerManager.transports[otherSessionId] = mockTransport;
				mcpServerManager.storePendingResponse(queueSessionId, 'msg1');
				mcpServerManager.storePendingResponse(otherSessionId, 'msg2');

				mcpServerManager.cleanupSessionPendingResponses(queueSessionId);

				expect(mcpServerManager.hasPendingResponse(queueSessionId, 'msg1')).toBe(false);
				expect(mcpServerManager.hasPendingResponse(otherSessionId, 'msg2')).toBe(true);
			});

			it('should handle cleaning up session with no pending responses gracefully', () => {
				expect(() => {
					mcpServerManager.cleanupSessionPendingResponses('non-existent-session');
				}).not.toThrow();
			});
		});

		describe('getMcpMetadata', () => {
			it('should return MCP metadata from request', () => {
				const metadataRequest = mock<Request>({
					query: { sessionId: queueSessionId },
				});
				metadataRequest.rawBody = Buffer.from(
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'tools/call',
						id: 123,
						params: { name: 'mockTool' },
					}),
				);

				const metadata = mcpServerManager.getMcpMetadata(metadataRequest);

				expect(metadata).toBeDefined();
				expect(metadata?.sessionId).toBe(queueSessionId);
				expect(metadata?.messageId).toBe('123');
			});

			it('should return undefined when no sessionId present', () => {
				const metadataRequest = mock<Request>();
				// Explicitly set empty query and headers to ensure getSessionId returns undefined
				Object.defineProperty(metadataRequest, 'query', { value: {}, writable: true });
				Object.defineProperty(metadataRequest, 'headers', { value: {}, writable: true });
				metadataRequest.rawBody = Buffer.from('{}');

				const metadata = mcpServerManager.getMcpMetadata(metadataRequest);

				expect(metadata).toBeUndefined();
			});

			it('should return empty messageId when message has no id', () => {
				const metadataRequest = mock<Request>({
					query: { sessionId: queueSessionId },
				});
				metadataRequest.rawBody = Buffer.from(
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'notifications/initialized',
					}),
				);

				const metadata = mcpServerManager.getMcpMetadata(metadataRequest);

				expect(metadata).toBeDefined();
				expect(metadata?.sessionId).toBe(queueSessionId);
				expect(metadata?.messageId).toBe('');
			});
		});

		describe('handleWorkerResponse with resolveFunctions', () => {
			it('should resolve handlePostMessage promise when resolveFunction exists', () => {
				const resolveFunction = jest.fn();
				// @ts-expect-error private property
				mcpServerManager.resolveFunctions[callId] = resolveFunction;

				mcpServerManager.transports[queueSessionId] = mockTransport;
				mcpServerManager.storePendingResponse(queueSessionId, queueMessageId);

				mcpServerManager.handleWorkerResponse(queueSessionId, queueMessageId, { result: 'test' });

				expect(resolveFunction).toHaveBeenCalled();
			});

			it('should handle response with empty messageId using sessionId as callId', () => {
				mcpServerManager.transports[queueSessionId] = mockTransport;
				mcpServerManager.storePendingResponse(queueSessionId, '');

				mcpServerManager.handleWorkerResponse(queueSessionId, '', { result: 'test' });

				expect(mcpServerManager.hasPendingResponse(queueSessionId, '')).toBe(false);
			});
		});

		describe('storePendingResponse with empty messageId', () => {
			it('should use sessionId as callId when messageId is empty', () => {
				mcpServerManager.transports[queueSessionId] = mockTransport;

				mcpServerManager.storePendingResponse(queueSessionId, '');

				expect(mcpServerManager.hasPendingResponse(queueSessionId, '')).toBe(true);
			});
		});

		describe('cleanupSessionPendingResponses with resolveFunctions', () => {
			it('should resolve pending resolveFunctions during cleanup', () => {
				const resolveFunction = jest.fn();
				const cleanupCallId = `${queueSessionId}_cleanup-msg`;
				// @ts-expect-error private property
				mcpServerManager.resolveFunctions[cleanupCallId] = resolveFunction;

				mcpServerManager.transports[queueSessionId] = mockTransport;
				mcpServerManager.storePendingResponse(queueSessionId, 'cleanup-msg');

				mcpServerManager.cleanupSessionPendingResponses(queueSessionId);

				expect(resolveFunction).toHaveBeenCalled();
			});
		});

		describe('SSE queue mode multi-main support', () => {
			const mockSseQueueTransport = mock<FlushingSSEServerTransport>({
				transportType: 'sse',
			});

			beforeEach(() => {
				mockSseQueueTransport.send.mockClear();
			});

			it('should return 202 when no local transport exists in queue mode for tool calls', async () => {
				mcpServerManager.setQueueMode(true);
				// No transport registered for this session

				const sseRequest = mock<Request>({
					query: { sessionId: queueSessionId },
				});
				sseRequest.rawBody = Buffer.from(
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'tools/call',
						id: 456,
						params: { name: 'mockTool', arguments: { param: 'value' } },
					}),
				);

				const result = await mcpServerManager.handlePostMessage(sseRequest, mockResponse, [
					mockTool,
				]);

				expect(mockResponse.status).toHaveBeenCalledWith(202);
				expect(mockResponse.send).toHaveBeenCalledWith('Accepted');
				expect(result.wasToolCall).toBe(true);
				expect(result.messageId).toBe('456');
				// Tool calls should NOT have relay info (they go through worker execution)
				expect(result.needsListToolsRelay).toBeFalsy();
				expect(result.relaySessionId).toBeUndefined();
			});

			it('should return 401 for initialize messages in queue mode with no local transport', async () => {
				mcpServerManager.setQueueMode(true);
				// No transport registered for this session

				const sseRequest = mock<Request>({
					query: { sessionId: queueSessionId },
				});
				// Initialize message requires the actual MCP server
				sseRequest.rawBody = Buffer.from(
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'initialize',
						id: 0,
						params: {
							protocolVersion: '2025-11-25',
							capabilities: {},
							clientInfo: { name: 'test-client', version: '1.0.0' },
						},
					}),
				);

				await mcpServerManager.handlePostMessage(sseRequest, mockResponse, [mockTool]);

				// Should return 401 because initialize needs the actual MCP server
				expect(mockResponse.status).toHaveBeenCalledWith(401);
				expect(mockResponse.send).toHaveBeenCalledWith('No transport found for sessionId');
			});

			it('should return 202 for tools/list requests in queue mode with no local transport', async () => {
				mcpServerManager.setQueueMode(true);
				// No transport registered for this session

				const sseRequest = mock<Request>({
					query: { sessionId: queueSessionId },
				});
				// tools/list can be forwarded via pub/sub
				sseRequest.rawBody = Buffer.from(
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'tools/list',
						id: 123,
						params: {},
					}),
				);

				const result = await mcpServerManager.handlePostMessage(sseRequest, mockResponse, [
					mockTool,
				]);

				expect(mockResponse.status).toHaveBeenCalledWith(202);
				expect(mockResponse.send).toHaveBeenCalledWith('Accepted');
				expect(result.wasToolCall).toBe(false);
				expect(result.messageId).toBe('123');
				// Should include relay info for CLI to publish mcp-response
				expect(result.needsListToolsRelay).toBe(true);
				expect(result.relaySessionId).toBe(queueSessionId);
			});

			it('should handle relayed list tools request and send tools list via SSE', () => {
				mcpServerManager.transports[queueSessionId] = mockSseQueueTransport;
				// Use empty tools array to avoid schema conversion issues in tests
				// @ts-expect-error private property
				mcpServerManager.tools[queueSessionId] = [];

				// Simulate receiving the list tools request marker from pub/sub
				mcpServerManager.handleWorkerResponse(queueSessionId, queueMessageId, {
					_listToolsRequest: true,
				});

				expect(mockSseQueueTransport.send).toHaveBeenCalledWith({
					jsonrpc: '2.0',
					id: queueMessageId,
					result: { tools: [] },
				});
			});

			it('should not return 202 when not in queue mode even if no local transport', async () => {
				mcpServerManager.setQueueMode(false);
				// No transport registered for this session

				const sseRequest = mock<Request>({
					query: { sessionId: queueSessionId },
				});
				sseRequest.rawBody = Buffer.from(
					JSON.stringify({
						jsonrpc: '2.0',
						method: 'tools/call',
						id: 789,
						params: { name: 'mockTool', arguments: {} },
					}),
				);

				await mcpServerManager.handlePostMessage(sseRequest, mockResponse, [mockTool]);

				expect(mockResponse.status).toHaveBeenCalledWith(401);
				expect(mockResponse.send).toHaveBeenCalledWith('No transport found for sessionId');
			});

			it('should send response directly via SSE transport when no pending tool call exists', () => {
				mcpServerManager.transports[queueSessionId] = mockSseQueueTransport;

				// No pending tool call - simulating POST was on different main
				mcpServerManager.handleWorkerResponse(queueSessionId, queueMessageId, {
					result: 'worker-result',
				});

				expect(mockSseQueueTransport.send).toHaveBeenCalledWith({
					jsonrpc: '2.0',
					id: queueMessageId,
					result: {
						content: [{ type: 'text', text: JSON.stringify({ result: 'worker-result' }) }],
					},
				});
			});

			it('should format string result correctly when sending directly via SSE transport', () => {
				mcpServerManager.transports[queueSessionId] = mockSseQueueTransport;

				mcpServerManager.handleWorkerResponse(queueSessionId, queueMessageId, 'string-result');

				expect(mockSseQueueTransport.send).toHaveBeenCalledWith({
					jsonrpc: '2.0',
					id: queueMessageId,
					result: {
						content: [{ type: 'text', text: 'string-result' }],
					},
				});
			});

			it('should not send via transport when messageId is empty', () => {
				mcpServerManager.transports[queueSessionId] = mockSseQueueTransport;

				// Empty messageId - should not send
				mcpServerManager.handleWorkerResponse(queueSessionId, '', { result: 'test' });

				expect(mockSseQueueTransport.send).not.toHaveBeenCalled();
			});
		});
	});

	describe('handlePostMessage tool call info extraction', () => {
		it('should extract sourceNodeName from tool metadata', async () => {
			mockTransport.handleRequest.mockImplementation(async () => {
				// @ts-expect-error private property `resolveFunctions`
				mcpServerManager.resolveFunctions[`${sessionId}_789`]();
			});

			mcpServerManager.transports[sessionId] = mockTransport;

			const toolWithMetadata = mock<Tool>({
				name: 'mockToolWithMeta',
				metadata: { sourceNodeName: 'MyToolNode' },
			});

			const mockToolCallRequest = mock<Request>({ query: { sessionId }, path: '/sse' });
			mockToolCallRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 789,
					params: { name: 'mockToolWithMeta', arguments: { param: 'value' } },
				}),
			);

			const result = await mcpServerManager.handlePostMessage(mockToolCallRequest, mockResponse, [
				toolWithMetadata,
			]);

			expect(result.wasToolCall).toBe(true);
			expect(result.toolCallInfo?.toolName).toBe('mockToolWithMeta');
			expect(result.toolCallInfo?.sourceNodeName).toBe('MyToolNode');
		});

		it('should not set sourceNodeName when tool has no metadata', async () => {
			mockTransport.handleRequest.mockImplementation(async () => {
				// @ts-expect-error private property `resolveFunctions`
				mcpServerManager.resolveFunctions[`${sessionId}_101`]();
			});

			mcpServerManager.transports[sessionId] = mockTransport;

			const toolWithoutMetadata = mock<Tool>({
				name: 'mockToolNoMeta',
				metadata: undefined,
			});

			const mockToolCallRequest = mock<Request>({ query: { sessionId }, path: '/sse' });
			mockToolCallRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 101,
					params: { name: 'mockToolNoMeta', arguments: { param: 'value' } },
				}),
			);

			const result = await mcpServerManager.handlePostMessage(mockToolCallRequest, mockResponse, [
				toolWithoutMetadata,
			]);

			expect(result.wasToolCall).toBe(true);
			expect(result.toolCallInfo?.toolName).toBe('mockToolNoMeta');
			expect(result.toolCallInfo?.sourceNodeName).toBeUndefined();
		});

		it('should return messageId in handlePostMessage result', async () => {
			mockTransport.handleRequest.mockImplementation(async () => {
				// @ts-expect-error private property `resolveFunctions`
				mcpServerManager.resolveFunctions[`${sessionId}_202`]();
			});

			mcpServerManager.transports[sessionId] = mockTransport;

			const mockToolCallRequest = mock<Request>({ query: { sessionId }, path: '/sse' });
			mockToolCallRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 202,
					params: { name: 'mockTool', arguments: {} },
				}),
			);

			const result = await mcpServerManager.handlePostMessage(mockToolCallRequest, mockResponse, [
				mockTool,
			]);

			expect(result.messageId).toBe('202');
		});
	});
});
