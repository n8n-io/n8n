// ---------------------------------------------------------------------------
// Upload synthetic prompts to LangSmith as two named datasets:
//   - instance-ai-general-agent  (queries, data tables, node discovery)
//   - instance-ai-builder        (workflow building via build-workflow-with-agent)
//
// Usage:
//   LANGSMITH_API_KEY=... pnpm eval:upload-datasets
// ---------------------------------------------------------------------------

import { Client } from 'langsmith/client';

import { SYNTHETIC_PROMPTS } from './synthetic-prompts';
import type { PromptConfig } from './types';

const GENERAL_DATASET_NAME = 'instance-ai-general-agent';
const BUILDER_DATASET_NAME = 'instance-ai-builder';

// ---------------------------------------------------------------------------
// Upload helpers
// ---------------------------------------------------------------------------

async function getOrCreateDataset(
	client: Client,
	name: string,
	description: string,
): Promise<{ id: string }> {
	try {
		const existing = await client.readDataset({ datasetName: name });
		console.log(`  Dataset "${name}" already exists (${existing.id})`);
		return { id: existing.id };
	} catch {
		const created = await client.createDataset(name, { description });
		console.log(`  Created dataset "${name}" (${created.id})`);
		return { id: created.id };
	}
}

async function uploadPrompts(
	client: Client,
	datasetId: string,
	prompts: PromptConfig[],
): Promise<void> {
	if (prompts.length === 0) {
		console.log('  No prompts to upload');
		return;
	}

	await client.createExamples({
		datasetId,
		inputs: prompts.map((p) => ({
			prompt: p.text,
			complexity: p.complexity,
			tags: p.tags ?? [],
		})),
		metadata: prompts.map((p) => ({
			complexity: p.complexity,
			source: p.source,
			tags: p.tags ?? [],
		})),
	});

	console.log(`  Uploaded ${String(prompts.length)} examples`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	if (!process.env.LANGSMITH_API_KEY) {
		console.error('Error: LANGSMITH_API_KEY environment variable is required');
		process.exit(1);
	}

	const client = new Client();

	const generalPrompts = SYNTHETIC_PROMPTS.filter((p) => p.dataset === 'general');
	const builderPrompts = SYNTHETIC_PROMPTS.filter((p) => p.dataset === 'builder');
	const untagged = SYNTHETIC_PROMPTS.filter((p) => !p.dataset);

	if (untagged.length > 0) {
		console.warn(
			`Warning: ${String(untagged.length)} prompt(s) have no dataset tag and will be skipped`,
		);
	}

	console.log(`\n=== Uploading Instance-AI Evaluation Datasets ===\n`);
	console.log(`General agent prompts: ${String(generalPrompts.length)}`);
	console.log(`Builder prompts: ${String(builderPrompts.length)}`);
	console.log('');

	// General agent dataset
	console.log(`[${GENERAL_DATASET_NAME}]`);
	const generalDataset = await getOrCreateDataset(
		client,
		GENERAL_DATASET_NAME,
		'Instance-AI general agent evaluation prompts: queries, data table management, node discovery, and non-builder tasks',
	);
	await uploadPrompts(client, generalDataset.id, generalPrompts);

	// Builder dataset
	console.log(`\n[${BUILDER_DATASET_NAME}]`);
	const builderDataset = await getOrCreateDataset(
		client,
		BUILDER_DATASET_NAME,
		'Instance-AI builder evaluation prompts: workflow building tasks that invoke the build-workflow-with-agent sub-agent',
	);
	await uploadPrompts(client, builderDataset.id, builderPrompts);

	console.log('\nDone.');
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
