import { z } from 'zod';

export const delegateInputSchema = z.object({
	role: z
		.string()
		.describe('Free-form role description (e.g., "workflow builder", "execution debugger")'),
	instructions: z
		.string()
		.describe(
			'Task-specific system prompt for the sub-agent. Be specific about what to do and how.',
		),
	tools: z
		.array(z.string())
		.min(1)
		.describe('Subset of registered native domain tool names the sub-agent needs'),
	briefing: z.string().describe('The specific task to accomplish, including all relevant context'),
	artifacts: z
		.record(z.unknown())
		.optional()
		.describe('Relevant IDs, data, or context (workflow IDs, credential IDs, etc.)'),
});

export type DelegateInput = z.infer<typeof delegateInputSchema>;

export const delegateOutputSchema = z.object({
	result: z.string().describe('The sub-agent synthesized answer'),
});

export type DelegateOutput = z.infer<typeof delegateOutputSchema>;
