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
			.describe(
				'Short human label naming the task as a repeatable action, 3-8 words, suitable as a workflow name. Present tense ("Sort desktop screenshots"), never a past-tense report of the run ("Sorted 12 screenshots"). Plain text — no emoji',
			),
		summary: z.string().describe('One sentence describing what was done (or why nothing was done)'),
		details: z
			.string()
			.optional()
			.describe(
				"The task's actual output, in markdown, when the deliverable is information the user asked for — a summary, an answer, extracted data. This field is the only channel that reaches the user, so include the full deliverable. Keep it under ~300 words unless the request calls for more. Omit for pure-action tasks whose result is a side effect on the system",
			),
		icon: z
			.string()
			.optional()
			.describe('A single emoji that captures the task, e.g. "🍌". No text, just the emoji'),
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
