import { jest } from '@jest/globals';
import type { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Request } from 'express';
import { captor, mock } from 'jest-mock-extended';

import type { CompressionResponse } from '../FlushingSSEServerTransport';
import { FlushingSSEServerTransport } from '../FlushingSSEServerTransport';
import { McpServer } from '../McpServer';

const sessionId = 'mock-session-id';
const mockServer = mock<Server>();
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
	return {
		Server: jest.fn().mockImplementation(() => mockServer),
	};
});

const mockTransport = mock<FlushingSSEServerTransport>({ sessionId });
jest.mock('../FlushingSSEServerTransport', () => {
	return {
		FlushingSSEServerTransport: jest.fn().mockImplementation(() => mockTransport),
	};
});

describe('McpServer', () => {
	const mockRequest = mock<Request>({ query: { sessionId }, path: '/sse' });
	const mockResponse = mock<CompressionResponse>();
	const mockTool = mock<Tool>({ name: 'mockTool' });

	let mcpServer: McpServer;

	beforeEach(() => {
		jest.clearAllMocks();
		mockResponse.status.mockReturnThis();

		mcpServer = new McpServer(mock());
	});

	describe('connectTransport', () => {
		const postUrl = '/post-url';

		it('should set up a transport and server', async () => {
			await mcpServer.connectTransport(postUrl, mockResponse);

			// Check that FlushingSSEServerTransport was initialized with correct params
			expect(FlushingSSEServerTransport).toHaveBeenCalledWith(postUrl, mockResponse);

			// Check that Server was initialized
			expect(Server).toHaveBeenCalled();

			// Check that transport and server are stored
			expect(mcpServer.transports[sessionId]).toBeDefined();
			expect(mcpServer.servers[sessionId]).toBeDefined();

			// Check that connect was called on the server
			expect(mcpServer.servers[sessionId].connect).toHaveBeenCalled();

			// Check that flush was called if available
			expect(mockResponse.flush).toHaveBeenCalled();
		});

		it('should set up close handler that cleans up resources', async () => {
			await mcpServer.connectTransport(postUrl, mockResponse);

			// Get the close callback and execute it
			const closeCallbackCaptor = captor<() => Promise<void>>();
			expect(mockResponse.on).toHaveBeenCalledWith('close', closeCallbackCaptor);
			await closeCallbackCaptor.value();

			// Check that resources were cleaned up
			expect(mcpServer.transports[sessionId]).toBeUndefined();
			expect(mcpServer.servers[sessionId]).toBeUndefined();
		});
	});

	describe('handlePostMessage', () => {
		it('should call transport.handlePostMessage when transport exists', async () => {
			mockTransport.handlePostMessage.mockImplementation(async () => {
				// @ts-expect-error private property `resolveFunctions`
				mcpServer.resolveFunctions[sessionId]();
			});

			// Add the transport directly
			mcpServer.transports[sessionId] = mockTransport;

			mockRequest.rawBody = Buffer.from(
				JSON.stringify({
					jsonrpc: '2.0',
					method: 'tools/call',
					id: 123,
					params: { name: 'mockTool' },
				}),
			);

			// Call the method
			const result = await mcpServer.handlePostMessage(mockRequest, mockResponse, [mockTool]);

			// Verify that transport's handlePostMessage was called
			expect(mockTransport.handlePostMessage).toHaveBeenCalledWith(
				mockRequest,
				mockResponse,
				expect.any(String),
			);

			// Verify that we check if it was a tool call
			expect(result).toBe(true);

			// Verify flush was called
			expect(mockResponse.flush).toHaveBeenCalled();
		});

		it('should return 401 when transport does not exist', async () => {
			// Call without setting up transport
			await mcpServer.handlePostMessage(mockRequest, mockResponse, [mockTool]);

			// Verify error status was set
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('No transport found'));
		});
	});
});
