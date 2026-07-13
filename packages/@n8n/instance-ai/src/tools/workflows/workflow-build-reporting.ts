import { withDeterministicRouting } from './workflow-build-routing';
import type { InstanceAiContext } from '../../types';
import type {
	RemediationMetadata,
	WorkflowBuildOutcome,
} from '../../workflow-loop/workflow-loop-state';

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
			context.logger.warn('Failed to store workflow build outcome on run context', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	try {
		await buildContext.workflowTaskService?.reportBuildOutcome(outcome);
	} catch (error) {
		context.logger.warn('Failed to report workflow build outcome to workflow loop', {
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
		context.logger.warn('Failed to mark planned workflow build task succeeded', {
			taskId: buildContext.taskId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function promoteMainWorkflow(
	context: InstanceAiContext,
	workflowId: string,
): Promise<void> {
	try {
		await context.workflowService.clearAiTemporary(workflowId);
	} catch (error) {
		context.logger.warn(
			`Failed to clear AI-builder temporary marker on main workflow ${workflowId}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

export async function reportFailedWorkflowBuildOutcome(
	context: InstanceAiContext,
	input: {
		targetWorkflowId?: string;
		sourceFilePath?: string;
		workItemId: string;
		taskId: string;
		plannedTaskId?: string;
		owner: WorkflowBuildOutcome['owner'];
		remediation: RemediationMetadata;
		errors: string[];
		summary: string;
		storeOnRunContext: boolean;
	},
): Promise<void> {
	const buildContext = context.workflowBuildContext;
	const outcome = withDeterministicRouting({
		workItemId: input.workItemId,
		...((buildContext?.runId ?? context.runId)
			? { runId: buildContext?.runId ?? context.runId }
			: {}),
		taskId: input.taskId,
		owner: input.owner,
		plannedTaskId: input.plannedTaskId,
		workflowId: input.targetWorkflowId,
		...(input.sourceFilePath ? { sourceFilePath: input.sourceFilePath } : {}),
		submitted: false,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		blockingReason: input.remediation.guidance,
		failureSignature: input.errors.join('\n').slice(0, 500),
		remediation: input.remediation,
		summary: input.summary,
	});

	await reportWorkflowBuildOutcome(context, outcome, {
		storeOnRunContext: input.storeOnRunContext,
		markPlannedTaskSucceeded: false,
	});
}
