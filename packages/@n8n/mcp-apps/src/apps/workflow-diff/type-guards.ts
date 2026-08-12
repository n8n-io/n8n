import { isRecord } from '@n8n/utils/is-record';

import type { UpdateWorkflowResult, WorkflowVersionData } from './types';

export function isUpdateWorkflowResult(value: unknown): value is UpdateWorkflowResult {
	return isRecord(value);
}

export function isWorkflowVersionData(value: unknown): value is WorkflowVersionData {
	return (
		isRecord(value) &&
		typeof value.workflowId === 'string' &&
		typeof value.versionId === 'string' &&
		(value.name === undefined || value.name === null || typeof value.name === 'string') &&
		Array.isArray(value.nodes) &&
		isRecord(value.connections)
	);
}
