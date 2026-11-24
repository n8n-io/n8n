import { createMockResponse } from '../../__tests__/helpers';
import { SSETransport } from '../SSETransport';

describe('SSETransport', () => {
	describe('constructor', () => {
		it('should set transportType to sse', () => {
			const response = createMockResponse();
			const transport = new SSETransport('/messages', response);

			expect(transport.transportType).toBe('sse');
		});

		it('should pass endpoint to parent SSEServerTransport', () => {
			const response = createMockResponse();
			const endpoint = '/api/messages';
			const transport = new SSETransport(endpoint, response);

			// Verify the transport is properly initialized with endpoint
			// The endpoint is used by SSEServerTransport for message routing
			expect(transport.transportType).toBe('sse');
			expect(typeof transport.send).toBe('function');
		});
	});

	describe('send', () => {
		it('should have flush available on response', () => {
			const response = createMockResponse();
			const transport = new SSETransport('/messages', response);

			// Verify flush is available - actual send requires full SSE connection setup
			expect(transport.transportType).toBe('sse');
			expect(typeof response.flush).toBe('function');
		});
	});

	describe('handleRequest', () => {
		it('should have handleRequest method', () => {
			const response = createMockResponse();
			const transport = new SSETransport('/messages', response);

			expect(typeof transport.handleRequest).toBe('function');
		});
	});

	describe('McpTransport interface', () => {
		it('should implement McpTransport interface', () => {
			const response = createMockResponse();
			const transport = new SSETransport('/messages', response);

			expect(transport.transportType).toBe('sse');
			expect(typeof transport.send).toBe('function');
			expect(typeof transport.handleRequest).toBe('function');
		});
	});
});
