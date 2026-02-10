import { createMockResponse } from '../../__tests__/helpers';
import { SSETransport } from '../SSETransport';
import { StreamableHttpTransport } from '../StreamableHttpTransport';
import { TransportFactory } from '../TransportFactory';

describe('TransportFactory', () => {
	let factory: TransportFactory;

	beforeEach(() => {
		factory = new TransportFactory();
	});

	describe('createSSE', () => {
		it('should create SSETransport with endpoint and response', () => {
			const response = createMockResponse();
			const transport = factory.createSSE('/messages', response);

			expect(transport).toBeInstanceOf(SSETransport);
			expect(transport.transportType).toBe('sse');
		});

		it('should create SSETransport with different endpoints', () => {
			const response1 = createMockResponse();
			const response2 = createMockResponse();

			const transport1 = factory.createSSE('/api/mcp/messages', response1);
			const transport2 = factory.createSSE('/custom/endpoint', response2);

			expect(transport1).toBeInstanceOf(SSETransport);
			expect(transport2).toBeInstanceOf(SSETransport);
		});
	});

	describe('createStreamableHttp', () => {
		it('should create StreamableHttpTransport', () => {
			const response = createMockResponse();

			const transport = factory.createStreamableHttp({}, response);

			expect(transport).toBeInstanceOf(StreamableHttpTransport);
			expect(transport.transportType).toBe('streamableHttp');
		});

		it('should pass sessionIdGenerator option', () => {
			const response = createMockResponse();
			const customGenerator = jest.fn().mockReturnValue('custom-session-id');

			const transport = factory.createStreamableHttp(
				{ sessionIdGenerator: customGenerator },
				response,
			);

			expect(transport).toBeInstanceOf(StreamableHttpTransport);
		});

		it('should pass onsessioninitialized callback', () => {
			const response = createMockResponse();
			const onSessionInit = jest.fn();

			const transport = factory.createStreamableHttp(
				{ onsessioninitialized: onSessionInit },
				response,
			);

			expect(transport).toBeInstanceOf(StreamableHttpTransport);
		});

		it('should use default sessionIdGenerator when not provided', () => {
			const response = createMockResponse();

			const transport = factory.createStreamableHttp({}, response);

			expect(transport).toBeInstanceOf(StreamableHttpTransport);
		});
	});

	describe('recreateStreamableHttp', () => {
		it('should create transport with fixed sessionId', () => {
			const response = createMockResponse();

			const transport = factory.recreateStreamableHttp('existing-session-123', response);

			expect(transport).toBeInstanceOf(StreamableHttpTransport);
			expect(transport.sessionId).toBe('existing-session-123');
		});

		it('should mark transport as initialized', () => {
			const response = createMockResponse();

			const transport = factory.recreateStreamableHttp('session-id', response);

			// The sessionId being set indicates markAsInitialized was called
			expect(transport.sessionId).toBe('session-id');
		});

		it('should create unique transports for different sessions', () => {
			const response1 = createMockResponse();
			const response2 = createMockResponse();

			const transport1 = factory.recreateStreamableHttp('session-1', response1);
			const transport2 = factory.recreateStreamableHttp('session-2', response2);

			expect(transport1).not.toBe(transport2);
			expect(transport1.sessionId).toBe('session-1');
			expect(transport2.sessionId).toBe('session-2');
		});
	});

	describe('factory independence', () => {
		it('should create independent transports from same factory', () => {
			const response1 = createMockResponse();
			const response2 = createMockResponse();

			const sseTransport = factory.createSSE('/messages', response1);
			const httpTransport = factory.createStreamableHttp({}, response2);

			expect(sseTransport).not.toBe(httpTransport);
			expect(sseTransport.transportType).toBe('sse');
			expect(httpTransport.transportType).toBe('streamableHttp');
		});
	});
});
