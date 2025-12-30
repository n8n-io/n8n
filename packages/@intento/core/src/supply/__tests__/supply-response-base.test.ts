import type { IDataObject, INodeExecutionData, LogMetadata } from 'n8n-workflow';

import { SupplyRequestBase } from '../supply-request-base';
import { SupplyResponseBase } from '../supply-response-base';

/**
 * Tests for SupplyResponseBase
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 */

/**
 * Test implementation of SupplyRequestBase for testing purposes.
 */
class TestRequest extends SupplyRequestBase {
	constructor(
		readonly testData: unknown = {},
		customRequestedAt?: number,
	) {
		super();
		if (customRequestedAt !== undefined) {
			// Override requestedAt for testing timing scenarios
			(this as { requestedAt: number }).requestedAt = customRequestedAt;
		}
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, requestedAt: this.requestedAt, testData: this.testData };
	}

	asExecutionData(): INodeExecutionData[][] {
		return [[{ json: { requestId: this.requestId, testData: this.testData as IDataObject } }]];
	}

	clone(): this {
		return new TestRequest(this.testData, this.requestedAt) as this;
	}
}

/**
 * Test implementation of SupplyResponseBase for testing purposes.
 */
class TestResponse extends SupplyResponseBase {
	constructor(
		request: SupplyRequestBase,
		private readonly data?: unknown,
	) {
		super(request);
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			latencyMs: this.latencyMs,
			data: this.data,
		};
	}

	asExecutionData(): INodeExecutionData[][] {
		return [[{ json: { requestId: this.requestId, latencyMs: this.latencyMs, data: this.data as IDataObject } }]];
	}
}

describe('SupplyResponseBase', () => {
	let dateNowSpy: jest.SpyInstance;

	afterEach(() => {
		if (dateNowSpy) {
			dateNowSpy.mockRestore();
		}
		jest.clearAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should copy requestId from request', () => {
			// ARRANGE
			const request = new TestRequest({ test: 'data' });
			const expectedRequestId = request.requestId;

			// ACT
			const response = new TestResponse(request);

			// ASSERT
			expect(response.requestId).toBe(expectedRequestId);
		});

		it('[BL-02] should calculate latency from request timestamp', () => {
			// ARRANGE
			const requestTimestamp = 1000;
			const responseTimestamp = 1500;
			const expectedLatency = 500;

			const request = new TestRequest({ test: 'data' }, requestTimestamp);
			dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(responseTimestamp);

			// ACT
			const response = new TestResponse(request);

			// ASSERT
			expect(response.latencyMs).toBe(expectedLatency);
		});

		it('[BL-03] should have readonly requestId property', () => {
			// ARRANGE
			const request = new TestRequest();

			// ACT
			const response = new TestResponse(request);

			// ASSERT - TypeScript readonly prevents compile-time modification
			// Runtime: property exists and is accessible
			expect(response.requestId).toBe(request.requestId);
			expect(typeof response.requestId).toBe('string');
		});

		it('[BL-04] should have readonly latencyMs property', () => {
			// ARRANGE
			const request = new TestRequest();

			// ACT
			const response = new TestResponse(request);

			// ASSERT - TypeScript readonly prevents compile-time modification
			// Runtime: property exists and is a number
			expect(response.latencyMs).toBeGreaterThanOrEqual(0);
			expect(typeof response.latencyMs).toBe('number');
		});

		it('[BL-05] should implement ITraceable interface', () => {
			// ARRANGE
			const request = new TestRequest({ test: 'data' });
			const response = new TestResponse(request, { result: 'success' });

			// ACT
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				requestId: request.requestId,
				latencyMs: expect.any(Number) as number,
				data: { result: 'success' },
			});
		});

		it('[BL-06] should implement IDataProvider interface', () => {
			// ARRANGE
			const request = new TestRequest({ test: 'data' });
			const response = new TestResponse(request, { result: 'success' });

			// ACT
			const executionData = response.asExecutionData();

			// ASSERT
			expect(executionData).toHaveLength(1);
			expect(executionData[0]).toHaveLength(1);
			expect(executionData[0][0].json).toEqual({
				requestId: request.requestId,
				latencyMs: expect.any(Number) as number,
				data: { result: 'success' },
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should calculate zero latency when request created at same millisecond', () => {
			// ARRANGE
			const timestamp = 1000;
			const request = new TestRequest({ test: 'data' }, timestamp);
			dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(timestamp);

			// ACT
			const response = new TestResponse(request);

			// ASSERT
			expect(response.latencyMs).toBe(0);
		});

		it('[EC-02] should calculate positive latency for older requests', () => {
			// ARRANGE
			const requestTimestamp = 5000;
			const responseTimestamp = 7500;
			const expectedLatency = 2500;

			const request = new TestRequest({ test: 'data' }, requestTimestamp);
			dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(responseTimestamp);

			// ACT
			const response = new TestResponse(request);

			// ASSERT
			expect(response.latencyMs).toBe(expectedLatency);
			expect(response.latencyMs).toBeGreaterThan(0);
		});

		it('[EC-03] should handle requests from different time epochs', () => {
			// ARRANGE
			const requestTimestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
			const responseTimestamp = 1735603200000; // 2024-12-31 00:00:00 UTC
			const expectedLatency = responseTimestamp - requestTimestamp;

			const request = new TestRequest({ test: 'data' }, requestTimestamp);
			dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(responseTimestamp);

			// ACT
			const response = new TestResponse(request);

			// ASSERT
			expect(response.latencyMs).toBe(expectedLatency);
			expect(response.latencyMs).toBeGreaterThan(0);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should require concrete implementation of asLogMetadata', () => {
			// ARRANGE
			const request = new TestRequest();

			// ACT
			const response = new TestResponse(request);

			// ASSERT
			expect(response.asLogMetadata).toBeDefined();
			expect(typeof response.asLogMetadata).toBe('function');
			expect(response.asLogMetadata()).toHaveProperty('requestId');
			expect(response.asLogMetadata()).toHaveProperty('latencyMs');
		});

		it('[EH-02] should require concrete implementation of asExecutionData', () => {
			// ARRANGE
			const request = new TestRequest();

			// ACT
			const response = new TestResponse(request);

			// ASSERT
			expect(response.asExecutionData).toBeDefined();
			expect(typeof response.asExecutionData).toBe('function');
			expect(Array.isArray(response.asExecutionData())).toBe(true);
			expect(Array.isArray(response.asExecutionData()[0])).toBe(true);
		});
	});
});
