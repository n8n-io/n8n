import type { API_KEY_RESOURCES } from '@n8n/permissions';

export const API_KEY_CREATE_OR_EDIT_MODAL_KEY = 'createOrEditApiKey';

type ApiKeyResource = keyof typeof API_KEY_RESOURCES;

export const API_KEY_SCOPE_GROUPS: Array<{ key: string; resources: ApiKeyResource[] }> = [
	{
		key: 'workflowsAndExecutions',
		resources: ['workflow', 'execution', 'workflowTags', 'executionTags'],
	},
	{ key: 'credentialsAndVariables', resources: ['credential', 'variable'] },
	{ key: 'dataTables', resources: ['dataTable', 'dataTableRow', 'dataTableColumn'] },
	{ key: 'projects', resources: ['project'] },
	{ key: 'foldersTags', resources: ['folder', 'tag'] },
	{ key: 'members', resources: ['user'] },
	{
		key: 'instanceOperations',
		resources: ['securityAudit', 'sourceControl', 'communityPackage', 'insights'],
	},
];

// Actions treated as read-only for the "Read only" preset and the read/write badge.
// `export` is intentionally included: it is non-mutating, even though `workflow:export`
// returns the full workflow definition.
export const READ_SCOPE_ACTIONS = ['read', 'list', 'export'] as const;
