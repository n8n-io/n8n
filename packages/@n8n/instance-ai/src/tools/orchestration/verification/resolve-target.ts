import type {
	ResolvedVerifyInput,
	VerifyBuiltWorkflowOutput,
	VerifyToolInput,
	WorkflowTaskService,
} from './types';
import type { OrchestrationContext } from '../../../types';
import {
	createRemediation,
	terminalRemediationFromState,
} from '../../../workflow-loop/remediation';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';

export interface ResolvedVerificationTarget {
	input: ResolvedVerifyInput;
	buildOutcome: WorkflowBuildOutcome;
	workflowId: string;
	stateBefore: Awaited<ReturnType<WorkflowTaskService['getWorkflowLoopState']>> | undefined;
	workflowTaskService: WorkflowTaskService;
	domainContext: NonNullable<OrchestrationContext['domainContext']>;
}

/**
 * Validate the verify request and load the build outcome. Returns an early
 * result to short-circuit the handler, or the resolved build outcome and prior
 * loop state needed by verification.
 */
export async function resolveVerificationTarget(
	input: VerifyToolInput,
	context: OrchestrationContext,
): Promise<
	| { kind: 'blocked'; result: VerifyBuiltWorkflowOutput }
	| { kind: 'ready'; target: ResolvedVerificationTarget }
> {
	if (!context.workflowTaskService || !context.domainContext) {
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'verification_support_unavailable',
			guidance: 'Verification support is not available. Stop code edits and explain the blocker.',
		});
		return {
			kind: 'blocked',
			result: { success: false, error: 'Verification support not available.', remediation },
		};
	}

	const buildOutcome =
		(input.workItemId
			? await context.workflowTaskService.getBuildOutcome(input.workItemId)
			: undefined) ??
		(await context.workflowTaskService.getLatestBuildOutcomeForWorkflow(input.workflowId));
	if (!buildOutcome) {
		const target = input.workItemId
			? `work item ${input.workItemId} or workflow ${input.workflowId}`
			: `workflow ${input.workflowId}`;
		const remediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'missing_build_outcome',
			guidance: `No build outcome found for ${target}. Stop code edits and explain the blocker.`,
		});
		return {
			kind: 'blocked',
			result: {
				success: false,
				error: `No build outcome found for ${target}.`,
				remediation,
				guidance: remediation.guidance,
			},
		};
	}

	const resolvedInput: ResolvedVerifyInput = { ...input, workItemId: buildOutcome.workItemId };
	const stateBefore = await context.workflowTaskService.getWorkflowLoopState(
		resolvedInput.workItemId,
	);
	const terminalRemediation =
		stateBefore?.lastRemediation && !stateBefore.lastRemediation.shouldEdit
			? terminalRemediationFromState(stateBefore, context.runId)
			: undefined;
	if (terminalRemediation) {
		return {
			kind: 'blocked',
			result: {
				success: false,
				resolvedWorkItemId: resolvedInput.workItemId,
				error: terminalRemediation.guidance,
				remediation: terminalRemediation,
				guidance: terminalRemediation.guidance,
			},
		};
	}

	if (!buildOutcome.workflowId) {
		return {
			kind: 'blocked',
			result: {
				success: false,
				resolvedWorkItemId: resolvedInput.workItemId,
				error: `Build outcome ${resolvedInput.workItemId} does not include a workflow ID.`,
			},
		};
	}

	if (buildOutcome.workflowId !== input.workflowId) {
		return {
			kind: 'blocked',
			result: {
				success: false,
				resolvedWorkItemId: resolvedInput.workItemId,
				error:
					`Build outcome ${resolvedInput.workItemId} belongs to workflow ${buildOutcome.workflowId}, ` +
					`but verification was requested for workflow ${input.workflowId}.`,
			},
		};
	}

	return {
		kind: 'ready',
		target: {
			input: resolvedInput,
			buildOutcome,
			workflowId: buildOutcome.workflowId,
			stateBefore,
			workflowTaskService: context.workflowTaskService,
			domainContext: context.domainContext,
		},
	};
}
