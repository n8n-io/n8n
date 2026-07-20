// ---------------------------------------------------------------------------
// Find and fetch the pinned baseline experiment from LangSmith.
//
// The baseline is whichever experiment most recently used the
// `instance-ai-baseline` prefix. To refresh, run the eval with that prefix:
//
//   pnpm eval:instance-ai --experiment-name instance-ai-baseline --iterations 10
//
// LangSmith appends a random suffix, so successive baseline runs become
// `instance-ai-baseline-7abc1234`, `instance-ai-baseline-9def5678`, etc.
// We pick the most recently started one.
//
// Two functions, both small:
//
//   findLatestBaseline    — list baseline-prefixed projects, pick newest.
//   fetchBaselineBucket   — read its root runs, bucket per evaluation unit
//                           (execution scenarios + build expectations).
//
// Both throw on transport errors. Callers are expected to swallow with a log:
// the comparison is advisory and shouldn't fail the eval run.
// ---------------------------------------------------------------------------

import type { Client } from 'langsmith';
import { z } from 'zod';

import {
	expectationUnitKey,
	scenarioUnitKey,
	type EvaluationUnitCounts,
	type ExperimentBucket,
} from './compare';
import { expectationResultsSchema } from '../cli/reshape';
import { BUILD_ONLY_SCENARIO_NAME } from '../langsmith/dataset-sync';

/**
 * Prefix the latest-baseline lookup matches against. The CLI flag
 * `--experiment-name instance-ai-baseline` produces project names like
 * `instance-ai-baseline-7abc1234` (LangSmith appends a hyphen + suffix), so
 * the constant must end in `-` to avoid matching unrelated names that
 * happen to start with `instance-ai-baseline...`.
 */
export const BASELINE_EXPERIMENT_PREFIX = 'instance-ai-baseline-';

const inputsSchema = z
	.object({
		testCaseFile: z.string().default(''),
		scenarioName: z.string().default(''),
		/** 0-based iteration index; absent on single-iteration runs. */
		_iteration: z.number().int().nonnegative().default(0),
	})
	.passthrough();

const outputsSchema = z
	.object({
		passed: z.boolean().default(false),
		failureCategory: z.string().optional(),
		incomplete: z.boolean().optional(),
		// Case-level expectation verdicts embedded by target(); absent on
		// baselines captured before expectation persistence. `.catch` so a
		// malformed field doesn't void the whole row.
		expectationResults: expectationResultsSchema.optional().catch(undefined),
	})
	.passthrough();

/** How many newest candidates to probe for the completion marker. Wide enough
 *  that a burst of failed captures can't hide an older completed baseline
 *  behind the probe window; only the no-marker-found path pays the extra
 *  reads. The plain-newest fallback below stays for pre-marker cohorts. */
const MAX_COMPLETION_PROBES = 25;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A capture killed mid-run (job timeout, runner death) leaves a partial
 * experiment with the baseline prefix. The CLI writes aggregate metadata
 * (`pass_rate_per_iter`) only at successful run end — treat it as the
 * completion marker so partial captures never become the comparison target.
 */
async function hasCompletionMarker(client: Client, projectName: string): Promise<boolean> {
	try {
		const project = await client.readProject({ projectName });
		const extra: unknown = project.extra;
		if (!isRecord(extra) || !isRecord(extra.metadata)) return false;
		return 'pass_rate_per_iter' in extra.metadata;
	} catch {
		return false;
	}
}

/**
 * Return the most recently created COMPLETED baseline experiment, or
 * `undefined` if none exist. We pick by `start_time` so a re-run of an older
 * snapshot doesn't displace the latest one, and require the completion marker
 * so a killed capture doesn't either (falling back to the plain newest when
 * no probed candidate carries the marker, e.g. legacy cohorts).
 *
 * `prefix` defaults to the Instance AI baseline. Pass a different prefix (e.g.
 * `mcp-baseline-`) to scope the lookup to an isolated cohort, so an MCP run
 * compares MCP-vs-MCP instead of against the Instance AI baseline.
 */
export async function findLatestBaseline(
	client: Client,
	prefix: string = BASELINE_EXPERIMENT_PREFIX,
): Promise<string | undefined> {
	const candidates: Array<{ name: string; ts: number }> = [];
	for await (const project of client.listProjects({ nameContains: prefix })) {
		const name = project.name;
		if (!name?.startsWith(prefix)) continue;
		const ts = project.start_time ? new Date(project.start_time).getTime() : 0;
		candidates.push({ name, ts });
	}
	candidates.sort((a, b) => b.ts - a.ts);
	for (const candidate of candidates.slice(0, MAX_COMPLETION_PROBES)) {
		if (await hasCompletionMarker(client, candidate.name)) return candidate.name;
	}
	return candidates[0]?.name;
}

/**
 * Fetch a baseline experiment's per-unit pass/fail counts. Each root run
 * corresponds to one (testCaseFile, scenarioName, iteration) triple — we
 * bucket scenarios by `${testCaseFile}/${scenarioName}` and accumulate.
 *
 * Every row of a case additionally embeds that (case, iteration)'s
 * expectation verdicts, so expectations are deduped per (case, iteration) —
 * the first row carrying the field wins — and accumulate into expectation
 * units. The `__build_only__` sentinel is such a carrier but never a
 * scenario unit. Baselines captured before expectation persistence simply
 * produce no expectation units.
 *
 * Throws if the project does not exist.
 */
export async function fetchBaselineBucket(
	client: Client,
	experimentName: string,
): Promise<ExperimentBucket> {
	const project = await client.readProject({ projectName: experimentName });
	const evaluationUnits = new Map<string, EvaluationUnitCounts>();
	const failureCategoryTotals: Record<string, number> = {};
	const seenExpectationCarriers = new Set<string>();
	let trialTotal = 0;

	for await (const run of client.listRuns({ projectId: project.id, isRoot: true })) {
		const inputs = inputsSchema.safeParse(run.inputs ?? {});
		if (!inputs.success || !inputs.data.testCaseFile || !inputs.data.scenarioName) continue;
		// Skip runs that never produced outputs (still running, crashed before
		// completion, infra error). Without this guard, every field defaults
		// (passed → false) would coerce them into "failed" trials and inflate
		// the baseline failure count. Mirrors `parseTargetOutput` in cli/index.ts.
		const rawOutputs = run.outputs;
		if (
			rawOutputs === null ||
			rawOutputs === undefined ||
			typeof rawOutputs !== 'object' ||
			Object.keys(rawOutputs).length === 0
		) {
			continue;
		}
		const outputs = outputsSchema.safeParse(rawOutputs);
		if (!outputs.success) continue;

		// Expectations ingest before the sentinel/incomplete guards: the sentinel
		// row is the only carrier for build-only cases, and a scenario-incomplete
		// row still holds valid expectation verdicts.
		// Same shape as the build-cache key (`iteration:fileSlug`).
		const carrierKey = `${String(inputs.data._iteration)}:${inputs.data.testCaseFile}`;
		const expectationResults = outputs.data.expectationResults;
		if (expectationResults && !seenExpectationCarriers.has(carrierKey)) {
			seenExpectationCarriers.add(carrierKey);
			for (const verdict of expectationResults) {
				// Judge-incomplete verdicts carry no signal — outside the denominator.
				if (verdict.incomplete) continue;
				const key = expectationUnitKey(inputs.data.testCaseFile, verdict.expectation);
				const existing: EvaluationUnitCounts = evaluationUnits.get(key) ?? {
					kind: 'expectation',
					testCaseFile: inputs.data.testCaseFile,
					name: verdict.expectation,
					passed: 0,
					total: 0,
				};
				existing.total++;
				if (verdict.pass) existing.passed++;
				evaluationUnits.set(key, existing);
			}
		}

		// Build-only sentinel rows aren't execution scenarios — counting them would
		// add a pseudo-scenario per build-only case and skew the trial totals.
		if (inputs.data.scenarioName === BUILD_ONLY_SCENARIO_NAME) continue;
		// Verifier-incomplete rows carry no verdict — skip so they don't count as failed trials.
		if (outputs.data.incomplete) continue;

		const key = scenarioUnitKey(inputs.data.testCaseFile, inputs.data.scenarioName);
		const existing: EvaluationUnitCounts = evaluationUnits.get(key) ?? {
			kind: 'scenario',
			testCaseFile: inputs.data.testCaseFile,
			name: inputs.data.scenarioName,
			passed: 0,
			total: 0,
			failureCategories: {},
		};
		existing.total++;
		trialTotal++;
		if (outputs.data.passed) {
			existing.passed++;
		} else if (outputs.data.failureCategory) {
			const cat = outputs.data.failureCategory;
			existing.failureCategories = existing.failureCategories ?? {};
			existing.failureCategories[cat] = (existing.failureCategories[cat] ?? 0) + 1;
			failureCategoryTotals[cat] = (failureCategoryTotals[cat] ?? 0) + 1;
		}
		evaluationUnits.set(key, existing);
	}

	return { experimentName, evaluationUnits, failureCategoryTotals, trialTotal };
}
