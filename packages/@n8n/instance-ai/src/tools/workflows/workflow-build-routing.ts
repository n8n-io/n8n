import { isMockableTriggerNodeType } from './workflow-json-utils';
import type {
	WorkflowBuildOutcome,
	WorkflowSetupRequirement,
	WorkflowVerificationReadiness,
} from '../../workflow-loop/workflow-loop-state';

type WorkflowBuildRoutingInput = Omit<
	WorkflowBuildOutcome,
	'verificationReadiness' | 'setupRequirement'
> & {
	workflowNeedsSetup?: boolean;
};

function hasSetupCredentials(
	outcome: Pick<WorkflowBuildOutcome, 'mockedCredentialTypes' | 'mockedCredentialsByNode'>,
): boolean {
	return (
		(outcome.mockedCredentialTypes?.length ?? 0) > 0 ||
		Object.keys(outcome.mockedCredentialsByNode ?? {}).length > 0
	);
}

function determineVerificationReadiness(
	outcome: Pick<WorkflowBuildRoutingInput, 'submitted' | 'workflowId' | 'triggerNodes'>,
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
		WorkflowBuildRoutingInput,
		| 'submitted'
		| 'workflowId'
		| 'mockedCredentialTypes'
		| 'mockedCredentialsByNode'
		| 'hasUnresolvedPlaceholders'
		| 'workflowNeedsSetup'
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

	if (hasSetupCredentials(outcome)) {
		return {
			status: 'required',
			reason: 'mocked-credentials',
			guidance: 'Route the workflow through setup so the user can add real credentials.',
		};
	}

	if (outcome.workflowNeedsSetup) {
		return {
			status: 'required',
			reason: 'workflow-needs-setup',
			guidance: 'Route the workflow through setup so the user can fill pending node setup fields.',
		};
	}

	return { status: 'not_required' };
}

export function withDeterministicRouting(outcome: WorkflowBuildRoutingInput): WorkflowBuildOutcome {
	const { workflowNeedsSetup, ...buildOutcome } = outcome;
	return {
		...buildOutcome,
		verificationReadiness: determineVerificationReadiness(outcome),
		setupRequirement: determineSetupRequirement(outcome),
	};
}
