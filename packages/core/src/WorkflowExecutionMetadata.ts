import type { IRunExecutionData } from 'n8n-workflow';

export function setWorkflowExecutionMetadata(
	executionData: IRunExecutionData,
	key: string,
	value: unknown,
) {
	if (!executionData.resultData.metadata) {
		executionData.resultData.metadata = {};
	}
	executionData.resultData.metadata[String(key)] = String(value);
}

export function setAllWorkflowExecutionMetadata(
	executionData: IRunExecutionData,
	obj: Record<string, string>,
) {
	Object.entries(obj).forEach(([key, value]) =>
		setWorkflowExecutionMetadata(executionData, key, value),
	);
}

export function getAllWorkflowExecutionMetadata(
	executionData: IRunExecutionData,
): Record<string, string> {
	return executionData.resultData.metadata ?? {};
}

export function getWorkflowExecutionMetadata(
	executionData: IRunExecutionData,
	key: string,
): string {
	return getAllWorkflowExecutionMetadata(executionData)[String(key)];
}
