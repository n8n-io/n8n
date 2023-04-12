import type { IRunExecutionData } from 'n8n-workflow';
import { LoggerProxy as Logger } from 'n8n-workflow';

export const KV_LIMIT = 10;

export class ExecutionMetadataValidationError extends Error {
	constructor(
		public type: 'key' | 'value',
		key: unknown,
		message?: string,
		options?: ErrorOptions,
	) {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		super(message ?? `Custom data ${type}s must be a string (key "${key}")`, options);
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
		throw new ExecutionMetadataValidationError('key', key);
	}
	if (key.replace(/[A-Za-z0-9_]/g, '').length !== 0) {
		throw new ExecutionMetadataValidationError(
			'key',
			key,
			`Custom date key can only contain characters "A-Za-z0-9_" (key "${key}")`,
		);
	}
	if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
		throw new ExecutionMetadataValidationError('value', key);
	}
	const val = String(value);
	if (key.length > 50) {
		Logger.error('Custom data key over 50 characters long. Truncating to 50 characters.');
	}
	if (val.length > 255) {
		Logger.error('Custom data value over 255 characters long. Truncating to 255 characters.');
	}
	executionData.resultData.metadata[key.slice(0, 50)] = val.slice(0, 255);
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
