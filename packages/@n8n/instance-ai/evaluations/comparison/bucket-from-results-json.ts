// ---------------------------------------------------------------------------
// Local comparison bucket: project a PERSISTED eval-results.json onto the
// ExperimentBucket shape used by compareBuckets.
//
// The sibling `bucket-from-evaluation.ts` projects the in-memory
// MultiRunEvaluation and is reachable only from the LangSmith driver, whose
// other side comes from `fetchBaselineBucket`. The direct driver writes
// eval-results.json and never compares — so two local runs of the same cases
// had no comparison path at all, even though the statistics that grade them
// (comparison/statistics.ts) have no LangSmith dependency whatsoever.
//
// This reads the artifact back under the SAME unit keys, which is what lets a
// before/after pair be graded by the same code CI grades a PR with, offline.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { z } from 'zod';

import {
	expectationUnitKey,
	scenarioUnitKey,
	type EvaluationUnitCounts,
	type ExperimentBucket,
} from './compare';

// The subset of eval-results.json a unit comparison needs. Unknown keys are
// stripped rather than rejected: the artifact also carries transcripts,
// workflow JSON and per-run verifier detail that this projection has no use
// for, and pinning those here would make the reader brittle against harness
// changes it does not care about. The fields below are the load-bearing ones —
// the writer side is pinned by `__tests__/eval-results-dispatcher-contract.test.ts`.
const scenarioRunSchema = z.object({
	passed: z.boolean(),
	incomplete: z.boolean().optional(),
	failureCategory: z.string().optional(),
});

const scenarioSchema = z.object({
	name: z.string(),
	passCount: z.number(),
	evaluatedCount: z.number(),
	runs: z.array(scenarioRunSchema).default([]),
});

const buildExpectationSchema = z.object({
	expectation: z.string(),
	passCount: z.number(),
	evaluatedCount: z.number(),
});

const testCaseSchema = z.object({
	name: z.string().optional(),
	testCaseFile: z.string().optional(),
	scenarios: z.array(scenarioSchema).default([]),
	buildExpectations: z.array(buildExpectationSchema).default([]),
});

const evalResultsSchema = z.object({
	timestamp: z.string().optional(),
	totalRuns: z.number().optional(),
	testCases: z.array(testCaseSchema),
});

export type ParsedEvalResults = z.infer<typeof evalResultsSchema>;

/** Thrown when the file exists but is not an eval-results.json we can compare. */
export class EvalResultsParseError extends Error {}

/**
 * Parse an already-read eval-results.json payload.
 *
 * Separate from the file read so callers that already hold the JSON (a test, a
 * future sweep-side consumer) don't have to round-trip through disk.
 */
export function parseEvalResults(raw: unknown, source: string): ParsedEvalResults {
	const parsed = evalResultsSchema.safeParse(raw);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		const where = issue?.path.join('.') ?? '(root)';
		throw new EvalResultsParseError(
			`${source} is not a readable eval-results.json — at \`${where}\`: ${issue?.message ?? 'unknown parse error'}`,
		);
	}
	return parsed.data;
}

/** Read and parse an eval-results.json from disk. */
export function readEvalResults(path: string): ParsedEvalResults {
	let text: string;
	try {
		text = readFileSync(path, 'utf8');
	} catch {
		throw new EvalResultsParseError(
			`Cannot read ${path}. Point --before/--after at a run's --output-dir (or directly at its eval-results.json).`,
		);
	}
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch (error: unknown) {
		throw new EvalResultsParseError(
			`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	return parseEvalResults(json, path);
}

/**
 * Project parsed results onto an ExperimentBucket.
 *
 * Unit semantics are deliberately identical to `bucketFromEvaluation`, because
 * the two buckets are compared against each other in the CI path and must not
 * disagree about what counts:
 *
 * - a scenario contributes a unit keyed `file/scenario`;
 * - a build expectation contributes one keyed `file#expectation:text`, and only
 *   when it was actually evaluated (an unevaluated expectation is unmeasured,
 *   not a zero);
 * - `trialTotal` and `failureCategoryTotals` stay scenario-only, and skip
 *   verifier-incomplete runs — those carry no verdict, so they are not trials.
 *
 * A case with no `testCaseFile` throws rather than being skipped: the whole
 * comparison is keyed on that slug, so dropping the case would quietly shrink
 * the intersection and read as "this unit is new" on the other side.
 */
export function bucketFromResultsJson(
	results: ParsedEvalResults,
	experimentName: string,
): ExperimentBucket {
	const evaluationUnits = new Map<string, EvaluationUnitCounts>();
	const failureCategoryTotals: Record<string, number> = {};
	let trialTotal = 0;

	for (const tc of results.testCases) {
		const fileSlug = tc.testCaseFile;
		if (!fileSlug) {
			throw new EvalResultsParseError(
				`bucketFromResultsJson: no testCaseFile for test case "${(tc.name ?? '(unnamed)').slice(0, 60)}" in ${experimentName} — cannot key its units for comparison`,
			);
		}

		for (const scenario of tc.scenarios) {
			const failureCategories: Record<string, number> = {};
			for (const run of scenario.runs) {
				if (run.incomplete) continue;
				trialTotal++;
				if (!run.passed && run.failureCategory) {
					failureCategories[run.failureCategory] =
						(failureCategories[run.failureCategory] ?? 0) + 1;
					failureCategoryTotals[run.failureCategory] =
						(failureCategoryTotals[run.failureCategory] ?? 0) + 1;
				}
			}
			evaluationUnits.set(scenarioUnitKey(fileSlug, scenario.name), {
				kind: 'scenario',
				testCaseFile: fileSlug,
				name: scenario.name,
				passed: scenario.passCount,
				total: scenario.evaluatedCount,
				failureCategories,
			});
		}

		for (const expectation of tc.buildExpectations) {
			if (expectation.evaluatedCount === 0) continue;
			evaluationUnits.set(expectationUnitKey(fileSlug, expectation.expectation), {
				kind: 'expectation',
				testCaseFile: fileSlug,
				name: expectation.expectation,
				passed: expectation.passCount,
				total: expectation.evaluatedCount,
			});
		}
	}

	return { experimentName, evaluationUnits, failureCategoryTotals, trialTotal };
}
