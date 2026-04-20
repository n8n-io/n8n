/**
 * Report Verification Verdict Tool
 *
 * Orchestration tool that feeds structured verification results into the
 * deterministic workflow loop controller. The LLM handles the fuzzy parts
 * (running workflows, debugging, diagnosing), but this tool ensures the
 * controller decides what phase comes next — with predictable retries and
 * no infinite loops.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';
import { formatWorkflowLoopGuidance } from '../../workflow-loop/guidance';
import { verificationVerdictSchema } from '../../workflow-loop/workflow-loop-state';

export const reportVerificationVerdictInputSchema = z.object({
	workItemId: z.string().describe('The work item ID from the build task (wi_XXXXXXXX)'),
	workflowId: z.string().describe('The workflow ID that was verified'),
	executionId: z
		.string()
		.optional()
		.describe('The execution ID from `executions(action="run")`, if available'),
	verdict: verificationVerdictSchema.describe(
		'Your assessment: "verified" if the workflow ran correctly, ' +
			'"needs_patch" if a specific node needs fixing, ' +
			'"needs_rebuild" if the workflow needs structural changes, ' +
			'"trigger_only" if the workflow uses event triggers and cannot be test-run, ' +
			'"needs_user_input" if user action is required (e.g. missing credentials), ' +
			'"failed_terminal" if the failure cannot be fixed automatically',
	),
	failureSignature: z
		.string()
		.optional()
		.describe(
			'A short, stable identifier for the failure (e.g. "TypeError:undefined_is_not_iterable" or node error code). Used to detect repeated failures.',
		),
	failedNodeName: z
		.string()
		.optional()
		.describe('The name of the node that failed (required for "needs_patch" verdict)'),
	diagnosis: z.string().optional().describe('Brief explanation of what went wrong and why'),
	patch: z
		.record(z.unknown())
		.optional()
		.describe(
			'Node parameter patch object for "needs_patch" verdict — the specific parameters to change on the failed node',
		),
	summary: z.string().describe('One-sentence summary of the verification result'),
});

export function createReportVerificationVerdictTool(context: OrchestrationContext) {
	return createTool({
		id: 'report-verification-verdict',
		description:
			'Report the result of verifying a workflow after building it. ' +
			'Call this after running a workflow and (optionally) debugging a failed execution. ' +
			'Returns deterministic guidance on what to do next (done, rebuild, or blocked).',
		inputSchema: reportVerificationVerdictInputSchema,
		outputSchema: z.object({
			guidance: z.string(),
		}),
		execute: async (input: z.infer<typeof reportVerificationVerdictInputSchema>) => {
			if (!context.workflowTaskService) {
				return { guidance: 'Error: verification verdict reporting not available.' };
			}

			const action = await context.workflowTaskService.reportVerificationVerdict({
				workItemId: input.workItemId,
				workflowId: input.workflowId,
				executionId: input.executionId,
				verdict: input.verdict,
				failureSignature: input.failureSignature,
				failedNodeName: input.failedNodeName,
				diagnosis: input.diagnosis,
				patch: input.patch,
				summary: input.summary,
			});

			return {
				guidance: formatWorkflowLoopGuidance(action, { workItemId: input.workItemId }),
			};
		},
	});
}
