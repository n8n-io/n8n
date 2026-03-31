// ---------------------------------------------------------------------------
// LangSmith dataset management: load examples and upload datasets
// ---------------------------------------------------------------------------

import type { Client } from 'langsmith';

import type { DatasetExample } from '../types';

// ---------------------------------------------------------------------------
// loadExamples
//
// Iterates over all examples in a LangSmith dataset and returns them as
// DatasetExample[], applying optional filters for tags, complexity,
// trigger type, and max count.
// ---------------------------------------------------------------------------

export async function loadExamples(
	client: Client,
	datasetName: string,
	filters?: {
		tags?: string[];
		complexity?: string;
		triggerType?: string;
		maxExamples?: number;
	},
): Promise<DatasetExample[]> {
	const examples: DatasetExample[] = [];

	for await (const example of client.listExamples({ datasetName })) {
		const inputs = example.inputs as Record<string, unknown>;

		const prompt = typeof inputs.prompt === 'string' ? inputs.prompt : '';
		if (!prompt) continue;

		const tags = Array.isArray(inputs.tags)
			? (inputs.tags as unknown[]).filter((t): t is string => typeof t === 'string')
			: [];

		const complexity = typeof inputs.complexity === 'string' ? inputs.complexity : 'medium';
		const triggerType = typeof inputs.triggerType === 'string' ? inputs.triggerType : undefined;

		const checklist = Array.isArray(inputs.checklist)
			? (inputs.checklist as DatasetExample['checklist'])
			: undefined;

		const expectedCredentials = Array.isArray(inputs.expectedCredentials)
			? (inputs.expectedCredentials as unknown[]).filter((c): c is string => typeof c === 'string')
			: undefined;

		const entry: DatasetExample = {
			prompt,
			tags,
			complexity: complexity as DatasetExample['complexity'],
			triggerType: triggerType as DatasetExample['triggerType'],
			checklist,
			expectedCredentials,
		};

		// Apply filters
		if (filters?.tags && filters.tags.length > 0) {
			const hasMatchingTag = filters.tags.some((t) => tags.includes(t));
			if (!hasMatchingTag) continue;
		}

		if (filters?.complexity && complexity !== filters.complexity) continue;

		if (filters?.triggerType && triggerType !== filters.triggerType) continue;

		examples.push(entry);

		if (filters?.maxExamples && examples.length >= filters.maxExamples) break;
	}

	return examples;
}

// ---------------------------------------------------------------------------
// uploadDataset
//
// Creates (or gets) a LangSmith dataset by name and uploads the provided
// examples. Each DatasetExample is stored as inputs with prompt, tags,
// complexity, triggerType, checklist, and expectedCredentials fields.
// ---------------------------------------------------------------------------

export async function uploadDataset(
	client: Client,
	datasetName: string,
	examples: DatasetExample[],
): Promise<void> {
	const dataset = await client.createDataset(datasetName, {
		description: `Instance AI evaluation dataset: ${datasetName}`,
	});

	for (const example of examples) {
		await client.createExample(
			{
				prompt: example.prompt,
				tags: example.tags,
				complexity: example.complexity,
				triggerType: example.triggerType,
				checklist: example.checklist,
				expectedCredentials: example.expectedCredentials,
			},
			{},
			{ datasetId: dataset.id },
		);
	}
}
