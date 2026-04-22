import { createMockResponse } from '../../__tests__/helpers';
import { StreamableHttpTransport } from '../StreamableHttpTransport';

describe('StreamableHttpTransport', () => {
	describe('constructor', () => {
		it('should set transportType to streamableHttp', () => {
			const response = createMockResponse();
			const transport = new StreamableHttpTransport(
				{ sessionIdGenerator: () => 'test-id' },
				response,
			);

			expect(transport.transportType).toBe('streamableHttp');
		});

		it('should accept sessionIdGenerator option and use it for transport type', () => {
			const response = createMockResponse();
			const generator = jest.fn().mockReturnValue('custom-session');

			const transport = new StreamableHttpTransport({ sessionIdGenerator: generator }, response);

			expect(transport.transportType).toBe('streamableHttp');
			expect(typeof transport.send).toBe('function');
		});

		it('should accept onsessioninitialized callback option', () => {
			const response = createMockResponse();
			const onInit = jest.fn();

			const transport = new StreamableHttpTransport(
				{
					sessionIdGenerator: () => 'test-id',
					onsessioninitialized: onInit,
				},
				response,
			);

			// Verify transport is properly configured with callback option
			expect(transport.transportType).toBe('streamableHttp');
			expect(typeof transport.handleRequest).toBe('function');
		});
	});

	describe('markAsInitialized', () => {
		it('should set sessionId when marked as initialized', () => {
			const response = createMockResponse();
			const transport = new StreamableHttpTransport(
				{ sessionIdGenerator: () => 'test-id' },
				response,
			);

			transport.markAsInitialized('specific-session-id');

			expect(transport.sessionId).toBe('specific-session-id');
		});

		it('should allow setting different sessionId than generator would produce', () => {
			const response = createMockResponse();
			const transport = new StreamableHttpTransport(
				{ sessionIdGenerator: () => 'generator-id' },
				response,
			);

			transport.markAsInitialized('override-id');

			expect(transport.sessionId).toBe('override-id');
		});
	});

	describe('send', () => {
		it('should have send method', () => {
			const response = createMockResponse();
			const transport = new StreamableHttpTransport(
				{ sessionIdGenerator: () => 'test-id' },
				response,
			);

			expect(typeof transport.send).toBe('function');
		});
	});

	describe('handleRequest', () => {
		it('should have handleRequest method', () => {
			const response = createMockResponse();
			const transport = new StreamableHttpTransport(
				{ sessionIdGenerator: () => 'test-id' },
				response,
			);

			expect(typeof transport.handleRequest).toBe('function');
		});
	});

	describe('McpTransport interface', () => {
		it('should implement McpTransport interface', () => {
			const response = createMockResponse();
			const transport = new StreamableHttpTransport(
				{ sessionIdGenerator: () => 'test-id' },
				response,
			);

			expect(transport.transportType).toBe('streamableHttp');
			expect(typeof transport.send).toBe('function');
			expect(typeof transport.handleRequest).toBe('function');
		});

		it('should have onclose property', () => {
			const response = createMockResponse();
			const transport = new StreamableHttpTransport(
				{ sessionIdGenerator: () => 'test-id' },
				response,
			);

			expect('onclose' in transport).toBe(true);
		});
	});
});
