import { z } from 'zod';

// Optional so tool calls saved before this field was added can still resume.
export const approvalSummarySchema = z
	.string()
	.min(1)
	.max(300)
	.optional()
	.describe(
		"Always provide: one plain-language line for the approval card, in the user's language, " +
			'naming the concrete effects of this call (e.g. "Add a Slack notification after the payment check"; ' +
			'for a live run, what it will do). Omit the workflow name, ID, and unrelated future actions.',
	);

/**
 * Description line under the approval card title. The title already names the
 * resource, so the line is the agent's summary alone, or a generic fallback
 * when a saved tool call has none.
 */
export function formatApprovalMessage(fallback: string, summary?: string): string {
	const oneLineSummary = summary?.replace(/\s+/g, ' ').trim();
	if (oneLineSummary) return oneLineSummary;
	return fallback;
}
