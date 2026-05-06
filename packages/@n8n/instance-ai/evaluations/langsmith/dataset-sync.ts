// ---------------------------------------------------------------------------
// LangSmith dataset sync
//
// Syncs JSON test case files from the repo to a LangSmith dataset. Existing
// examples are found by inputs (testCaseFile + scenarioName) and updated in
// place; new scenarios get a random UUID. Stale examples are left in place
// — LangSmith's soft-delete tombstones UUIDs, which historically caused 409
// conflicts on resurrection; manual orphan cleanup happens via UI or MCP.
// ---------------------------------------------------------------------------

import { randomUUID } from 'crypto';
import type { Client } from 'langsmith';
import type { Example, KVMap } from 'langsmith/schemas';
import { z } from 'zod';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';

/**
 * Shape of the inputs passed to the target function for each scenario.
 * `testCaseFile` is included so the LangSmith Inputs column shows which
 * workflow a scenario belongs to (metadata is hidden by default).
 */
export const datasetExampleInputsSchema = z.object({
	prompt: z.string(),
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
 * Sync JSON test cases to a LangSmith dataset.
 *
 * - Creates the dataset if it doesn't exist
 * - Finds existing examples by (testCaseFile, scenarioName) and updates in place
 * - Creates new scenarios with a random UUID
 * - Orders examples round-robin across test cases for optimal parallelism
 * - Assigns each example to a split (test case file slug) for UI filtering
 *
 * Never deletes. Orphan cleanup is manual (LangSmith UI or MCP).
 *
 * Returns the dataset name for use with evaluate().
 */
export async function syncDataset(
	lsClient: Client,
	datasetName: string,
	logger: EvalLogger,
	filter?: string,
): Promise<string> {
	const testCasesWithFiles = loadWorkflowTestCasesWithFiles(filter);

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

	// List existing examples, keyed by derived ID (testCaseFile/scenarioName from inputs).
	const existingByDerivedId = new Map<string, Example>();
	for await (const example of lsClient.listExamples({ datasetId })) {
		const inputs = existingInputsSchema.safeParse(example.inputs);
		if (!inputs.success) continue;
		existingByDerivedId.set(`${inputs.data.testCaseFile}/${inputs.data.scenarioName}`, example);
	}

	// Diff and sync
	const toCreate: Array<{ id: string; inputs: KVMap; metadata: KVMap; split: string }> = [];
	const toUpdate: Array<{ id: string; inputs: KVMap; metadata: KVMap; split: string }> = [];

	for (const scenario of scenarios) {
		const derivedId = `${scenario.testCaseFile}/${scenario.scenarioName}`;

		const inputs: DatasetExampleInputs = {
			prompt: scenario.prompt,
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

		const existingExample = existingByDerivedId.get(derivedId);
		if (existingExample) {
			if (
				hasInputsChanged(existingExample.inputs, inputs) ||
				hasMetadataChanged(existingExample.metadata, metadata)
			) {
				toUpdate.push({
					id: existingExample.id,
					inputs,
					metadata,
					split: scenario.testCaseFile,
				});
			}
		} else {
			toCreate.push({
				id: randomUUID(),
				inputs,
				metadata,
				split: scenario.testCaseFile,
			});
		}
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

	if (toCreate.length === 0 && toUpdate.length === 0) {
		logger.info('  Dataset up to date');
	}

	return datasetName;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FlatScenario {
	prompt: string;
	testCaseFile: string;
	scenarioName: string;
	scenarioDescription: string;
	dataSetup: string;
	successCriteria: string;
	complexity?: 'simple' | 'medium' | 'complex';
	tags?: string[];
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
}

/**
 * Flatten test cases into scenarios ordered round-robin across test cases.
 *
 * Input:  [tc1(s1,s2,s3), tc2(s1,s2), tc3(s1)]
 * Output: [tc1/s1, tc2/s1, tc3/s1, tc1/s2, tc2/s2, tc1/s3]
 */
function buildRoundRobinScenarios(
	testCasesWithFiles: Array<{
		testCase: {
			prompt: string;
			complexity?: 'simple' | 'medium' | 'complex';
			tags?: string[];
			triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
			scenarios: Array<{
				name: string;
				description: string;
				dataSetup: string;
				successCriteria: string;
			}>;
		};
		fileSlug: string;
	}>,
): FlatScenario[] {
	const result: FlatScenario[] = [];
	const maxScenarios = Math.max(...testCasesWithFiles.map((tc) => tc.testCase.scenarios.length), 0);

	for (let i = 0; i < maxScenarios; i++) {
		for (const { testCase, fileSlug } of testCasesWithFiles) {
			const scenario = testCase.scenarios[i];
			if (scenario) {
				result.push({
					prompt: testCase.prompt,
					testCaseFile: fileSlug,
					scenarioName: scenario.name,
					scenarioDescription: scenario.description,
					dataSetup: scenario.dataSetup,
					successCriteria: scenario.successCriteria,
					complexity: testCase.complexity,
					tags: testCase.tags,
					triggerType: testCase.triggerType,
				});
			}
		}
	}

	return result;
}

// Schemas for reading existing LangSmith example data, which is typed as an
// open KVMap by the SDK. We only parse the fields we care about for diffing.

const existingInputsSchema = z
	.object({
		prompt: z.string().default(''),
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
		e.prompt !== incoming.prompt ||
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
