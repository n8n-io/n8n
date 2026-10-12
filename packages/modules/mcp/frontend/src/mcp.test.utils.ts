import type { McpWorkflow } from './mcp.types';
import type { ProjectSharingData } from 'n8n-workflow';
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

export const createWorkflow = (overrides: Partial<McpWorkflow> = {}): McpWorkflow => ({
	id: 'test-workflow-1',
	name: 'Test Workflow',
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
	grantedAt: new Date('2025-09-09T14:14:04.155Z').getTime(),
	scopes: ['workflow:read', 'execution:read'],
	...overrides,
});
