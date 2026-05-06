import type {
	RemediationCategory,
	RemediationMetadata,
	WorkflowLoopState,
} from './workflow-loop-state';

export const MAX_PRE_SAVE_SUBMIT_FAILURES = 3;
export const MAX_POST_SUBMIT_REMEDIATION_SUBMITS = 2;

export function createRemediation(input: {
	category: RemediationCategory;
	shouldEdit: boolean;
	guidance: string;
	reason?: string;
	remainingSubmitFixes?: number;
	attemptCount?: number;
}): RemediationMetadata {
	return input;
}

export function remainingPostSubmitRemediations(state: WorkflowLoopState): number {
	return Math.max(
		0,
		MAX_POST_SUBMIT_REMEDIATION_SUBMITS - (state.postSubmitRemediationSubmitsUsed ?? 0),
	);
}

export function terminalRemediationFromState(
	state: WorkflowLoopState | undefined,
	currentRunId?: string,
): RemediationMetadata | undefined {
	if (!state) return undefined;
	if (currentRunId !== undefined && state.runId !== currentRunId) return undefined;
	if (state.lastRemediation && !state.lastRemediation.shouldEdit) {
		return state.lastRemediation;
	}
	if (
		state.successfulSubmitSeen &&
		(state.postSubmitRemediationSubmitsUsed ?? 0) >= MAX_POST_SUBMIT_REMEDIATION_SUBMITS
	) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'post_submit_budget_exhausted',
			attemptCount: state.postSubmitRemediationSubmitsUsed ?? 0,
			remainingSubmitFixes: 0,
			guidance:
				'The workflow was saved, but the automatic repair budget is exhausted. Stop editing and explain the blocker to the user.',
		});
	}
	return undefined;
}
