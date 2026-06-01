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
		.default([])
		.describe('Subset of registered native domain tool names the sub-agent needs'),
	briefing: z.string().describe('The specific task to accomplish, including all relevant context'),
	artifacts: z
		.record(z.unknown())
		.optional()
		.describe('Relevant IDs, data, or context (workflow IDs, credential IDs, etc.)'),
	conversationContext: z
		.string()
		.optional()
		.describe(
			'Brief summary of the conversation so far — what was discussed, decisions made, and information gathered. The sub-agent uses this to avoid repeating information the user already knows.',
		),
});

export type DelegateInput = z.infer<typeof delegateInputSchema>;

export const delegateOutputSchema = z.object({
	result: z.string().describe('The sub-agent synthesized answer'),
	toolCallCount: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Total number of tool invocations the sub-agent made'),
	toolErrorCount: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Number of tool invocations that failed'),
	durationMs: z.number().optional().describe('Wall-clock duration in milliseconds'),
	blockers: z
		.array(z.string())
		.optional()
		.describe('Specific blockers encountered during execution'),
});

export type DelegateOutput = z.infer<typeof delegateOutputSchema>;
