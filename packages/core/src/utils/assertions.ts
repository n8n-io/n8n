import {
	type IRunExecutionData,
	type IWorkflowExecuteAdditionalData,
	UnexpectedError,
	type Workflow,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

export function assertExecutionDataExists(
	executionData: IRunExecutionData['executionData'],
	workflow: Workflow,
	additionalData: IWorkflowExecuteAdditionalData | undefined,
	mode: WorkflowExecuteMode,
): asserts executionData is NonNullable<IRunExecutionData['executionData']> {
	if (!executionData) {
		throw new UnexpectedError('Failed to run workflow due to missing execution data', {
			extra: {
				workflowId: workflow.id,
				executionId: additionalData?.executionId,
				mode,
			},
		});
	}
}

export function assertUnreachable(value: never): never {
	throw new UnexpectedError(`Unhandled value in exhaustive switch: ${String(value)}`);
}
