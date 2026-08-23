import type { RemediationMetadata, WorkflowBuildOutcome } from './workflow-loop-state';

export function isNeedsSetupRemediation(
	remediation: RemediationMetadata | undefined,
): remediation is RemediationMetadata & { category: 'needs_setup'; shouldEdit: false } {
	return remediation?.category === 'needs_setup' && !remediation.shouldEdit;
}

export function shouldVerifyBeforeSetup(outcome: WorkflowBuildOutcome): boolean {
	return outcome.submitted && outcome.verificationReadiness?.status === 'ready';
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
