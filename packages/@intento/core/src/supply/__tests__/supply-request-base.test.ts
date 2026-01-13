import type { IDataObject } from 'n8n-workflow';

import type { AgentRequestBase } from '../../agents/agent-request-base';
import { SupplyRequestBase } from '../supply-request-base';

/**
 * Tests for SupplyRequestBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

// Concrete test implementation of abstract SupplyRequestBase
class TestSupplyRequest extends SupplyRequestBase {
	asDataObject(): IDataObject {
		return { test: 'data' };
	}
}

describe('SupplyRequestBase', () => {
	let mockCryptoRandomUUID: jest.SpyInstance;
	let mockDateNow: jest.SpyInstance;

	beforeEach(() => {
		mockCryptoRandomUUID = jest.spyOn(crypto, 'randomUUID');
		mockDateNow = jest.spyOn(Date, 'now');
	});

	afterEach(() => {
		mockCryptoRandomUUID.mockRestore();
		mockDateNow.mockRestore();
	});

	describe('business logic', () => {
		it('[BL-01] should copy agentRequestId from parent request', () => {
			const agentRequestId = '00000000-0000-0000-0000-000000000001';
			const mockParentRequest = { agentRequestId } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(request.agentRequestId).toBe(agentRequestId);
		});

		it('[BL-02] should generate unique supplyRequestId', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			const expectedUuid = '00000000-0000-0000-0000-000000000002';
			mockCryptoRandomUUID.mockReturnValue(expectedUuid as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(request.supplyRequestId).toBe(expectedUuid);
			expect(mockCryptoRandomUUID).toHaveBeenCalledTimes(1);
		});

		it('[BL-03] should capture current timestamp', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			const expectedTimestamp = 5000;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(expectedTimestamp);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(request.requestedAt).toBe(expectedTimestamp);
			expect(mockDateNow).toHaveBeenCalledTimes(1);
		});

		it('[BL-04] should set readonly agentRequestId', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			// TypeScript readonly is compile-time only, verify property exists and is set
			expect(request.agentRequestId).toBe('00000000-0000-0000-0000-000000000001');
			expect(Object.keys(request)).toContain('agentRequestId');
		});

		it('[BL-05] should set readonly supplyRequestId', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			// TypeScript readonly is compile-time only, verify property exists and is set
			expect(request.supplyRequestId).toBe('00000000-0000-0000-0000-000000000002');
			expect(Object.keys(request)).toContain('supplyRequestId');
		});

		it('[BL-06] should set readonly requestedAt', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			// TypeScript readonly is compile-time only, verify property exists and is set
			expect(request.requestedAt).toBe(1000);
			expect(Object.keys(request)).toContain('requestedAt');
		});

		it('[BL-07] should return complete log metadata', () => {
			const agentRequestId = '00000000-0000-0000-0000-000000000001';
			const supplyRequestId = '00000000-0000-0000-0000-000000000002';
			const mockParentRequest = { agentRequestId } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue(supplyRequestId as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(5000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(request.asLogMetadata()).toEqual({
				agentRequestId,
				supplyRequestId,
				requestedAt: 5000,
			});
		});

		it('[BL-08] should pass validation with valid fields', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(() => request.throwIfInvalid()).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should generate different supplyRequestIds for multiple instances', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			const uuid1 = '00000000-0000-0000-0000-000000000002';
			const uuid2 = '00000000-0000-0000-0000-000000000003';
			mockCryptoRandomUUID
				.mockReturnValueOnce(uuid1 as `${string}-${string}-${string}-${string}-${string}`)
				.mockReturnValueOnce(uuid2 as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request1 = new TestSupplyRequest(mockParentRequest);
			const request2 = new TestSupplyRequest(mockParentRequest);

			expect(request1.supplyRequestId).toBe(uuid1);
			expect(request2.supplyRequestId).toBe(uuid2);
			expect(request1.supplyRequestId).not.toBe(request2.supplyRequestId);
		});

		it('[EC-02] should capture different timestamps for multiple instances', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			const timestamp1 = 1000;
			const timestamp2 = 2000;
			mockDateNow.mockReturnValueOnce(timestamp1).mockReturnValueOnce(timestamp2);

			const request1 = new TestSupplyRequest(mockParentRequest);
			const request2 = new TestSupplyRequest(mockParentRequest);

			expect(request1.requestedAt).toBe(timestamp1);
			expect(request2.requestedAt).toBe(timestamp2);
			expect(request1.requestedAt).not.toBe(request2.requestedAt);
		});

		it('[EC-03] should preserve exact agentRequestId from parent', () => {
			const specialId = '12345678-abcd-ef01-2345-67890abcdef0';
			const mockParentRequest = { agentRequestId: specialId } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(request.agentRequestId).toBe(specialId);
		});

		it('[EC-04] should preserve exact UUID from crypto.randomUUID()', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			const specialUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
			mockCryptoRandomUUID.mockReturnValue(specialUuid as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(request.supplyRequestId).toBe(specialUuid);
		});

		it('[EC-05] should preserve exact timestamp from Date.now()', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			const specialTimestamp = 1234567890123;
			mockDateNow.mockReturnValue(specialTimestamp);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(request.requestedAt).toBe(specialTimestamp);
		});

		it('[EC-06] should handle special characters in agentRequestId', () => {
			const specialId = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
			const mockParentRequest = { agentRequestId: specialId } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(request.agentRequestId).toBe(specialId);
			expect(() => request.throwIfInvalid()).not.toThrow();
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw Error if agentRequestId is empty', () => {
			const mockParentRequest = { agentRequestId: '' as `${string}-${string}-${string}-${string}-${string}` } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(() => request.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-02] should throw Error if agentRequestId is whitespace', () => {
			const mockParentRequest = { agentRequestId: '   ' as `${string}-${string}-${string}-${string}-${string}` } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(() => request.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-03] should throw Error if supplyRequestId is empty', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(() => request.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-04] should throw Error if supplyRequestId is whitespace', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('   ' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(() => request.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-05] should throw Error if agentRequestId is undefined', () => {
			const mockParentRequest = { agentRequestId: undefined as unknown as string } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('00000000-0000-0000-0000-000000000002' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(() => request.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-06] should throw Error if supplyRequestId is undefined', () => {
			const mockParentRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue(undefined as unknown as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			const request = new TestSupplyRequest(mockParentRequest);

			expect(() => request.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-07] should allow construction without validation', () => {
			const mockParentRequest = { agentRequestId: '' } as AgentRequestBase;
			mockCryptoRandomUUID.mockReturnValue('' as `${string}-${string}-${string}-${string}-${string}`);
			mockDateNow.mockReturnValue(1000);

			expect(() => new TestSupplyRequest(mockParentRequest)).not.toThrow();
		});
	});
});
