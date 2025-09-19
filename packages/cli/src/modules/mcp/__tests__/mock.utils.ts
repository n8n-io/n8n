import type { WorkflowEntity } from '@n8n/db';

export const createWorkflow = (overrides: Partial<WorkflowEntity> = {}) => ({
	id: 'wf-1',
	name: 'My wf',
	nodes: [
		{
			id: 'node-1',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1,
			position: [0, 0],
			disabled: false,
			parameters: {},
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'HeaderAuth' } },
		},
		{
			id: 'node-2',
			name: 'Start',
			type: 'n8n-nodes-base.start',
			typeVersion: 1,
			position: [100, 0],
			disabled: false,
			parameters: {},
			credentials: { httpHeaderAuth: { id: 'cred-2', name: 'HeaderAuth2' } },
		},
	],
	active: overrides.active ?? true,
	isArchived: overrides.isArchived ?? false,
	settings: overrides.settings ?? { availableInMCP: true },
	pinData: overrides.pinData ?? { should: 'be-removed' },
	...overrides,
});
