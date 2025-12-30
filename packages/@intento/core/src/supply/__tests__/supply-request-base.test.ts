import type { IDataObject, INodeExecutionData, LogMetadata } from 'n8n-workflow';

import { SupplyRequestBase } from '../supply-request-base';

/**
 * Tests for SupplyRequestBase
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 */

/**
 * Test implementation of SupplyRequestBase for testing purposes.
 */
class TestRequest extends SupplyRequestBase {
	constructor(readonly data: unknown = {}) {
		super();
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			requestedAt: this.requestedAt,
			data: this.data as IDataObject,
		};
	}

	asExecutionData(): INodeExecutionData[][] {
		return [[{ json: { requestId: this.requestId, data: this.data as IDataObject } }]];
	}

	clone(): this {
		return new TestRequest(this.data) as this;
	}
}

describe('SupplyRequestBase', () => {
	let cryptoSpy: jest.SpyInstance;
	let dateNowSpy: jest.SpyInstance;

	afterEach(() => {
		if (cryptoSpy) {
			cryptoSpy.mockRestore();
		}
		if (dateNowSpy) {
			dateNowSpy.mockRestore();
		}
		jest.clearAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should generate unique requestId using crypto.randomUUID', () => {
			// ARRANGE
			const mockUuid = '550e8400-e29b-41d4-a716-446655440000';
			cryptoSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue(mockUuid);

			// ACT
			const request = new TestRequest({ test: 'data' });

			// ASSERT
			expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
			expect(request.requestId).toBe(mockUuid);
		});

		it('[BL-02] should capture timestamp at construction', () => {
			// ARRANGE
			const mockTimestamp = 1609459200000; // 2021-01-01 00:00:00 UTC
			dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

			// ACT
			const request = new TestRequest({ test: 'data' });

			// ASSERT
			expect(Date.now).toHaveBeenCalledTimes(1);
			expect(request.requestedAt).toBe(mockTimestamp);
		});

		it('[BL-03] should have readonly requestId property', () => {
			// ARRANGE
			const request = new TestRequest();

			// ACT & ASSERT - TypeScript readonly prevents compile-time modification
			// Runtime: property exists and is a string
			expect(request.requestId).toBeDefined();
			expect(typeof request.requestId).toBe('string');
			expect(request.requestId.length).toBeGreaterThan(0);
		});

		it('[BL-04] should have readonly requestedAt property', () => {
			// ARRANGE
			const request = new TestRequest();

			// ACT & ASSERT - TypeScript readonly prevents compile-time modification
			// Runtime: property exists and is a number
			expect(request.requestedAt).toBeDefined();
			expect(typeof request.requestedAt).toBe('number');
			expect(request.requestedAt).toBeGreaterThan(0);
		});

		it('[BL-05] should implement ITraceable interface', () => {
			// ARRANGE
			const request = new TestRequest({ test: 'data' });

			// ACT
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata).toBeDefined();
			expect(metadata.requestId).toBe(request.requestId);
			expect(metadata.requestedAt).toBe(request.requestedAt);
			expect(metadata.data).toEqual({ test: 'data' });
		});

		it('[BL-06] should implement IDataProvider interface', () => {
			// ARRANGE
			const request = new TestRequest({ test: 'data' });

			// ACT
			const executionData = request.asExecutionData();

			// ASSERT
			expect(executionData).toHaveLength(1);
			expect(executionData[0]).toHaveLength(1);
			expect(executionData[0][0].json).toEqual({
				requestId: request.requestId,
				data: { test: 'data' },
			});
		});

		it('[BL-07] should generate different IDs for multiple instances', () => {
			// ARRANGE & ACT
			const request1 = new TestRequest({ id: 1 });
			const request2 = new TestRequest({ id: 2 });
			const request3 = new TestRequest({ id: 3 });

			// ASSERT
			expect(request1.requestId).not.toBe(request2.requestId);
			expect(request2.requestId).not.toBe(request3.requestId);
			expect(request1.requestId).not.toBe(request3.requestId);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should capture increasing timestamps for sequential requests', () => {
			// ARRANGE
			const timestamps = [1000, 1001, 1002];
			let callCount = 0;
			dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => timestamps[callCount++]);

			// ACT
			const request1 = new TestRequest({ id: 1 });
			const request2 = new TestRequest({ id: 2 });
			const request3 = new TestRequest({ id: 3 });

			// ASSERT
			expect(request1.requestedAt).toBe(1000);
			expect(request2.requestedAt).toBe(1001);
			expect(request3.requestedAt).toBe(1002);
			expect(request1.requestedAt).toBeLessThan(request2.requestedAt);
			expect(request2.requestedAt).toBeLessThan(request3.requestedAt);
		});

		it('[EC-02] should generate RFC 4122 v4 compliant UUIDs', () => {
			// ARRANGE
			const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

			// ACT
			const request = new TestRequest();

			// ASSERT
			expect(request.requestId).toMatch(uuidV4Regex);
		});

		it('[EC-03] should maintain timestamp precision in milliseconds', () => {
			// ARRANGE
			const preciseTimestamp = 1609459200123; // Includes milliseconds
			dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(preciseTimestamp);

			// ACT
			const request = new TestRequest();

			// ASSERT
			expect(request.requestedAt).toBe(preciseTimestamp);
			expect(request.requestedAt % 1000).toBe(123); // Verify millisecond precision
		});
	});

	describe('error handling', () => {
		it('[EH-01] should require concrete implementation of asLogMetadata', () => {
			// ARRANGE
			const request = new TestRequest({ test: 'data' });

			// ACT
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(request.asLogMetadata).toBeDefined();
			expect(typeof request.asLogMetadata).toBe('function');
			expect(metadata).toHaveProperty('requestId');
			expect(metadata).toHaveProperty('requestedAt');
		});

		it('[EH-02] should require concrete implementation of asExecutionData', () => {
			// ARRANGE
			const request = new TestRequest({ test: 'data' });

			// ACT
			const executionData = request.asExecutionData();

			// ASSERT
			expect(request.asExecutionData).toBeDefined();
			expect(typeof request.asExecutionData).toBe('function');
			expect(Array.isArray(executionData)).toBe(true);
			expect(Array.isArray(executionData[0])).toBe(true);
		});

		it('[EH-03] should require concrete implementation of clone', () => {
			// ARRANGE
			const originalData = { test: 'data', value: 42 };
			const request = new TestRequest(originalData);
			const originalRequestId = request.requestId;
			const originalTimestamp = request.requestedAt;

			// ACT
			const cloned = request.clone();

			// ASSERT
			expect(request.clone).toBeDefined();
			expect(typeof request.clone).toBe('function');
			expect(cloned).toBeInstanceOf(TestRequest);
			expect(cloned.data).toEqual(originalData);
			// NOTE: Clone creates new instance via super(), so gets new ID and timestamp
			expect(cloned.requestId).not.toBe(originalRequestId);
			expect(cloned.requestedAt).toBeGreaterThanOrEqual(originalTimestamp);
		});
	});
});
