import { API_KEY_RESOURCES, RESOURCES } from './constants.ee';
import type { ApiKeyScope, Scope, ScopeInformation } from './types.ee';

function buildResourceScopes() {
	const resourceScopes = Object.entries(RESOURCES).flatMap(([resource, operations]) => [
		...operations.map((op) => `${resource}:${op}` as const),
	]) as Scope[];

	return resourceScopes;
}

function buildApiKeyScopes() {
	const apiKeyScopes = Object.entries(API_KEY_RESOURCES).flatMap(([resource, operations]) => [
		...operations.map((op) => `${resource}:${op}` as const),
	]) as ApiKeyScope[];

	return new Set(apiKeyScopes);
}

export const ALL_SCOPES = buildResourceScopes();

export const ALL_API_KEY_SCOPES = buildApiKeyScopes();

export const scopeInformation: Partial<Record<Scope, ScopeInformation>> = {
	'agent:create': {
		displayName: 'Create Agent',
		description: 'Allows creating new agents in a project.',
	},
	'agent:read': {
		displayName: 'Read Agent',
		description: 'Allows reading agent configuration and history.',
	},
	'agent:update': {
		displayName: 'Update Agent',
		description: 'Allows updating, building, publishing, and managing integrations of agents.',
	},
	'agent:delete': {
		displayName: 'Delete Agent',
		description: 'Allows deleting agents.',
	},
	'agent:list': {
		displayName: 'List Agents',
		description: 'Allows listing agents in a project.',
	},
	'agent:execute': {
		displayName: 'Execute Agent',
		description: 'Allows running agents in chat.',
	},
	'agent:publish': {
		displayName: 'Publish Agent',
		description: 'Allows publishing agents.',
	},
	'agent:unpublish': {
		displayName: 'Unpublish Agent',
		description: 'Allows unpublishing agents.',
	},
	'aiAssistant:manage': {
		displayName: 'Manage AI Usage',
		description: 'Allows managing AI Usage settings.',
	},
	'encryptionKey:manage': {
		displayName: 'Manage Encryption Keys',
		description: 'Allows listing and rotating instance encryption keys.',
	},
	'annotationTag:create': {
		displayName: 'Create Annotation Tag',
		description: 'Allows creating new annotation tags.',
	},
	'workflow:publish': {
		displayName: 'Publish Workflow',
		description: 'Allows publishing workflows.',
	},
	'workflow:unpublish': {
		displayName: 'Unpublish Workflow',
		description: 'Allows unpublishing workflows.',
	},
	'workflow:unshare': {
		displayName: 'Unshare Workflow',
		description: 'Allows removing workflow shares.',
	},
	'workflow:export': {
		displayName: 'Export Workflow',
		description: 'Allows including workflows in a portable package export.',
	},
	'workflow:import': {
		displayName: 'Import Workflow',
		description: 'Allows importing workflows from a portable package into the project.',
	},
	'project:export': {
		displayName: 'Export Project',
		description: 'Allows including projects in a portable package export.',
	},
	'credential:unshare': {
		displayName: 'Unshare Credential',
		description: 'Allows removing credential shares.',
	},
	'credential:connect': {
		displayName: 'Connect End-User Credential',
		description: 'Allows connecting an own account to an end-user credential.',
	},
	'credential:createEndUser': {
		displayName: 'Manage End-User Credential',
		description:
			"Allows creating, deleting, and changing the type of end-user credentials, which resolve to each user's own connection.",
	},
	'credential:manageInstance': {
		displayName: 'Manage provider connections',
		description:
			'Allows creating, updating, and deleting provider connections used by instance-level features. These connections are not available in workflows.',
	},
	'insights:read': {
		displayName: 'Read Insights',
		description: 'Allows reading insights data.',
	},
	'testRun:read': {
		displayName: 'Read Test Run',
		description: 'Allows reading evaluation test runs and their per-case results.',
	},
	'testRun:list': {
		displayName: 'List Test Runs',
		description: 'Allows listing evaluation test runs for a workflow.',
	},
	'workflow:execute-chat': {
		displayName: 'Execute Workflow in Chat',
		description: 'Allows executing workflows in chat.',
	},
	'role:manageProject': {
		displayName: 'Manage project roles',
		description: 'Allows creating, editing, and deleting project role definitions.',
	},
	'serviceAccount:create': {
		displayName: 'Create Service Account',
		description: 'Allows creating new service accounts.',
	},
	'serviceAccount:read': {
		displayName: 'Read Service Account',
		description: 'Allows reading service account details.',
	},
	'serviceAccount:update': {
		displayName: 'Update Service Account',
		description: 'Allows renaming service accounts and changing their role.',
	},
	'serviceAccount:delete': {
		displayName: 'Delete Service Account',
		description: 'Allows deleting service accounts and the resources they own.',
	},
	'serviceAccount:list': {
		displayName: 'List Service Accounts',
		description: 'Allows listing the service accounts on this instance.',
	},
	'serviceAccount:impersonate': {
		displayName: 'Act as Service Account',
		description:
			'Allows acting as a service account, gaining all of its permissions and access to everything it owns, including creating API keys on its behalf. Grant with care.',
	},
};
