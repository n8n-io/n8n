import { API_KEY_RESOURCES, RESOURCES } from './constants.ee';
import type { ApiKeyScope, Scope, ScopeInformation } from './types.ee';

function buildResourceScopes() {
	const resourceScopes = Object.entries(RESOURCES).flatMap(([resource, operations]) => [
		...operations.map((op) => `${resource}:${op}` as const),
		`${resource}:*` as const,
	]) as Scope[];

	resourceScopes.push('*' as const); // Global wildcard
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
	'credential:unshare': {
		displayName: 'Unshare Credential',
		description: 'Allows removing credential shares.',
	},
	'insights:read': {
		displayName: 'Read Insights',
		description: 'Allows reading insights data.',
	},
};
