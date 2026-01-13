import type { TelemetryValidationStatus } from '../validation/types';
import { WorkflowState } from '../workflow-state';

describe('WorkflowState.validationHistory reducer', () => {
	// Helper to create TelemetryValidationStatus avoiding ESLint naming-convention warnings
	const createValidationStatus = (
		violations: Array<{ name: string; result: 'pass' | 'fail' }>,
	): TelemetryValidationStatus => {
		const status: Record<string, 'pass' | 'fail'> = {};
		for (const violation of violations) {
			status[violation.name] = violation.result;
		}
		return status as TelemetryValidationStatus;
	};

	it('should append new validation history to existing history', () => {
		const reducer = WorkflowState.spec.validationHistory.operator;

		const existingHistory: TelemetryValidationStatus[] = [
			createValidationStatus([
				{ name: 'tool-node-has-no-parameters', result: 'pass' },
				{ name: 'agent-static-prompt', result: 'fail' },
				{ name: 'workflow-has-no-nodes', result: 'pass' },
			]),
			createValidationStatus([
				{ name: 'tool-node-has-no-parameters', result: 'fail' },
				{ name: 'agent-static-prompt', result: 'pass' },
				{ name: 'workflow-has-no-nodes', result: 'pass' },
			]),
		];
		const newHistory: TelemetryValidationStatus[] = [
			createValidationStatus([
				{ name: 'tool-node-has-no-parameters', result: 'pass' },
				{ name: 'agent-static-prompt', result: 'pass' },
				{ name: 'workflow-has-no-nodes', result: 'pass' },
			]),
		];

		const result = reducer(existingHistory, newHistory);

		expect(result).toHaveLength(3);
		expect(result[0]).toBe(existingHistory[0]);
		expect(result[1]).toBe(existingHistory[1]);
		expect(result[2]).toBe(newHistory[0]);
	});

	it('should handle empty existing history with new updates', () => {
		const reducer = WorkflowState.spec.validationHistory.operator;

		const newHistory: TelemetryValidationStatus[] = [
			createValidationStatus([
				{ name: 'node-missing-required-input', result: 'pass' },
				{ name: 'node-merge-single-input', result: 'fail' },
			]),
		];

		const result = reducer([], newHistory);

		expect(result).toEqual(newHistory);
		expect(result[0]).toBe(newHistory[0]);
	});

	it('should handle multiple updates sequentially', () => {
		type ReducerFn = (
			x: TelemetryValidationStatus[],
			y: TelemetryValidationStatus[] | undefined | null,
		) => TelemetryValidationStatus[];
		const reducer = WorkflowState.spec.validationHistory.operator as ReducerFn;

		let history: TelemetryValidationStatus[] = [];

		// First update
		const update1: TelemetryValidationStatus[] = [
			createValidationStatus([{ name: 'tool-node-has-no-parameters', result: 'pass' }]),
		];
		history = reducer(history, update1);
		expect(history).toHaveLength(1);
		expect(history[0]).toBe(update1[0]);

		// Second update (undefined - should not change)
		const prevHistory = history;
		history = reducer(history, undefined);
		expect(history).toBe(prevHistory);
		expect(history).toHaveLength(1);

		// Third update
		const update2: TelemetryValidationStatus[] = [
			createValidationStatus([{ name: 'agent-static-prompt', result: 'fail' }]),
		];
		history = reducer(history, update2);
		expect(history).toHaveLength(2);
		expect(history[0]).toBe(update1[0]);
		expect(history[1]).toBe(update2[0]);

		// Fourth update (empty array - should not change)
		const prevHistory2 = history;
		history = reducer(history, []);
		expect(history).toBe(prevHistory2);
		expect(history).toHaveLength(2);
	});
});

describe('WorkflowState.techniqueCategories reducer', () => {
	it('should append new technique categories to existing categories', () => {
		const reducer = WorkflowState.spec.techniqueCategories.operator;

		const existingCategories = ['scraping', 'data-transformation'];
		const newCategories = ['notifications', 'scheduling'];

		const result = reducer(existingCategories, newCategories);

		expect(result).toHaveLength(4);
		expect(result).toEqual(['scraping', 'data-transformation', 'notifications', 'scheduling']);
	});

	it('should return existing categories when update is undefined', () => {
		type ReducerFn = (x: string[], y: string[] | undefined | null) => string[];
		const reducer = WorkflowState.spec.techniqueCategories.operator as ReducerFn;

		const existingCategories = ['api-integration', 'webhook'];

		const result = reducer(existingCategories, undefined);

		expect(result).toEqual(existingCategories);
		expect(result).toBe(existingCategories);
	});

	it('should handle empty existing categories with new updates', () => {
		const reducer = WorkflowState.spec.techniqueCategories.operator;

		const newCategories = ['email-automation', 'file-processing'];

		const result = reducer([], newCategories);

		expect(result).toEqual(newCategories);
		expect(result[0]).toBe(newCategories[0]);
	});
});
