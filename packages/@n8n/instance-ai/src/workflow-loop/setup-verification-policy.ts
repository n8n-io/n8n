import { terminalRemediationFromState } from './remediation';
import type {
	RemediationMetadata,
	WorkflowBuildOutcome,
	WorkflowLoopState,
} from './workflow-loop-state';

export function isNeedsSetupRemediation(
	remediation: RemediationMetadata | undefined,
): remediation is RemediationMetadata & { category: 'needs_setup'; shouldEdit: false } {
	return remediation?.category === 'needs_setup' && !remediation.shouldEdit;
}

export function shouldVerifyBeforeSetup(outcome: WorkflowBuildOutcome): boolean {
	return outcome.submitted && outcome.verificationReadiness?.status === 'ready';
}

/** Older outcomes can require setup even when a simulation plan is available. */
export function canVerifyPendingSetup(outcome: WorkflowBuildOutcome): boolean {
	return (
		outcome.submitted &&
		!!outcome.workflowId &&
		outcome.triggerType === 'manual_or_testable' &&
		outcome.executionIntent !== 'one-off' &&
		outcome.verificationReadiness?.status === 'needs_setup' &&
		outcome.nodeSimulationPlan !== undefined &&
		(outcome.verifyAttempts ?? 0) === 0 &&
		outcome.verification?.attempted !== true
	);
}

/** Remove only a setup blocker that the first simulated verification can supersede. */
export function stateForPendingSetupVerification(
	state: WorkflowLoopState,
	outcome: WorkflowBuildOutcome,
): WorkflowLoopState | undefined {
	if (
		!canVerifyPendingSetup(outcome) ||
		!(
			isNeedsSetupRemediation(state.lastRemediation) ||
			(state.lastRemediation === undefined && outcome.needsUserInput)
		)
	) {
		return undefined;
	}

	const next: WorkflowLoopState = {
		...state,
		phase: 'verifying',
		status: 'active',
		lastRemediation: undefined,
	};
	const blocker = terminalRemediationFromState(next);
	return blocker ? { ...state, status: 'blocked', lastRemediation: blocker } : next;
}

export function buildRemediationForVerification(
	outcome: WorkflowBuildOutcome,
	remediation: RemediationMetadata | undefined,
): RemediationMetadata | undefined {
	return shouldVerifyBeforeSetup(outcome) && isNeedsSetupRemediation(remediation)
		? undefined
		: remediation;
}

export function setupRemediationBlocksVerification(
	remediation: RemediationMetadata | undefined,
	outcome: WorkflowBuildOutcome,
): boolean {
	if (!isNeedsSetupRemediation(remediation)) return false;
	if (outcome.verificationReadiness?.status !== 'ready') return true;
	return outcome.verification?.attempted === true;
}
