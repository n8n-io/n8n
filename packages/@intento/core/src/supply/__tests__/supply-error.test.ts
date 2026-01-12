import type { INode } from 'n8n-workflow';

import { SupplyError } from '../supply-error';
import type { SupplyRequestBase } from '../supply-request-base';

/**
 * Tests for SupplyError
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */
describe('SupplyError', () => {
	let mockRequest: SupplyRequestBase;
	let mockNode: INode;
	let dateNowSpy: jest.SpyInstance;

	beforeEach(() => {
		dateNowSpy = jest.spyOn(Date, 'now');

		mockRequest = {
			requestId: 'test-request-id-123',
			requestedAt: 1000000000000,
		} as SupplyRequestBase;

		mockNode = {
			id: 'node-123',
			name: 'Test Node',
			type: 'n8n-nodes-base.testNode',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode;
	});

	afterEach(() => {
		jest.clearAllMocks();
		dateNowSpy.mockRestore();
	});

	describe('business logic', () => {
		it('[BL-01] should create error with request ID from request', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001500);

			// ACT
			const error = new SupplyError(mockRequest, 500, 'Internal Server Error', false);

			// ASSERT
			expect(error.requestId).toBe('test-request-id-123');
		});

		it('[BL-02] should calculate latency from request to error', () => {
			// ARRANGE - Request at 1000000000000, error at 1000000001500 (1500ms later)
			dateNowSpy.mockReturnValue(1000000001500);

			// ACT
			const error = new SupplyError(mockRequest, 500, 'Internal Server Error', false);

			// ASSERT
			expect(error.latencyMs).toBe(1500);
		});

		it('[BL-03] should store error code and reason', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const error = new SupplyError(mockRequest, 404, 'Resource not found', false);

			// ASSERT
			expect(error.code).toBe(404);
			expect(error.reason).toBe('Resource not found');
		});

		it('[BL-04] should store retriable flag', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const retriableError = new SupplyError(mockRequest, 503, 'Service Unavailable', true);
			const nonRetriableError = new SupplyError(mockRequest, 400, 'Bad Request', false);

			// ASSERT
			expect(retriableError.isRetriable).toBe(true);
			expect(nonRetriableError.isRetriable).toBe(false);
		});

		it('[BL-05] should return log metadata with all error details', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000002000);

			// ACT
			const error = new SupplyError(mockRequest, 429, 'Rate limit exceeded', true);
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				requestId: 'test-request-id-123',
				code: 429,
				reason: 'Rate limit exceeded',
				isRetriable: true,
				latencyMs: 2000,
			});
		});

		it('[BL-06] should return data object without requestId', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000003500);

			// ACT
			const error = new SupplyError(mockRequest, 500, 'Internal Error', false);
			const dataObject = error.asDataObject();

			// ASSERT
			expect(dataObject).toEqual({
				code: 500,
				reason: 'Internal Error',
				latencyMs: 3500,
			});
			expect(dataObject).not.toHaveProperty('requestId');
			expect(dataObject).not.toHaveProperty('isRetriable');
		});

		it('[BL-07] should convert to NodeOperationError with reason', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);
			const error = new SupplyError(mockRequest, 500, 'Database connection failed', false);

			// ACT
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError).toBeDefined();
			expect(nodeError.message).toContain('Database connection failed');
			expect(nodeError.node).toBe(mockNode);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle zero latency when error occurs immediately', () => {
			// ARRANGE - Same timestamp for request and error
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const error = new SupplyError(mockRequest, 400, 'Immediate error', false);

			// ASSERT
			expect(error.latencyMs).toBe(0);
		});

		it('[EC-02] should handle large latency values', () => {
			// ARRANGE - 48 hours later (172800000 ms)
			const twoDaysLater = mockRequest.requestedAt + 172800000;
			dateNowSpy.mockReturnValue(twoDaysLater);

			// ACT
			const error = new SupplyError(mockRequest, 504, 'Gateway Timeout', true);

			// ASSERT
			expect(error.latencyMs).toBe(172800000);
		});

		it('[EC-03] should handle HTTP status error codes (4xx, 5xx)', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const error400 = new SupplyError(mockRequest, 400, 'Bad Request', false);
			const error401 = new SupplyError(mockRequest, 401, 'Unauthorized', false);
			const error404 = new SupplyError(mockRequest, 404, 'Not Found', false);
			const error500 = new SupplyError(mockRequest, 500, 'Internal Error', true);
			const error503 = new SupplyError(mockRequest, 503, 'Service Unavailable', true);

			// ASSERT
			expect(error400.code).toBe(400);
			expect(error401.code).toBe(401);
			expect(error404.code).toBe(404);
			expect(error500.code).toBe(500);
			expect(error503.code).toBe(503);
		});

		it('[EC-04] should handle custom error codes', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const customError1 = new SupplyError(mockRequest, 1001, 'Custom validation error', false);
			const customError2 = new SupplyError(mockRequest, 9999, 'Custom system error', true);

			// ASSERT
			expect(customError1.code).toBe(1001);
			expect(customError2.code).toBe(9999);
		});

		it('[EC-05] should handle very long error reasons', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);
			const longReason = 'A'.repeat(1000);

			// ACT
			const error = new SupplyError(mockRequest, 500, longReason, false);

			// ASSERT
			expect(error.reason).toBe(longReason);
			expect(error.reason.length).toBe(1000);
		});

		it('[EC-06] should implement ITraceable interface correctly', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const error = new SupplyError(mockRequest, 500, 'Error', false);

			// ASSERT - Verify interface method exists and returns correct type
			expect(error.asLogMetadata).toBeDefined();
			expect(typeof error.asLogMetadata).toBe('function');

			const metadata = error.asLogMetadata();
			expect(metadata).toHaveProperty('requestId');
			expect(metadata).toHaveProperty('latencyMs');
		});

		it('[EC-07] should implement IDataProvider interface correctly', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const error = new SupplyError(mockRequest, 500, 'Error', false);

			// ASSERT - Verify interface method exists and returns correct type
			expect(error.asDataObject).toBeDefined();
			expect(typeof error.asDataObject).toBe('function');

			const dataObject = error.asDataObject();
			expect(dataObject).toHaveProperty('code');
			expect(dataObject).toHaveProperty('reason');
			expect(dataObject).toHaveProperty('latencyMs');
		});

		it('[EC-08] should create retriable and non-retriable errors', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT - Common retriable errors
			const rateLimitError = new SupplyError(mockRequest, 429, 'Rate Limit', true);
			const serviceUnavailable = new SupplyError(mockRequest, 503, 'Service Down', true);
			const timeout = new SupplyError(mockRequest, 504, 'Timeout', true);

			// ACT - Common non-retriable errors
			const badRequest = new SupplyError(mockRequest, 400, 'Bad Request', false);
			const unauthorized = new SupplyError(mockRequest, 401, 'Unauthorized', false);
			const notFound = new SupplyError(mockRequest, 404, 'Not Found', false);

			// ASSERT
			expect(rateLimitError.isRetriable).toBe(true);
			expect(serviceUnavailable.isRetriable).toBe(true);
			expect(timeout.isRetriable).toBe(true);

			expect(badRequest.isRetriable).toBe(false);
			expect(unauthorized.isRetriable).toBe(false);
			expect(notFound.isRetriable).toBe(false);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should handle negative error codes', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const error = new SupplyError(mockRequest, -1, 'System error', false);

			// ASSERT
			expect(error.code).toBe(-1);
			expect(error.reason).toBe('System error');
		});

		it('[EH-02] should handle zero error code', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const error = new SupplyError(mockRequest, 0, 'Unknown error', false);

			// ASSERT
			expect(error.code).toBe(0);
		});

		it('[EH-03] should handle empty reason string', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const error = new SupplyError(mockRequest, 500, '', false);

			// ASSERT
			expect(error.reason).toBe('');
			expect(error.code).toBe(500);
		});
	});
});
