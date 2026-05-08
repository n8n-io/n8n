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
import { createRemediation, terminalRemediationFromState } from '../../workflow-loop/remediation';
import {
	type RemediationMetadata,
	verificationVerdictSchema,
} from '../../workflow-loop/workflow-loop-state';

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
	remediation: z
		.object({
			category: z.enum(['code_fixable', 'needs_setup', 'blocked']),
			shouldEdit: z.boolean(),
			guidance: z.string(),
			reason: z.string().optional(),
			remainingSubmitFixes: z.number().int().min(0).optional(),
			attemptCount: z.number().int().min(0).optional(),
		})
		.optional()
		.describe('Remediation metadata returned by verify-built-workflow, if available'),
	summary: z.string().describe('One-sentence summary of the verification result'),
});

function defaultRemediationForVerdict(
	input: z.infer<typeof reportVerificationVerdictInputSchema>,
): RemediationMetadata | undefined {
	switch (input.verdict) {
		case 'needs_patch':
		case 'needs_rebuild':
			return createRemediation({
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'verification_code_fixable',
				guidance:
					input.diagnosis ??
					'Verification found a workflow-code issue. Apply one batched repair if the guard allows it.',
			});
		case 'needs_user_input':
			return createRemediation({
				category: 'needs_setup',
				shouldEdit: false,
				reason: input.failureSignature ?? 'verification_needs_user_input',
				guidance: input.diagnosis ?? input.summary,
			});
		case 'failed_terminal':
			return createRemediation({
				category: 'blocked',
				shouldEdit: false,
				reason: input.failureSignature ?? 'verification_terminal_failure',
				guidance: input.diagnosis ?? input.summary,
			});
		default:
			return undefined;
	}
}

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

			const stateBefore = await context.workflowTaskService.getWorkflowLoopState(input.workItemId);
			const terminalRemediation =
				stateBefore?.lastRemediation && !stateBefore.lastRemediation.shouldEdit
					? terminalRemediationFromState(stateBefore, context.runId)
					: undefined;
			if (terminalRemediation) {
				return {
					guidance: formatWorkflowLoopGuidance({
						type: 'blocked',
						reason: terminalRemediation.guidance,
					}),
				};
			}

			const remediation = input.remediation ?? defaultRemediationForVerdict(input);
			const forcedTerminalVerdict =
				remediation && !remediation.shouldEdit
					? remediation.category === 'needs_setup'
						? 'needs_user_input'
						: 'failed_terminal'
					: undefined;

			const action = await context.workflowTaskService.reportVerificationVerdict({
				workItemId: input.workItemId,
				runId: context.runId,
				workflowId: input.workflowId,
				executionId: input.executionId,
				verdict: forcedTerminalVerdict ?? input.verdict,
				failureSignature: forcedTerminalVerdict
					? (remediation?.reason ?? input.failureSignature)
					: input.failureSignature,
				failedNodeName: forcedTerminalVerdict ? undefined : input.failedNodeName,
				diagnosis: forcedTerminalVerdict
					? (remediation?.guidance ?? input.diagnosis)
					: input.diagnosis,
				patch: forcedTerminalVerdict ? undefined : input.patch,
				remediation,
				summary: forcedTerminalVerdict ? (remediation?.guidance ?? input.summary) : input.summary,
			});

			if (action.type === 'blocked') {
				const state = await context.workflowTaskService.getWorkflowLoopState(input.workItemId);
				if (state?.lastRemediation && !state.lastRemediation.shouldEdit) {
					context.trackTelemetry?.('Builder remediation guard fired', {
						thread_id: context.threadId,
						run_id: context.runId,
						work_item_id: input.workItemId,
						workflow_id: input.workflowId,
						category: state.lastRemediation.category,
						attempt_count: state.lastRemediation.attemptCount,
						reason: state.lastRemediation.reason,
					});
				}
			}

			return {
				guidance: formatWorkflowLoopGuidance(action, { workItemId: input.workItemId }),
			};
		},
	});
}
