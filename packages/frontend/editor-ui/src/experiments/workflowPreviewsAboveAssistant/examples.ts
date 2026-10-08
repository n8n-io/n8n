// Experiment cleanup (124_workflow_previews_above_assistant)
import { z } from 'zod';

import examples from './examples.json';
import type { WorkflowPreviewExample } from './types';

const positionSchema = z.object({ x: z.number(), y: z.number() });

const cardVisualizationSchema = z.object({
	type: z.literal('salesforce-card'),
	icon: z.string(),
	titleKey: z.string(),
	subtitleKey: z.string(),
});

const spreadsheetVisualizationSchema = z.object({ type: z.literal('invoice-spreadsheet') });

const slackMessageVisualizationSchema = z.object({
	type: z.literal('slack-message'),
	senderKey: z.string(),
	messageKey: z.string(),
});

const outputVisualizationSchema = z
	.discriminatedUnion('type', [
		cardVisualizationSchema,
		spreadsheetVisualizationSchema,
		slackMessageVisualizationSchema,
	])
	.and(z.object({ targetNodeId: z.string() }));

const exampleSchema = z.object({
	id: z.string(),
	titleKey: z.string(),
	promptKey: z.string(),
	nodes: z.array(
		z.object({ id: z.string(), labelKey: z.string(), icon: z.string(), position: positionSchema }),
	),
	connections: z.array(z.object({ source: z.string(), target: z.string() })),
	inputVisualization: cardVisualizationSchema.optional(),
	outputVisualizations: z.array(outputVisualizationSchema).optional(),
	iconCycle: z.object({ nodeIds: z.array(z.string()), icons: z.array(z.string()) }).optional(),
});

const parsedExamples: WorkflowPreviewExample[] = z.array(exampleSchema).parse(examples);
const firstExample = parsedExamples[0];

if (!firstExample) {
	throw new Error('Workflow preview examples must not be empty');
}

export const WORKFLOW_PREVIEW_EXAMPLES: [WorkflowPreviewExample, ...WorkflowPreviewExample[]] = [
	firstExample,
	...parsedExamples.slice(1),
];
