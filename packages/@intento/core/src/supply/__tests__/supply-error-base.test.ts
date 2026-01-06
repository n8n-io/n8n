import { mock } from 'jest-mock-extended';
import type { IDataObject, INode, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { SupplyErrorBase } from '../supply-error-base';
import type { SupplyRequestBase } from '../supply-request-base';

/**
 * Tests for SupplyErrorBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-06
 */

// Concrete test implementation of abstract SupplyErrorBase
class TestError extends SupplyErrorBase {
	constructor(request: SupplyRequestBase, code: number, reason: string, isRetriable: boolean) {
		super(request, code, reason, isRetriable);
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			code: this.code,
			reason: this.reason,
			isRetriable: this.isRetriable,
			latencyMs: this.latencyMs,
		};
	}

	asDataObject(): IDataObject {
		return {
			requestId: this.requestId,
			error: this.reason,
			code: this.code,
			retriable: this.isRetriable,
		};
	}

	asError(node: INode): NodeOperationError {
		return new NodeOperationError(node, this.reason, {
			description: `Error code: ${this.code}`,
		});
	}
}

describe('SupplyErrorBase', () => {
	let mockRequest: SupplyRequestBase;
	let mockNode: INode;

	beforeEach(() => {
		mockRequest = mock<SupplyRequestBase>({
			requestId: 'test-request-uuid-123',
			requestedAt: 1000,
		});

		mockNode = {
			id: 'node-123',
			name: 'TestNode',
			type: 'n8n-nodes-base.test',
			typeVersion: 1,
			position: [100, 200],
			parameters: {},
		};

		jest.spyOn(Date, 'now').mockReturnValue(1100); // 100ms after request
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('[BL-01] should extract requestId from supply request', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestId', { value: 'custom-request-id-456', writable: true });

			// ACT
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ASSERT
			expect(error.requestId).toBe('custom-request-id-456');
		});

		it('[BL-02] should calculate latencyMs from request timestamp to current time', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestedAt', { value: 1000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(1100);

			// ACT
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ASSERT
			expect(error.latencyMs).toBe(100);
		});

		it('[BL-03] should assign code from constructor parameter', () => {
			// ARRANGE
			const code = 429;

			// ACT
			const error = new TestError(mockRequest, code, 'Rate limit', true);

			// ASSERT
			expect(error.code).toBe(429);
		});

		it('[BL-04] should assign reason from constructor parameter', () => {
			// ARRANGE
			const reason = 'Rate limit exceeded. Retry after 60 seconds.';

			// ACT
			const error = new TestError(mockRequest, 429, reason, true);

			// ASSERT
			expect(error.reason).toBe('Rate limit exceeded. Retry after 60 seconds.');
		});

		it('[BL-05] should assign isRetriable from constructor parameter', () => {
			// ARRANGE
			const isRetriable = true;

			// ACT
			const error = new TestError(mockRequest, 429, 'Rate limit', isRetriable);

			// ASSERT
			expect(error.isRetriable).toBe(true);
		});

		it('[BL-06] should implement ITraceable interface with requestId', () => {
			// ARRANGE & ACT
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ASSERT
			expect(error.requestId).toBeDefined();
			expect(typeof error.requestId).toBe('string');
		});

		it('[BL-07] should implement IDataProvider interface', () => {
			// ARRANGE & ACT
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ASSERT
			expect(error.asLogMetadata).toBeDefined();
			expect(error.asDataObject).toBeDefined();
			expect(typeof error.asLogMetadata).toBe('function');
			expect(typeof error.asDataObject).toBe('function');
		});

		it('[BL-08] should create error with all properties initialized', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestId', { value: 'req-123', writable: true });
			Object.defineProperty(mockRequest, 'requestedAt', { value: 2000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(2500);

			// ACT
			const error = new TestError(mockRequest, 400, 'Bad request', false);

			// ASSERT
			expect(error.requestId).toBe('req-123');
			expect(error.latencyMs).toBe(500);
			expect(error.code).toBe(400);
			expect(error.reason).toBe('Bad request');
			expect(error.isRetriable).toBe(false);
		});
	});

	describe('latency calculation', () => {
		it('[EC-01] should calculate zero latency when instantiated at same timestamp', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestedAt', { value: 5000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(5000);

			// ACT
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ASSERT
			expect(error.latencyMs).toBe(0);
		});

		it('[EC-02] should calculate latency for long-running request (large time diff)', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestedAt', { value: 1000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(61000); // 60 seconds later

			// ACT
			const error = new TestError(mockRequest, 504, 'Gateway timeout', true);

			// ASSERT
			expect(error.latencyMs).toBe(60000);
		});

		it('should calculate latency for normal request (100ms)', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestedAt', { value: 1000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(1100);

			// ACT
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ASSERT
			expect(error.latencyMs).toBe(100);
		});

		it('should calculate latency for high latency request (5 seconds)', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestedAt', { value: 1000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(6000);

			// ACT
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ASSERT
			expect(error.latencyMs).toBe(5000);
		});
	});

	describe('error codes and reasons', () => {
		it('[EC-03] should handle HTTP status codes (400, 500, etc.)', () => {
			// ARRANGE & ACT
			const error400 = new TestError(mockRequest, 400, 'Bad request', false);
			const error401 = new TestError(mockRequest, 401, 'Unauthorized', false);
			const error429 = new TestError(mockRequest, 429, 'Rate limit', true);
			const error500 = new TestError(mockRequest, 500, 'Server error', true);
			const error503 = new TestError(mockRequest, 503, 'Service unavailable', true);

			// ASSERT
			expect(error400.code).toBe(400);
			expect(error401.code).toBe(401);
			expect(error429.code).toBe(429);
			expect(error500.code).toBe(500);
			expect(error503.code).toBe(503);
		});

		it('[EC-04] should handle API-specific error codes (custom ranges)', () => {
			// ARRANGE & ACT
			const customError1 = new TestError(mockRequest, 9999, 'Custom error', false);
			const customError2 = new TestError(mockRequest, 1001, 'Provider error', true);

			// ASSERT
			expect(customError1.code).toBe(9999);
			expect(customError2.code).toBe(1001);
		});

		it('[EC-05] should handle empty reason string', () => {
			// ARRANGE & ACT
			const error = new TestError(mockRequest, 500, '', true);

			// ASSERT
			expect(error.reason).toBe('');
		});

		it('[EC-06] should handle long reason strings (verbose errors)', () => {
			// ARRANGE
			const longReason = 'A'.repeat(1000);

			// ACT
			const error = new TestError(mockRequest, 500, longReason, true);

			// ASSERT
			expect(error.reason).toBe(longReason);
			expect(error.reason.length).toBe(1000);
		});
	});

	describe('retry flag', () => {
		it('[EC-12] should handle isRetriable true (transient errors)', () => {
			// ARRANGE & ACT
			const rateLimitError = new TestError(mockRequest, 429, 'Rate limit exceeded', true);
			const serverError = new TestError(mockRequest, 500, 'Internal server error', true);

			// ASSERT
			expect(rateLimitError.isRetriable).toBe(true);
			expect(serverError.isRetriable).toBe(true);
		});

		it('[EC-13] should handle isRetriable false (permanent errors)', () => {
			// ARRANGE & ACT
			const authError = new TestError(mockRequest, 401, 'Invalid API key', false);
			const badRequestError = new TestError(mockRequest, 400, 'Invalid input', false);

			// ASSERT
			expect(authError.isRetriable).toBe(false);
			expect(badRequestError.isRetriable).toBe(false);
		});
	});

	describe('immutability', () => {
		it('[EC-07] should declare properties as readonly', () => {
			// ARRANGE
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ASSERT
			// NOTE: TypeScript enforces readonly at compile-time
			// Properties are assigned once in constructor and not meant to be modified
			expect(error.requestId).toBe('test-request-uuid-123');
			expect(error.latencyMs).toBe(100);
			expect(error.code).toBe(500);
			expect(error.reason).toBe('Server error');
			expect(error.isRetriable).toBe(true);
		});
	});

	describe('abstract method contracts', () => {
		it('[EH-01] should require concrete implementation of asLogMetadata', () => {
			// ARRANGE
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ACT
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata).toBeDefined();
			expect(metadata.requestId).toBe('test-request-uuid-123');
			expect(metadata.code).toBe(500);
			expect(metadata.reason).toBe('Server error');
			expect(metadata.isRetriable).toBe(true);
			expect(metadata.latencyMs).toBe(100);
		});

		it('[EH-02] should require concrete implementation of asDataObject', () => {
			// ARRANGE
			const error = new TestError(mockRequest, 429, 'Rate limit', true);

			// ACT
			const dataObject = error.asDataObject();

			// ASSERT
			expect(dataObject).toBeDefined();
			expect(dataObject.requestId).toBe('test-request-uuid-123');
			expect(dataObject.error).toBe('Rate limit');
			expect(dataObject.code).toBe(429);
			expect(dataObject.retriable).toBe(true);
		});

		it('[EH-03] should require concrete implementation of asError', () => {
			// ARRANGE
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ACT
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError).toBeInstanceOf(NodeOperationError);
			expect(nodeError.message).toBe('Server error');
			expect(nodeError.node).toBe(mockNode);
			expect(nodeError.description).toBe('Error code: 500');
		});
	});

	describe('concrete implementation', () => {
		it('should produce complete log metadata with all required fields', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestId', { value: 'log-test-123', writable: true });
			Object.defineProperty(mockRequest, 'requestedAt', { value: 5000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(5250);

			// ACT
			const error = new TestError(mockRequest, 429, 'Rate limit exceeded', true);
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				requestId: 'log-test-123',
				code: 429,
				reason: 'Rate limit exceeded',
				isRetriable: true,
				latencyMs: 250,
			});
		});

		it('should produce user-facing data object for workflow data', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestId', { value: 'data-test-456', writable: true });

			// ACT
			const error = new TestError(mockRequest, 401, 'Invalid API key', false);
			const dataObject = error.asDataObject();

			// ASSERT
			expect(dataObject).toEqual({
				requestId: 'data-test-456',
				error: 'Invalid API key',
				code: 401,
				retriable: false,
			});
		});

		it('should produce NodeOperationError with actionable message', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestId', { value: 'error-test-789', writable: true });

			// ACT
			const error = new TestError(mockRequest, 503, 'Service unavailable', true);
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError).toBeInstanceOf(NodeOperationError);
			expect(nodeError.message).toBe('Service unavailable');
			expect(nodeError.description).toBe('Error code: 503');
			expect(nodeError.node).toBe(mockNode);
			expect(nodeError.node.name).toBe('TestNode');
		});

		it('should handle error with all edge case values', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestId', { value: 'edge-case-test', writable: true });
			Object.defineProperty(mockRequest, 'requestedAt', { value: 0, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(0);

			// ACT
			const error = new TestError(mockRequest, 0, '', false);

			// ASSERT
			expect(error.requestId).toBe('edge-case-test');
			expect(error.latencyMs).toBe(0);
			expect(error.code).toBe(0);
			expect(error.reason).toBe('');
			expect(error.isRetriable).toBe(false);
		});

		it('should maintain property values across method calls', () => {
			// ARRANGE
			const error = new TestError(mockRequest, 500, 'Server error', true);

			// ACT
			const metadata1 = error.asLogMetadata();
			const metadata2 = error.asLogMetadata();
			const dataObject1 = error.asDataObject();
			const dataObject2 = error.asDataObject();

			// ASSERT
			expect(metadata1).toEqual(metadata2);
			expect(dataObject1).toEqual(dataObject2);
			expect(error.requestId).toBe('test-request-uuid-123');
			expect(error.latencyMs).toBe(100);
		});
	});

	describe('integration scenarios', () => {
		it('should handle HTTP 429 rate limit error with retry flag', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestedAt', { value: 1000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(1250);

			// ACT
			const error = new TestError(mockRequest, 429, 'Rate limit exceeded. Retry after 60 seconds.', true);

			// ASSERT
			expect(error.code).toBe(429);
			expect(error.reason).toContain('Rate limit');
			expect(error.isRetriable).toBe(true);
			expect(error.latencyMs).toBe(250);
			expect(error.asLogMetadata()).toMatchObject({
				code: 429,
				isRetriable: true,
			});
		});

		it('should handle HTTP 401 authentication error without retry', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestedAt', { value: 2000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(2100);

			// ACT
			const error = new TestError(mockRequest, 401, 'Invalid API key provided.', false);

			// ASSERT
			expect(error.code).toBe(401);
			expect(error.reason).toContain('Invalid API key');
			expect(error.isRetriable).toBe(false);
			expect(error.latencyMs).toBe(100);
			expect(error.asDataObject()).toMatchObject({
				code: 401,
				retriable: false,
			});
		});

		it('should handle HTTP 500 server error with high latency', () => {
			// ARRANGE
			Object.defineProperty(mockRequest, 'requestedAt', { value: 1000, writable: true });
			jest.spyOn(Date, 'now').mockReturnValue(31000); // 30 seconds

			// ACT
			const error = new TestError(mockRequest, 500, 'Internal server error. Please try again later.', true);
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(error.code).toBe(500);
			expect(error.latencyMs).toBe(30000);
			expect(error.isRetriable).toBe(true);
			expect(nodeError).toBeInstanceOf(NodeOperationError);
			expect(nodeError.message).toContain('Internal server error');
		});
	});
});
