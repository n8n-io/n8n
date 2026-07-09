import { nanoid } from 'nanoid';

import {
	saveWorkflowSourceFileBinding,
	type WorkflowSourceFileBinding,
} from './workflow-file-bindings';
import type { InstanceAiContext } from '../../types';
import type { WorkflowBuildOutcome } from '../../workflow-loop/workflow-loop-state';

export function isApprovedBuildContext(context: InstanceAiContext): boolean {
	const buildContext = context.workflowBuildContext;
	return Boolean(buildContext?.plannedTaskService ?? buildContext?.allowPostPlanWorkflowCreate);
}

export async function resolveWorkflowName(
	context: InstanceAiContext,
	workflowId: string,
): Promise<string> {
	try {
		return (await context.workflowService.getAsWorkflowJSON(workflowId)).name || 'workflow';
	} catch {
		return 'workflow';
	}
}

export function getBuildFailureTrackingKey({
	workItemId,
	workflowId,
	workflowName,
	filePath,
	isAuxiliarySupportingWorkflow,
	buildContext,
	runId,
}: {
	workItemId?: string;
	workflowId?: string;
	workflowName?: string;
	filePath: string;
	isAuxiliarySupportingWorkflow: boolean;
	buildContext?: InstanceAiContext['workflowBuildContext'];
	runId?: string;
}): string {
	if (workItemId) return workItemId;

	if (isAuxiliarySupportingWorkflow) {
		return [
			'supporting-workflow',
			buildContext?.taskId ?? (runId ? `run:${runId}` : 'unknown-run'),
			workflowId ?? workflowName ?? filePath,
		].join(':');
	}

	return buildContext?.workItemId ?? buildContext?.taskId ?? workflowId ?? workflowName ?? filePath;
}

export function resolveBuildIdentifiers(input: {
	context: InstanceAiContext;
	filePath: string;
	inputWorkItemId?: string;
	isSupportingWorkflow: boolean;
}): {
	isAuxiliarySupportingWorkflow: boolean;
	plannedTaskId?: string;
	owner: WorkflowBuildOutcome['owner'];
	resolvedWorkItemId: string;
	resolvedTaskId: string;
} {
	const { context, filePath, inputWorkItemId, isSupportingWorkflow } = input;
	const buildContext = context.workflowBuildContext;
	const isAuxiliarySupportingWorkflow =
		isSupportingWorkflow && buildContext?.isSupportingWorkflowTask !== true;
	const plannedTaskId =
		buildContext?.plannedTaskService && !isAuxiliarySupportingWorkflow
			? buildContext.taskId
			: undefined;
	const owner = plannedTaskId
		? { type: 'planned' as const, taskId: plannedTaskId }
		: { type: 'direct' as const };
	const resolvedWorkItemId =
		inputWorkItemId ??
		(isAuxiliarySupportingWorkflow ? undefined : buildContext?.workItemId) ??
		filePath;
	const resolvedTaskId = isAuxiliarySupportingWorkflow
		? `${buildContext?.taskId ?? (context.runId ? `build-${context.runId}` : 'build')}:supporting-${nanoid(6)}`
		: (buildContext?.taskId ?? (context.runId ? `build-${context.runId}` : `build-${nanoid(8)}`));

	return {
		isAuxiliarySupportingWorkflow,
		plannedTaskId,
		owner,
		resolvedWorkItemId,
		resolvedTaskId,
	};
}

export function formatWarning(code: string, message: string): string {
	return `[${code}]: ${message}`;
}

export function combineWarnings(...groups: Array<string[] | undefined>): string[] | undefined {
	const warnings = groups.flatMap((group) => group ?? []);
	return warnings.length > 0 ? warnings : undefined;
}

export function sourceResponseBase(binding: WorkflowSourceFileBinding) {
	return {
		filePath: binding.filePath,
		sourceHash: binding.sourceHash,
	};
}

export async function markSourceBuildFailed(
	context: InstanceAiContext,
	binding: WorkflowSourceFileBinding,
	sourceHash: string,
): Promise<WorkflowSourceFileBinding> {
	return await saveWorkflowSourceFileBinding(context, {
		...binding,
		sourceHash,
	});
}
