import { buildUpdateWorkflowSessionGrantKey } from '@n8n/api-types';
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

/**
 * True when update HITL can be skipped for this workflow in this session:
 * created earlier in the current run (`aiCreatedWorkflowIds`), or covered by a
 * `workflows:update:<id>` thread grant (written on create, or when the user
 * chose "always allow" for an edit — including foreign workflows). Untrusted
 * workflows without a grant still require approval.
 */
export function canSkipWorkflowUpdateHitl(context: InstanceAiContext, workflowId: string): boolean {
	if (context.aiCreatedWorkflowIds?.has(workflowId) === true) return true;
	const grantKey = buildUpdateWorkflowSessionGrantKey(workflowId);
	return context.sessionApprovedToolKeys?.has(grantKey) === true;
}

/**
 * Persist a thread grant so later update HITL for this workflow is skipped
 * (same run and later runs in the thread). Used when the user chooses
 * "always allow" on an edit confirmation.
 */
export async function grantSessionWorkflowUpdate(
	context: InstanceAiContext,
	workflowId: string,
): Promise<void> {
	await context.grantSessionToolApproval?.(buildUpdateWorkflowSessionGrantKey(workflowId));
}

/**
 * Mark a newly created workflow as owned by this session: in-memory for the
 * current run, and as a persisted thread grant so later runs skip update HITL.
 */
export async function recordSessionOwnedWorkflow(
	context: InstanceAiContext,
	workflowId: string,
): Promise<void> {
	(context.aiCreatedWorkflowIds ??= new Set<string>()).add(workflowId);
	await grantSessionWorkflowUpdate(context, workflowId);
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
