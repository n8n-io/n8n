import { z } from 'zod';

// Optional so tool calls saved before this field was added can still resume.
export const approvalSummarySchema = z
	.string()
	.min(1)
	.max(300)
	.optional()
	// The communication-style prompt carries the full rule. Keep this short: the
	// field repeats in every tool that shows an approval card.
	.describe(
		'One plain-language line for the approval card: the concrete change or effect of this call. ' +
			'Do not repeat the workflow name or ID. Do not include unrelated future actions.',
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
