// ---------------------------------------------------------------------------
// `eval-results.json` for routing mode, in the format that the LangTracer
// dispatcher reads (see ../__tests__/eval-results-dispatcher-contract.test.ts).
//
// A case has one build expectation: the routes that it accepts. Each trial is
// one verdict on it. A trial with no route is `incomplete`: it counts neither
// as a pass nor as a failure.
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import type { RoutingCase } from './cases';
import { routeLabel, type RouteResolution } from './grade';
import type { DiscoveryStreamStatus } from '../discovery/types';
import type { EvalAttribution } from '../harness/attribution';
import { passAtK, passHatK } from '../run/aggregator';
import type { BuildExpectationResult } from '../types';

export interface RoutingTrial {
	resolution: RouteResolution;
	passed: boolean;
	turn: { streamStatus: DiscoveryStreamStatus; runError?: string };
}

export interface RoutingCaseResult {
	routingCase: RoutingCase;
	trials: RoutingTrial[];
}

function noRouteAttribution({ turn }: RoutingTrial): EvalAttribution {
	if (turn.streamStatus === 'timed-out') return 'timeout';
	if (turn.runError || turn.streamStatus === 'errored') return 'framework_issue';
	return 'verification_gap';
}

function trialVerdict(expectation: string, trial: RoutingTrial): BuildExpectationResult {
	const { resolution, passed, turn } = trial;
	if (resolution.route === 'none') {
		const detail = turn.runError ?? resolution.judgeError;
		return {
			expectation,
			pass: false,
			reason: `Not graded: no route from ${resolution.evidence}${detail ? ` (${detail})` : ''}.`,
			incomplete: true,
			attribution: noRouteAttribution(trial),
		};
	}
	const judge = resolution.judgeReason ? ` Judge: ${resolution.judgeReason}` : '';
	const reason = `Route ${routeLabel(resolution)} from ${resolution.evidence}.${judge}`;
	return passed
		? { expectation, pass: true, reason }
		: { expectation, pass: false, reason, attribution: 'builder_issue' };
}

function toTestCase({ routingCase, trials }: RoutingCaseResult) {
	// The same text that LangTracer stores as the case's process expectation.
	const expectation = `Routes to one of: ${routingCase.accepts.join(', ')}`;
	const verdicts = trials.map((trial) => trialVerdict(expectation, trial));
	const evaluated = verdicts.filter((verdict) => !verdict.incomplete);
	const passCount = evaluated.filter((verdict) => verdict.pass).length;
	const n = evaluated.length;
	return {
		name: routingCase.id,
		testCaseFile: routingCase.id,
		status: n > 0 ? 'verified' : 'notVerified',
		totalRuns: trials.length,
		buildExpectations: [
			{
				expectation,
				passCount,
				evaluatedCount: n,
				// Terminal values at k = the evaluated trials, as run/persist.ts writes them.
				passAtK: passAtK(n, passCount, n),
				passHatK: passHatK(n, passCount, n),
			},
		],
		buildExpectationResultsPerRun: verdicts.map((verdict) => [verdict]),
	};
}

/** Writes `eval-results.json` to `outputDir` and returns its path. */
export function writeRoutingEvalResults(
	outputDir: string,
	results: RoutingCaseResult[],
	totalRuns: number,
	duration: number,
): string {
	mkdirSync(outputDir, { recursive: true });
	const jsonPath = join(outputDir, 'eval-results.json');
	const report = {
		timestamp: new Date().toISOString(),
		duration,
		totalRuns,
		testCases: results.map(toTestCase),
	};
	writeFileSync(jsonPath, JSON.stringify(report, null, 2));
	return jsonPath;
}
