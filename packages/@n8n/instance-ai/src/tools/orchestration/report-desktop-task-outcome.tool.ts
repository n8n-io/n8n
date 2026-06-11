/**
 * Outcome report filed by desktop one-shot task runs — the run's final tool
 * call. The tool itself is a stateless ack: the desktop client reads the
 * structured outcome straight from this tool-call event on the thread event
 * stream, so nothing is persisted server-side.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';

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

export function createReportDesktopTaskOutcomeTool() {
	return new Tool('report-desktop-task-outcome')
		.description(
			'Report the structured outcome of this task run. Call exactly once, as the final tool call of the run — never call another tool after it.',
		)
		.input(inputSchema)
		.handler(async () => await Promise.resolve({ result: 'Outcome recorded. End the run now.' }))
		.build();
}
