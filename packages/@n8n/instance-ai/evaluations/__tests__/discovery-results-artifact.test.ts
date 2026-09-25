import { bucketFromResultsJson, parseEvalResults } from '../comparison/bucket-from-results-json';
import { compareBuckets } from '../comparison/compare';
import {
	DISCOVERY_UNIT_NAME,
	buildDiscoveryEvalResults,
	type DiscoveryScenarioAggregate,
} from '../discovery/results-artifact';
import type { DiscoveryRunResult } from '../discovery/runner';
import type { DiscoveryTestCase } from '../discovery/types';

function scenario(id: string): DiscoveryTestCase {
	return {
		id,
		userMessage: 'list my data tables',
		expectedToolInvocations: { anyOf: ['data-tables'] },
	};
}

function trial(
	pass: boolean,
	overrides: Partial<Pick<DiscoveryRunResult, 'runError' | 'streamStatus'>> = {},
): DiscoveryRunResult {
	return {
		scenario: scenario('x'),
		check: {
			pass,
			comment: pass ? 'invoked data-tables' : 'never invoked data-tables',
			invokedTools: [],
			spawnedAgents: [],
		},
		events: [],
		outcome: { toolCalls: [], agentActivities: [] },
		durationMs: 1200,
		streamStatus: 'completed',
		...overrides,
	} as DiscoveryRunResult;
}

function aggregate(fileSlug: string, trials: DiscoveryRunResult[]): DiscoveryScenarioAggregate {
	return {
		scenario: scenario(fileSlug),
		fileSlug,
		results: trials,
		passCount: trials.filter((t) => t.check.pass).length,
	};
}

describe('buildDiscoveryEvalResults', () => {
	it('produces an artifact the local comparison can key and read', () => {
		const raw = buildDiscoveryEvalResults(
			[aggregate('data-table-skill-loading', [trial(true), trial(false), trial(true)])],
			3,
			5000,
		);

		const { bucket, skipped } = bucketFromResultsJson(parseEvalResults(raw, 'x'), 'run');

		expect(skipped).toEqual([]);
		expect(
			bucket.evaluationUnits.get(`data-table-skill-loading/${DISCOVERY_UNIT_NAME}`),
		).toMatchObject({ kind: 'scenario', passed: 2, total: 3 });
		expect(bucket.trialTotal).toBe(3);
	});

	it('separates a routing failure from a run that never got that far', () => {
		// The drift table is the only place this distinction survives, and
		// "your change started causing timeouts" is a different finding from
		// "your change started routing to the wrong tool".
		const raw = buildDiscoveryEvalResults(
			[
				aggregate('routing', [trial(false)]),
				aggregate('timing-out', [trial(false, { streamStatus: 'timed-out' })]),
				aggregate('erroring', [trial(false, { runError: 'boom' })]),
			],
			1,
			100,
		);

		const { bucket } = bucketFromResultsJson(parseEvalResults(raw, 'x'), 'run');

		expect(bucket.failureCategoryTotals).toEqual({ builder_issue: 1, framework_issue: 2 });
	});

	it('round-trips through a real before/after comparison', () => {
		const before = buildDiscoveryEvalResults(
			[aggregate('routing', [trial(false), trial(false), trial(false)])],
			3,
			100,
		);
		const after = buildDiscoveryEvalResults(
			[aggregate('routing', [trial(true), trial(true), trial(true)])],
			3,
			100,
		);

		const result = compareBuckets(
			bucketFromResultsJson(parseEvalResults(after, 'a'), 'after').bucket,
			bucketFromResultsJson(parseEvalResults(before, 'b'), 'before').bucket,
		);

		expect(result.evaluationUnits).toHaveLength(1);
		expect(result.evaluationUnits[0]).toMatchObject({
			name: DISCOVERY_UNIT_NAME,
			testCaseFile: 'routing',
			baselinePasses: 0,
			prPasses: 3,
			verdict: 'improvement',
		});
	});
});
