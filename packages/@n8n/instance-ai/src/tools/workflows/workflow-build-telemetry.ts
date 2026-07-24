import type { WorkflowSourceFileBinding } from './workflow-file-bindings';
import type { InstanceAiContext } from '../../types';
import type { RemediationMetadata } from '../../workflow-loop/workflow-loop-state';

export type BuildTelemetryResult = 'success' | 'failure' | 'blocked' | 'denied' | 'suspended';
export type BuildTelemetryStage =
	| 'source_read'
	| 'permission'
	| 'hitl'
	| 'parse'
	| 'validation'
	| 'name'
	| 'save'
	| 'conflict';

export function trackWorkflowSourceBuild(
	context: InstanceAiContext,
	input: {
		result: BuildTelemetryResult;
		stage: BuildTelemetryStage;
		binding: WorkflowSourceFileBinding;
		targetWorkflowId?: string;
		savedWorkflowId?: string;
		saveOperation?: 'create' | 'update';
		isSupportingWorkflow?: boolean;
		isAuxiliarySupportingWorkflow?: boolean;
		remediation?: RemediationMetadata;
		errorCount?: number;
		warningCount?: number;
	},
): void {
	const buildContext = context.workflowBuildContext;
	context.trackTelemetry?.('instance_ai_workflow_source_build', {
		source_transport: 'workspace_file',
		result: input.result,
		stage: input.stage,
		thread_id: context.threadId ?? buildContext?.threadId ?? 'unknown',
		run_id: buildContext?.runId ?? context.runId ?? 'unknown',
		work_item_id: buildContext?.workItemId ?? 'unknown',
		task_id: buildContext?.taskId ?? 'unknown',
		file_path: input.binding.filePath,
		identity_bound: Boolean(input.binding.workflowId),
		is_supporting_workflow: input.isSupportingWorkflow === true,
		is_auxiliary_supporting_workflow: input.isAuxiliarySupportingWorkflow === true,
		error_count: input.errorCount ?? 0,
		warning_count: input.warningCount ?? 0,
		...(input.targetWorkflowId ? { target_workflow_id: input.targetWorkflowId } : {}),
		...(input.savedWorkflowId ? { workflow_id: input.savedWorkflowId } : {}),
		...(input.binding.sourceHash ? { source_hash: input.binding.sourceHash } : {}),
		...(input.saveOperation ? { save_operation: input.saveOperation } : {}),
		...(input.remediation
			? {
					remediation_category: input.remediation.category,
					remediation_should_edit: input.remediation.shouldEdit,
					...(input.remediation.reason ? { remediation_reason: input.remediation.reason } : {}),
				}
			: {}),
	});
}
