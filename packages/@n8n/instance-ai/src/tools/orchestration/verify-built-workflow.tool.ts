/**
 * Verify Built Workflow Tool
 *
 * Runs a built workflow using sidecar verification pin data from the build outcome.
 * The verification pin data is never persisted to the workflow — it only exists
 * for this execution.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';
import { createRemediation, terminalRemediationFromState } from '../../workflow-loop/remediation';
import type {
	RemediationMetadata,
	WorkflowBuildOutcome,
} from '../../workflow-loop/workflow-loop-state';

export const verifyBuiltWorkflowInputSchema = z.object({
	workItemId: z.string().describe('The work item ID from the build (wi_XXXXXXXX)'),
	workflowId: z.string().describe('The workflow ID to verify'),
	inputData: z.record(z.unknown()).optional().describe('Input data passed to the workflow trigger'),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(600_000)
		.optional()
		.describe('Max wait time in milliseconds (default 300000)'),
});

const remediationOutputSchema = z
	.object({
		category: z.enum(['code_fixable', 'needs_setup', 'blocked']),
		shouldEdit: z.boolean(),
		guidance: z.string(),
		reason: z.string().optional(),
		remainingSubmitFixes: z.number().int().min(0).optional(),
		attemptCount: z.number().int().min(0).optional(),
	})
	.optional();

function classifyVerificationFailure(
	error: string | undefined,
	status: string | undefined,
	buildOutcome: WorkflowBuildOutcome,
): RemediationMetadata {
	if (
		buildOutcome.mockedCredentialTypes?.length ||
		buildOutcome.mockedNodeNames?.length ||
		buildOutcome.hasUnresolvedPlaceholders
	) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
			guidance:
				'Workflow submitted successfully, but verification is blocked by mocked credentials or unresolved setup values. Stop code edits and route to workflows(action="setup").',
		});
	}

	if (status === 'waiting') {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'execution_waiting',
			guidance:
				'Workflow verification is waiting for user action or setup. Stop code edits and ask the user to complete setup.',
		});
	}

	const normalized = (error ?? '').toLowerCase();
	if (
		normalized.includes('credential') ||
		normalized.includes('unauthorized') ||
		normalized.includes('forbidden') ||
		normalized.includes('401') ||
		normalized.includes('403') ||
		normalized.includes('free tier') ||
		normalized.includes('quota')
	) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'credential_or_setup_failure',
			guidance:
				'Workflow submitted successfully, but verification requires credential or account setup. Stop code edits and route to workflows(action="setup").',
		});
	}

	if (
		normalized.includes('429') ||
		normalized.includes('rate limit') ||
		normalized.includes('502') ||
		normalized.includes('bad gateway') ||
		normalized.includes('timed out')
	) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'external_service_or_timeout',
			guidance:
				'Workflow submitted successfully, but verification is blocked by an external service or timeout. Stop code edits and explain the blocker to the user.',
		});
	}

	return createRemediation({
		category: 'code_fixable',
		shouldEdit: true,
		reason: 'runtime_failure',
		guidance:
			'Verification found a workflow runtime failure. Diagnose it and apply one batched workflow-code repair if the guard allows it.',
	});
}

export function createVerifyBuiltWorkflowTool(context: OrchestrationContext) {
	return createTool({
		id: 'verify-built-workflow',
		description:
			'Run a built workflow that has mocked credentials, using sidecar verification pin data ' +
			'from the build outcome. Use this instead of `executions(action="run")` when the build had mocked credentials.',
		inputSchema: verifyBuiltWorkflowInputSchema,
		outputSchema: z.object({
			executionId: z.string().optional(),
			success: z.boolean(),
			status: z.enum(['running', 'success', 'error', 'waiting', 'unknown']).optional(),
			data: z.record(z.unknown()).optional(),
			error: z.string().optional(),
			remediation: remediationOutputSchema,
			guidance: z.string().optional(),
		}),
		execute: async (input: z.infer<typeof verifyBuiltWorkflowInputSchema>) => {
			if (!context.workflowTaskService || !context.domainContext) {
				const remediation = createRemediation({
					category: 'blocked',
					shouldEdit: false,
					reason: 'verification_support_unavailable',
					guidance:
						'Verification support is not available. Stop code edits and explain the blocker.',
				});
				return { success: false, error: 'Verification support not available.', remediation };
			}

			const stateBefore = await context.workflowTaskService.getWorkflowLoopState(input.workItemId);
			const terminalRemediation =
				stateBefore?.lastRemediation && !stateBefore.lastRemediation.shouldEdit
					? terminalRemediationFromState(stateBefore)
					: undefined;
			if (terminalRemediation) {
				return {
					success: false,
					error: terminalRemediation.guidance,
					remediation: terminalRemediation,
					guidance: terminalRemediation.guidance,
				};
			}

			const buildOutcome = await context.workflowTaskService.getBuildOutcome(input.workItemId);
			if (!buildOutcome) {
				const remediation = createRemediation({
					category: 'blocked',
					shouldEdit: false,
					reason: 'missing_build_outcome',
					guidance: `No build outcome found for work item ${input.workItemId}. Stop code edits and explain the blocker.`,
				});
				return {
					success: false,
					error: `No build outcome found for work item ${input.workItemId}.`,
					remediation,
					guidance: remediation.guidance,
				};
			}

			const result = await context.domainContext.executionService.run(
				input.workflowId,
				input.inputData,
				{
					timeout: input.timeout,
					pinData: buildOutcome.verificationPinData as Record<string, unknown[]> | undefined,
				},
			);

			const success = result.status === 'success';
			const remediation = success
				? undefined
				: classifyVerificationFailure(result.error, result.status, buildOutcome);

			if (remediation && !remediation.shouldEdit) {
				await context.workflowTaskService.reportVerificationVerdict({
					workItemId: input.workItemId,
					runId: context.runId,
					workflowId: input.workflowId,
					executionId: result.executionId || undefined,
					verdict: remediation.category === 'needs_setup' ? 'needs_user_input' : 'failed_terminal',
					failureSignature: remediation.reason,
					diagnosis: remediation.guidance,
					remediation,
					summary: remediation.guidance,
				});
				context.trackTelemetry?.('Builder remediation guard fired', {
					thread_id: context.threadId,
					run_id: context.runId,
					work_item_id: input.workItemId,
					workflow_id: input.workflowId,
					category: remediation.category,
					attempt_count: remediation.attemptCount,
					reason: remediation.reason,
				});
			}

			return {
				executionId: result.executionId || undefined,
				success,
				status: result.status,
				data: result.data,
				error: result.error,
				remediation,
				guidance: remediation?.guidance,
			};
		},
	});
}
