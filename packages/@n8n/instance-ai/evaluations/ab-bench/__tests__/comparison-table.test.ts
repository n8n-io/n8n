import { describe, expect, it } from 'vitest';

import { renderComparisonTable, summarizeRun } from '../comparison-table';

const report = {
	llmCalls: 10,
	inputTokens: 200_000,
	firstCallInput: 15_000,
	maxCallInput: 30_000,
	outputTokens: 4_000,
	firstCallToolCount: 12,
};

const autoChecks = {
	groups: [
		{ title: 'Correctness', checks: [{ ok: true }, { ok: false }] },
		{ title: 'Execution with pinned data: digest', checks: [{ ok: true }, { ok: null }] },
		{ title: 'Style', checks: [{ ok: false }] },
	],
};

describe('summarizeRun', () => {
	it('counts only the gating check groups', () => {
		const summary = summarizeRun(report, autoChecks);

		expect(summary).toMatchObject({ checksPassed: 2, checksTotal: 3 });
	});

	// testmax leaves informational checks (for example C2s, setup left for the user) out of the verdict.
	it('does not count informational checks', () => {
		const summary = summarizeRun(report, {
			groups: [{ title: 'Correctness', checks: [{ ok: true }, { ok: true, level: 'info' }] }],
		});

		expect(summary).toMatchObject({ checksPassed: 1, checksTotal: 1 });
	});

	it('copies the token figures from the context report', () => {
		const summary = summarizeRun(report, undefined);

		expect(summary).toEqual({
			calls: 10,
			input: 200_000,
			first: 15_000,
			max: 30_000,
			output: 4_000,
			tools: 12,
			checksPassed: 0,
			checksTotal: 0,
		});
	});

	it('ignores auto-checks that do not have the expected shape', () => {
		const summary = summarizeRun(report, { groups: 'broken' });

		expect(summary).toMatchObject({ checksPassed: 0, checksTotal: 0 });
	});
});

describe('renderComparisonTable', () => {
	const base = summarizeRun(report, autoChecks);
	const branch = summarizeRun({ ...report, llmCalls: 7, inputTokens: 100_001 }, undefined);

	it('writes one row for each case and arm with mean values', () => {
		const table = renderComparisonTable([
			{ caseName: 'hn-digest', arm: 'base', runs: [base, { ...base, calls: 13 }] },
			{ caseName: 'hn-digest', arm: 'branch', runs: [branch] },
		]);

		const lines = table.split('\n');
		expect(lines[0]).toContain('| Case | Arm | Runs |');
		expect(lines[2]).toBe(
			'| hn-digest | base | 2 | 12 | 200,000 | 15,000 | 30,000 | 4,000 | 12 | 2/3, 2/3 |',
		);
		expect(lines[3]).toBe(
			'| hn-digest | branch | 1 | 7 | 100,001 | 15,000 | 30,000 | 4,000 | 12 | 0/0 |',
		);
	});

	it('skips a case and arm pair without runs', () => {
		const table = renderComparisonTable([{ caseName: 'multi-edit', arm: 'base', runs: [] }]);

		expect(table.split('\n')).toHaveLength(2);
	});
});
