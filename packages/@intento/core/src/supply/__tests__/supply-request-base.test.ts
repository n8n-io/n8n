import { SupplyRequestBase } from '../supply-request-base';

/**
 * Concrete implementation of SupplyRequestBase for testing purposes.
 * SupplyRequestBase is abstract and meant to be extended by domain-specific requests.
 */
class TestSupplyRequest extends SupplyRequestBase {
	constructor() {
		super();
	}
}

/**
 * Tests for SupplyRequestBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */
describe('SupplyRequestBase', () => {
	let dateNowSpy: jest.SpyInstance;
	let randomUUIDSpy: jest.SpyInstance;

	beforeEach(() => {
		dateNowSpy = jest.spyOn(Date, 'now');
		randomUUIDSpy = jest.spyOn(crypto, 'randomUUID');
	});

	afterEach(() => {
		jest.clearAllMocks();
		dateNowSpy.mockRestore();
		randomUUIDSpy.mockRestore();
	});

	describe('business logic', () => {
		it('[BL-01] should generate unique request ID using crypto.randomUUID', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValue('test-uuid-123');
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const request = new TestSupplyRequest();

			// ASSERT
			expect(request.requestId).toBe('test-uuid-123');
			expect(randomUUIDSpy).toHaveBeenCalledTimes(1);
		});

		it('[BL-02] should capture timestamp at construction time', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValue('uuid-1');
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const request = new TestSupplyRequest();

			// ASSERT
			expect(request.requestedAt).toBe(1000000000000);
			expect(dateNowSpy).toHaveBeenCalledTimes(1);
		});

		it('[BL-03] should return log metadata with requestId and requestedAt', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValue('uuid-metadata');
			dateNowSpy.mockReturnValue(1234567890000);

			// ACT
			const request = new TestSupplyRequest();
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				requestId: 'uuid-metadata',
				requestedAt: 1234567890000,
			});
		});

		it('[BL-04] should return data object with requestId and requestedAt', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValue('uuid-data');
			dateNowSpy.mockReturnValue(9876543210000);

			// ACT
			const request = new TestSupplyRequest();
			const dataObject = request.asDataObject();

			// ASSERT
			expect(dataObject).toEqual({
				requestId: 'uuid-data',
				requestedAt: 9876543210000,
			});
		});

		it('[BL-05] should generate different IDs for multiple instances', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValueOnce('uuid-first').mockReturnValueOnce('uuid-second').mockReturnValueOnce('uuid-third');
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const request1 = new TestSupplyRequest();
			const request2 = new TestSupplyRequest();
			const request3 = new TestSupplyRequest();

			// ASSERT
			expect(request1.requestId).toBe('uuid-first');
			expect(request2.requestId).toBe('uuid-second');
			expect(request3.requestId).toBe('uuid-third');
			expect(randomUUIDSpy).toHaveBeenCalledTimes(3);
		});

		it('[BL-06] should capture different timestamps for sequential constructions', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValue('uuid');
			dateNowSpy.mockReturnValueOnce(1000000000000).mockReturnValueOnce(1000000001000).mockReturnValueOnce(1000000002000);

			// ACT
			const request1 = new TestSupplyRequest();
			const request2 = new TestSupplyRequest();
			const request3 = new TestSupplyRequest();

			// ASSERT
			expect(request1.requestedAt).toBe(1000000000000);
			expect(request2.requestedAt).toBe(1000000001000);
			expect(request3.requestedAt).toBe(1000000002000);
			expect(request1.requestedAt).toBeLessThan(request2.requestedAt);
			expect(request2.requestedAt).toBeLessThan(request3.requestedAt);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should generate valid UUID format (RFC 4122)', () => {
			// ARRANGE
			const validUUID = '550e8400-e29b-41d4-a716-446655440000';
			randomUUIDSpy.mockReturnValue(validUUID);
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const request = new TestSupplyRequest();

			// ASSERT
			expect(request.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		});

		it('[EC-02] should implement ITraceable interface correctly', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValue('uuid');
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const request = new TestSupplyRequest();

			// ASSERT - Verify interface method exists and returns correct type
			expect(request.asLogMetadata).toBeDefined();
			expect(typeof request.asLogMetadata).toBe('function');

			const metadata = request.asLogMetadata();
			expect(metadata).toHaveProperty('requestId');
			expect(metadata).toHaveProperty('requestedAt');
		});

		it('[EC-03] should implement IDataProvider interface correctly', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValue('uuid');
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const request = new TestSupplyRequest();

			// ASSERT - Verify interface method exists and returns correct type
			expect(request.asDataObject).toBeDefined();
			expect(typeof request.asDataObject).toBe('function');

			const dataObject = request.asDataObject();
			expect(dataObject).toHaveProperty('requestId');
			expect(dataObject).toHaveProperty('requestedAt');
		});

		it('[EC-04] should create instances with timestamps in chronological order', () => {
			// ARRANGE
			randomUUIDSpy.mockReturnValue('uuid');
			let timestamp = 1000000000000;
			dateNowSpy.mockImplementation(() => {
				timestamp += 100;
				return timestamp;
			});

			// ACT
			const requests = Array.from({ length: 5 }, () => new TestSupplyRequest());

			// ASSERT - Each timestamp should be greater than the previous
			for (let i = 1; i < requests.length; i++) {
				expect(requests[i].requestedAt).toBeGreaterThan(requests[i - 1].requestedAt);
			}
		});
	});

	describe('error handling', () => {
		it('[EH-01] should handle rapid successive instantiations', () => {
			// ARRANGE
			const uuids = ['uuid-1', 'uuid-2', 'uuid-3', 'uuid-4', 'uuid-5'];
			randomUUIDSpy.mockImplementation(() => uuids.shift() as string);
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT - Create multiple instances rapidly
			const requests = Array.from({ length: 5 }, () => new TestSupplyRequest());

			// ASSERT - All should have unique IDs even with same timestamp
			const ids = requests.map((r) => r.requestId);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(5);
			expect(requests.every((r) => r.requestedAt === 1000000000000)).toBe(true);
		});

		it('[EH-02] should maintain UUID format consistency across instances', () => {
			// ARRANGE
			const validUUIDs = [
				'550e8400-e29b-41d4-a716-446655440000',
				'6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				'f47ac10b-58cc-4372-a567-0e02b2c3d479',
			];
			randomUUIDSpy.mockImplementation(() => validUUIDs.shift() as string);
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const requests = Array.from({ length: 3 }, () => new TestSupplyRequest());

			// ASSERT - All should match UUID format
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			requests.forEach((request) => {
				expect(request.requestId).toMatch(uuidRegex);
			});
		});
	});
});
