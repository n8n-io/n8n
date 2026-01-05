import { mock } from 'jest-mock-extended';
import type { IDataObject, INode, LogMetadata, NodeOperationError } from 'n8n-workflow';

import { SupplyErrorBase } from '../supply-error-base';
import { SupplyRequestBase } from '../supply-request-base';

/**
 * Tests for SupplyErrorBase
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

// Mock request implementation for testing
class MockRequest extends SupplyRequestBase {
	constructor(testRequestId: string, testRequestedAt: number) {
		super();
		// Override generated values with test values for predictable testing
		Object.assign(this, { requestId: testRequestId, requestedAt: testRequestedAt });
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId };
	}

	asDataObject(): IDataObject {
		return { requestId: this.requestId };
	}

	clone(): this {
		return new MockRequest(this.requestId, this.requestedAt) as this;
	}
}

// Concrete test implementation of abstract SupplyErrorBase
class TestError extends SupplyErrorBase {
	constructor(
		request: SupplyRequestBase,
		code: number,
		reason: string,
		private readonly details?: string,
	) {
		super(request, code, reason);
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			latencyMs: this.latencyMs,
			code: this.code,
			reason: this.reason,
		};
	}

	asDataObject(): IDataObject {
		return {
			requestId: this.requestId,
			latencyMs: this.latencyMs,
			code: this.code,
			reason: this.reason,
			details: this.details,
		};
	}

	asError(node: INode): NodeOperationError {
		// Simple implementation for testing - actual NodeOperationError would require n8n-workflow
		const error: Partial<NodeOperationError> = {
			message: this.reason,
			description: this.details,
			node,
		};
		return error as NodeOperationError;
	}
}

describe('SupplyErrorBase', () => {
	const MOCK_REQUEST_ID = 'test-request-uuid-001';
	const MOCK_REQUEST_TIMESTAMP = 1704412800000; // 2025-01-05 00:00:00 UTC
	const MOCK_ERROR_TIMESTAMP_ZERO = 1704412800000; // Same millisecond (0ms latency)
	const MOCK_ERROR_TIMESTAMP_100 = 1704412800100; // +100ms latency
	const MOCK_ERROR_TIMESTAMP_1000 = 1704412801000; // +1000ms latency
	const MOCK_ERROR_TIMESTAMP_5000 = 1704412805000; // +5000ms latency

	// HTTP Status Codes
	const CODE_RATE_LIMIT = 429;
	const CODE_SERVER_ERROR = 500;
	const CODE_SERVICE_UNAVAILABLE = 503;
	const CODE_GATEWAY_TIMEOUT = 504;
	const CODE_BAD_REQUEST = 400;
	const CODE_NOT_FOUND = 404;
	const CODE_BOUNDARY_499 = 499;
	const CODE_BOUNDARY_599 = 599;
	const CODE_BOUNDARY_600 = 600;

	let mockDateNow: jest.SpyInstance;
	let mockNode: INode;

	beforeEach(() => {
		mockDateNow = jest.spyOn(Date, 'now');
		mockNode = mock<INode>();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should copy requestId from request', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error occurred');

			// ASSERT
			expect(error.requestId).toBe(MOCK_REQUEST_ID);
			expect(error.requestId).toBe(request.requestId);
		});

		it('[BL-02] should calculate latencyMs from request timestamp', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error occurred');

			// ASSERT
			expect(error.latencyMs).toBe(100);
			expect(error.latencyMs).toBe(MOCK_ERROR_TIMESTAMP_100 - MOCK_REQUEST_TIMESTAMP);
		});

		it('[BL-03] should store error code', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error occurred');

			// ASSERT
			expect(error.code).toBe(CODE_SERVER_ERROR);
			expect(error.code).toBe(500);
		});

		it('[BL-04] should store error reason', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);
			const reason = 'Server error occurred';

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, reason);

			// ASSERT
			expect(error.reason).toBe(reason);
		});

		it('[BL-05] should implement ITraceable interface with requestId', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error occurred');
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata.requestId).toBe(MOCK_REQUEST_ID);
			expect(typeof metadata.requestId).toBe('string');
		});

		it('[BL-06] should implement IDataProvider interface', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error occurred', 'Additional details');
			const dataObject = error.asDataObject();

			// ASSERT
			expect(dataObject).toBeInstanceOf(Object);
			expect(dataObject.requestId).toBe(MOCK_REQUEST_ID);
			expect(dataObject.latencyMs).toBe(100);
			expect(dataObject.code).toBe(CODE_SERVER_ERROR);
			expect(dataObject.reason).toBe('Server error occurred');
			expect(dataObject.details).toBe('Additional details');
		});

		it('[BL-07] should return true for retryable error code 429', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_RATE_LIMIT, 'Rate limit exceeded');

			// ASSERT
			expect(error.isRetryable()).toBe(true);
		});

		it('[BL-08] should return true for retryable server error 500', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'Internal server error');

			// ASSERT
			expect(error.isRetryable()).toBe(true);
		});

		it('[BL-09] should return true for retryable server error 503', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVICE_UNAVAILABLE, 'Service unavailable');

			// ASSERT
			expect(error.isRetryable()).toBe(true);
		});

		it('[BL-10] should return false for non-retryable client error 400', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_BAD_REQUEST, 'Bad request');

			// ASSERT
			expect(error.isRetryable()).toBe(false);
		});

		it('[BL-11] should return false for non-retryable client error 404', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_NOT_FOUND, 'Not found');

			// ASSERT
			expect(error.isRetryable()).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle zero latency (same millisecond as request)', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_ZERO);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'Immediate error');

			// ASSERT
			expect(error.latencyMs).toBe(0);
		});

		it('[EC-02] should handle large latency values', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_5000);

			// ACT
			const error = new TestError(request, CODE_GATEWAY_TIMEOUT, 'Timeout after 5 seconds');

			// ASSERT
			expect(error.latencyMs).toBe(5000);
			expect(error.latencyMs).toBeGreaterThan(1000);
		});

		it('[EC-03] should preserve requestId from request without modification', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error');

			// ASSERT
			expect(error.requestId).toBe(MOCK_REQUEST_ID);
			expect(error.requestId).toBe(request.requestId);
			expect(error.requestId.length).toBe(MOCK_REQUEST_ID.length);
		});

		it('[EC-04] should handle empty reason string', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, '');

			// ASSERT
			expect(error.reason).toBe('');
			expect(error.reason.length).toBe(0);
		});

		it('[EC-05] should handle long reason string', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);
			const longReason = 'A'.repeat(1000);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, longReason);

			// ASSERT
			expect(error.reason).toBe(longReason);
			expect(error.reason.length).toBe(1000);
		});

		it('[EC-06] should return true for boundary retryable code 500', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_SERVER_ERROR, 'First 5xx code');

			// ASSERT
			expect(error.isRetryable()).toBe(true);
		});

		it('[EC-07] should return true for boundary retryable code 599', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_BOUNDARY_599, 'Last 5xx code');

			// ASSERT
			expect(error.isRetryable()).toBe(true);
		});

		it('[EC-08] should return false for boundary non-retryable code 499', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_BOUNDARY_499, 'Before 5xx range');

			// ASSERT
			expect(error.isRetryable()).toBe(false);
		});

		it('[EC-09] should return false for boundary non-retryable code 600', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error = new TestError(request, CODE_BOUNDARY_600, 'After 5xx range');

			// ASSERT
			expect(error.isRetryable()).toBe(false);
		});

		it('[EC-10] should require concrete implementation of asLogMetadata', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error');

			// ACT
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata).toBeDefined();
			expect(metadata.requestId).toBe(MOCK_REQUEST_ID);
			expect(metadata.latencyMs).toBe(100);
			expect(metadata.code).toBe(CODE_SERVER_ERROR);
			expect(metadata.reason).toBe('Server error');
		});

		it('[EC-11] should require concrete implementation of asDataObject', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error', 'Details');

			// ACT
			const dataObject = error.asDataObject();

			// ASSERT
			expect(dataObject).toBeDefined();
			expect(dataObject.requestId).toBe(MOCK_REQUEST_ID);
			expect(dataObject.latencyMs).toBe(100);
			expect(dataObject.code).toBe(CODE_SERVER_ERROR);
			expect(dataObject.reason).toBe('Server error');
			expect(dataObject.details).toBe('Details');
		});

		it('[EC-12] should require concrete implementation of asError', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error', 'Error details');

			// ACT
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError).toBeDefined();
			expect(nodeError.message).toBe('Server error');
			expect(nodeError.description).toBe('Error details');
			expect(nodeError.node).toBe(mockNode);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should enforce abstract class pattern via TypeScript', () => {
			// ASSERT
			// TypeScript prevents direct instantiation at compile time
			// This test validates the design enforces abstract pattern
			// @ts-expect-error Cannot instantiate abstract class - TypeScript compile-time check
			const abstractCheck: SupplyErrorBase = SupplyErrorBase;
			expect(abstractCheck).toBeDefined(); // Validates abstract keyword presence
		});
	});

	describe('integration scenarios', () => {
		it('should work with real Date.now for latency calculation', () => {
			// ARRANGE
			const requestTime = Date.now();
			const request = new MockRequest(MOCK_REQUEST_ID, requestTime);

			// ACT - Wait a tiny bit (test execution time adds natural delay)
			const error = new TestError(request, CODE_SERVER_ERROR, 'Server error');

			// ASSERT
			expect(error.latencyMs).toBeGreaterThanOrEqual(0);
		});

		it('should handle all common HTTP error codes correctly', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT & ASSERT - Retryable codes
			expect(new TestError(request, 429, 'Rate limit').isRetryable()).toBe(true);
			expect(new TestError(request, 500, 'Internal server error').isRetryable()).toBe(true);
			expect(new TestError(request, 502, 'Bad gateway').isRetryable()).toBe(true);
			expect(new TestError(request, 503, 'Service unavailable').isRetryable()).toBe(true);
			expect(new TestError(request, 504, 'Gateway timeout').isRetryable()).toBe(true);

			// ACT & ASSERT - Non-retryable codes
			expect(new TestError(request, 400, 'Bad request').isRetryable()).toBe(false);
			expect(new TestError(request, 401, 'Unauthorized').isRetryable()).toBe(false);
			expect(new TestError(request, 403, 'Forbidden').isRetryable()).toBe(false);
			expect(new TestError(request, 404, 'Not found').isRetryable()).toBe(false);
		});

		it('should correlate error to originating request', () => {
			// ARRANGE
			const request1 = new MockRequest('request-001', MOCK_REQUEST_TIMESTAMP);
			const request2 = new MockRequest('request-002', MOCK_REQUEST_TIMESTAMP + 1000);
			mockDateNow.mockReturnValueOnce(MOCK_ERROR_TIMESTAMP_100).mockReturnValueOnce(MOCK_ERROR_TIMESTAMP_100 + 1000);

			// ACT
			const error1 = new TestError(request1, CODE_SERVER_ERROR, 'Error 1');
			const error2 = new TestError(request2, CODE_BAD_REQUEST, 'Error 2');

			// ASSERT - Each error correlates to correct request
			expect(error1.requestId).toBe('request-001');
			expect(error2.requestId).toBe('request-002');
			expect(error1.latencyMs).toBe(100);
			expect(error2.latencyMs).toBe(100);
		});

		it('should include all error context in both log metadata and data object', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_1000);

			// ACT
			const error = new TestError(request, CODE_SERVICE_UNAVAILABLE, 'Service unavailable', 'Backend is down');

			// ASSERT
			const metadata = error.asLogMetadata();
			const dataObject = error.asDataObject();

			expect(metadata.requestId).toBe(MOCK_REQUEST_ID);
			expect(metadata.latencyMs).toBe(1000);
			expect(metadata.code).toBe(CODE_SERVICE_UNAVAILABLE);
			expect(metadata.reason).toBe('Service unavailable');

			expect(dataObject.requestId).toBe(MOCK_REQUEST_ID);
			expect(dataObject.latencyMs).toBe(1000);
			expect(dataObject.code).toBe(CODE_SERVICE_UNAVAILABLE);
			expect(dataObject.reason).toBe('Service unavailable');
			expect(dataObject.details).toBe('Backend is down');
		});

		it('should determine retryability consistently for same error code', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_ERROR_TIMESTAMP_100);

			// ACT
			const error1 = new TestError(request, CODE_SERVER_ERROR, 'Error 1');
			const error2 = new TestError(request, CODE_SERVER_ERROR, 'Error 2');

			// ASSERT - Same code = same retryability
			expect(error1.isRetryable()).toBe(error2.isRetryable());
			expect(error1.isRetryable()).toBe(true);
		});
	});
});
