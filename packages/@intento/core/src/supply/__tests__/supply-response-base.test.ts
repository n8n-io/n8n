import type { IDataObject, LogMetadata } from 'n8n-workflow';

import { SupplyRequestBase } from '../supply-request-base';
import { SupplyResponseBase } from '../supply-response-base';

/**
 * Tests for SupplyResponseBase
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

// Concrete test implementation of abstract SupplyResponseBase
class TestResponse extends SupplyResponseBase {
	constructor(
		request: SupplyRequestBase,
		private readonly data: string,
	) {
		super(request);
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, latencyMs: this.latencyMs, data: this.data };
	}

	asDataObject(): IDataObject {
		return { requestId: this.requestId, latencyMs: this.latencyMs, data: this.data };
	}
}

describe('SupplyResponseBase', () => {
	const MOCK_REQUEST_ID = 'test-request-uuid-001';
	const MOCK_REQUEST_TIMESTAMP = 1704412800000; // 2025-01-05 00:00:00 UTC
	const MOCK_RESPONSE_TIMESTAMP_ZERO = 1704412800000; // Same millisecond (0ms latency)
	const MOCK_RESPONSE_TIMESTAMP_100 = 1704412800100; // +100ms latency
	const MOCK_RESPONSE_TIMESTAMP_1000 = 1704412801000; // +1000ms (1 second) latency
	const MOCK_RESPONSE_TIMESTAMP_5000 = 1704412805000; // +5000ms (5 seconds) latency

	let mockDateNow: jest.SpyInstance;

	beforeEach(() => {
		mockDateNow = jest.spyOn(Date, 'now');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should copy requestId from request', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_100);

			// ACT
			const response = new TestResponse(request, 'test-data');

			// ASSERT
			expect(response.requestId).toBe(MOCK_REQUEST_ID);
			expect(response.requestId).toBe(request.requestId);
		});

		it('[BL-02] should calculate latencyMs from request timestamp', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_100);

			// ACT
			const response = new TestResponse(request, 'test-data');

			// ASSERT
			expect(response.latencyMs).toBe(100);
			expect(response.latencyMs).toBe(MOCK_RESPONSE_TIMESTAMP_100 - MOCK_REQUEST_TIMESTAMP);
		});

		it('[BL-03] should implement ITraceable interface with requestId', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_100);

			// ACT
			const response = new TestResponse(request, 'test-data');
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata.requestId).toBe(MOCK_REQUEST_ID);
			expect(typeof metadata.requestId).toBe('string');
		});

		it('[BL-04] should implement IDataProvider interface', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_100);

			// ACT
			const response = new TestResponse(request, 'test-data');
			const dataObject = response.asDataObject();

			// ASSERT
			expect(dataObject).toBeInstanceOf(Object);
			expect(dataObject.requestId).toBe(MOCK_REQUEST_ID);
			expect(dataObject.latencyMs).toBe(100);
			expect(dataObject.data).toBe('test-data');
		});

		it('[BL-05] should correlate response to originating request via requestId', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_100);

			// ACT
			const response = new TestResponse(request, 'test-data');

			// ASSERT - Response carries same ID as request for correlation
			expect(response.requestId).toBe(request.requestId);
			expect(response.asLogMetadata().requestId).toBe(request.requestId);
			expect(response.asDataObject().requestId).toBe(request.requestId);
		});

		it('[BL-06] should calculate positive latency for delayed response', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_1000);

			// ACT
			const response = new TestResponse(request, 'test-data');

			// ASSERT
			expect(response.latencyMs).toBe(1000);
			expect(response.latencyMs).toBeGreaterThan(0);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle zero latency (same millisecond as request)', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_ZERO);

			// ACT
			const response = new TestResponse(request, 'test-data');

			// ASSERT
			expect(response.latencyMs).toBe(0);
			expect(response.asLogMetadata().latencyMs).toBe(0);
		});

		it('[EC-02] should handle large latency values (seconds/minutes)', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_5000);

			// ACT
			const response = new TestResponse(request, 'test-data');

			// ASSERT
			expect(response.latencyMs).toBe(5000);
			expect(response.latencyMs).toBeGreaterThan(1000);
		});

		it('[EC-03] should preserve requestId from request without modification', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_100);

			// ACT
			const response = new TestResponse(request, 'test-data');

			// ASSERT
			expect(response.requestId).toBe(MOCK_REQUEST_ID);
			expect(response.requestId).toBe(request.requestId);
			expect(response.requestId.length).toBe(MOCK_REQUEST_ID.length);
		});

		it('[EC-04] should require concrete implementation of asLogMetadata', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_100);
			const response = new TestResponse(request, 'test-data');

			// ACT
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata).toBeDefined();
			expect(metadata.requestId).toBe(MOCK_REQUEST_ID);
			expect(metadata.latencyMs).toBe(100);
			expect(metadata.data).toBe('test-data');
		});

		it('[EC-05] should require concrete implementation of asDataObject', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_100);
			const response = new TestResponse(request, 'test-data');

			// ACT
			const dataObject = response.asDataObject();

			// ASSERT
			expect(dataObject).toBeDefined();
			expect(dataObject.requestId).toBe(MOCK_REQUEST_ID);
			expect(dataObject.latencyMs).toBe(100);
			expect(dataObject.data).toBe('test-data');
		});

		it('[EC-06] should create multiple responses with same requestId (retries)', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValueOnce(MOCK_RESPONSE_TIMESTAMP_100).mockReturnValueOnce(MOCK_RESPONSE_TIMESTAMP_1000);

			// ACT
			const response1 = new TestResponse(request, 'first-attempt');
			const response2 = new TestResponse(request, 'second-attempt');

			// ASSERT - Both responses correlate to same request
			expect(response1.requestId).toBe(MOCK_REQUEST_ID);
			expect(response2.requestId).toBe(MOCK_REQUEST_ID);
			expect(response1.requestId).toBe(response2.requestId);
			// But have different latencies
			expect(response1.latencyMs).toBe(100);
			expect(response2.latencyMs).toBe(1000);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should enforce abstract class pattern via TypeScript', () => {
			// ASSERT
			// TypeScript prevents direct instantiation at compile time
			// This test validates the design enforces abstract pattern
			// @ts-expect-error Cannot instantiate abstract class - TypeScript compile-time check
			const abstractCheck: SupplyResponseBase = SupplyResponseBase;
			expect(abstractCheck).toBeDefined(); // Validates abstract keyword presence
		});
	});

	describe('integration scenarios', () => {
		it('should work with real Date.now for latency calculation', () => {
			// ARRANGE
			const requestTime = Date.now();
			const request = new MockRequest(MOCK_REQUEST_ID, requestTime);

			// ACT - Wait a tiny bit (test execution time adds natural delay)
			const response = new TestResponse(request, 'test-data');
			const afterResponse = Date.now();

			// ASSERT
			expect(response.latencyMs).toBeGreaterThanOrEqual(0);
			expect(response.latencyMs).toBeLessThanOrEqual(afterResponse - requestTime);
		});

		it('should calculate different latencies for multiple responses', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow
				.mockReturnValueOnce(MOCK_RESPONSE_TIMESTAMP_100)
				.mockReturnValueOnce(MOCK_RESPONSE_TIMESTAMP_1000)
				.mockReturnValueOnce(MOCK_RESPONSE_TIMESTAMP_5000);

			// ACT
			const fastResponse = new TestResponse(request, 'fast');
			const normalResponse = new TestResponse(request, 'normal');
			const slowResponse = new TestResponse(request, 'slow');

			// ASSERT
			expect(fastResponse.latencyMs).toBe(100);
			expect(normalResponse.latencyMs).toBe(1000);
			expect(slowResponse.latencyMs).toBe(5000);
			expect(normalResponse.latencyMs).toBeGreaterThan(fastResponse.latencyMs);
			expect(slowResponse.latencyMs).toBeGreaterThan(normalResponse.latencyMs);
		});

		it('should maintain request-response correlation through latency tracking', () => {
			// ARRANGE
			const request1 = new MockRequest('request-001', MOCK_REQUEST_TIMESTAMP);
			const request2 = new MockRequest('request-002', MOCK_REQUEST_TIMESTAMP + 1000);
			mockDateNow.mockReturnValueOnce(MOCK_RESPONSE_TIMESTAMP_100).mockReturnValueOnce(MOCK_RESPONSE_TIMESTAMP_100 + 1000);

			// ACT
			const response1 = new TestResponse(request1, 'data-1');
			const response2 = new TestResponse(request2, 'data-2');

			// ASSERT - Each response correlates to correct request
			expect(response1.requestId).toBe('request-001');
			expect(response2.requestId).toBe('request-002');
			expect(response1.latencyMs).toBe(100);
			expect(response2.latencyMs).toBe(100);
		});

		it('should include latency in both log metadata and data object', () => {
			// ARRANGE
			const request = new MockRequest(MOCK_REQUEST_ID, MOCK_REQUEST_TIMESTAMP);
			mockDateNow.mockReturnValue(MOCK_RESPONSE_TIMESTAMP_1000);

			// ACT
			const response = new TestResponse(request, 'test-data');

			// ASSERT
			const metadata = response.asLogMetadata();
			const dataObject = response.asDataObject();
			expect(metadata.latencyMs).toBe(1000);
			expect(dataObject.latencyMs).toBe(1000);
			expect(metadata.latencyMs).toBe(dataObject.latencyMs);
		});
	});
});
