import type { WorkflowListItem } from '@/Interface';

export const createWorkflow = (overrides: Partial<WorkflowListItem> = {}): WorkflowListItem => ({
	resource: 'workflow',
	id: 'test-workflow-1',
	createdAt: '2025-09-09T14:14:04.155Z',
	updatedAt: '2025-09-23T08:13:45.000Z',
	name: 'Test Workflow',
	active: true,
	activeVersionId: 'v1',
	isArchived: false,
	settings: {
		availableInMCP: true,
		executionOrder: 'v1',
	},
	versionId: 'v1',
	tags: [],
	scopes: ['workflow:read', 'workflow:update'],
	homeProject: {
		id: 'project1',
		type: 'team',
		name: 'Test Project',
		icon: {
			type: 'icon',
			value: 'bot',
		},
		createdAt: '2025-09-09T14:13:50.000Z',
		updatedAt: '2025-09-09T14:13:50.000Z',
	},
	sharedWithProjects: [],
	...overrides,
});
