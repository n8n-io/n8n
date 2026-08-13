import type { IRunData } from 'n8n-workflow';

import { TestDiffService } from '../test-diff.service';
import type { NodeExpectation } from '../workflow-tests.types';

describe('TestDiffService', () => {
	let diffService: TestDiffService;

	beforeEach(() => {
		diffService = new TestDiffService();
	});

	it('marks the run as passed when every expectation matches the actual run data', () => {
		const expectations: NodeExpectation[] = [
			{ nodeName: 'A', executionIndex: 0, outputs: [[{ json: { a: 1 } }]] },
			{ nodeName: 'B', executionIndex: 1, outputs: [[{ json: { b: 2 } }]] },
		];
		const actualRunData = {
			A: [{ executionIndex: 0, data: { main: [[{ json: { a: 1 } }]] } }],
			B: [{ executionIndex: 1, data: { main: [[{ json: { b: 2 } }]] } }],
		} as unknown as IRunData;

		const result = diffService.diff({
			testId: 'test-1',
			testName: 'My Test',
			executionId: 'execution-1',
			expectations,
			actualRunData,
		});

		expect(result.status).toBe('passed');
		expect(result.firstFailedNode).toBeUndefined();
		expect(result.errorMessage).toBeUndefined();
		expect(result.nodeResults).toEqual([
			{ nodeName: 'A', status: 'passed' },
			{ nodeName: 'B', status: 'passed' },
		]);
		expect(result.testId).toBe('test-1');
		expect(result.testName).toBe('My Test');
		expect(result.executionId).toBe('execution-1');
		expect(typeof result.completedAt).toBe('string');
		expect(() => new Date(result.completedAt)).not.toThrow();
	});

	it('fails only the node whose output field changed, and sets firstFailedNode', () => {
		const expectations: NodeExpectation[] = [
			{ nodeName: 'A', executionIndex: 0, outputs: [[{ json: { a: 1 } }]] },
			{ nodeName: 'B', executionIndex: 1, outputs: [[{ json: { b: 2 } }]] },
		];
		const actualRunData = {
			A: [{ executionIndex: 0, data: { main: [[{ json: { a: 1 } }]] } }],
			// B's field value changed from 2 to 999
			B: [{ executionIndex: 1, data: { main: [[{ json: { b: 999 } }]] } }],
		} as unknown as IRunData;

		const result = diffService.diff({
			testId: 'test-1',
			testName: 'My Test',
			executionId: 'execution-1',
			expectations,
			actualRunData,
		});

		expect(result.status).toBe('failed');
		expect(result.firstFailedNode).toBe('B');
		expect(result.nodeResults).toEqual([
			{ nodeName: 'A', status: 'passed' },
			{
				nodeName: 'B',
				status: 'failed',
				expected: JSON.stringify([[{ json: { b: 2 } }]], null, 2),
				actual: JSON.stringify([[{ json: { b: 999 } }]], null, 2),
			},
		]);
	});

	it('marks a node missing from actualRunData as not-executed, counted as a failure', () => {
		const expectations: NodeExpectation[] = [
			{ nodeName: 'A', executionIndex: 0, outputs: [[{ json: { a: 1 } }]] },
			{ nodeName: 'Missing', executionIndex: 1, outputs: [[{ json: { c: 3 } }]] },
		];
		const actualRunData = {
			A: [{ executionIndex: 0, data: { main: [[{ json: { a: 1 } }]] } }],
			// 'Missing' never ran
		} as unknown as IRunData;

		const result = diffService.diff({
			testId: 'test-1',
			testName: 'My Test',
			executionId: 'execution-1',
			expectations,
			actualRunData,
		});

		expect(result.status).toBe('failed');
		expect(result.firstFailedNode).toBe('Missing');
		expect(result.nodeResults).toEqual([
			{ nodeName: 'A', status: 'passed' },
			{
				nodeName: 'Missing',
				status: 'not-executed',
				expected: JSON.stringify([[{ json: { c: 3 } }]], null, 2),
				actual: JSON.stringify(null, null, 2),
			},
		]);
	});

	it('sets status to error with the run error message, and still diffs partial results', () => {
		const expectations: NodeExpectation[] = [
			{ nodeName: 'A', executionIndex: 0, outputs: [[{ json: { a: 1 } }]] },
			{ nodeName: 'B', executionIndex: 1, outputs: [[{ json: { b: 2 } }]] },
		];
		// Only A ran before the workflow errored out.
		const actualRunData = {
			A: [{ executionIndex: 0, data: { main: [[{ json: { a: 1 } }]] } }],
		} as unknown as IRunData;

		const result = diffService.diff({
			testId: 'test-1',
			testName: 'My Test',
			executionId: 'execution-1',
			expectations,
			actualRunData,
			runError: { message: 'Node B failed: boom' },
		});

		expect(result.status).toBe('error');
		expect(result.errorMessage).toBe('Node B failed: boom');
		expect(result.firstFailedNode).toBe('B');
		expect(result.nodeResults).toEqual([
			{ nodeName: 'A', status: 'passed' },
			{
				nodeName: 'B',
				status: 'not-executed',
				expected: JSON.stringify([[{ json: { b: 2 } }]], null, 2),
				actual: JSON.stringify(null, null, 2),
			},
		]);
	});

	it('ignores volatile fields (pairedItem, binary) on actual items via sanitization', () => {
		const expectations: NodeExpectation[] = [
			{ nodeName: 'A', executionIndex: 0, outputs: [[{ json: { a: 1 } }]] },
		];
		const actualRunData = {
			A: [
				{
					executionIndex: 0,
					data: {
						main: [
							[
								{
									json: { a: 1 },
									pairedItem: { item: 0 },
									binary: { data: { data: 'base64', mimeType: 'text/plain' } },
									index: 0,
									metadata: { subExecution: {} },
								},
							],
						],
					},
				},
			],
		} as unknown as IRunData;

		const result = diffService.diff({
			testId: 'test-1',
			testName: 'My Test',
			executionId: 'execution-1',
			expectations,
			actualRunData,
		});

		expect(result.status).toBe('passed');
		expect(result.nodeResults).toEqual([{ nodeName: 'A', status: 'passed' }]);
	});

	it('fails when the number of output branches differs from the expectation', () => {
		const expectations: NodeExpectation[] = [
			{
				nodeName: 'If',
				executionIndex: 0,
				outputs: [[{ json: { branch: 'true' } }], []],
			},
		];
		// Actual only produced one branch instead of the expected two.
		const actualRunData = {
			If: [{ executionIndex: 0, data: { main: [[{ json: { branch: 'true' } }]] } }],
		} as unknown as IRunData;

		const result = diffService.diff({
			testId: 'test-1',
			testName: 'My Test',
			executionId: 'execution-1',
			expectations,
			actualRunData,
		});

		expect(result.status).toBe('failed');
		expect(result.firstFailedNode).toBe('If');
		expect(result.nodeResults[0].status).toBe('failed');
	});
});
