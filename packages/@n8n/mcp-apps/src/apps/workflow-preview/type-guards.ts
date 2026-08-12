import { isRecord } from '@n8n/utils/is-record';

import type { WorkflowPreviewData, WorkflowPreviewNodeType, WorkflowResult } from './types';

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

export function isWorkflowPreviewNodeType(value: unknown): value is WorkflowPreviewNodeType {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		typeof value.displayName === 'string' &&
		Array.isArray(value.group) &&
		Array.isArray(value.properties)
	);
}

export function toWorkflowPreviewNodeTypes(value: unknown): WorkflowPreviewNodeType[] {
	if (!Array.isArray(value)) return [];
	return value.filter(isWorkflowPreviewNodeType);
}
