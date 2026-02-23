import { describe, it, expect } from '@jest/globals';

import {
	mapGuardrailResultToUserResult,
	wrapResultsToNodeExecutionData,
} from '../../helpers/mappers';
import {
	GuardrailError,
	type GuardrailResult,
	type GuardrailUserResult,
} from '../../actions/types';

describe('mappers helper', () => {
	describe('mapGuardrailResultToUserResult', () => {
		it('should map a successful GuardrailResult to GuardrailUserResult', () => {
			const result: GuardrailResult = {
				guardrailName: 'test-guardrail',
				tripwireTriggered: true,
				confidenceScore: 0.8,
				executionFailed: false,
				info: {
					someInfo: 'value',
					maskEntities: { email: ['test@example.com'] },
				},
			};

			const userResult = mapGuardrailResultToUserResult(result);

			expect(userResult).toEqual({
				name: 'test-guardrail',
				triggered: true,
				confidenceScore: 0.8,
				executionFailed: false,
				exception: undefined,
				info: {
					someInfo: 'value',
				},
			});
		});

		it('should map a GuardrailResult with exception to GuardrailUserResult', () => {
			const error = new Error('Test error');
			const result: GuardrailResult = {
				guardrailName: 'test-guardrail',
				tripwireTriggered: false,
				confidenceScore: 0.3,
				executionFailed: true,
				originalException: error,
				info: {
					errorDetails: 'Something went wrong',
				},
			};

			const userResult = mapGuardrailResultToUserResult(result);

			expect(userResult).toEqual({
				name: 'test-guardrail',
				triggered: false,
				confidenceScore: 0.3,
				executionFailed: true,
				exception: {
					name: 'Error',
					description: 'Test error',
				},
				info: {
					errorDetails: 'Something went wrong',
				},
			});
		});

		it('should map a fulfilled PromiseSettledResult to GuardrailUserResult', () => {
			const result: PromiseFulfilledResult<GuardrailResult> = {
				status: 'fulfilled',
				value: {
					guardrailName: 'fulfilled-guardrail',
					tripwireTriggered: false,
					confidenceScore: 0.2,
					executionFailed: false,
					info: {
						success: true,
						maskEntities: { phone: ['555-123-4567'] },
					},
				},
			};

			const userResult = mapGuardrailResultToUserResult(result);

			expect(userResult).toEqual({
				name: 'fulfilled-guardrail',
				triggered: false,
				confidenceScore: 0.2,
				executionFailed: false,
				exception: undefined,
				info: {
					success: true,
				},
			});
		});

		it('should map a rejected PromiseSettledResult with GuardrailError to GuardrailUserResult', () => {
			const guardrailError = new GuardrailError(
				'rejected-guardrail',
				'Guardrail failed',
				'Detailed error',
			);
			const result: PromiseRejectedResult = {
				status: 'rejected',
				reason: guardrailError,
			};

			const userResult = mapGuardrailResultToUserResult(result);

			expect(userResult).toEqual({
				name: 'rejected-guardrail',
				triggered: true,
				executionFailed: true,
				exception: {
					name: 'Error', // GuardrailError extends Error, so .name is 'Error'
					description: 'Guardrail failed',
				},
			});
		});

		it('should map a rejected PromiseSettledResult with generic Error to GuardrailUserResult', () => {
			const error = new Error('Generic error occurred');
			const result: PromiseRejectedResult = {
				status: 'rejected',
				reason: error,
			};

			const userResult = mapGuardrailResultToUserResult(result);

			expect(userResult).toEqual({
				name: 'Unknown Guardrail',
				triggered: true,
				executionFailed: true,
				exception: {
					name: 'Error',
					description: 'Generic error occurred',
				},
			});
		});

		it('should map a rejected PromiseSettledResult with non-Error reason to GuardrailUserResult', () => {
			const result: PromiseRejectedResult = {
				status: 'rejected',
				reason: 'String error',
			};

			const userResult = mapGuardrailResultToUserResult(result);

			expect(userResult).toEqual({
				name: 'Unknown Guardrail',
				triggered: true,
				executionFailed: true,
				exception: {
					name: 'Unknown Exception',
					description: 'Unknown exception occurred',
				},
			});
		});

		it('should handle GuardrailResult with undefined info', () => {
			const result = {
				guardrailName: 'no-info-guardrail',
				tripwireTriggered: false,
				confidenceScore: 0.5,
				executionFailed: false,
			} as GuardrailResult;

			const userResult = mapGuardrailResultToUserResult(result);

			expect(userResult).toEqual({
				name: 'no-info-guardrail',
				triggered: false,
				confidenceScore: 0.5,
				executionFailed: false,
				exception: undefined,
				info: {},
			});
		});

		it('should handle GuardrailResult with empty info object', () => {
			const result: GuardrailResult = {
				guardrailName: 'empty-info-guardrail',
				tripwireTriggered: true,
				confidenceScore: 0.9,
				executionFailed: false,
				info: {},
			};

			const userResult = mapGuardrailResultToUserResult(result);

			expect(userResult).toEqual({
				name: 'empty-info-guardrail',
				triggered: true,
				confidenceScore: 0.9,
				executionFailed: false,
				exception: undefined,
				info: {},
			});
		});
	});

	describe('wrapResultsToNodeExecutionData', () => {
		it('should return empty array when no checks provided', () => {
			const checks: GuardrailUserResult[] = [];
			const itemIndex = 0;

			const result = wrapResultsToNodeExecutionData(checks, itemIndex);

			expect(result).toEqual([]);
		});

		it('should wrap single check result to node execution data', () => {
			const checks: GuardrailUserResult[] = [
				{
					name: 'test-guardrail',
					triggered: true,
					confidenceScore: 0.8,
					executionFailed: false,
					info: { test: 'value' },
				},
			];
			const itemIndex = 0;

			const result = wrapResultsToNodeExecutionData(checks, itemIndex);

			expect(result).toEqual([
				{
					json: { checks },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should wrap multiple check results to node execution data', () => {
			const checks: GuardrailUserResult[] = [
				{
					name: 'guardrail-1',
					triggered: true,
					confidenceScore: 0.8,
					executionFailed: false,
					info: { test1: 'value1' },
				},
				{
					name: 'guardrail-2',
					triggered: false,
					confidenceScore: 0.3,
					executionFailed: false,
					info: { test2: 'value2' },
				},
			];
			const itemIndex = 2;

			const result = wrapResultsToNodeExecutionData(checks, itemIndex);

			expect(result).toEqual([
				{
					json: { checks },
					pairedItem: { item: 2 },
				},
			]);
		});

		it('should handle checks with exceptions', () => {
			const checks: GuardrailUserResult[] = [
				{
					name: 'error-guardrail',
					triggered: true,
					executionFailed: true,
					exception: {
						name: 'Error',
						description: 'Something went wrong',
					},
				},
			];
			const itemIndex = 1;

			const result = wrapResultsToNodeExecutionData(checks, itemIndex);

			expect(result).toEqual([
				{
					json: { checks },
					pairedItem: { item: 1 },
				},
			]);
		});

		it('should handle checks with minimal data', () => {
			const checks: GuardrailUserResult[] = [
				{
					name: 'minimal-guardrail',
					triggered: false,
				},
			];
			const itemIndex = 5;

			const result = wrapResultsToNodeExecutionData(checks, itemIndex);

			expect(result).toEqual([
				{
					json: { checks },
					pairedItem: { item: 5 },
				},
			]);
		});
	});
});
