import { jest } from '@jest/globals';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { mock } from 'jest-mock-extended';

import { FlushingSSEServerTransport } from '../FlushingSSEServerTransport';
import type { CompressionResponse } from '../FlushingSSEServerTransport';

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
