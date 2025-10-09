import type { WorkflowEntity } from '@n8n/db';
import { MANUAL_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from 'n8n-workflow';

export const createWorkflow = (overrides: Partial<WorkflowEntity> = {}) => ({
	id: 'wf-1',
	name: 'My wf',
	nodes: overrides.nodes ?? [
		{
			id: 'node-1',
			name: 'Webhook',
			type: WEBHOOK_NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			disabled: false,
			parameters: {},
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'HeaderAuth' } },
		},
		{
			id: 'node-2',
			name: 'Start',
			type: MANUAL_TRIGGER_NODE_TYPE,
			typeVersion: 1,
			position: [100, 0],
			disabled: false,
			parameters: {},
			credentials: { httpHeaderAuth: { id: 'cred-2', name: 'HeaderAuth2' } },
		},
	],
	active: overrides.active ?? false,
	isArchived: overrides.isArchived ?? false,
	createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
	updatedAt: overrides.updatedAt ?? new Date('2024-01-02T00:00:00.000Z'),
	triggerCount: overrides.triggerCount ?? 1,
	settings: overrides.settings ?? { availableInMCP: true },
	pinData: overrides.pinData ?? { should: 'be-removed' },
	...overrides,
});
