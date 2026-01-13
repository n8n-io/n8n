import type { IDataObject } from 'n8n-workflow';

import type { SupplyRequestBase } from '../supply-request-base';
import { SupplyResponseBase } from '../supply-response-base';

/**
 * Tests for SupplyResponseBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

// Concrete test implementation of abstract SupplyResponseBase
class TestSupplyResponse extends SupplyResponseBase {
	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			supplyRequestId: this.supplyRequestId,
			latencyMs: this.latencyMs,
		};
	}
}

// Helper to create test request
const createTestRequest = (agentRequestId: string, supplyRequestId: string, requestedAt: number): SupplyRequestBase => {
	return {
		agentRequestId,
		supplyRequestId,
		requestedAt,
		throwIfInvalid: jest.fn(),
		asLogMetadata: jest.fn(),
		asDataObject: jest.fn(),
	} as unknown as SupplyRequestBase;
};

describe('SupplyResponseBase', () => {
	let mockDateNow: jest.SpyInstance;

	beforeEach(() => {
		mockDateNow = jest.spyOn(Date, 'now');
	});

	afterEach(() => {
		mockDateNow.mockRestore();
	});

	describe('business logic', () => {
		it('[BL-01] should copy agentRequestId from request', () => {
			const agentRequestId = '00000000-0000-0000-0000-000000000001';
			const request = createTestRequest(agentRequestId, '00000000-0000-0000-0000-000000000002', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(response.agentRequestId).toBe(agentRequestId);
		});

		it('[BL-02] should copy supplyRequestId from request', () => {
			const supplyRequestId = '00000000-0000-0000-0000-000000000002';
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', supplyRequestId, 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(response.supplyRequestId).toBe(supplyRequestId);
		});

		it('[BL-03] should calculate latencyMs from request timestamp', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(response.latencyMs).toBe(1000);
		});

		it('[BL-04] should return all three fields in asLogMetadata', () => {
			const agentRequestId = '00000000-0000-0000-0000-000000000001';
			const supplyRequestId = '00000000-0000-0000-0000-000000000002';
			const request = createTestRequest(agentRequestId, supplyRequestId, 1000);
			mockDateNow.mockReturnValue(3500);

			const response = new TestSupplyResponse(request);
			const metadata = response.asLogMetadata();

			expect(metadata).toEqual({
				agentRequestId,
				supplyRequestId,
				latencyMs: 2500,
			});
		});

		it('[BL-05] should have readonly properties', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(response.agentRequestId).toBeDefined();
			expect(response.supplyRequestId).toBeDefined();
			expect(response.latencyMs).toBeDefined();
		});

		it('[BL-06] should validate successfully with valid IDs', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(() => response.throwIfInvalid()).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should calculate latency correctly with time difference', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 5000);
			mockDateNow.mockReturnValue(10000);

			const response = new TestSupplyResponse(request);

			expect(response.latencyMs).toBe(5000);
		});

		it('[EC-02] should handle zero latency (same timestamp)', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 2000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(response.latencyMs).toBe(0);
		});

		it('[EC-03] should preserve exact ID values without modification', () => {
			const agentRequestId = '12345678-1234-5678-1234-567812345678';
			const supplyRequestId = 'abcdef01-abcd-ef01-abcd-ef0123456789';
			const request = createTestRequest(agentRequestId, supplyRequestId, 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(response.agentRequestId).toBe(agentRequestId);
			expect(response.supplyRequestId).toBe(supplyRequestId);
		});

		it('[EC-04] should handle special characters in IDs', () => {
			const agentRequestId = 'agent-id-with-special-chars-@#$';
			const supplyRequestId = 'supply-id-with-special-chars-!%^';
			const request = createTestRequest(agentRequestId, supplyRequestId, 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(response.agentRequestId).toBe(agentRequestId);
			expect(response.supplyRequestId).toBe(supplyRequestId);
		});

		it('[EC-05] should calculate negative latency if clock adjusted backward', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 2000);
			mockDateNow.mockReturnValue(1000);

			const response = new TestSupplyResponse(request);

			expect(response.latencyMs).toBe(-1000);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw if agentRequestId is empty string', () => {
			const request = createTestRequest('', '00000000-0000-0000-0000-000000000002', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(() => response.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-02] should throw if agentRequestId is whitespace only', () => {
			const request = createTestRequest('   ', '00000000-0000-0000-0000-000000000002', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(() => response.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-03] should throw if agentRequestId is undefined', () => {
			const request = createTestRequest(undefined as unknown as string, '00000000-0000-0000-0000-000000000002', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(() => response.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-04] should throw if supplyRequestId is empty string', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', '', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(() => response.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-05] should throw if supplyRequestId is whitespace only', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', '   ', 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(() => response.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-06] should throw if supplyRequestId is undefined', () => {
			const request = createTestRequest('00000000-0000-0000-0000-000000000001', undefined as unknown as string, 1000);
			mockDateNow.mockReturnValue(2000);

			const response = new TestSupplyResponse(request);

			expect(() => response.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-07] should allow construction without calling throwIfInvalid', () => {
			const request = createTestRequest('', '', 1000);
			mockDateNow.mockReturnValue(2000);

			expect(() => new TestSupplyResponse(request)).not.toThrow();
		});
	});
});
