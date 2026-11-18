import { describe, expect, it } from 'vitest';

import { buildTestTree } from './workflowTests.display';
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
