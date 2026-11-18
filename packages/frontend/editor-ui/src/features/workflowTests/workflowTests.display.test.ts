import { describe, expect, it } from 'vitest';

import { buildTestTree, collectNodeMarks, flattenTests } from './workflowTests.display';
import { parseTestFile } from './workflowTests.utils';

const source = `
describe('a) mocked', () => {
	test('passes', () => {});
	test('fails', () => {});
});
test('top', () => {});
`;

describe('buildTestTree', () => {
	it('matches results to tests by the full name of the runner', () => {
		const tree = buildTestTree(
			parseTestFile(source),
			[
				{ name: 'a) mocked > passes', status: 'passed', durationMs: 1 },
				{ name: 'a) mocked > fails', status: 'failed', durationMs: 1, error: { message: 'no' } },
				{ name: 'top', status: 'passed', durationMs: 1 },
			],
			false,
		);

		expect(tree).toMatchObject([
			{
				kind: 'group',
				name: 'a) mocked',
				status: 'failed',
				counts: { passed: 1, failed: 1, total: 2 },
				children: [
					{ kind: 'test', name: 'passes', status: 'passed' },
					{ kind: 'test', name: 'fails', status: 'failed', error: { message: 'no' } },
				],
			},
			{ kind: 'test', name: 'top', status: 'passed' },
		]);
	});

	it('marks tests without a result as running during a run, and lists unknown results last', () => {
		const tree = buildTestTree(
			parseTestFile(source),
			[{ name: 'case 7', status: 'passed', durationMs: 1 }],
			true,
		);

		expect(tree).toMatchObject([
			{ kind: 'group', status: 'running', counts: { running: 2 } },
			{ kind: 'test', name: 'top', status: 'running' },
			{ kind: 'test', name: 'case 7', fullName: 'case 7', status: 'passed' },
		]);
	});
});

describe('collectNodeMarks', () => {
	const marked = `
describe('orders', () => {
	test('accepts', async () => {
		mockNode(workflow.node('Get customer'), []);
		const result = await executeWorkflow(workflow, { input: {} });
		expect(result.node('Sales').input).toEqual([]);
		expect(result.node('Sales').runs).toHaveLength(1);
	});
	test('rejects', async () => {
		mockNode(workflow.node('Get customer'), []);
		const result = await executeWorkflow(workflow, { input: {} });
		expect(result.node('Sales').runs).toHaveLength(0);
	});
});
`;

	it('counts the tests for each node and shows where a test failed', () => {
		const rows = flattenTests(
			buildTestTree(
				parseTestFile(marked),
				[
					{ name: 'orders > accepts', status: 'passed', durationMs: 1 },
					{
						name: 'orders > rejects',
						status: 'failed',
						durationMs: 1,
						error: { message: 'no', node: 'IF' },
					},
				],
				false,
			),
		);

		const marks = collectNodeMarks(rows, 'Webhook');

		expect(marks.get('Webhook')?.input.tests).toBe(2);
		expect(marks.get('Get customer')?.mocked.tests).toBe(2);
		expect(marks.get('Sales')?.asserted).toMatchObject({ tests: 2, marks: { length: 3 } });
		expect(marks.get('Sales')?.assertionsPassed).toBe(false);
		expect(marks.get('IF')?.failed).toBe(true);
		expect(collectNodeMarks(rows.slice(0, 1), 'Webhook').get('Sales')?.assertionsPassed).toBe(true);
	});
});
