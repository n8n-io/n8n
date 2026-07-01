/**
 * FE-only config for the instance (global) role editor.
 *
 * The user only ever sees per-resource permission *options* (e.g. View / Manage,
 * or "Manage own" / "Manage all"); they never see individual scopes. Each option
 * maps to a fixed set of real scopes, resolved under the hood. The role still
 * saves a flat scope list.
 */

import { type BaseTextKey } from '@n8n/i18n';
import { type RESOURCES, type Scope } from '@n8n/permissions';

type ResourceScope<R extends keyof typeof RESOURCES> =
	`${R & string}:${(typeof RESOURCES)[R][number]}`;

type InstanceScopeGroups = {
	[R in keyof typeof RESOURCES]?: Record<string, ReadonlyArray<ResourceScope<R>>>;
} & {
	settings?: Record<string, readonly Scope[]>;
};

export const INSTANCE_SCOPE_GROUPS = {
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
		View: ['tag:read', 'tag:list'],
		Manage: ['tag:create', 'tag:update', 'tag:delete'],
	},
	project: {
		Create: ['project:create'],
	},
	insights: {
		View: ['insights:read', 'insights:list'],
	},
} as const satisfies InstanceScopeGroups;

export type InstanceResource = keyof typeof INSTANCE_SCOPE_GROUPS;

/** Display order of the resource groups in the editor. */
export const INSTANCE_RESOURCE_ORDER: InstanceResource[] = [
	'settings',
	'user',
	'role',
	'apiKey',
	'tag',
	'project',
	'insights',
];

/** i18n label key per resource group. */
export const INSTANCE_RESOURCE_LABEL_KEYS: Record<InstanceResource, BaseTextKey> = {
	settings: 'instanceRoles.resource.settings',
	user: 'instanceRoles.resource.user',
	role: 'instanceRoles.resource.role',
	apiKey: 'instanceRoles.resource.apiKey',
	tag: 'instanceRoles.resource.tag',
	project: 'instanceRoles.resource.project',
	insights: 'instanceRoles.resource.insights',
};

/**
 * i18n label key per option label. Option labels are shared across resources, so
 * "View"/"Manage" reuse one key while api keys get their own "Manage own"/"Manage all".
 */
export const INSTANCE_OPTION_LABEL_KEYS: Record<string, BaseTextKey> = {
	View: 'instanceRoles.option.view',
	Create: 'instanceRoles.option.create',
	Manage: 'instanceRoles.option.manage',
	'Manage own': 'instanceRoles.option.manageOwn',
	'Manage all': 'instanceRoles.option.manageAll',
};

/** Display order of options within a resource group. */
export const INSTANCE_OPTION_ORDER: string[] = [
	'View',
	'Create',
	'Manage',
	'Manage own',
	'Manage all',
];

export type InstanceScopeOption = {
	/** The option's config key, e.g. "View" or "Manage own". */
	key: string;
	labelKey: BaseTextKey;
	scopes: Scope[];
};

export type InstanceScopeGroup = {
	resource: InstanceResource;
	labelKey: BaseTextKey;
	options: InstanceScopeOption[];
};

const sortByOrder = (order: string[]) => (a: string, b: string) => {
	const ia = order.indexOf(a);
	const ib = order.indexOf(b);
	return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
};

/**
 * Flattened, ordered structure the selector renders from: resource groups in
 * display order, each with its options in display order.
 */
export const INSTANCE_SCOPE_GROUP_LIST: InstanceScopeGroup[] = INSTANCE_RESOURCE_ORDER.map(
	(resource) => {
		const optionMap = INSTANCE_SCOPE_GROUPS[resource] as Record<string, readonly Scope[]>;
		const options = Object.keys(optionMap)
			.sort(sortByOrder(INSTANCE_OPTION_ORDER))
			.map<InstanceScopeOption>((key) => ({
				key,
				labelKey: INSTANCE_OPTION_LABEL_KEYS[key],
				scopes: [...optionMap[key]],
			}));
		return { resource, labelKey: INSTANCE_RESOURCE_LABEL_KEYS[resource], options };
	},
);

export const ALL_INSTANCE_SCOPES: Scope[] = [
	...new Set(INSTANCE_SCOPE_GROUP_LIST.flatMap((g) => g.options.flatMap((o) => o.scopes))),
];

export type OptionState = 'checked' | 'indeterminate' | 'unchecked';

/**
 * Declares when one option is visually superseded by another within the same
 * resource group. If the superseding option is fully checked, the superseded
 * option is implied — it should render as disabled ✔︎ with an explanatory
 * tooltip rather than as an independently active selection.
 */
export const SUPERSEDED_BY: Partial<Record<string, string>> = {
	'Manage own': 'Manage all',
};

/**
 * Returns true when another option in the same group is fully checked and
 * supersedes this option. The caller should render implied options as disabled
 * with a tooltip explaining they are included in the superseding option.
 */
export function isOptionImplied(
	option: InstanceScopeOption,
	groupOptions: InstanceScopeOption[],
	roleScopes: readonly string[],
): boolean {
	const supersededByKey = SUPERSEDED_BY[option.key];
	if (!supersededByKey) return false;
	const superseding = groupOptions.find((o) => o.key === supersededByKey);
	return !!superseding && getOptionState(roleScopes, superseding.scopes) === 'checked';
}

/**
 * Resolve how an option should render against a saved flat scope list.
 * - all of the option's scopes present -> checked
 * - some but not all present          -> indeterminate (e.g. system-role presets
 *                                         or API-created roles that carry a partial subset)
 * - none present                      -> unchecked
 */
export function getOptionState(
	scopes: readonly string[],
	optionScopes: readonly string[],
): OptionState {
	const present = optionScopes.filter((scope) => scopes.includes(scope)).length;
	if (present === 0) return 'unchecked';
	if (present === optionScopes.length) return 'checked';
	return 'indeterminate';
}

/**
 * When option A is a strict superset of option B (B is superseded by A), and B
 * is fully checked, A will appear indeterminate via raw scope arithmetic because
 * B's scopes are already present. That indeterminate is misleading — the user
 * selected B only, not A. This function returns 'unchecked' in that case.
 *
 * The guard only fires when a sub-option is *fully* checked, so genuine partial
 * selections (e.g. API-created roles with an arbitrary subset) still show
 * indeterminate correctly.
 */
export function resolveOptionState(
	option: InstanceScopeOption,
	groupOptions: InstanceScopeOption[],
	roleScopes: readonly string[],
): OptionState {
	const base = getOptionState(roleScopes, option.scopes);
	if (base !== 'indeterminate') return base;

	// Collect scopes that belong to fully-checked sub-options of this option.
	const fullyCheckedSubScopes = new Set(
		groupOptions
			.filter(
				(other) =>
					SUPERSEDED_BY[other.key] === option.key &&
					getOptionState(roleScopes, other.scopes) === 'checked',
			)
			.flatMap((o) => o.scopes),
	);

	if (fullyCheckedSubScopes.size === 0) return base;

	// If every present scope in this option is already accounted for by a
	// fully-checked sub-option, the indeterminate is an artifact — show unchecked.
	const presentScopes = option.scopes.filter((s) => roleScopes.includes(s));
	return presentScopes.every((s) => fullyCheckedSubScopes.has(s)) ? 'unchecked' : base;
}

/**
 * Toggle an option on the saved flat scope list. Adds the option's full resolved
 * scope set when it is not already fully checked (unchecked or indeterminate),
 * otherwise removes the full set. Returns a new array; input is not mutated.
 */
export function toggleOption(scopes: readonly string[], optionScopes: readonly string[]): string[] {
	const fullyChecked = optionScopes.every((scope) => scopes.includes(scope));
	const next = new Set(scopes);
	for (const scope of optionScopes) {
		if (fullyChecked) next.delete(scope);
		else next.add(scope);
	}
	return [...next];
}

/** Total number of permission options shown in the instance role editor. */
export const TOTAL_INSTANCE_PERMISSIONS = INSTANCE_SCOPE_GROUP_LIST.reduce(
	(sum, group) => sum + group.options.length,
	0,
);

/** Count how many permission options a saved flat scope list fully grants. */
export function countGrantedInstancePermissions(scopes: readonly string[]): number {
	let count = 0;
	for (const group of INSTANCE_SCOPE_GROUP_LIST) {
		for (const option of group.options) {
			if (getOptionState(scopes, option.scopes) === 'checked') count++;
		}
	}
	return count;
}
