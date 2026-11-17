import { WorkflowExecute } from 'n8n-core';
import type {
	ExecutionStorageLocation,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

interface PreparedWorkflow {
	workflow: Workflow;
	additionalData: IWorkflowExecuteAdditionalData;
	runExecutionData: IRunExecutionData;
	mode: WorkflowExecuteMode;
	storedAt?: ExecutionStorageLocation;
	configureAdditionalData?: (
		additionalData: IWorkflowExecuteAdditionalData,
	) => void | Promise<void>;
}

export async function startPreparedWorkflow({
	workflow,
	additionalData,
	runExecutionData,
	mode,
	storedAt,
	configureAdditionalData,
}: PreparedWorkflow) {
	await configureAdditionalData?.(additionalData);
	const engine = new WorkflowExecute(additionalData, mode, runExecutionData, storedAt);
	return { execution: engine.processRunExecutionData(workflow) };
}
