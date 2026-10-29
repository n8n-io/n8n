import { compareArms, compareByPrompt, formatComparison, summarize } from '../compare';
import type { LatencyMetrics, LatencyRunRecord } from '../metrics';

function run(
	label: string,
	metrics: Partial<LatencyMetrics>,
	overrides: Partial<Pick<LatencyRunRecord, 'gitSha' | 'promptId'>> = {},
): LatencyRunRecord {
	return {
		label,
		gitSha: overrides.gitSha ?? 'abc1234',
		promptId: overrides.promptId ?? 'schedule-http',
		threadId: `thread-${label}`,
		metrics: {
			firstWorkspaceToolMs: null,
			timeToFirstWorkflowMs: null,
			turnMs: null,
			missing: [],
			...metrics,
		},
	};
}

describe('summarize', () => {
	it('returns count, median, nearest-rank p90 and mean', () => {
		expect(summarize([10, 1, 4, 3, 2])).toEqual({ n: 5, median: 3, p90: 10, mean: 4 });
	});

	it('averages the two middle values for an even count', () => {
		expect(summarize([1, 2, 3, 4]).median).toBe(2.5);
	});

	it('returns an empty summary for no values', () => {
		expect(summarize([])).toEqual({ n: 0, median: null, p90: null, mean: null });
	});
});

describe('compareArms', () => {
	const baseline = [
		run('baseline', { firstWorkspaceToolMs: 9_000, timeToFirstWorkflowMs: 60_000, turnMs: 80_000 }),
		run('baseline', {
			firstWorkspaceToolMs: 10_000,
			timeToFirstWorkflowMs: 70_000,
			turnMs: 90_000,
		}),
	];
	const prewarm = [
		run('prewarm', { firstWorkspaceToolMs: 1_000, timeToFirstWorkflowMs: 50_000, turnMs: 70_000 }),
		run('prewarm', { firstWorkspaceToolMs: null, missing: ['no workspace tool call'] }),
	];

	it('summarizes each metric per arm and skips missing values', () => {
		const rows = compareArms(baseline, prewarm);
		const workspace = rows.find((row) => row.metric === 'firstWorkspaceToolMs');

		expect(workspace?.a).toEqual({ n: 2, median: 9_500, p90: 10_000, mean: 9_500 });
		expect(workspace?.b).toEqual({ n: 1, median: 1_000, p90: 1_000, mean: 1_000 });
		expect(workspace?.medianDeltaMs).toBe(-8_500);
	});

	it('reports a null delta when an arm has no values', () => {
		const rows = compareArms(baseline, [run('prewarm', {})]);

		expect(rows.every((row) => row.medianDeltaMs === null)).toBe(true);
	});
});

describe('compareByPrompt', () => {
	it('compares each prompt on its own', () => {
		const baseline = [
			run('baseline', { firstWorkspaceToolMs: 9_000 }, { promptId: 'schedule-http' }),
			run('baseline', { firstWorkspaceToolMs: 20_000 }, { promptId: 'form-code' }),
		];
		const after = [
			run('after', { firstWorkspaceToolMs: 7_000 }, { promptId: 'schedule-http' }),
			run('after', { firstWorkspaceToolMs: 25_000 }, { promptId: 'form-code' }),
		];

		const deltas = compareByPrompt(baseline, after).map(({ promptId, rows }) => [
			promptId,
			rows.find((row) => row.metric === 'firstWorkspaceToolMs')?.medianDeltaMs,
		]);

		expect(deltas).toEqual([
			['form-code', 5_000],
			['schedule-http', -2_000],
		]);
	});
});

describe('formatComparison', () => {
	it('names both arms, every metric, and the missing-value count', () => {
		const baseline = [run('baseline', { firstWorkspaceToolMs: 9_000 })];
		const prewarm = [run('prewarm', { missing: ['no workspace tool call'] })];

		const text = formatComparison(baseline, prewarm);

		expect(text).toContain('baseline');
		expect(text).toContain('prewarm');
		expect(text).toContain('firstWorkspaceToolMs');
		expect(text).toContain('timeToFirstWorkflowMs');
		expect(text).toContain('turnMs');
		expect(text).toContain('no workspace tool call: 1');
	});

	it('warns when an arm mixes runs from different builds', () => {
		const baseline = [
			run('baseline', { firstWorkspaceToolMs: 9_000 }, { gitSha: 'aaa1111' }),
			run('baseline', { firstWorkspaceToolMs: 9_500 }, { gitSha: 'bbb2222' }),
		];

		const text = formatComparison(baseline, [run('after', { firstWorkspaceToolMs: 7_000 })]);

		const warnings = text.split('\n').filter((line) => line.startsWith('Warning:'));
		expect(warnings).toEqual(['Warning: baseline mixes builds aaa1111, bbb2222']);
	});
});
