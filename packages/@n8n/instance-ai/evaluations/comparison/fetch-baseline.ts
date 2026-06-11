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
//   fetchBaselineBucket   — read its root runs, bucket per scenario.
//
// Both throw on transport errors. Callers are expected to swallow with a log:
// the comparison is advisory and shouldn't fail the eval run.
// ---------------------------------------------------------------------------

import type { Client } from 'langsmith';
import { z } from 'zod';

import type { ExperimentBucket, ScenarioCounts } from './compare';

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
	})
	.passthrough();

const outputsSchema = z
	.object({
		passed: z.boolean().default(false),
		failureCategory: z.string().optional(),
	})
	.passthrough();

/**
 * Return the most recently created baseline experiment, or `undefined` if
 * none exist. We pick by `start_time` so a re-run of an older snapshot
 * doesn't displace the latest one.
 */
export async function findLatestBaseline(client: Client): Promise<string | undefined> {
	let latest: { name: string; ts: number } | undefined;
	for await (const project of client.listProjects({ nameContains: BASELINE_EXPERIMENT_PREFIX })) {
		const name = project.name;
		if (!name?.startsWith(BASELINE_EXPERIMENT_PREFIX)) continue;
		const ts = project.start_time ? new Date(project.start_time).getTime() : 0;
		if (!latest || ts > latest.ts) latest = { name, ts };
	}
	return latest?.name;
}

/**
 * Fetch a baseline experiment's per-scenario pass/fail counts. Each root run
 * corresponds to one (testCaseFile, scenarioName, iteration) triple — we
 * bucket by `${testCaseFile}/${scenarioName}` and accumulate.
 *
 * Throws if the project does not exist.
 */
export async function fetchBaselineBucket(
	client: Client,
	experimentName: string,
): Promise<ExperimentBucket> {
	const project = await client.readProject({ projectName: experimentName });
	const scenarios = new Map<string, ScenarioCounts>();
	const failureCategoryTotals: Record<string, number> = {};
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

		const key = `${inputs.data.testCaseFile}/${inputs.data.scenarioName}`;
		const existing: ScenarioCounts = scenarios.get(key) ?? {
			testCaseFile: inputs.data.testCaseFile,
			scenarioName: inputs.data.scenarioName,
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
		scenarios.set(key, existing);
	}

	return { experimentName, scenarios, failureCategoryTotals, trialTotal };
}
