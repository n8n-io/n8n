import type { WorkflowListItem } from '@/Interface';

export const MCP_WORKFLOWS: WorkflowListItem[] = [
	{
		resource: 'workflow',
		id: 'test-workflow-1',
		createdAt: '2025-09-09T14:14:04.155Z',
		updatedAt: '2025-09-23T08:13:45.000Z',
		name: 'MCP Test 1',
		active: true,
		isArchived: false,
		settings: {
			availableInMCP: true,
			executionOrder: 'v1',
		},
		versionId: 'v1',
		tags: [],
		homeProject: {
			id: 'project1',
			type: 'team',
			name: 'MCP Test',
			icon: {
				type: 'icon',
				value: 'bot',
			},
			createdAt: '2025-09-09T14:13:50.000Z',
			updatedAt: '2025-09-09T14:13:50.000Z',
		},
		sharedWithProjects: [],
	},
	{
		resource: 'workflow',
		id: 'test-workflow-2',
		createdAt: '2025-09-09T14:14:04.155Z',
		updatedAt: '2025-09-23T08:13:45.000Z',
		name: 'MCP Test 2',
		active: false,
		isArchived: false,
		settings: {
			availableInMCP: true,
			executionOrder: 'v1',
		},
		versionId: 'v1',
		tags: [],
		homeProject: {
			id: 'personal',
			type: 'personal',
			name: 'User<user@n8n.io>',
			icon: {
				type: 'icon',
				value: 'user',
			},
			createdAt: '2025-09-09T14:13:50.000Z',
			updatedAt: '2025-09-09T14:13:50.000Z',
		},
		parentFolder: {
			id: '1',
			name: 'A folder',
			parentFolderId: null,
		},
	},
];
