import type { IRunExecutionData } from 'n8n-workflow';
import { LoggerProxy as Logger } from 'n8n-workflow';

import { InvalidExecutionMetadataError } from '@/errors/invalid-execution-metadata.error';

export const KV_LIMIT = 10;
export const KEY_MAX_LENGTH = 50;
export const VALUE_MAX_LENGTH = 512;

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
		throw new InvalidExecutionMetadataError('key', key);
	}
	if (key.replace(/[\p{L}\p{N}\p{M}_]/gu, '').length !== 0) {
		throw new InvalidExecutionMetadataError(
			'key',
			key,
			`Custom data key can only contain letters, numbers, and underscores (key "${key}")`,
		);
	}
	if (
		typeof value !== 'string' &&
		typeof value !== 'number' &&
		typeof value !== 'bigint' &&
		typeof value !== 'boolean'
	) {
		throw new InvalidExecutionMetadataError('value', key);
	}
	const val = String(value);
	if (key.length > KEY_MAX_LENGTH) {
		Logger.warn(
			`Custom data key over ${KEY_MAX_LENGTH} characters long. Truncating to ${KEY_MAX_LENGTH} characters.`,
		);
	}
	if (val.length > VALUE_MAX_LENGTH) {
		Logger.warn(
			`Custom data value over ${VALUE_MAX_LENGTH} characters long. Truncating to ${VALUE_MAX_LENGTH} characters.`,
		);
	}
	executionData.resultData.metadata[key.slice(0, KEY_MAX_LENGTH)] = val.slice(0, VALUE_MAX_LENGTH);
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
	return executionData.resultData.metadata ? { ...executionData.resultData.metadata } : {};
}

export function getWorkflowExecutionMetadata(
	executionData: IRunExecutionData,
	key: string,
): string {
	return getAllWorkflowExecutionMetadata(executionData)[String(key).slice(0, KEY_MAX_LENGTH)];
}
