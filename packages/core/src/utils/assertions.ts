import type {
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { UnexpectedError } from '@n8n/errors';

export type PreExecutionAdditionalData = Pick<
	IWorkflowExecuteAdditionalData,
	'executionId' | 'encryptedRunnerIdentity'
>;

export function assertExecutionDataExists(
	executionData: IRunExecutionData['executionData'],
	workflow: Workflow,
	additionalData: PreExecutionAdditionalData | undefined,
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
