import type { IRunExecutionData } from 'n8n-workflow';

export const KV_LIMIT = 10;

export function setWorkflowExecutionMetadata(
	executionData: IRunExecutionData,
	key: string,
	value: unknown,
) {
	if (!executionData.resultData.metadata) {
		executionData.resultData.metadata = {};
	}
	// Currently limited to 10 metadata KVs
	if (
		!(key in executionData.resultData.metadata) &&
		Object.keys(executionData.resultData.metadata).length >= KV_LIMIT
	) {
		return;
	}
	executionData.resultData.metadata[String(key).slice(0, 50)] = String(value).slice(0, 255);
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
	// Make a copy so it can't be modified directly
	return { ...executionData.resultData.metadata } ?? {};
}

export function getWorkflowExecutionMetadata(
	executionData: IRunExecutionData,
	key: string,
): string {
	return getAllWorkflowExecutionMetadata(executionData)[String(key).slice(0, 50)];
}
