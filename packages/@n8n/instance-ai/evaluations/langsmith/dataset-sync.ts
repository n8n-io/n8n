// ---------------------------------------------------------------------------
// LangSmith dataset sync
//
// Syncs JSON test case files from the repo to a LangSmith dataset. Existing
// examples are found by inputs (testCaseFile + scenarioName) and updated in
// place; new scenarios get a random UUID. Stale examples (scenario removed
// from a test case present in the sync) are ARCHIVED: moved to the
// 'archived' split, never deleted — LangSmith's soft-delete tombstones
// UUIDs, which historically caused 409 conflicts on resurrection, and
// deleting also strips the example from the UI. evaluate() selects examples
// by file-slug/tier splits, so archived examples are excluded from runs; a
// re-added scenario is found by inputs and restored to its active splits
// through the normal update path.
// ---------------------------------------------------------------------------

import { randomUUID } from 'crypto';
import type { Client } from 'langsmith';
import type { Example, KVMap } from 'langsmith/schemas';
import { z } from 'zod';

import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import { BUILD_ONLY_SCENARIO_NAME, roundRobinCaseRows } from '../run/rows';

/**
 * Shape of the inputs passed to the target function for each scenario.
 * `testCaseFile` is included so the LangSmith Inputs column shows which
 * workflow a scenario belongs to (metadata is hidden by default).
 */
export const datasetExampleInputsSchema = z.object({
	testCaseFile: z.string(),
	scenarioName: z.string(),
	scenarioDescription: z.string(),
	dataSetup: z.string(),
	successCriteria: z.string(),
});
export type DatasetExampleInputs = z.infer<typeof datasetExampleInputsSchema>;

/** Metadata attached to each example for filtering / grouping in the UI. */
export const datasetExampleMetadataSchema = z.object({
	/** Duplicated from inputs so the LangSmith UI can group by it (only metadata keys are groupable). */
	testCaseFile: z.string(),
	complexity: z.enum(['simple', 'medium', 'complex']).optional(),
	tags: z.array(z.string()).optional(),
	triggerType: z.enum(['manual', 'webhook', 'schedule', 'form']).optional(),
});
export type DatasetExampleMetadata = z.infer<typeof datasetExampleMetadataSchema>;

/**
 * Split assigned to examples whose scenario no longer exists in the repo.
 * Runs select examples by file-slug/tier splits, so this split acts as an
 * archive: excluded from every run, still inspectable in the UI. (A test
 * case file named "archived" would collide with it — don't create one.)
 */
export const ARCHIVED_SPLIT = 'archived';

/**
 * Sync JSON test cases to a LangSmith dataset.
 *
 * - Creates the dataset if it doesn't exist
 * - Finds existing examples by (testCaseFile, scenarioName) and updates in place
 * - Creates new scenarios with a random UUID
 * - Orders examples round-robin across test cases for optimal parallelism
 * - Assigns each example to a split (test case file slug) for UI filtering
 * - Archives stale examples (split → 'archived') so removed scenarios stop
 *   running — a stale example otherwise fails every attempt and skews the
 *   experiment's aggregate metrics. Scoped to test cases present in this
 *   sync: examples of filtered-out or deleted CASES are left alone (the two
 *   are indistinguishable here — deleted-case cleanup stays manual)
 *
 * Takes the already-selected test cases (the caller loads them once, from disk
 * or lang-tracer, and threads them through), so the sync stays source-agnostic.
 *
 * Never deletes. Hard removal stays manual (LangSmith UI or MCP).
 *
 * Returns the dataset name for use with evaluate().
 */
export async function syncDataset(
	lsClient: Client,
	datasetName: string,
	logger: EvalLogger,
	testCasesWithFiles: WorkflowTestCaseWithFile[],
): Promise<string> {
	// Round-robin ordering ensures evaluate() triggers diverse builds early
	// rather than burning all concurrency slots on one test case.
	const scenarios = buildRoundRobinScenarios(testCasesWithFiles);

	logger.info(
		`Dataset sync: ${String(scenarios.length)} scenarios from ${String(testCasesWithFiles.length)} test cases`,
	);

	// Create or get dataset. `hasDataset` distinguishes "not found" from auth/
	// network errors, so we only create when it genuinely doesn't exist.
	let datasetId: string;
	if (await lsClient.hasDataset({ datasetName })) {
		const dataset = await lsClient.readDataset({ datasetName });
		datasetId = dataset.id;
	} else {
		const dataset = await lsClient.createDataset(datasetName, {
			description: 'Instance AI workflow execution evaluations (synced from repo JSON files)',
		});
		datasetId = dataset.id;
		logger.info(`Created dataset: ${datasetName}`);
	}

	// List existing examples, keyed by derived ID (testCaseFile/scenarioName from
	// inputs). Scoped to the synced cases' slug splits: every mutation below only
	// touches these slugs, and a scoped read keeps concurrent syncs of disjoint
	// cases (the LangTracer dispatcher pattern) and sync cost independent of
	// dataset size. Already-archived examples carry only the 'archived' split, so
	// they fall out of the read — which keeps re-archiving idempotent for free.
	const slugSplits = [...new Set(testCasesWithFiles.map((tc) => tc.fileSlug))];
	const existingByDerivedId = new Map<string, Example>();
	for await (const example of lsClient.listExamples({ datasetId, splits: slugSplits })) {
		const inputs = existingInputsSchema.safeParse(example.inputs);
		if (!inputs.success) continue;
		existingByDerivedId.set(`${inputs.data.testCaseFile}/${inputs.data.scenarioName}`, example);
	}

	// Diff and sync. `split` is multi-valued so a case can belong to multiple
	// logical groupings (e.g. ['pr', 'full']) in addition to its per-file slug.
	const toCreate: Array<{ id: string; inputs: KVMap; metadata: KVMap; split: string[] }> = [];
	const toUpdate: Array<{ id: string; inputs: KVMap; metadata: KVMap; split: string[] }> = [];

	for (const scenario of scenarios) {
		const derivedId = `${scenario.testCaseFile}/${scenario.scenarioName}`;

		const inputs: DatasetExampleInputs = {
			testCaseFile: scenario.testCaseFile,
			scenarioName: scenario.scenarioName,
			scenarioDescription: scenario.scenarioDescription,
			dataSetup: scenario.dataSetup,
			successCriteria: scenario.successCriteria,
		};

		const metadata: DatasetExampleMetadata = {
			testCaseFile: scenario.testCaseFile,
			complexity: scenario.complexity,
			tags: scenario.tags,
			triggerType: scenario.triggerType,
		};

		const split = [scenario.testCaseFile, ...scenario.datasets];

		const existingExample = existingByDerivedId.get(derivedId);
		if (existingExample) {
			if (
				hasInputsChanged(existingExample.inputs, inputs) ||
				hasMetadataChanged(existingExample.metadata, metadata) ||
				hasSplitChanged(existingExample.split, split)
			) {
				toUpdate.push({
					id: existingExample.id,
					inputs,
					metadata,
					split,
				});
			}
		} else {
			toCreate.push({
				id: randomUUID(),
				inputs,
				metadata,
				split,
			});
		}
	}

	// Archive stale examples: a scenario that was removed from a test case
	// still has its example matching the case's file-slug split, so evaluate()
	// keeps running it — failing every attempt and depressing the experiment
	// aggregates (observed: an `empty-response` example whose scenario had
	// been removed from the repo burned 3 runs per eval and skewed pass_at_k
	// in every experiment). Only examples belonging to a test case IN THIS
	// SYNC are considered: the selection reaching us is already narrowed by
	// --filter/--exclude/--tier, and a filtered-out case is indistinguishable
	// from a deleted one — archiving across the whole dataset would wrongly
	// archive everything unselected. Split-only update: inputs/metadata stay
	// untouched for forensics.
	const syncedCaseSlugs = new Set(testCasesWithFiles.map((tc) => tc.fileSlug));
	const currentDerivedIds = new Set(scenarios.map((s) => `${s.testCaseFile}/${s.scenarioName}`));
	const toArchive: Array<{ id: string; derivedId: string }> = [];
	for (const [derivedId, example] of existingByDerivedId) {
		if (currentDerivedIds.has(derivedId)) continue;
		// File slugs are path basenames and cannot contain '/'.
		const exampleCaseSlug = derivedId.slice(0, derivedId.indexOf('/'));
		if (!syncedCaseSlugs.has(exampleCaseSlug)) continue;
		// Already archived on a previous sync — keep the operation idempotent.
		if (!hasSplitChanged(example.split, [ARCHIVED_SPLIT])) continue;
		toArchive.push({ id: example.id, derivedId });
	}

	if (toCreate.length > 0) {
		await lsClient.createExamples(
			toCreate.map((e) => ({
				id: e.id,
				inputs: e.inputs,
				metadata: e.metadata,
				split: e.split,
				dataset_id: datasetId,
			})),
		);
		logger.info(`  Created ${String(toCreate.length)} example(s)`);
	}

	if (toUpdate.length > 0) {
		await lsClient.updateExamples(
			toUpdate.map((e) => ({
				id: e.id,
				inputs: e.inputs,
				metadata: e.metadata,
				split: e.split,
				dataset_id: datasetId,
			})),
		);
		logger.info(`  Updated ${String(toUpdate.length)} example(s)`);
	}

	if (toArchive.length > 0) {
		await lsClient.updateExamples(
			toArchive.map((e) => ({
				id: e.id,
				split: [ARCHIVED_SPLIT],
				dataset_id: datasetId,
			})),
		);
		logger.info(
			`  Archived ${String(toArchive.length)} stale example(s): ${toArchive.map((e) => e.derivedId).join(', ')}`,
		);
	}

	if (toCreate.length === 0 && toUpdate.length === 0 && toArchive.length === 0) {
		logger.info('  Dataset up to date');
	}

	return datasetName;
}

/** Read-after-write guard: freshly created examples can lag the immediate
 *  list. Verify the split-scoped count covers what was just synced before a
 *  driver starts an experiment — an invisible example silently produces an
 *  empty or partial run (the dispatcher's historical "no results" failure). */
export async function ensureExamplesVisible(
	lsClient: Client,
	datasetName: string,
	testCasesWithFiles: WorkflowTestCaseWithFile[],
	logger: EvalLogger,
	opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<void> {
	const expected = roundRobinCaseRows(testCasesWithFiles).length;
	if (expected === 0) return;
	const attempts = opts.attempts ?? 3;
	const baseDelayMs = opts.baseDelayMs ?? 2_000;
	const splits = [...new Set(testCasesWithFiles.map((tc) => tc.fileSlug))];
	for (let attempt = 1; ; attempt++) {
		let count = 0;
		for await (const _example of lsClient.listExamples({ datasetName, splits })) count++;
		if (count >= expected) return;
		if (attempt >= attempts) {
			throw new Error(
				`Dataset "${datasetName}" lists ${String(count)}/${String(expected)} synced example(s) after ${String(attempts)} attempt(s) — read-after-write lag or split drift; refusing to run a partial experiment.`,
			);
		}
		logger.warn(
			`Dataset "${datasetName}" lists ${String(count)}/${String(expected)} synced example(s); retrying (${String(attempt)}/${String(attempts)})…`,
		);
		await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Home moved to run/rows.ts (single row-flattening source for both drivers);
// re-exported here so existing importers keep working.
export { BUILD_ONLY_SCENARIO_NAME };

interface FlatScenario {
	testCaseFile: string;
	scenarioName: string;
	scenarioDescription: string;
	dataSetup: string;
	successCriteria: string;
	complexity?: 'simple' | 'medium' | 'complex';
	tags?: string[];
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
	/** Logical groupings (e.g. ['pr', 'full']) — written into the LangSmith example's splits alongside the file slug. */
	datasets: string[];
}

/**
 * Flatten test cases into scenarios ordered round-robin across test cases.
 *
 * Input:  [tc1(s1,s2,s3), tc2(s1,s2), tc3(s1)]
 * Output: [tc1/s1, tc2/s1, tc3/s1, tc1/s2, tc2/s2, tc1/s3]
 */
function buildRoundRobinScenarios(testCasesWithFiles: WorkflowTestCaseWithFile[]): FlatScenario[] {
	return roundRobinCaseRows(testCasesWithFiles).map(({ testCase, testCaseFile, scenario }) => ({
		testCaseFile,
		scenarioName: scenario?.name ?? BUILD_ONLY_SCENARIO_NAME,
		scenarioDescription: scenario?.description ?? '',
		dataSetup: scenario?.dataSetup ?? '',
		successCriteria: scenario?.successCriteria ?? '',
		complexity: testCase.complexity,
		tags: testCase.tags,
		triggerType: testCase.triggerType,
		datasets: testCase.datasets,
	}));
}

// Schemas for reading existing LangSmith example data, which is typed as an
// open KVMap by the SDK. We only parse the fields we care about for diffing.

const existingInputsSchema = z
	.object({
		testCaseFile: z.string().default(''),
		scenarioName: z.string().default(''),
		scenarioDescription: z.string().default(''),
		dataSetup: z.string().default(''),
		successCriteria: z.string().default(''),
	})
	.passthrough();

const existingMetadataSchema = z
	.object({
		testCaseFile: z.string().default(''),
		complexity: z.string().default(''),
		triggerType: z.string().default(''),
		tags: z.array(z.string()).default([]),
	})
	.passthrough();

function hasInputsChanged(existing: unknown, incoming: DatasetExampleInputs): boolean {
	// Treat unparseable existing data as changed so we overwrite with fresh
	// values rather than aborting the whole sync on one malformed row.
	const parsed = existingInputsSchema.safeParse(existing ?? {});
	if (!parsed.success) return true;
	const e = parsed.data;
	return (
		e.testCaseFile !== incoming.testCaseFile ||
		e.dataSetup !== incoming.dataSetup ||
		e.successCriteria !== incoming.successCriteria ||
		e.scenarioDescription !== incoming.scenarioDescription
	);
}

function hasMetadataChanged(existing: unknown, incoming: DatasetExampleMetadata): boolean {
	const parsed = existingMetadataSchema.safeParse(existing ?? {});
	if (!parsed.success) return true;
	const e = parsed.data;
	return (
		e.testCaseFile !== incoming.testCaseFile ||
		e.complexity !== (incoming.complexity ?? '') ||
		e.triggerType !== (incoming.triggerType ?? '') ||
		JSON.stringify(e.tags) !== JSON.stringify(incoming.tags ?? [])
	);
}

// Split (file slug + datasets/tiers) is order-insensitive — compare as sets so a
// reorder isn't a change, but adding/removing a tier is and triggers a re-sync.
function hasSplitChanged(existing: string | string[] | undefined, incoming: string[]): boolean {
	const current = existing === undefined ? [] : Array.isArray(existing) ? existing : [existing];
	if (current.length !== incoming.length) return true;
	const incomingSet = new Set(incoming);
	return !current.every((s) => incomingSet.has(s));
}
