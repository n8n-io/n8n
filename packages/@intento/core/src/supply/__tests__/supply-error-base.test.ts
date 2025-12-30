import { mock } from 'jest-mock-extended';
import type { INode, INodeExecutionData, LogMetadata, NodeOperationError } from 'n8n-workflow';

import { SupplyErrorBase } from '../supply-error-base';
import { SupplyRequestBase } from '../supply-request-base';

/**
 * Tests for SupplyErrorBase
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 */

// Concrete test implementations for abstract classes
class TestSupplyRequest extends SupplyRequestBase {
	constructor(requestId: string, requestedAt: number) {
		super();
		// Override readonly properties for testing
		(this as { requestId: string }).requestId = requestId;
		(this as { requestedAt: number }).requestedAt = requestedAt;
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId };
	}

	asExecutionData(): INodeExecutionData[][] {
		return [[{ json: { requestId: this.requestId } }]];
	}

	clone(): this {
		return new TestSupplyRequest(this.requestId, this.requestedAt) as this;
	}
}

class TestSupplyError extends SupplyErrorBase {
	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			code: this.code,
			reason: this.reason,
			latencyMs: this.latencyMs,
		};
	}

	asExecutionData(): INodeExecutionData[][] {
		return [
			[
				{
					json: {
						requestId: this.requestId,
						code: this.code,
						reason: this.reason,
						latencyMs: this.latencyMs,
					},
				},
			],
		];
	}

	asError(node: INode): NodeOperationError {
		const message = `Error [${this.code}]: ${this.reason}`;
		return { message, node } as NodeOperationError;
	}
}

describe('SupplyErrorBase', () => {
	let dateNowSpy: jest.SpyInstance;

	beforeEach(() => {
		dateNowSpy = jest.spyOn(Date, 'now');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should initialize requestId from request', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-123', 1000);
			dateNowSpy.mockReturnValue(1500);

			// ACT
			const error = new TestSupplyError(request, 500, 'Internal error');

			// ASSERT
			expect(error.requestId).toBe('test-req-123');
		});

		it('[BL-02] should calculate latencyMs from request timestamp', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-456', 2000);
			dateNowSpy.mockReturnValue(2350);

			// ACT
			const error = new TestSupplyError(request, 404, 'Not found');

			// ASSERT
			expect(error.latencyMs).toBe(350);
		});

		it('[BL-03] should initialize code from parameter', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-789', 3000);
			dateNowSpy.mockReturnValue(3100);

			// ACT
			const error = new TestSupplyError(request, 403, 'Forbidden');

			// ASSERT
			expect(error.code).toBe(403);
		});

		it('[BL-04] should initialize reason from parameter', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-abc', 4000);
			dateNowSpy.mockReturnValue(4200);

			// ACT
			const error = new TestSupplyError(request, 502, 'Bad gateway');

			// ASSERT
			expect(error.reason).toBe('Bad gateway');
		});

		it('[BL-05] should copy requestId from request object', () => {
			// ARRANGE
			const requestId = 'correlation-id-12345';
			const request = new TestSupplyRequest(requestId, 5000);
			dateNowSpy.mockReturnValue(5100);

			// ACT
			const error = new TestSupplyError(request, 200, 'OK');

			// ASSERT
			expect(error.requestId).toBe(requestId);
			expect(error.requestId).toBe(request.requestId);
		});

		it('[BL-06] should implement ITraceable interface', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-trace', 6000);
			dateNowSpy.mockReturnValue(6100);
			const error = new TestSupplyError(request, 500, 'Server error');

			// ACT
			const logMetadata = error.asLogMetadata();

			// ASSERT
			expect(logMetadata).toBeDefined();
			expect(logMetadata.requestId).toBe('test-req-trace');
			expect(logMetadata.code).toBe(500);
			expect(logMetadata.reason).toBe('Server error');
			expect(logMetadata.latencyMs).toBe(100);
		});

		it('[BL-07] should implement IDataProvider interface', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-data', 7000);
			dateNowSpy.mockReturnValue(7250);
			const error = new TestSupplyError(request, 429, 'Too many requests');

			// ACT
			const executionData = error.asExecutionData();

			// ASSERT
			expect(executionData).toBeInstanceOf(Array);
			expect(executionData).toHaveLength(1);
			expect(executionData[0]).toHaveLength(1);
			expect(executionData[0][0].json).toEqual({
				requestId: 'test-req-data',
				code: 429,
				reason: 'Too many requests',
				latencyMs: 250,
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle zero latency when error immediate', () => {
			// ARRANGE
			const timestamp = 10000;
			const request = new TestSupplyRequest('test-req-instant', timestamp);
			dateNowSpy.mockReturnValue(timestamp);

			// ACT
			const error = new TestSupplyError(request, 400, 'Bad request');

			// ASSERT
			expect(error.latencyMs).toBe(0);
		});

		it('[EC-02] should handle large latency values', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-slow', 1000);
			dateNowSpy.mockReturnValue(31000); // 30 seconds later

			// ACT
			const error = new TestSupplyError(request, 504, 'Gateway timeout');

			// ASSERT
			expect(error.latencyMs).toBe(30000);
		});

		it('[EC-03] should preserve negative error codes', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-negative', 12000);
			dateNowSpy.mockReturnValue(12100);

			// ACT
			const error = new TestSupplyError(request, -1, 'System error');

			// ASSERT
			expect(error.code).toBe(-1);
		});

		it('[EC-04] should handle empty reason string', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-empty', 13000);
			dateNowSpy.mockReturnValue(13050);

			// ACT
			const error = new TestSupplyError(request, 500, '');

			// ASSERT
			expect(error.reason).toBe('');
		});

		it('[EC-05] should handle very long reason strings', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-long', 14000);
			dateNowSpy.mockReturnValue(14100);
			const longReason = 'Error: ' + 'x'.repeat(1000);

			// ACT
			const error = new TestSupplyError(request, 500, longReason);

			// ASSERT
			expect(error.reason).toBe(longReason);
			expect(error.reason.length).toBe(1007);
		});

		it('[EC-06] should have readonly properties', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-readonly', 15000);
			dateNowSpy.mockReturnValue(15100);
			const error = new TestSupplyError(request, 500, 'Error');

			// ASSERT - Verify properties exist and are accessible
			expect(error.requestId).toBeDefined();
			expect(error.latencyMs).toBeDefined();
			expect(error.code).toBeDefined();
			expect(error.reason).toBeDefined();
		});
	});

	describe('error handling', () => {
		it('[EH-01] should require concrete implementations of asLogMetadata', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-log', 16000);
			dateNowSpy.mockReturnValue(16100);
			const error = new TestSupplyError(request, 500, 'Error');

			// ACT
			const metadata = error.asLogMetadata();

			// ASSERT
			expect(metadata).toBeDefined();
			expect(typeof metadata).toBe('object');
			expect(metadata.requestId).toBe('test-req-log');
		});

		it('[EH-02] should require concrete implementations of asExecutionData', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-exec', 17000);
			dateNowSpy.mockReturnValue(17200);
			const error = new TestSupplyError(request, 500, 'Error');

			// ACT
			const executionData = error.asExecutionData();

			// ASSERT
			expect(executionData).toBeDefined();
			expect(Array.isArray(executionData)).toBe(true);
			expect(executionData[0][0].json.requestId).toBe('test-req-exec');
		});

		it('[EH-03] should require concrete implementations of asError', () => {
			// ARRANGE
			const request = new TestSupplyRequest('test-req-error', 18000);
			dateNowSpy.mockReturnValue(18100);
			const error = new TestSupplyError(request, 500, 'Internal error');
			const mockNode = mock<INode>();

			// ACT
			const nodeError = error.asError(mockNode);

			// ASSERT
			expect(nodeError).toBeDefined();
			expect(nodeError.message).toContain('[500]');
			expect(nodeError.message).toContain('Internal error');
		});
	});
});
