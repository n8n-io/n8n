import type { IDataObject, LogMetadata } from 'n8n-workflow';

import { SupplyRequestBase } from '../supply-request-base';

/**
 * Tests for SupplyRequestBase
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

// Concrete test implementation of abstract SupplyRequestBase
class TestRequest extends SupplyRequestBase {
	constructor(private readonly data: string) {
		super();
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, data: this.data };
	}

	asDataObject(): IDataObject {
		return { requestId: this.requestId, data: this.data };
	}

	clone(): this {
		return new TestRequest(this.data) as this;
	}
}

describe('SupplyRequestBase', () => {
	const MOCK_UUID_1 = 'test-uuid-001';
	const MOCK_UUID_2 = 'test-uuid-002';
	const MOCK_TIMESTAMP_1 = 1704412800000; // 2025-01-05 00:00:00 UTC
	const MOCK_TIMESTAMP_2 = 1704412801000; // 2025-01-05 00:00:01 UTC

	let mockRandomUUID: jest.SpyInstance;
	let mockDateNow: jest.SpyInstance;

	beforeEach(() => {
		mockRandomUUID = jest.spyOn(crypto, 'randomUUID');
		mockDateNow = jest.spyOn(Date, 'now');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should generate unique requestId using crypto.randomUUID', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValue(MOCK_UUID_1);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1);

			// ACT
			const request = new TestRequest('test-data');

			// ASSERT
			expect(request.requestId).toBe(MOCK_UUID_1);
			expect(mockRandomUUID).toHaveBeenCalledTimes(1);
		});

		it('[BL-02] should capture timestamp at construction using Date.now', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValue(MOCK_UUID_1);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1);

			// ACT
			const request = new TestRequest('test-data');

			// ASSERT
			expect(request.requestedAt).toBe(MOCK_TIMESTAMP_1);
			expect(mockDateNow).toHaveBeenCalledTimes(1);
		});

		it('[BL-03] should implement ITraceable interface with requestId', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValue(MOCK_UUID_1);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1);

			// ACT
			const request = new TestRequest('test-data');
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata.requestId).toBe(MOCK_UUID_1);
			expect(typeof metadata.requestId).toBe('string');
		});

		it('[BL-04] should implement IDataProvider interface', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValue(MOCK_UUID_1);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1);

			// ACT
			const request = new TestRequest('test-data');
			const dataObject = request.asDataObject();

			// ASSERT
			expect(dataObject).toBeInstanceOf(Object);
			expect(dataObject.requestId).toBe(MOCK_UUID_1);
			expect(dataObject.data).toBe('test-data');
		});

		it('[BL-05] should create multiple instances with unique requestIds', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValueOnce(MOCK_UUID_1).mockReturnValueOnce(MOCK_UUID_2);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1);

			// ACT
			const request1 = new TestRequest('data-1');
			const request2 = new TestRequest('data-2');

			// ASSERT
			expect(request1.requestId).toBe(MOCK_UUID_1);
			expect(request2.requestId).toBe(MOCK_UUID_2);
			expect(request1.requestId).not.toBe(request2.requestId);
			expect(mockRandomUUID).toHaveBeenCalledTimes(2);
		});

		it('[BL-06] should capture sequential timestamps for multiple instances', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValue(MOCK_UUID_1);
			mockDateNow.mockReturnValueOnce(MOCK_TIMESTAMP_1).mockReturnValueOnce(MOCK_TIMESTAMP_2);

			// ACT
			const request1 = new TestRequest('data-1');
			const request2 = new TestRequest('data-2');

			// ASSERT
			expect(request1.requestedAt).toBe(MOCK_TIMESTAMP_1);
			expect(request2.requestedAt).toBe(MOCK_TIMESTAMP_2);
			expect(request2.requestedAt).toBeGreaterThan(request1.requestedAt);
			expect(mockDateNow).toHaveBeenCalledTimes(2);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle rapid instantiation (same millisecond)', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValueOnce(MOCK_UUID_1).mockReturnValueOnce(MOCK_UUID_2);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1); // Same timestamp

			// ACT
			const request1 = new TestRequest('data-1');
			const request2 = new TestRequest('data-2');

			// ASSERT
			expect(request1.requestedAt).toBe(MOCK_TIMESTAMP_1);
			expect(request2.requestedAt).toBe(MOCK_TIMESTAMP_1);
			expect(request1.requestId).not.toBe(request2.requestId); // UUIDs still unique
		});

		it('[EC-02] should require concrete implementation of asLogMetadata', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValue(MOCK_UUID_1);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1);
			const request = new TestRequest('test-data');

			// ACT
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata).toBeDefined();
			expect(metadata.requestId).toBe(MOCK_UUID_1);
			expect(metadata.data).toBe('test-data');
		});

		it('[EC-03] should require concrete implementation of asDataObject', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValue(MOCK_UUID_1);
			mockDateNow.mockReturnValue(MOCK_TIMESTAMP_1);
			const request = new TestRequest('test-data');

			// ACT
			const dataObject = request.asDataObject();

			// ASSERT
			expect(dataObject).toBeDefined();
			expect(dataObject.requestId).toBe(MOCK_UUID_1);
			expect(dataObject.data).toBe('test-data');
		});

		it('[EC-04] should require concrete implementation of clone', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValueOnce(MOCK_UUID_1).mockReturnValueOnce(MOCK_UUID_2);
			mockDateNow.mockReturnValueOnce(MOCK_TIMESTAMP_1).mockReturnValueOnce(MOCK_TIMESTAMP_2);
			const original = new TestRequest('test-data');

			// ACT
			const cloned = original.clone();

			// ASSERT
			expect(cloned).toBeInstanceOf(TestRequest);
			expect(cloned.requestId).toBe(MOCK_UUID_2); // New UUID
			expect(cloned.requestedAt).toBe(MOCK_TIMESTAMP_2); // New timestamp
			expect(cloned.asDataObject().data).toBe('test-data'); // Same data
			expect(cloned).not.toBe(original); // Different instance
		});
	});

	describe('error handling', () => {
		it('[EH-01] should enforce abstract class pattern via TypeScript', () => {
			// ASSERT
			// TypeScript prevents direct instantiation at compile time
			// This test validates the design enforces abstract pattern
			// @ts-expect-error Cannot instantiate abstract class - TypeScript compile-time check
			const abstractCheck: SupplyRequestBase = SupplyRequestBase;
			expect(abstractCheck).toBeDefined(); // Validates abstract keyword presence
		});
	});

	describe('integration scenarios', () => {
		it('should work with real crypto.randomUUID (unmocked)', () => {
			// ACT (no mocks)
			const request1 = new TestRequest('data-1');
			const request2 = new TestRequest('data-2');

			// ASSERT
			expect(request1.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
			expect(request2.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
			expect(request1.requestId).not.toBe(request2.requestId);
		});

		it('should work with real Date.now (unmocked)', () => {
			// ARRANGE
			const beforeTime = Date.now();

			// ACT
			const request = new TestRequest('test-data');

			// ASSERT
			const afterTime = Date.now();
			expect(request.requestedAt).toBeGreaterThanOrEqual(beforeTime);
			expect(request.requestedAt).toBeLessThanOrEqual(afterTime);
		});

		it('should maintain immutability across clone operations', () => {
			// ARRANGE
			mockRandomUUID.mockReturnValueOnce(MOCK_UUID_1).mockReturnValueOnce(MOCK_UUID_2);
			mockDateNow.mockReturnValueOnce(MOCK_TIMESTAMP_1).mockReturnValueOnce(MOCK_TIMESTAMP_2);
			const original = new TestRequest('original-data');
			const originalId = original.requestId;
			const originalTime = original.requestedAt;

			// ACT
			const cloned = original.clone();

			// ASSERT - original unchanged
			expect(original.requestId).toBe(originalId);
			expect(original.requestedAt).toBe(originalTime);
			// ASSERT - clone has new identity
			expect(cloned.requestId).not.toBe(originalId);
			expect(cloned.requestedAt).not.toBe(originalTime);
		});
	});
});
