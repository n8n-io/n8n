import type { IRunExecutionData } from 'n8n-workflow';

export const KV_LIMIT = 10;

export class WorkflowMetadataValidationError extends Error {
	constructor(
		public type: 'key' | 'value',
		key: unknown,
		message?: string,
		options?: ErrorOptions,
	) {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		super(`Custom data ${type}s must be a string (key "${key}")`, options);
	}
}

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
	if (typeof key !== 'string') {
		throw new WorkflowMetadataValidationError('key', key);
	}
	if (typeof value !== 'string') {
		throw new WorkflowMetadataValidationError('value', key);
	}
	executionData.resultData.metadata[key.slice(0, 50)] = value.slice(0, 255);
}

export function setAllWorkflowExecutionMetadata(
	executionData: IRunExecutionData,
	obj: Record<string, string>,
) {
	const errors: Error[] = [];
	Object.entries(obj).forEach(([key, value]) => {
		try {
			setWorkflowExecutionMetadata(executionData, key, value);
		} catch (e) {
			errors.push(e as Error);
		}
	});
	if (errors.length) {
		throw errors[0];
	}
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
