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
import { verificationVerdictSchema } from '../../workflow-loop/workflow-loop-state';
import type { WorkflowLoopAction } from '../../workflow-loop/workflow-loop-state';

function actionToGuidance(action: WorkflowLoopAction): string {
	switch (action.type) {
		case 'done': {
			if (action.mockedCredentialTypes?.length) {
				const types = action.mockedCredentialTypes.join(', ');
				return (
					`Workflow verified successfully with temporary mock data. ` +
					`Call \`setup-credentials\` with types [${types}] and ` +
					`credentialFlow stage "finalize" to let the user add real credentials. ` +
					`After the user selects credentials, call \`apply-workflow-credentials\` to apply them.`
				);
			}
			return `Workflow verified successfully. Report completion to the user.${action.workflowId ? ` Workflow ID: ${action.workflowId}` : ''}`;
		}
		case 'verify':
			return (
				`VERIFY: Run workflow ${action.workflowId}. ` +
				'If the build had mocked credentials, use `verify-built-workflow` with the workItemId. ' +
				'Otherwise use `run-workflow`. ' +
				'If it fails, use `debug-execution` to diagnose. ' +
				'Then call `report-verification-verdict` with your findings.'
			);
		case 'blocked':
			return `BUILD BLOCKED: ${action.reason}. Explain this to the user and ask how to proceed.`;
		case 'patch':
			return (
				`PATCH NEEDED: Apply \`patch-workflow\` to node "${action.nodeName}" in workflow ${action.workflowId}. ` +
				'After patching, run the workflow again and call `report-verification-verdict` with the result.'
			);
		case 'rebuild':
			return (
				`REBUILD NEEDED: The workflow at ${action.workflowId} needs structural repair. ` +
				`Call \`build-workflow-with-agent\` again with these details: ${action.failureDetails}. ` +
				'The build outcome will trigger verification automatically.'
			);
	}
}

export function createReportVerificationVerdictTool(context: OrchestrationContext) {
	return createTool({
		id: 'report-verification-verdict',
		description:
			'Report the result of verifying a workflow after building or patching it. ' +
			'Call this after running a workflow and (optionally) debugging a failed execution. ' +
			'Returns deterministic guidance on what to do next (done, patch, rebuild, or blocked).',
		inputSchema: z.object({
			workItemId: z.string().describe('The work item ID from the build task (wi_XXXXXXXX)'),
			workflowId: z.string().describe('The workflow ID that was verified'),
			executionId: z
				.string()
				.optional()
				.describe('The execution ID from run-workflow, if available'),
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
		}),
		outputSchema: z.object({
			guidance: z.string(),
		}),
		execute: async (input) => {
			if (!context.reportVerificationVerdict) {
				return { guidance: 'Error: verification verdict reporting not available.' };
			}

			const action = await context.reportVerificationVerdict({
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

			return { guidance: actionToGuidance(action) };
		},
	});
}
