import { isTriggerNodeType } from './workflow-json-utils';
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

	// Any trigger type is verifiable: deterministic triggers get shaped input
	// (getPinDataForTrigger), every other trigger gets a simulated fixture from
	// the build outcome sidecar (planVerificationSimulation), so the trigger
	// never really fires. Only a workflow with no trigger at all can't run.
	if (!outcome.triggerNodes?.some((node) => isTriggerNodeType(node.nodeType))) {
		return {
			status: 'not_verifiable',
			reason: 'no-trigger-node',
			guidance: 'The workflow does not have a trigger node the post-build verifier can start from.',
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
