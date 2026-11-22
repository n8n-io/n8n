import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { RunWorkflowTestFn } from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

export const workflowTestInputSchema = z.object({
	workflowId: z.string().min(1).describe('The ID of the workflow to test.'),
	startNode: z
		.string()
		.min(1)
		.optional()
		.describe('Optional trigger or start node name to run from.'),
	destinationNode: z
		.string()
		.min(1)
		.optional()
		.describe('Optional destination node name to stop at (partial simulation).'),
	pinData: z
		.record(z.array(z.object({ json: z.record(z.unknown()) })))
		.optional()
		.describe('Optional pinned trigger/node input items for the simulation.'),
	seeds: z
		.record(z.record(z.unknown()))
		.optional()
		.describe('Optional initial vendor state payloads keyed by ai-gym vendor slug (e.g. "slack").'),
	faults: z
		.record(z.number().int())
		.optional()
		.describe('Optional vendor fault flags mapped to occurrence count (-1 for persistent).'),
	skipCredentialCheck: z
		.boolean()
		.optional()
		.describe('Skip Stage 1 live credential validation and run only the ai-gym simulation.'),
	timeoutMs: z
		.number()
		.int()
		.min(1000)
		.max(300_000)
		.optional()
		.describe('Maximum simulation timeout in milliseconds.'),
});

type WorkflowTestToolInput = z.infer<typeof workflowTestInputSchema>;

export function createWorkflowTestTool(runWorkflowTest: RunWorkflowTestFn) {
	return new Tool(ORCHESTRATION_TOOL_IDS.WORKFLOW_TEST)
		.description(
			'Test a workflow in two stages: (1) verify that its configured real credentials are still valid with read-only auth checks, then (2) execute an ephemeral, in-process ai-gym simulation with no side effects on live external services or execution history. Fails fast if the workflow contains nodes unsupported by ai-gym.',
		)
		.input(workflowTestInputSchema)
		.handler(async (input: WorkflowTestToolInput) => {
			return await runWorkflowTest(input);
		})
		.build();
}
