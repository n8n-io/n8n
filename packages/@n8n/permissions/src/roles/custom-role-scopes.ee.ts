import type { RESOURCES } from '@/constants.ee';
import type { Scope } from '@/types.ee';

/**
 * UI-visible operations per resource for the project role editor.
 * The `satisfies` constraint ensures every key is a valid resource and
 * every operation exists in that resource's definition in @n8n/permissions.
 */
export const PROJECT_CUSTOM_ROLE_OPERATIONS = {
	project: ['read', 'update', 'delete', 'export'],
	folder: ['read', 'update', 'create', 'move', 'delete'],
	workflow: [
		'read',
		'execute',
		'execute-chat',
		'export',
		'import',
		'update',
		'create',
		'publish',
		'move',
		'delete',
		'enableRedaction',
		'disableRedaction',
	],
	agent: ['read', 'execute', 'list', 'create', 'update', 'delete', 'publish', 'unpublish'],
	credential: [
		'read',
		'connect',
		'createEndUser',
		'update',
		'create',
		'share',
		'unshare',
		'move',
		'delete',
	],
	execution: ['reveal'],
	externalSecretsProvider: ['read', 'create', 'update', 'delete', 'sync'],
	externalSecret: ['list'],
	sourceControl: ['push'],
	dataTable: [
		'read',
		'readRow',
		'update',
		'readColumn',
		'writeColumn',
		'writeRow',
		'create',
		'delete',
	],
	projectVariable: ['read', 'update', 'create', 'delete'],
} as const satisfies {
	[R in keyof typeof RESOURCES]?: ReadonlyArray<(typeof RESOURCES)[R][number]>;
};

/**
 * Scopes that are coupled to a visible scope but hidden from the checkbox UI.
 * These are counted in permission totals so roles carrying them (e.g.
 * PERSONAL_PROJECT_OWNER_SCOPES with workflow:unpublish but no workflow:publish)
 * are not undercounted.
 */
export const COUPLED_HIDDEN_SCOPES: ReadonlySet<Scope> = new Set(['workflow:unpublish']);

type ResourceScope<R extends keyof typeof RESOURCES> =
	`${R & string}:${(typeof RESOURCES)[R][number]}`;

type InstanceScopeGroups = {
	[R in keyof typeof RESOURCES]?: Record<string, ReadonlyArray<ResourceScope<R>>>;
} & {
	settings?: Record<string, readonly Scope[]>;
};

export const GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS = {
	settings: {
		// Grants access to every instance Settings page. Each scope below gates a
		// specific page; granting all of them lets the role see and manage all of them.
		Manage: [
			'securitySettings:manage', // Security & Policies
			'credentialResolver:read', // Resolvers (requires the full CRUD set)
			'credentialResolver:list',
			'credentialResolver:create',
			'credentialResolver:update',
			'credentialResolver:delete',
			'sourceControl:manage', // Environments (Source Control)
			'externalSecretsProvider:list', // External Secrets
			'externalSecretsProvider:update',
			'saml:manage', // Single Sign-On
			'logStreaming:manage', // Log Streaming
			'ldap:manage', // LDAP
			'otel:manage', // OpenTelemetry
			'eventBusDestination:create', // Log Streaming
			'eventBusDestination:read',
			'eventBusDestination:update',
			'eventBusDestination:delete',
			'eventBusDestination:list',
			'eventBusDestination:test',
			'variable:list',
			'variable:read',
			'dataTable:list',
		],
	},
	user: {
		Manage: [
			'user:create',
			'user:update',
			'user:delete',
			'user:changeRole',
			'user:resetPassword',
			'user:generateInviteLink',
			'user:enforceMfa',
			'user:read',
			'user:list',
		],
	},
	role: {
		'Manage project roles': ['role:read', 'role:manageProject'],
		Manage: ['role:read', 'role:manage'],
	},
	apiKey: {
		'Manage own': ['apiKey:create', 'apiKey:list', 'apiKey:delete', 'apiKey:update'],
		'Manage all': [
			'apiKey:create',
			'apiKey:list',
			'apiKey:delete',
			'apiKey:update',
			'apiKey:manage',
		],
	},
	tag: {
		// read/list are bundled with write scopes: tags on workflows you can already
		// read are always visible (they come embedded in the workflow response), so
		// there is no meaningful "view-only" tier for tag definitions.
		Manage: ['tag:read', 'tag:list', 'tag:create', 'tag:update', 'tag:delete'],
	},
	project: {
		Create: ['project:create'],
	},
	insights: {
		View: ['insights:read', 'insights:list'],
	},
} as const satisfies InstanceScopeGroups;

export const GLOBAL_CUSTOM_ROLE_SCOPES: ReadonlySet<Scope> = new Set(
	Object.values(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS).flatMap((optionMap) =>
		Object.values<readonly Scope[]>(optionMap).flat(),
	),
);

/** Precise union of the scopes the operations map grants — keeps each resource
 * correlated with its own operations (no resource×operation cross-product). */
type ProjectCustomRoleScope = {
	[R in keyof typeof PROJECT_CUSTOM_ROLE_OPERATIONS]: `${R & string}:${(typeof PROJECT_CUSTOM_ROLE_OPERATIONS)[R][number]}`;
}[keyof typeof PROJECT_CUSTOM_ROLE_OPERATIONS];

const projectResources = Object.keys(PROJECT_CUSTOM_ROLE_OPERATIONS) as Array<
	keyof typeof PROJECT_CUSTOM_ROLE_OPERATIONS
>;

const projectBaseScopes = projectResources.flatMap((resource) =>
	PROJECT_CUSTOM_ROLE_OPERATIONS[resource].map(
		(op) => `${resource}:${op}` as ProjectCustomRoleScope,
	),
);

/**
 * The project role editor auto-adds a companion "list" scope whenever a `:read`
 * scope is selected — `dataTable:read` pairs with `dataTable:listProject`, every
 * other `:read` with `:list` (see ProjectRoleView.toggleScope). These are never
 * shown as checkboxes but are sent on save, so the whitelist must accept them.
 */
const projectAutoAddedListScopes = projectBaseScopes
	.filter((scope) => scope.endsWith(':read'))
	.map((scope) =>
		scope === 'dataTable:read' ? 'dataTable:listProject' : scope.replace(/:read$/, ':list'),
	) as Scope[];

export const PROJECT_CUSTOM_ROLE_SCOPES: ReadonlySet<Scope> = new Set([
	...projectBaseScopes,
	...projectAutoAddedListScopes,
	...COUPLED_HIDDEN_SCOPES,
]);

export const CUSTOM_ROLE_SCOPE_WHITELIST: Record<'project' | 'global', ReadonlySet<string>> = {
	project: PROJECT_CUSTOM_ROLE_SCOPES,
	global: GLOBAL_CUSTOM_ROLE_SCOPES,
};
