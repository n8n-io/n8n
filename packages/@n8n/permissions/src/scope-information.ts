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
	'app:create': { displayName: 'Create app', description: 'Create apps in a project.' },
	'app:read': { displayName: 'View app', description: 'View app details and versions.' },
	'app:update': { displayName: 'Edit app', description: 'Edit apps in a project.' },
	'app:delete': { displayName: 'Delete app', description: 'Delete apps and their versions.' },
	'app:list': {
		displayName: 'List apps',
		description: 'List apps in a project.',
	},
	'aiPreference:read': {
		displayName: 'Read AI Preferences',
		description:
			'Allows reading the AI preferences saved for the instance, the user, and their projects.',
	},
	'skill:read': {
		displayName: 'Read Skills',
		description: 'Allows reading instance skills.',
	},
	'skill:update': {
		displayName: 'Update Skills',
		description: 'Allows editing and saving instance skills.',
	},
	'projectSkill:read': {
		displayName: 'Read Project Skills',
		description: 'Allows reading the skills of a project.',
	},
	'projectSkill:update': {
		displayName: 'Update Project Skills',
		description: 'Allows editing and saving the skills of a project.',
	},
	'agent:create': {
		displayName: 'Create Agent',
		description: 'Allows creating new agents in a project.',
	},
	'agent:read': {
		displayName: 'Read Agent',
		description: 'Allows reading agent configuration and history.',
	},
	'agent:export': {
		displayName: 'Export Agent',
		description: 'Allows including agents in a portable package export.',
	},
	'agent:import': {
		displayName: 'Import Agent',
		description: 'Allows importing agents from a portable package.',
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
	'execution:read': {
		displayName: 'View Execution',
		description: 'Allows viewing executions of workflows the role can view.',
	},
	'execution:list': {
		displayName: 'List Executions',
		description: 'Allows listing executions of workflows the role can view.',
	},
	'execution:delete': {
		displayName: 'Delete Execution',
		description: 'Allows deleting executions of workflows in the project.',
	},
	'nodeTypePolicy:manage': {
		displayName: 'Manage Node Type Policies',
		description: 'Allows managing which node types are available, on the instance or in a project.',
	},
	'credentialTypePolicy:manage': {
		displayName: 'Manage Credential Type Policies',
		description:
			'Allows managing which credential types are available, on the instance or in a project.',
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
	'project:manageMembers': {
		displayName: 'Manage Project Members',
		description:
			"Allows adding members to a project, changing a member's project role, and removing members.",
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
	'credential:use': {
		displayName: 'Use Credential',
		description:
			'Allows using any credential on the instance in a workflow, without being a member of its project. Without it, a role that can read credentials sees them but cannot select, test, or run them.',
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
	'promotions:create': {
		displayName: 'Create promotion setup',
		description: 'Allows creating promotion providers and environments.',
	},
	'promotions:read': {
		displayName: 'Read promotion setup',
		description:
			'Allows reading promotion providers, environments, and the projects linked to each environment.',
	},
	'promotions:update': {
		displayName: 'Update promotion setup',
		description: 'Allows updating promotion providers and environments.',
	},
	'promotions:delete': {
		displayName: 'Delete promotion setup',
		description: 'Allows deleting promotion providers and environments.',
	},
	'promotions:list': {
		displayName: 'List promotion setup',
		description: 'Allows listing promotion providers and environments.',
	},
	'promotions:discover': {
		displayName: 'Discover promotion locations',
		description: 'Allows listing the locations that a promotion provider can reach.',
	},
	'promotions:connect': {
		displayName: 'Connect promotion environment',
		description: 'Allows connecting this instance to a promotion environment and disconnecting it.',
	},
	'promotions:promote': {
		displayName: 'Promote',
		description:
			'Allows previewing and promoting changes from team projects to a promotion environment.',
	},
	'promotions:manageProjects': {
		displayName: 'Manage promotion environment projects',
		description: 'Allows adding projects to and removing projects from a promotion environment.',
	},
	'promotions:apply': {
		displayName: 'Apply',
		description:
			'Allows previewing and applying changes from a promotion environment to this instance.',
	},
	'promotions:readReviews': {
		displayName: 'Read promotion reviews',
		description: 'Allows listing promotion reviews and viewing their status and changes.',
	},
	'promotions:approveReviews': {
		displayName: 'Approve promotion reviews',
		description:
			'Allows approving promotion reviews, which adds their changes to the promotion environment.',
	},
};
