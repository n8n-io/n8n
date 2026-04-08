import { hasNonPositionalChanges } from 'n8n-workflow';
import { z } from 'zod';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

const gateSchema = z.object({
	requiresChange: z.boolean().describe('Whether the user request requires the workflow to change'),
	reasoning: z.string().describe('Brief reasoning'),
});

export const workflowActuallyChanged: BinaryCheck = {
	name: 'workflow_actually_changed',
	kind: 'deterministic',

	async gate(_workflow, ctx) {
		// The gate cannot run without an LLM or a preexisting workflow
		if (!ctx.existingWorkflow || !ctx.llm) return undefined;

		const result = await ctx.llm.withStructuredOutput(gateSchema).invoke([
			{
				role: 'system',
				content: `
					You decide whether a user's request to an AI workflow builder requires the workflow to be changed.
					Some requests are questions, explanations, or confirmations that do not require any change in the workflow.
					Answer requiresChange: true if the workflow should be different after this request, false otherwise.
				`,
			},
			{
				role: 'user',
				content: ctx.prompt,
			},
		]);

		if (result.requiresChange) return undefined;

		return `Skipped since user request does not require changes: (${result.reasoning})`;
	},

	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		if (!ctx.existingWorkflow) {
			return { pass: true, comment: 'There is no existing workflow, skipped' };
		}

		const changed = hasNonPositionalChanges(
			ctx.existingWorkflow.nodes,
			workflow.nodes,
			ctx.existingWorkflow.connections,
			workflow.connections,
		);

		if (changed) return { pass: true };
		return {
			pass: false,
			comment: 'Nothing has changed in the workflow',
		};
	},
};
