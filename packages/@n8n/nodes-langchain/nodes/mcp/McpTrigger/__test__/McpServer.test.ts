import { jest } from '@jest/globals';
import type { Tool } from '@langchain/core/tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Request } from 'express';
import { captor, mock } from 'jest-mock-extended';

import type { CompressionResponse } from '../FlushingSSEServerTransport';
import { FlushingSSEServerTransport } from '../FlushingSSEServerTransport';
import { McpServerManager } from '../McpServer';

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

	const mcpServerManager = McpServerManager.instance(mock());

	beforeEach(() => {
		jest.clearAllMocks();
		mockResponse.status.mockReturnThis();
	});

	describe('connectTransport', () => {
		const postUrl = '/post-url';

		it('should set up a transport and server', async () => {
			await mcpServerManager.createServerAndTransport('mcpServer', postUrl, mockResponse);

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
			await mcpServerManager.createServerAndTransport('mcpServer', postUrl, mockResponse);

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
		it('should call transport.handlePostMessage when transport exists', async () => {
			mockTransport.handlePostMessage.mockImplementation(async () => {
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

		it('should handle multiple tool calls with different ids', async () => {
			const firstId = 123;
			const secondId = 456;

			mockTransport.handlePostMessage.mockImplementation(async () => {
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
			expect(mockTransport.handlePostMessage).toHaveBeenCalledWith(
				mockRequest,
				mockResponse,
				expect.any(String),
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

			// Verify transport's handlePostMessage was called twice
			expect(mockTransport.handlePostMessage).toHaveBeenCalledTimes(2);

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
});
