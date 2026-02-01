import { mock } from 'jest-mock-extended';
import type { IRunData } from 'n8n-workflow';

import { getNextExecutionIndex } from '../run-data-utils';

describe('getNextExecutionIndex', () => {
	it('should return 0 if runData is undefined', () => {
		const result = getNextExecutionIndex(undefined);
		expect(result).toBe(0);
	});

	it('should return 0 if runData is empty', () => {
		const result = getNextExecutionIndex({});
		expect(result).toBe(0);
	});

	it('should return the next execution index based on the highest executionIndex in runData', () => {
		const runData = mock<IRunData>({
			node1: [{ executionIndex: 0 }, { executionIndex: 1 }],
			node2: [{ executionIndex: 2 }],
		});
		const result = getNextExecutionIndex(runData);
		expect(result).toBe(3);
	});

	it('should return 1 if all tasks in runData have executionIndex 0', () => {
		const runData = mock<IRunData>({
			node1: [{ executionIndex: 0 }, { executionIndex: 0 }],
			node2: [{ executionIndex: 0 }],
		});
		const result = getNextExecutionIndex(runData);
		expect(result).toBe(1);
	});

	it('should handle runData with mixed executionIndex values', () => {
		const runData = mock<IRunData>({
			node1: [{ executionIndex: 5 }, { executionIndex: 3 }],
			node2: [{ executionIndex: 7 }, { executionIndex: 2 }],
		});
		const result = getNextExecutionIndex(runData);
		expect(result).toBe(8);
	});

	it('should handle runData with missing executionIndex values', () => {
		const runData = mock<IRunData>({
			node1: [{}],
			node2: [{}, {}],
		});
		const result = getNextExecutionIndex(runData);
		expect(result).toBe(0);
	});

	it('should handle runData with negative executionIndex values', () => {
		const runData = mock<IRunData>({
			node1: [{ executionIndex: -5 }, { executionIndex: -10 }],
			node2: [{ executionIndex: -2 }],
		});
		const result = getNextExecutionIndex(runData);
		expect(result).toBe(-1);
	});
});
