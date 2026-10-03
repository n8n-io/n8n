// ---------------------------------------------------------------------------
// Persist a discovery run as an `eval-results.json` the local comparison
// (`cli/compare-local.ts`) can read.
//
// Discovery is the cheapest lane — in-process, no build, no sandbox — which
// makes it the one a developer reaches for most while iterating. It used to
// print pass rates and exit, leaving the before/after step of the EDD loop with
// nothing to diff on exactly that lane. Writing the workflow lane's artifact
// shape means one comparison tool serves both.
//
// The shape is a deliberate SUBSET: a discovery scenario has no built workflow,
// no execution scenarios and no build expectations, so each scenario becomes a
// single scenario unit keyed `<fileSlug>/tool-discovery`. Everything the
// comparison actually reads (unit keys, pass/evaluated counts, per-trial
// verdicts, failure categories) is present; nothing else is invented.
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DiscoveryRunResult } from './runner';
import type { DiscoveryTestCase } from './types';

/**
 * The single unit name every discovery scenario reports under. A discovery
 * scenario carries exactly one pass condition, so the scenario file IS the
 * unit; a constant here keeps the key readable (`my-scenario/tool-discovery`)
 * without repeating the slug on both sides of the separator.
 */
export const DISCOVERY_UNIT_NAME = 'tool-discovery';

export interface DiscoveryScenarioAggregate {
	scenario: DiscoveryTestCase;
	fileSlug: string;
	results: DiscoveryRunResult[];
	passCount: number;
}

/**
 * Which failure category a failed trial reports.
 *
 * The distinction is load-bearing for the comparison's failure-category drift
 * table: a change that starts making runs time out is a different finding from
 * one that starts routing to the wrong tool, and reporting both as one category
 * would hide the former behind the latter.
 */
function failureCategoryFor(result: DiscoveryRunResult): string {
	if (result.runError !== undefined) return 'framework_issue';
	if (result.streamStatus === 'errored' || result.streamStatus === 'timed-out') {
		return 'framework_issue';
	}
	return 'builder_issue';
}

export function buildDiscoveryEvalResults(
	aggregates: DiscoveryScenarioAggregate[],
	trials: number,
	durationMs: number,
): unknown {
	const scenariosTotal = aggregates.length;
	const evaluated = aggregates.reduce((sum, a) => sum + a.results.length, 0);
	const passed = aggregates.reduce((sum, a) => sum + a.passCount, 0);

	return {
		timestamp: new Date().toISOString(),
		duration: durationMs,
		totalRuns: trials,
		summary: {
			testCases: aggregates.length,
			scenariosTotal,
			passRatePerIter: evaluated > 0 ? passed / evaluated : 0,
		},
		comparisonStatus: 'not_attempted',
		testCases: aggregates.map((aggregate) => ({
			// `testCaseFile` is what the comparison keys on — never omit it.
			testCaseFile: aggregate.fileSlug,
			name: aggregate.scenario.userMessage.slice(0, 70),
			status: 'verified',
			totalRuns: trials,
			scenarios: [
				{
					name: DISCOVERY_UNIT_NAME,
					passCount: aggregate.passCount,
					evaluatedCount: aggregate.results.length,
					totalRuns: trials,
					runs: aggregate.results.map((result) => ({
						passed: result.check.pass,
						score: result.check.pass ? 1 : 0,
						reasoning: result.check.comment,
						...(result.check.pass ? {} : { failureCategory: failureCategoryFor(result) }),
					})),
				},
			],
			buildExpectations: [],
		})),
	};
}

/** Write the artifact into `outputDir`, creating it if needed. Returns the path. */
export function writeDiscoveryEvalResults(
	outputDir: string,
	aggregates: DiscoveryScenarioAggregate[],
	trials: number,
	durationMs: number,
): string {
	mkdirSync(outputDir, { recursive: true });
	const target = join(outputDir, 'eval-results.json');
	writeFileSync(
		target,
		`${JSON.stringify(buildDiscoveryEvalResults(aggregates, trials, durationMs), null, 2)}\n`,
	);
	return target;
}
