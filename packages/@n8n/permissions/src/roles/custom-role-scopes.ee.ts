import type { RESOURCES } from '../constants.ee';
import type { Scope } from '../types.ee';

/**
 * UI-visible operations per resource for the project role editor.
 * The `satisfies` constraint ensures every key is a valid resource and
 * every operation exists in that resource's definition in @n8n/permissions.
 */
export const PROJECT_CUSTOM_ROLE_OPERATIONS = {
	project: ['read', 'update', 'delete', 'export', 'manageMembers'],
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
	execution: ['read', 'reveal', 'delete'],
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
	projectAiPreference: ['read', 'update', 'create', 'delete'],
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
		// Grants access to every instance Settings page, including MCP and n8n
		// Assistant management. MCP and n8n Assistant also have their own narrower
		// use/manage options below so a role can be given just those without the
		// rest of instance Settings — Manage's bundle is a strict superset of all
		// four, so checking Manage checks them too, and unchecking any one of them
		// drops Manage out of the fully-checked state. The read scopes every role
		// holds anyway live in BASELINE_INSTANCE_SCOPES, not in this bundle.
		Manage: [
			'securitySettings:manage', // Security & Policies
			'credentialResolver:read', // Resolvers (requires the full CRUD set)
			'credentialResolver:create',
			'credentialResolver:update',
			'credentialResolver:delete',
			'sourceControl:manage', // Environments (Source Control)
			'externalSecretsProvider:list', // External Secrets
			'externalSecretsProvider:update',
			'saml:manage', // Single Sign-On
			'sso:manage', // Single Sign-On (shared settings, e.g. login redirect)
			'logStreaming:manage', // Log Streaming
			'ldap:manage', // LDAP
			'otel:manage', // OpenTelemetry
			'eventBusDestination:create', // Log Streaming
			'eventBusDestination:read',
			'eventBusDestination:update',
			'eventBusDestination:delete',
			'aiPreference:create', // Context (instance-wide AI preferences)
			'aiPreference:read',
			'aiPreference:update',
			'aiPreference:delete',
			'aiPreference:list',
			'chatHub:manage', // Chat
			'aiAssistant:manage', // n8n Assistant
			'instanceAi:manage',
			'instanceAi:message',
			'instanceAi:gateway', // computer-use gateway pairing
			'mcp:manage', // Instance-level MCP
			'mcp:oauth', // MCP OAuth clients
			'mcpApiKey:create', // MCP personal API key
			'mcpApiKey:rotate',
		],
		'Mcp use': ['mcp:oauth', 'mcpApiKey:create', 'mcpApiKey:rotate'],
		'Mcp manage': ['mcp:manage', 'mcp:oauth', 'mcpApiKey:create', 'mcpApiKey:rotate'],
		'AiAssistant use': ['instanceAi:message', 'instanceAi:gateway'],
		'AiAssistant manage': [
			'aiAssistant:manage',
			'instanceAi:manage',
			'instanceAi:message',
			'instanceAi:gateway',
		],
	},
	user: {
		// Lets a role look up other users (e.g. the member-search box a Project Admin
		// uses to add users to a project) without granting the Settings > Users page
		// or the ability to change anyone's role. Only `user:list` — the scope the
		// search endpoint actually checks — matches GLOBAL_MEMBER_SCOPES exactly, so
		// a custom role built to mirror Member never ends up with more than Member.
		// `user:read` only gates the Public API's single-user lookup, which Member
		// doesn't have either, so it stays out of this bundle.
		View: ['user:list'],
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
		// Viewing and revoking your own keys needs no scope (always available),
		// so these options only gate creating/editing own keys and managing others'.
		'Manage own': ['apiKey:create', 'apiKey:update'],
		'Manage all': ['apiKey:create', 'apiKey:update', 'apiKey:manage'],
	},
	tag: {
		// Tags on a workflow you can read come embedded in the workflow response, and
		// applying one rides on workflow:update, not a tag scope. read/list gate only
		// the tag *picker* — listing every existing tag to choose from — which every
		// role gets (see MANDATORY_INSTANCE_OPTIONS below). Manage keeps read/list so
		// it stays a strict superset of View, matching `user`.
		View: ['tag:read', 'tag:list'],
		Manage: ['tag:read', 'tag:list', 'tag:create', 'tag:update', 'tag:delete'],
	},
	variable: {
		// Global (instance-level) variables only; project variables are granted per
		// project via `projectVariable:*` on a project role. View mirrors
		// GLOBAL_MEMBER_SCOPES exactly, so a custom role built to match Member never
		// exceeds it. The list response carries each variable's value, so View reads
		// values and is not only discovery — hence it is opt-in, not mandatory.
		View: ['variable:list', 'variable:read'],
		Manage: [
			'variable:list',
			'variable:read',
			'variable:create',
			'variable:update',
			'variable:delete',
		],
	},
	credential: {
		// Instance-wide credential access: what the role can do with credentials it is
		// not a member of the project for. Project-level credential rights are granted
		// per project via a project role and are untouched by this group.
		//
		// Each option is a strict superset of the one below it, which the editor's
		// implied/downgrade arithmetic requires (see SUPERSEDED_BY in editor-ui's
		// instanceRoleScopes).
		//
		// View sees every credential in Overview but cannot select one in a node, test
		// it, or run it — `credential:use` is the separate rung for that.
		//
		// Manage also grants instance-wide plaintext decrypt, because decryption is
		// gated on `credential:read` + `credential:update` (see the TODO about
		// `credential:decrypt` in credentials.service.ee.ts). Hence the escalation
		// warning on this group in the editor.
		//
		// Deliberately excluded from every option, so they stay Owner/Admin-only:
		// `credential:shareGlobally` (makes a credential usable by every user on the
		// instance), `credential:manageInstance` (a separate lane for provider
		// connections that never reach workflows), `credential:createEndUser` (an
		// owner-level *project* capability with no instance-wide meaning) and
		// `credential:connect` (per-user, per-credential; globally it would attach the
		// holder's own account to every end-user credential on the instance).
		View: ['credential:list', 'credential:read'],
		Use: ['credential:list', 'credential:read', 'credential:use'],
		Manage: [
			'credential:list',
			'credential:read',
			'credential:use',
			'credential:create',
			'credential:update',
			'credential:delete',
			'credential:move',
			'credential:share',
			'credential:unshare',
		],
	},
	project: {
		Create: ['project:create'],
	},
	insights: {
		View: ['insights:read', 'insights:list'],
	},
} as const satisfies InstanceScopeGroups;

/**
 * Scopes every instance role carries without a checkbox of their own. The default
 * Member role holds them and they only unlock read-only surfaces: the Chat page,
 * the data table list, and the log streaming and credential resolver lists that
 * other settings pages read. `resolveScopes` and the role editor union them into
 * every global role, so a custom role never trails Member on these pages and the
 * editor never has to render them as a half-checked "Manage all settings".
 */
export const BASELINE_INSTANCE_SCOPES = [
	'chatHub:message',
	'credentialResolver:list',
	'dataTable:list',
	'eventBusDestination:list',
	'eventBusDestination:test',
] as const satisfies readonly Scope[];

export const GLOBAL_CUSTOM_ROLE_SCOPES: ReadonlySet<Scope> = new Set([
	...Object.values(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS).flatMap((optionMap) =>
		Object.values<readonly Scope[]>(optionMap).flat(),
	),
	...BASELINE_INSTANCE_SCOPES,
]);

/** Correlates each resource with its own option keys, so a typo fails the typecheck. */
type MandatoryInstanceOption = {
	[R in keyof typeof GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS]: {
		resource: R;
		option: keyof (typeof GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS)[R];
	};
}[keyof typeof GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS];

/**
 * Options every instance role carries regardless of what is saved — the default
 * Member role already grants them, so they are baseline behaviour rather than
 * something a custom role opts into. The editor renders them checked and
 * disabled; `resolveScopes` unions them into every global-role write.
 */
export const MANDATORY_INSTANCE_OPTIONS = [
	{ resource: 'user', option: 'View' },
	{ resource: 'tag', option: 'View' },
] as const satisfies readonly MandatoryInstanceOption[];

export function isMandatoryInstanceOption(resource: string, option: string): boolean {
	return MANDATORY_INSTANCE_OPTIONS.some((m) => m.resource === resource && m.option === option);
}

/**
 * Every scope a global role write unions in: the mandatory options' scopes (derived
 * by indexing the groups table, so a typo contributes nothing silently) plus the
 * baseline scopes that have no option of their own.
 */
export const MANDATORY_INSTANCE_SCOPES: readonly Scope[] = [
	...new Set<Scope>([
		...MANDATORY_INSTANCE_OPTIONS.flatMap(({ resource, option }) => {
			const optionMap: Record<string, readonly Scope[]> = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS[resource];
			return optionMap[option];
		}),
		...BASELINE_INSTANCE_SCOPES,
	]),
];

/** Unions in the mandatory scopes (see `MANDATORY_INSTANCE_OPTIONS`) on top of an already-filtered scope list. */
export function withMandatoryInstanceScopes(scopes: readonly string[]): string[] {
	return [...new Set([...scopes, ...MANDATORY_INSTANCE_SCOPES])];
}

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
