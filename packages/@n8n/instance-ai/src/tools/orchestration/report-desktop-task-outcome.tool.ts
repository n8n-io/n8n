/**
 * Outcome report filed by desktop one-shot task runs — the run's final tool
 * call. Persists a structured `DesktopAssistantTaskOutcome` into thread
 * metadata (keyed by runId) for the BFF to read when the run finishes.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import { DesktopTaskOutcomeStorage } from '../../storage/desktop-task-outcome-storage';
import type { OrchestrationContext } from '../../types';

const inputSchema = sanitizeInputSchema(
	z.object({
		success: z
			.boolean()
			.describe('Whether the task was completed. false when declining or when the task failed'),
		title: z
			.string()
			.describe('Short human label for the task, 3-8 words, suitable as a workflow name'),
		summary: z
			.string()
			.describe('One sentence describing what was done (or why nothing was done)'),
		failureReason: z
			.string()
			.optional()
			.describe('User-readable reason the task was not completed. Required when success is false'),
	}),
);

type Input = z.infer<typeof inputSchema>;

export function createReportDesktopTaskOutcomeTool(context: OrchestrationContext) {
	return new Tool('report-desktop-task-outcome')
		.description(
			'Report the structured outcome of this task run. Call exactly once, as the final tool call of the run — never call another tool after it.',
		)
		.input(inputSchema)
		.handler(async (input: Input) => {
			if (!context.memory) {
				return { result: 'Outcome could not be persisted: thread storage unavailable.' };
			}
			const storage = new DesktopTaskOutcomeStorage(context.memory);
			await storage.save(context.threadId, context.runId, input);
			return { result: 'Outcome recorded. End the run now.' };
		})
		.build();
}
