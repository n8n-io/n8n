import type { IWorkflowBase } from 'n8n-workflow';

import { createExecutionRef } from '../types';
import type { ExecutionDataPayload } from '../types';

export const workflowId = '123';
export const executionId = '456';

export const workflowData: IWorkflowBase = {
	id: workflowId,
	name: 'Test Workflow',
	nodes: [],
	connections: {},
	active: false,
	isArchived: false,
	activeVersionId: null,
	createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
	updatedAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
};

export const payload: ExecutionDataPayload = {
	data: '[[{"json":{"key":"value"}},null]]',
	workflowData,
	workflowVersionId: 'version-789',
};

export const ref = createExecutionRef(workflowId, executionId);
