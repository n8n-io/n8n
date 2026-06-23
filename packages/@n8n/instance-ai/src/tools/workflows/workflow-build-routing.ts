import { isMockableTriggerNodeType } from './workflow-json-utils';
import type {
	WorkflowBuildOutcome,
	WorkflowSetupRequirement,
	WorkflowVerificationReadiness,
} from '../../workflow-loop/workflow-loop-state';

function hasMockedCredentials(
	outcome: Pick<WorkflowBuildOutcome, 'mockedCredentialTypes' | 'mockedCredentialsByNode'>,
): boolean {
	return (
		(outcome.mockedCredentialTypes?.length ?? 0) > 0 ||
		Object.keys(outcome.mockedCredentialsByNode ?? {}).length > 0
	);
}

function hasCredentialVerificationData(
	outcome: Pick<WorkflowBuildOutcome, 'mockedNodeNames' | 'nodeSimulationPlan'>,
): boolean {
	const mocked = outcome.mockedNodeNames ?? [];
	if (mocked.length === 0) return false;
	const simulated = new Set(
		(outcome.nodeSimulationPlan ?? [])
			.filter((verdict) => verdict.verdict === 'simulate')
			.map((verdict) => verdict.nodeName),
	);
	return mocked.every((name) => simulated.has(name));
}

function determineVerificationReadiness(
	outcome: Pick<
		WorkflowBuildOutcome,
		| 'submitted'
		| 'workflowId'
		| 'triggerNodes'
		| 'mockedCredentialTypes'
		| 'mockedCredentialsByNode'
		| 'mockedNodeNames'
		| 'nodeSimulationPlan'
		| 'hasUnresolvedPlaceholders'
	>,
): WorkflowVerificationReadiness {
	if (!outcome.submitted) {
		return {
			status: 'not_verifiable',
			reason: 'not-submitted',
			guidance: 'The build did not submit a workflow, so there is nothing to verify.',
		};
	}

	if (!outcome.workflowId) {
		return {
			status: 'not_verifiable',
			reason: 'missing-workflow-id',
			guidance: 'The build outcome does not include a workflow ID.',
		};
	}

	if (outcome.hasUnresolvedPlaceholders) {
		return {
			status: 'needs_setup',
			reason: 'unresolved-placeholders',
			guidance: 'Route the workflow through setup before verification.',
		};
	}

	if (hasMockedCredentials(outcome) && !hasCredentialVerificationData(outcome)) {
		return {
			status: 'needs_setup',
			reason: 'missing-mocked-credential-pin-data',
			guidance: 'Route the workflow through setup because mocked credentials cannot be verified.',
		};
	}

	if (!outcome.triggerNodes?.some((node) => isMockableTriggerNodeType(node.nodeType))) {
		return {
			status: 'not_verifiable',
			reason: 'non-mockable-trigger',
			guidance: 'The workflow does not have a trigger the post-build verifier can exercise.',
		};
	}

	return { status: 'ready' };
}

function determineSetupRequirement(
	outcome: Pick<
		WorkflowBuildOutcome,
		| 'submitted'
		| 'workflowId'
		| 'mockedCredentialTypes'
		| 'mockedCredentialsByNode'
		| 'hasUnresolvedPlaceholders'
	>,
): WorkflowSetupRequirement {
	if (!outcome.submitted || !outcome.workflowId) {
		return { status: 'not_required' };
	}

	if (outcome.hasUnresolvedPlaceholders) {
		return {
			status: 'required',
			reason: 'unresolved-placeholders',
			guidance: 'Route the workflow through setup so the user can fill unresolved values.',
		};
	}

	if (hasMockedCredentials(outcome)) {
		return {
			status: 'required',
			reason: 'mocked-credentials',
			guidance: 'Route the workflow through setup so the user can add real credentials.',
		};
	}

	return { status: 'not_required' };
}

export function withDeterministicRouting(
	outcome: Omit<WorkflowBuildOutcome, 'verificationReadiness' | 'setupRequirement'>,
): WorkflowBuildOutcome {
	return {
		...outcome,
		verificationReadiness: determineVerificationReadiness(outcome),
		setupRequirement: determineSetupRequirement(outcome),
	};
}
