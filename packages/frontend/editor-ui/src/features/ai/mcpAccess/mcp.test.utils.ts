import type { WorkflowListItem } from '@/Interface';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import type { OAuthClientResponseDto } from '@n8n/api-types';

export const createHomeProject = (
	overrides: Partial<ProjectSharingData> = {},
): ProjectSharingData => ({
	id: 'project-1',
	type: 'team',
	name: 'Test Project',
	icon: null,
	createdAt: '2025-01-01',
	updatedAt: '2025-01-01',
	...overrides,
});

export const createParentFolder = (
	overrides: Partial<{ id: string; name: string; parentFolderId: string | null }> = {},
) => ({
	id: 'folder-1',
	name: 'Test Folder',
	parentFolderId: null,
	...overrides,
});

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

export const createOAuthClient = (
	overrides: Partial<OAuthClientResponseDto> = {},
): OAuthClientResponseDto => ({
	id: 'client-1',
	name: 'Test Client',
	createdAt: '2025-09-09T14:14:04.155Z',
	updatedAt: '2025-09-09T14:14:04.155Z',
	redirectUris: [],
	grantTypes: ['authorization_code'],
	tokenEndpointAuthMethod: 'client_secret_basic',
	...overrides,
});
