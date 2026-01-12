import type { SupplyRequestBase } from '../supply-request-base';
import { SupplyResponseBase } from '../supply-response-base';

/**
 * Concrete implementation of SupplyResponse for testing purposes.
 * SupplyResponse is abstract and meant to be extended by domain-specific responses.
 */
class TestSupplyResponse extends SupplyResponseBase {
	constructor(request: SupplyRequestBase) {
		super(request);
	}
}

/**
 * Tests for SupplyResponse
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */
describe('SupplyResponse', () => {
	let mockRequest: SupplyRequestBase;
	let dateNowSpy: jest.SpyInstance;

	beforeEach(() => {
		// Mock Date.now for deterministic timing tests
		dateNowSpy = jest.spyOn(Date, 'now');

		// Create mock request with fixed timestamp
		mockRequest = {
			requestId: 'test-request-id-123',
			requestedAt: 1000000000000,
		} as SupplyRequestBase;
	});

	afterEach(() => {
		jest.clearAllMocks();
		dateNowSpy.mockRestore();
	});

	describe('business logic', () => {
		it('[BL-01] should create response with request ID from request', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001500);

			// ACT
			const response = new TestSupplyResponse(mockRequest);

			// ASSERT
			expect(response.requestId).toBe('test-request-id-123');
		});

		it('[BL-02] should calculate latency from request creation time', () => {
			// ARRANGE - Request created at 1000000000000, response at 1000000001500
			dateNowSpy.mockReturnValue(1000000001500);

			// ACT
			const response = new TestSupplyResponse(mockRequest);

			// ASSERT
			expect(response.latencyMs).toBe(1500);
		});

		it('[BL-03] should return log metadata with requestId and latency', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000002000);

			// ACT
			const response = new TestSupplyResponse(mockRequest);
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				requestId: 'test-request-id-123',
				latencyMs: 2000,
			});
		});

		it('[BL-04] should return data object with requestId and latency', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000003500);

			// ACT
			const response = new TestSupplyResponse(mockRequest);
			const dataObject = response.asDataObject();

			// ASSERT
			expect(dataObject).toEqual({
				requestId: 'test-request-id-123',
				latencyMs: 3500,
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should calculate zero latency when created immediately', () => {
			// ARRANGE - Same timestamp for request and response
			dateNowSpy.mockReturnValue(1000000000000);

			// ACT
			const response = new TestSupplyResponse(mockRequest);

			// ASSERT
			expect(response.latencyMs).toBe(0);
		});

		it('[EC-02] should handle large latency values (hours/days)', () => {
			// ARRANGE - 48 hours later (172800000 ms)
			const twoDaysLater = mockRequest.requestedAt + 172800000;
			dateNowSpy.mockReturnValue(twoDaysLater);

			// ACT
			const response = new TestSupplyResponse(mockRequest);

			// ASSERT
			expect(response.latencyMs).toBe(172800000);
		});

		it('[EC-03] should implement ITraceable interface correctly', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const response = new TestSupplyResponse(mockRequest);

			// ASSERT - Verify interface method exists and returns correct type
			expect(response.asLogMetadata).toBeDefined();
			expect(typeof response.asLogMetadata).toBe('function');

			const metadata = response.asLogMetadata();
			expect(metadata).toHaveProperty('requestId');
			expect(metadata).toHaveProperty('latencyMs');
		});

		it('[EC-04] should implement IDataProvider interface correctly', () => {
			// ARRANGE
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const response = new TestSupplyResponse(mockRequest);

			// ASSERT - Verify interface method exists and returns correct type
			expect(response.asDataObject).toBeDefined();
			expect(typeof response.asDataObject).toBe('function');

			const dataObject = response.asDataObject();
			expect(dataObject).toHaveProperty('requestId');
			expect(dataObject).toHaveProperty('latencyMs');
		});
	});

	describe('error handling', () => {
		it('[EH-01] should create valid instance with minimal request data', () => {
			// ARRANGE
			const minimalRequest = {
				requestId: 'min-id',
				requestedAt: 999999999000,
			} as SupplyRequestBase;
			dateNowSpy.mockReturnValue(999999999100);

			// ACT
			const response = new TestSupplyResponse(minimalRequest);

			// ASSERT
			expect(response.requestId).toBe('min-id');
			expect(response.latencyMs).toBe(100);
			expect(response.asLogMetadata()).toBeDefined();
			expect(response.asDataObject()).toBeDefined();
		});

		it('[EH-02] should handle request with very long request ID', () => {
			// ARRANGE
			const longId = 'a'.repeat(1000);
			const requestWithLongId = {
				requestId: longId,
				requestedAt: 1000000000000,
			} as SupplyRequestBase;
			dateNowSpy.mockReturnValue(1000000001000);

			// ACT
			const response = new TestSupplyResponse(requestWithLongId);

			// ASSERT
			expect(response.requestId).toBe(longId);
			expect(response.requestId.length).toBe(1000);
		});
	});
});
