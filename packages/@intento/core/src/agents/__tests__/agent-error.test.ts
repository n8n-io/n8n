import { mock } from 'jest-mock-extended';

import { AgentError } from '../agent-error';
import type { AgentRequestBase } from '../agent-request-base';

/**
 * Tests for AgentError
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

describe('AgentError', () => {
	let mockRequest: AgentRequestBase;
	const mockNow = 1704067200000;
	const mockRequestedAt = mockNow - 1500;

	beforeEach(() => {
		mockRequest = mock<AgentRequestBase>({
			agentRequestId: 'test-request-123',
			requestedAt: mockRequestedAt,
		});
		jest.spyOn(Date, 'now').mockReturnValue(mockNow);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should create error with request data', () => {
			const error = new AgentError(mockRequest, 500, 'Test error');

			expect(error.agentRequestId).toBe('test-request-123');
			expect(error.code).toBe(500);
			expect(error.reason).toBe('Test error');
		});

		it('[BL-02] should calculate latencyMs from request timestamp', () => {
			const error = new AgentError(mockRequest, 500, 'Test error');

			expect(error.latencyMs).toBe(1500);
		});

		it('[BL-03] should freeze instance after construction', () => {
			const error = new AgentError(mockRequest, 500, 'Test error');

			expect(Object.isFrozen(error)).toBe(true);
			expect(() => {
				(error as { code: number }).code = 400;
			}).toThrow();
		});

		it('[BL-04] should return complete log metadata', () => {
			const error = new AgentError(mockRequest, 500, 'Test error');

			const metadata = error.asLogMetadata();

			expect(metadata).toEqual({
				agentRequestId: 'test-request-123',
				code: 500,
				reason: 'Test error',
				latencyMs: 1500,
			});
		});

		it('[BL-05] should return data object without agentRequestId', () => {
			const error = new AgentError(mockRequest, 500, 'Test error');

			const dataObject = error.asDataObject();

			expect(dataObject).toEqual({
				code: 500,
				reason: 'Test error',
				latencyMs: 1500,
			});
			expect(dataObject).not.toHaveProperty('agentRequestId');
		});

		it('[BL-06] should accept valid HTTP status codes (100-599)', () => {
			const validCodes = [100, 200, 300, 400, 500, 599];

			for (const code of validCodes) {
				const error = new AgentError(mockRequest, code, 'Test error');

				expect(() => error.throwIfInvalid()).not.toThrow();
			}
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle timeout error code (408)', () => {
			const error = new AgentError(mockRequest, 408, 'Execution timed out');

			expect(error.code).toBe(408);
			expect(() => error.throwIfInvalid()).not.toThrow();
		});

		it('[EC-02] should handle abort error code (499)', () => {
			const error = new AgentError(mockRequest, 499, 'Execution was aborted');

			expect(error.code).toBe(499);
			expect(() => error.throwIfInvalid()).not.toThrow();
		});

		it('[EC-03] should handle unexpected error code (500)', () => {
			const error = new AgentError(mockRequest, 500, 'Unexpected error occurred');

			expect(error.code).toBe(500);
			expect(() => error.throwIfInvalid()).not.toThrow();
		});

		it('[EC-04] should calculate latencyMs immediately at construction', () => {
			const firstNow = mockNow;
			const secondNow = mockNow + 5000;

			jest.spyOn(Date, 'now').mockReturnValueOnce(firstNow);
			const error1 = new AgentError(mockRequest, 500, 'Error 1');

			jest.spyOn(Date, 'now').mockReturnValueOnce(secondNow);
			const error2 = new AgentError(mockRequest, 500, 'Error 2');

			expect(error1.latencyMs).toBe(firstNow - mockRequestedAt);
			expect(error2.latencyMs).toBe(secondNow - mockRequestedAt);
			expect(error1.latencyMs).not.toBe(error2.latencyMs);
		});

		it('[EC-05] should preserve all readonly properties', () => {
			const error = new AgentError(mockRequest, 404, 'Not found');

			expect(() => {
				(error as { agentRequestId: string }).agentRequestId = 'modified';
			}).toThrow();
			expect(() => {
				(error as { code: number }).code = 500;
			}).toThrow();
			expect(() => {
				(error as { reason: string }).reason = 'modified';
			}).toThrow();
			expect(() => {
				(error as { latencyMs: number }).latencyMs = 999;
			}).toThrow();
		});

		it('[EC-06] should handle boundary status codes (100, 599)', () => {
			const error100 = new AgentError(mockRequest, 100, 'Continue');
			const error599 = new AgentError(mockRequest, 599, 'Network error');

			expect(() => error100.throwIfInvalid()).not.toThrow();
			expect(() => error599.throwIfInvalid()).not.toThrow();
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw Error if agentRequestId empty', () => {
			const emptyRequest = mock<AgentRequestBase>({
				agentRequestId: '',
				requestedAt: mockRequestedAt,
			});
			const error = new AgentError(emptyRequest, 500, 'Test error');

			expect(() => error.throwIfInvalid()).toThrow(Error);
			expect(() => error.throwIfInvalid()).toThrow('"agentRequestId" is required');
		});

		it('[EH-02] should throw Error if reason empty', () => {
			const error = new AgentError(mockRequest, 500, '');

			expect(() => error.throwIfInvalid()).toThrow(Error);
			expect(() => error.throwIfInvalid()).toThrow('"reason" is required');
		});

		it('[EH-03] should throw RangeError if code < 100', () => {
			const error = new AgentError(mockRequest, 99, 'Invalid code');

			expect(() => error.throwIfInvalid()).toThrow(RangeError);
			expect(() => error.throwIfInvalid()).toThrow('"code" must be a valid HTTP status code (100-599)');
		});

		it('[EH-04] should throw RangeError if code > 599', () => {
			const error = new AgentError(mockRequest, 600, 'Invalid code');

			expect(() => error.throwIfInvalid()).toThrow(RangeError);
			expect(() => error.throwIfInvalid()).toThrow('"code" must be a valid HTTP status code (100-599)');
		});

		it('[EH-05] should pass validation with all valid fields', () => {
			const error = new AgentError(mockRequest, 500, 'Valid error');

			expect(() => error.throwIfInvalid()).not.toThrow();
		});

		it('[EH-06] should validate after construction (not throw)', () => {
			const error = new AgentError(mockRequest, 200, 'Success treated as error');

			error.throwIfInvalid();

			expect(error.code).toBe(200);
			expect(error.reason).toBe('Success treated as error');
		});
	});
});
