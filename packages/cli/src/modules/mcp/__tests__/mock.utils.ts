import type { WorkflowEntity } from '@n8n/db';
import { MANUAL_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE, type INode } from 'n8n-workflow';

const testNodes: INode[] = [
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
];

export const createWorkflow = (overrides: Partial<WorkflowEntity> = {}): WorkflowEntity => {
	const activeVersionId = overrides.activeVersionId ?? null;
	const testActiveVersion = overrides.activeVersion ?? { nodes: overrides.nodes ?? testNodes };
	const activeVersion = activeVersionId ? testActiveVersion : undefined;
	return {
		id: 'wf-1',
		name: 'My wf',
		description: null,
		nodes: overrides.nodes ?? testNodes,
		connections: {},
		versionId: 'some-version-id',
		activeVersionId,
		active: activeVersionId !== null,
		isArchived: overrides.isArchived ?? false,
		createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: overrides.updatedAt ?? new Date('2024-01-02T00:00:00.000Z'),
		triggerCount: overrides.triggerCount ?? 1,
		settings: overrides.settings ?? { availableInMCP: true },
		pinData: overrides.pinData ?? { should: 'be-removed' },
		activeVersion,
		...overrides,
	} as WorkflowEntity;
};
