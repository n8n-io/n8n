import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

import type { verifyBuiltWorkflowInputSchema } from '../orchestration/verify-built-workflow.tool';

/** Node contracts: the build already verifies, so the verify tool only describes a re-run. */
export const REVERIFY_DESCRIPTION =
	'Re-run verification after a change, or with other inputData or fixtures. build-workflow already verifies each successful build. ' +
	'A wrong `inputData` shape gives null values downstream. Fix the shape, not the workflow.';

const REVERIFY_FIELD_DESCRIPTIONS: Record<
	keyof typeof verifyBuiltWorkflowInputSchema.shape,
	string
> = {
	workItemId:
		'Work item ID from the build (wi_XXXXXXXX). When omitted, the latest build of workflowId in this thread is used.',
	workflowId: 'The workflow ID to verify',
	inputData:
		'Trigger input in the real trigger output shape. ' +
		'Form Trigger: flat fields, e.g. {name: "Alice"}. Do not wrap them in formFields. ' +
		'Webhook: a flat payload goes under `body`. When expressions read $json.query, $json.headers, or $json.params, pass {body, query, headers, params}. ' +
		'Chat Trigger: {chatInput: "..."}. Schedule Trigger: omit it.',
	triggerNodeName:
		'Trigger node to start from. REQUIRED when the workflow has more than one trigger. Verify once per trigger to cover each branch. ' +
		'Never change or copy the workflow to reach a branch.',
	timeout: 'Max wait in ms (default 300000)',
	includeData: 'True: return the full execution data. Default false.',
	maxDataChars: 'Max characters per node preview (default 600)',
	fixtureOverrides:
		'Output fixtures by node name, only for nodes that the build simulated. Not for trigger input. An empty array needs `allowZeroItemFixtures`.',
	fixTargetNodeNames:
		'Nodes this change is about, e.g. the failing or repaired node. When one was not reached or was simulated, the verdict is "changed but unverified". Pass them when you fix a node.',
	allowZeroItemFixtures:
		'Nodes whose `fixtureOverrides` entry may be empty. Zero items stop all nodes below. Use it only to verify the empty branch, and report that.',
};

/**
 * Node contracts: the verify input with the same fields and rules and shorter text.
 * It takes the schema from the tool so that this module does not load the lazy verify tool.
 */
export function reverifyInputSchema(
	inputSchema: BuiltTool['inputSchema'],
): BuiltTool['inputSchema'] {
	if (!(inputSchema instanceof z.ZodObject)) return inputSchema;
	const shape: z.ZodRawShape = inputSchema.shape;
	return inputSchema.extend(
		Object.fromEntries(
			Object.entries(REVERIFY_FIELD_DESCRIPTIONS).flatMap(([name, description]) => {
				const field = shape[name];
				return field ? [[name, field.describe(description)]] : [];
			}),
		),
	);
}
