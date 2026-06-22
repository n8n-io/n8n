import { isRecord } from '@n8n/utils';

import type { WorkflowPreviewData, WorkflowResult } from './types';

export function isWorkflowResult(value: unknown): value is WorkflowResult {
	return isRecord(value);
}

export function isWorkflowPreviewData(value: unknown): value is WorkflowPreviewData {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		(value.name === undefined || value.name === null || typeof value.name === 'string') &&
		Array.isArray(value.nodes) &&
		isRecord(value.connections)
	);
}
