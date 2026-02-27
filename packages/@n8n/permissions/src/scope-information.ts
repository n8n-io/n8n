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

export const scopeInformation: Partial<Record<Scope | ApiKeyScope, ScopeInformation>> = {
	'aiAssistant:manage': {
		displayName: 'Manage AI Usage',
		description: 'Allows managing AI Usage settings.',
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
	'agent:create': {
		displayName: 'Create Agent',
		description: 'Allows creating new agents.',
	},
	'agent:read': {
		displayName: 'Read Agent Card',
		description: 'Allows reading agent cards for A2A discovery.',
	},
	'agent:update': {
		displayName: 'Update Agent',
		description: 'Allows updating agent settings.',
	},
	'agent:delete': {
		displayName: 'Delete Agent',
		description: 'Allows deleting agents.',
	},
	'agent:list': {
		displayName: 'List Agents',
		description: 'Allows listing visible agents.',
	},
	'agent:execute': {
		displayName: 'Execute Agent Task',
		description: 'Allows dispatching tasks to agents.',
	},
	'agent:receive': {
		displayName: 'Receive Agent Task',
		description: 'Allows receiving tasks from other agents.',
	},
};
