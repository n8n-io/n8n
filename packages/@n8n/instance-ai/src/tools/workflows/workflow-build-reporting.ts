import { hasPlaceholderDeep } from '@n8n/utils';
import { nanoid } from 'nanoid';

import { isMockableTriggerNodeType } from './workflow-json-utils';
import type { InstanceAiContext } from '../../types';
import { createRemediation } from '../../workflow-loop/remediation';
import type {
	TriggerNodeDescriptor,
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
	outcome: Pick<WorkflowBuildOutcome, 'verificationPinData' | 'usesWorkflowPinDataForVerification'>,
): boolean {
	return (
		Object.keys(outcome.verificationPinData ?? {}).length > 0 ||
		outcome.usesWorkflowPinDataForVerification === true
	);
}

export function determineVerificationReadiness(
	outcome: Pick<
		WorkflowBuildOutcome,
		| 'submitted'
		| 'workflowId'
		| 'triggerNodes'
		| 'mockedCredentialTypes'
		| 'mockedCredentialsByNode'
		| 'verificationPinData'
		| 'usesWorkflowPinDataForVerification'
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

export function determineSetupRequirement(
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

export function hasUnresolvedPlaceholders(
	nodes: Array<{ parameters?: unknown }> | undefined,
): boolean {
	return nodes?.some((node) => hasPlaceholderDeep(node.parameters)) ?? false;
}

export function createSuccessfulWorkflowBuildOutcome(args: {
	context: InstanceAiContext;
	workflowId?: string;
	savedId: string;
	workflowName: string;
	workItemId?: string;
	isSupportingWorkflow?: boolean;
	triggerNodes: TriggerNodeDescriptor[];
	mockedNodeNames?: string[];
	mockedCredentialTypes?: string[];
	mockedCredentialsByNode?: Record<string, string[]>;
	verificationPinData?: Record<string, Array<Record<string, unknown>>>;
	usesWorkflowPinDataForVerification?: boolean;
	referencedWorkflowIds?: string[];
	hasUnresolvedPlaceholders?: boolean;
}): WorkflowBuildOutcome {
	const buildContext = args.context.workflowBuildContext;
	const isSupportingWorkflow = args.isSupportingWorkflow === true;
	const resolvedWorkItemId =
		args.workItemId ??
		(isSupportingWorkflow ? undefined : buildContext?.workItemId) ??
		`wi_${nanoid(8)}`;
	const runId = buildContext?.runId ?? args.context.runId;
	const resolvedTaskId = isSupportingWorkflow
		? `${buildContext?.taskId ?? (args.context.runId ? `build-${args.context.runId}` : 'build')}:supporting-${nanoid(6)}`
		: (buildContext?.taskId ??
			(args.context.runId ? `build-${args.context.runId}` : `build-${nanoid(8)}`));
	const placeholderRemediation = args.hasUnresolvedPlaceholders
		? createRemediation({
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
				guidance:
					'Workflow submitted successfully, but unresolved setup values remain. Stop code edits and route to workflows(action="setup").',
			})
		: undefined;
	const summary = `${args.workflowId ? 'Updated' : 'Created'} ${
		isSupportingWorkflow ? 'supporting ' : ''
	}workflow "${args.workflowName}" (${args.savedId}).`;

	return withDeterministicRouting({
		workItemId: resolvedWorkItemId,
		...(runId ? { runId } : {}),
		taskId: resolvedTaskId,
		workflowId: args.savedId,
		submitted: true,
		triggerType: 'manual_or_testable',
		triggerNodes: args.triggerNodes,
		needsUserInput: args.hasUnresolvedPlaceholders === true,
		blockingReason: placeholderRemediation?.guidance,
		mockedNodeNames: args.mockedNodeNames,
		mockedCredentialTypes: args.mockedCredentialTypes,
		mockedCredentialsByNode: args.mockedCredentialsByNode,
		verificationPinData: args.verificationPinData,
		usesWorkflowPinDataForVerification: args.usesWorkflowPinDataForVerification,
		supportingWorkflowIds:
			args.referencedWorkflowIds && args.referencedWorkflowIds.length > 0
				? args.referencedWorkflowIds
				: undefined,
		hasUnresolvedPlaceholders: args.hasUnresolvedPlaceholders ? true : undefined,
		remediation: placeholderRemediation,
		summary,
	});
}

export async function reportWorkflowBuildOutcome(
	context: InstanceAiContext,
	outcome: WorkflowBuildOutcome,
	options: { storeOnRunContext?: boolean; markPlannedTaskSucceeded?: boolean } = {},
): Promise<void> {
	const buildContext = context.workflowBuildContext;
	if (!buildContext) return;

	if (options.storeOnRunContext !== false) {
		try {
			await buildContext.onBuildOutcome?.(outcome);
		} catch (error) {
			context.logger?.warn('Failed to store workflow build outcome on run context', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	try {
		await buildContext.workflowTaskService?.reportBuildOutcome(outcome);
	} catch (error) {
		context.logger?.warn('Failed to report workflow build outcome to workflow loop', {
			workItemId: outcome.workItemId,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	if (options.markPlannedTaskSucceeded === false) return;

	try {
		await buildContext.plannedTaskService?.markSucceeded(
			buildContext.threadId,
			buildContext.taskId,
			{
				result: outcome.summary,
				outcome,
			},
		);
	} catch (error) {
		context.logger?.warn('Failed to mark planned workflow build task succeeded', {
			taskId: buildContext.taskId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

// Clear the AI-builder temporary marker from the saved deliverable so run-finish
// cleanup only reaps scratch artifacts, not the workflow the user asked for.
export async function promoteMainWorkflow(
	context: InstanceAiContext,
	workflowId: string,
): Promise<void> {
	try {
		await context.workflowService.clearAiTemporary(workflowId);
	} catch (error) {
		context.logger?.warn(
			`Failed to clear AI-builder temporary marker on main workflow ${workflowId}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}
