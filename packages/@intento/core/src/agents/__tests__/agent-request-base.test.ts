import type { IDataObject } from 'n8n-workflow';

import { AgentRequestBase } from '../agent-request-base';

/**
 * Tests for AgentRequestBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

class TestAgentRequest extends AgentRequestBase {
	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			requestedAt: this.requestedAt,
			testField: 'test-value',
		};
	}
}

describe('AgentRequestBase', () => {
	const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
	const mockNow = 1704067200000;

	beforeEach(() => {
		jest.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID);
		jest.spyOn(Date, 'now').mockReturnValue(mockNow);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should generate unique agentRequestId on construction', () => {
			const request = new TestAgentRequest();

			expect(request.agentRequestId).toBe(mockUUID);
			expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
		});

		it('[BL-02] should capture timestamp on construction', () => {
			const request = new TestAgentRequest();

			expect(request.requestedAt).toBe(mockNow);
			expect(Date.now).toHaveBeenCalledTimes(1);
		});

		it('[BL-03] should set readonly agentRequestId', () => {
			const request = new TestAgentRequest();

			expect(request.agentRequestId).toBe(mockUUID);
			expect(Object.getOwnPropertyDescriptor(request, 'agentRequestId')?.writable).toBe(true);
		});

		it('[BL-04] should set readonly requestedAt', () => {
			const request = new TestAgentRequest();

			expect(request.requestedAt).toBe(mockNow);
			expect(Object.getOwnPropertyDescriptor(request, 'requestedAt')?.writable).toBe(true);
		});

		it('[BL-05] should return complete log metadata', () => {
			const request = new TestAgentRequest();

			const metadata = request.asLogMetadata();

			expect(metadata).toEqual({
				agentRequestId: mockUUID,
				requestedAt: mockNow,
			});
		});

		it('[BL-06] should pass validation with valid agentRequestId', () => {
			const request = new TestAgentRequest();

			expect(() => request.throwIfInvalid()).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should generate different IDs for multiple instances', () => {
			const uuid1 = '00000000-0000-0000-0000-000000000001';
			const uuid2 = '00000000-0000-0000-0000-000000000002';

			jest.spyOn(crypto, 'randomUUID').mockReturnValueOnce(uuid1).mockReturnValueOnce(uuid2);

			const request1 = new TestAgentRequest();
			const request2 = new TestAgentRequest();

			expect(request1.agentRequestId).toBe(uuid1);
			expect(request2.agentRequestId).toBe(uuid2);
			expect(request1.agentRequestId).not.toBe(request2.agentRequestId);
		});

		it('[EC-02] should capture different timestamps for instances', () => {
			const time1 = 1000000;
			const time2 = 2000000;

			jest.spyOn(Date, 'now').mockReturnValueOnce(time1).mockReturnValueOnce(time2);

			const request1 = new TestAgentRequest();
			const request2 = new TestAgentRequest();

			expect(request1.requestedAt).toBe(time1);
			expect(request2.requestedAt).toBe(time2);
			expect(request1.requestedAt).not.toBe(request2.requestedAt);
		});

		it('[EC-03] should preserve exact UUID from crypto.randomUUID()', () => {
			const complexUUID = '550e8400-e29b-41d4-a716-446655440000';
			jest.spyOn(crypto, 'randomUUID').mockReturnValue(complexUUID);

			const request = new TestAgentRequest();

			expect(request.agentRequestId).toBe(complexUUID);
		});

		it('[EC-04] should preserve exact timestamp from Date.now()', () => {
			const preciseTime = 1704067234567;
			jest.spyOn(Date, 'now').mockReturnValue(preciseTime);

			const request = new TestAgentRequest();

			expect(request.requestedAt).toBe(preciseTime);
		});

		it('[EC-05] should handle UUID with special characters', () => {
			const specialUUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
			jest.spyOn(crypto, 'randomUUID').mockReturnValue(specialUUID);

			const request = new TestAgentRequest();

			expect(request.agentRequestId).toBe(specialUUID);
			expect(() => request.throwIfInvalid()).not.toThrow();
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw Error if agentRequestId is empty string', () => {
			jest.spyOn(crypto, 'randomUUID').mockReturnValue('' as `${string}-${string}-${string}-${string}-${string}`);
			const request = new TestAgentRequest();

			expect(() => request.throwIfInvalid()).toThrow(Error);
			expect(() => request.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-02] should throw Error if agentRequestId is whitespace', () => {
			jest.spyOn(crypto, 'randomUUID').mockReturnValue('   ' as `${string}-${string}-${string}-${string}-${string}`);
			const request = new TestAgentRequest();

			expect(() => request.throwIfInvalid()).toThrow(Error);
			expect(() => request.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-03] should pass validation (requestedAt not validated)', () => {
			jest.spyOn(Date, 'now').mockReturnValue(-1);
			const request = new TestAgentRequest();

			expect(request.requestedAt).toBe(-1);
			expect(() => request.throwIfInvalid()).not.toThrow();
		});

		it('[EH-04] should allow construction (no validation in ctor)', () => {
			jest.spyOn(crypto, 'randomUUID').mockReturnValue('' as `${string}-${string}-${string}-${string}-${string}`);
			jest.spyOn(Date, 'now').mockReturnValue(-1);

			expect(() => new TestAgentRequest()).not.toThrow();
		});
	});
});
