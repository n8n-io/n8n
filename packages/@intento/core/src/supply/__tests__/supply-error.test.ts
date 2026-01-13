import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { SupplyError } from '../supply-error';
import type { SupplyRequestBase } from '../supply-request-base';

/**
 * Tests for SupplyError
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

describe('SupplyError', () => {
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
			const mockRequest = {
				agentRequestId,
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(error.agentRequestId).toBe(agentRequestId);
		});

		it('[BL-02] should copy supplyRequestId from request', () => {
			const supplyRequestId = '00000000-0000-0000-0000-000000000002';
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId,
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(error.supplyRequestId).toBe(supplyRequestId);
		});

		it('[BL-03] should calculate latencyMs from request timestamp', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(error.latencyMs).toBe(1500);
		});

		it('[BL-04] should set code from constructor parameter', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 408, 'Test error', false);

			expect(error.code).toBe(408);
		});

		it('[BL-05] should set reason from constructor parameter', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Custom error message', false);

			expect(error.reason).toBe('Custom error message');
		});

		it('[BL-06] should set isRetriable from constructor parameter', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const errorRetriable = new SupplyError(mockRequest, 500, 'Test error', true);
			const errorNonRetriable = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(errorRetriable.isRetriable).toBe(true);
			expect(errorNonRetriable.isRetriable).toBe(false);
		});

		it('[BL-07] should return complete log metadata', () => {
			const agentRequestId = '00000000-0000-0000-0000-000000000001';
			const supplyRequestId = '00000000-0000-0000-0000-000000000002';
			const mockRequest = {
				agentRequestId,
				supplyRequestId,
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 408, 'Timeout error', true);

			expect(error.asLogMetadata()).toEqual({
				agentRequestId,
				supplyRequestId,
				code: 408,
				reason: 'Timeout error',
				isRetriable: true,
				latencyMs: 1500,
			});
		});

		it('[BL-08] should return minimal data object', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 499, 'Abort error', false);

			expect(error.asDataObject()).toEqual({
				code: 499,
				reason: 'Abort error',
				latencyMs: 1500,
			});
		});

		it('[BL-09] should convert to NodeOperationError', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			const mockNode = { name: 'TestNode', type: 'test' } as INode;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Operation failed', false);
			const nodeError = error.asError(mockNode);

			expect(nodeError).toBeInstanceOf(NodeOperationError);
			expect(nodeError.message).toContain('Operation failed');
		});

		it('[BL-10] should pass validation with all valid fields', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Valid error', false);

			expect(() => error.throwIfInvalid()).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle different HTTP status codes', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error408 = new SupplyError(mockRequest, 408, 'Timeout', false);
			const error499 = new SupplyError(mockRequest, 499, 'Abort', false);
			const error500 = new SupplyError(mockRequest, 500, 'Server error', false);

			expect(error408.code).toBe(408);
			expect(error499.code).toBe(499);
			expect(error500.code).toBe(500);
		});

		it('[EC-02] should calculate different latencies for different timestamps', () => {
			const mockRequest1 = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			const mockRequest2 = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 500,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error1 = new SupplyError(mockRequest1, 500, 'Error 1', false);
			const error2 = new SupplyError(mockRequest2, 500, 'Error 2', false);

			expect(error1.latencyMs).toBe(1500);
			expect(error2.latencyMs).toBe(2000);
		});

		it('[EC-03] should preserve exact IDs from request', () => {
			const agentRequestId = '12345678-abcd-ef01-2345-67890abcdef0';
			const supplyRequestId = '98765432-fedc-ba10-9876-543210fedcba';
			const mockRequest = {
				agentRequestId,
				supplyRequestId,
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(error.agentRequestId).toBe(agentRequestId);
			expect(error.supplyRequestId).toBe(supplyRequestId);
		});

		it('[EC-04] should handle zero latency (same timestamp)', () => {
			const timestamp = 5000;
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: timestamp,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(timestamp);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(error.latencyMs).toBe(0);
		});

		it('[EC-05] should handle large latency values', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			const largeTimestamp = 1000 + 3600000; // 1 hour later
			mockDateNow.mockReturnValue(largeTimestamp);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(error.latencyMs).toBe(3600000);
		});

		it('[EC-06] should handle isRetriable true and false', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const retriableError = new SupplyError(mockRequest, 500, 'Retriable', true);
			const nonRetriableError = new SupplyError(mockRequest, 500, 'Non-retriable', false);

			expect(retriableError.isRetriable).toBe(true);
			expect(nonRetriableError.isRetriable).toBe(false);
		});

		it('[EC-07] should handle boundary HTTP codes (100, 599)', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error100 = new SupplyError(mockRequest, 100, 'Continue', false);
			const error599 = new SupplyError(mockRequest, 599, 'Network error', false);

			expect(() => error100.throwIfInvalid()).not.toThrow();
			expect(() => error599.throwIfInvalid()).not.toThrow();
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw Error if agentRequestId is empty', () => {
			const mockRequest = {
				agentRequestId: '' as `${string}-${string}-${string}-${string}-${string}`,
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(() => error.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-02] should throw Error if agentRequestId is whitespace', () => {
			const mockRequest = {
				agentRequestId: '   ' as `${string}-${string}-${string}-${string}-${string}`,
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(() => error.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-03] should throw Error if supplyRequestId is empty', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '' as `${string}-${string}-${string}-${string}-${string}`,
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(() => error.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-04] should throw Error if supplyRequestId is whitespace', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '   ' as `${string}-${string}-${string}-${string}-${string}`,
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(() => error.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-05] should throw Error if reason is empty', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, '', false);

			expect(() => error.throwIfInvalid()).toThrow('"reason" is required');
		});

		it('[EH-06] should throw Error if reason is whitespace', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, '   ', false);

			expect(() => error.throwIfInvalid()).toThrow('"reason" is required');
		});

		it('[EH-07] should throw RangeError if code is below 100', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 99, 'Test error', false);

			expect(() => error.throwIfInvalid()).toThrow(RangeError);
			expect(() => error.throwIfInvalid()).toThrow('"code" must be a valid HTTP status code (100-599)');
		});

		it('[EH-08] should throw RangeError if code is above 599', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 600, 'Test error', false);

			expect(() => error.throwIfInvalid()).toThrow(RangeError);
			expect(() => error.throwIfInvalid()).toThrow('"code" must be a valid HTTP status code (100-599)');
		});

		it('[EH-09] should throw Error if agentRequestId is undefined', () => {
			const mockRequest = {
				agentRequestId: undefined as unknown as string,
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(() => error.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-10] should throw Error if supplyRequestId is undefined', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: undefined as unknown as string,
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, 'Test error', false);

			expect(() => error.throwIfInvalid()).toThrow('"supplyRequestId" is required');
		});

		it('[EH-11] should throw Error if reason is undefined', () => {
			const mockRequest = {
				agentRequestId: '00000000-0000-0000-0000-000000000001',
				supplyRequestId: '00000000-0000-0000-0000-000000000002',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			const error = new SupplyError(mockRequest, 500, undefined as unknown as string, false);

			expect(() => error.throwIfInvalid()).toThrow('"reason" is required');
		});

		it('[EH-12] should allow construction without validation', () => {
			const mockRequest = {
				agentRequestId: '',
				supplyRequestId: '',
				requestedAt: 1000,
			} as SupplyRequestBase;
			mockDateNow.mockReturnValue(2500);

			expect(() => new SupplyError(mockRequest, 99, '', false)).not.toThrow();
		});
	});
});
