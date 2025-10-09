import { jest } from '@jest/globals';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { IncomingMessage, ServerResponse } from 'http';
import { mock } from 'jest-mock-extended';

import { FlushingSSEServerTransport, FlushingStreamableHTTPTransport } from '../FlushingTransport';
import type { CompressionResponse } from '../FlushingTransport';

describe('FlushingSSEServerTransport', () => {
	const mockResponse = mock<CompressionResponse>();
	let transport: FlushingSSEServerTransport;
	const endpoint = '/test/endpoint';

	beforeEach(() => {
		jest.resetAllMocks();
		mockResponse.status.mockReturnThis();
		transport = new FlushingSSEServerTransport(endpoint, mockResponse);
	});

	it('should call flush after sending a message', async () => {
		// Create a sample JSONRPC message
		const message: JSONRPCMessage = {
			jsonrpc: '2.0',
			id: '123',
			result: { success: true },
		};

		// Send a message through the transport
		await transport.start();
		await transport.send(message);

		expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
		});
		expect(mockResponse.write).toHaveBeenCalledWith(
			// @ts-expect-error `_sessionId` is private
			`event: endpoint\ndata: /test/endpoint?sessionId=${transport._sessionId}\n\n`,
		);
		expect(mockResponse.write).toHaveBeenCalledWith(
			`event: message\ndata: ${JSON.stringify(message)}\n\n`,
		);
		expect(mockResponse.flush).toHaveBeenCalled();
	});
});

describe('FlushingStreamableHTTPTransport', () => {
	const mockResponse = mock<CompressionResponse>();
	let transport: FlushingStreamableHTTPTransport;
	const options = {
		sessionIdGenerator: () => 'test-session-id',
		onsessioninitialized: jest.fn(),
	};

	beforeEach(() => {
		jest.resetAllMocks();
		mockResponse.status.mockReturnThis();

		// Mock the parent class methods before creating the instance
		jest.spyOn(StreamableHTTPServerTransport.prototype, 'send').mockResolvedValue();
		jest.spyOn(StreamableHTTPServerTransport.prototype, 'handleRequest').mockResolvedValue();

		transport = new FlushingStreamableHTTPTransport(options, mockResponse);
	});

	it('should call flush after sending a message', async () => {
		const message: JSONRPCMessage = {
			jsonrpc: '2.0',
			id: '123',
			result: { success: true },
		};

		await transport.send(message);

		expect(StreamableHTTPServerTransport.prototype.send).toHaveBeenCalledWith(message);
		expect(mockResponse.flush).toHaveBeenCalled();
	});

	it('should call flush after handling a request', async () => {
		const mockRequest = mock<IncomingMessage>();
		const mockServerResponse = mock<ServerResponse>();
		const parsedBody = { jsonrpc: '2.0', method: 'test', id: '123' };

		await transport.handleRequest(mockRequest, mockServerResponse, parsedBody);

		expect(StreamableHTTPServerTransport.prototype.handleRequest).toHaveBeenCalledWith(
			mockRequest,
			mockServerResponse,
			parsedBody,
		);
		expect(mockResponse.flush).toHaveBeenCalled();
	});

	it('should pass options correctly to parent constructor', () => {
		expect(transport).toBeInstanceOf(FlushingStreamableHTTPTransport);
		expect(transport).toBeInstanceOf(StreamableHTTPServerTransport);
		expect(typeof transport.send).toBe('function');
		expect(typeof transport.handleRequest).toBe('function');
	});
});
