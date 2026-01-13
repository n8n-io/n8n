import type { IDataObject } from 'n8n-workflow';

import type { AgentRequestBase } from '../agent-request-base';
import { AgentResponseBase } from '../agent-response-base';

/**
 * Tests for AgentResponseBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

// Concrete test implementation of abstract AgentResponseBase
class TestAgentResponse extends AgentResponseBase {
	asDataObject(): IDataObject {
		return { test: 'data' };
	}
}

describe('AgentResponseBase', () => {
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
			const mockRequest = { agentRequestId, requestedAt: 1000 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			expect(response.agentRequestId).toBe(agentRequestId);
		});

		it('[BL-02] should calculate latencyMs from request timestamp', () => {
			const mockRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001', requestedAt: 1000 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			expect(response.latencyMs).toBe(1500);
		});

		it('[BL-03] should set readonly agentRequestId', () => {
			const mockRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001', requestedAt: 1000 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			// TypeScript readonly is compile-time only, verify property exists and is set
			expect(response.agentRequestId).toBe('00000000-0000-0000-0000-000000000001');
			expect(Object.keys(response)).toContain('agentRequestId');
		});

		it('[BL-04] should set readonly latencyMs', () => {
			const mockRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001', requestedAt: 1000 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			// TypeScript readonly is compile-time only, verify property exists and is set
			expect(response.latencyMs).toBe(1500);
			expect(Object.keys(response)).toContain('latencyMs');
		});
		it('[BL-05] should return complete log metadata', () => {
			const agentRequestId = '00000000-0000-0000-0000-000000000001';
			const mockRequest = { agentRequestId, requestedAt: 1000 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			expect(response.asLogMetadata()).toEqual({
				agentRequestId,
				latencyMs: 1500,
			});
		});

		it('[BL-06] should pass validation with valid agentRequestId', () => {
			const mockRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001', requestedAt: 1000 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			expect(() => response.throwIfInvalid()).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should calculate different latencies for different requests', () => {
			const mockRequest1 = { agentRequestId: '00000000-0000-0000-0000-000000000001', requestedAt: 1000 } as AgentRequestBase;
			const mockRequest2 = { agentRequestId: '00000000-0000-0000-0000-000000000002', requestedAt: 500 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response1 = new TestAgentResponse(mockRequest1);
			const response2 = new TestAgentResponse(mockRequest2);

			expect(response1.latencyMs).toBe(1500);
			expect(response2.latencyMs).toBe(2000);
			expect(response1.latencyMs).not.toBe(response2.latencyMs);
		});

		it('[EC-02] should preserve exact agentRequestId from request', () => {
			const specialId = '12345678-abcd-ef01-2345-67890abcdef0';
			const mockRequest = { agentRequestId: specialId, requestedAt: 1000 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			expect(response.agentRequestId).toBe(specialId);
		});

		it('[EC-03] should calculate latency at exact construction time', () => {
			const mockRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001', requestedAt: 1000 } as AgentRequestBase;
			const firstNow = 2500;
			const secondNow = 3000;

			mockDateNow.mockReturnValueOnce(firstNow);
			const response1 = new TestAgentResponse(mockRequest);

			mockDateNow.mockReturnValueOnce(secondNow);
			const response2 = new TestAgentResponse(mockRequest);

			expect(response1.latencyMs).toBe(firstNow - 1000);
			expect(response2.latencyMs).toBe(secondNow - 1000);
		});

		it('[EC-04] should handle zero latency (same timestamp)', () => {
			const timestamp = 5000;
			const mockRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001', requestedAt: timestamp } as AgentRequestBase;
			mockDateNow.mockReturnValue(timestamp);

			const response = new TestAgentResponse(mockRequest);

			expect(response.latencyMs).toBe(0);
		});

		it('[EC-05] should handle large latency values', () => {
			const mockRequest = { agentRequestId: '00000000-0000-0000-0000-000000000001', requestedAt: 1000 } as AgentRequestBase;
			const largeTimestamp = 1000 + 3600000; // 1 hour later
			mockDateNow.mockReturnValue(largeTimestamp);

			const response = new TestAgentResponse(mockRequest);

			expect(response.latencyMs).toBe(3600000);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw Error if agentRequestId is empty string', () => {
			const mockRequest = {
				agentRequestId: '' as `${string}-${string}-${string}-${string}-${string}`,
				requestedAt: 1000,
			} as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			expect(() => response.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-02] should throw Error if agentRequestId is whitespace', () => {
			const mockRequest = {
				agentRequestId: '   ' as `${string}-${string}-${string}-${string}-${string}`,
				requestedAt: 1000,
			} as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			expect(() => response.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-03] should throw Error if agentRequestId is missing', () => {
			const mockRequest = { agentRequestId: undefined as unknown as string, requestedAt: 1000 } as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			const response = new TestAgentResponse(mockRequest);

			expect(() => response.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-04] should allow construction without validation', () => {
			const mockRequest = {
				agentRequestId: '' as `${string}-${string}-${string}-${string}-${string}`,
				requestedAt: 1000,
			} as AgentRequestBase;
			mockDateNow.mockReturnValue(2500);

			expect(() => new TestAgentResponse(mockRequest)).not.toThrow();
		});
	});
});
