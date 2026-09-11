import { z } from 'zod';

// Optional so tool calls saved before this field was added can still resume.
export const approvalSummarySchema = z
	.string()
	.min(1)
	.max(300)
	.optional()
	.describe(
		'Always provide a short, plain-language summary for the approval card. ' +
			'Describe the concrete changes or effects of this call, including affected nodes or external actions. ' +
			'Use one line. Do not repeat the workflow name or ID. Do not include unrelated future actions. ' +
			'For example: "Add a Slack notification after the payment check". ' +
			'For a live execution, describe what it will do, not just "test the workflow".',
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
