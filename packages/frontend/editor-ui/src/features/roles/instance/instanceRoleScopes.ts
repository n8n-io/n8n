/**
 * FE-only config for the instance (global) role editor.
 *
 * The user only ever sees per-resource permission *options* (e.g. View / Manage,
 * or "Manage own" / "Manage all"); they never see individual scopes. Each option
 * maps to a fixed set of real scopes, resolved under the hood. The role still
 * saves a flat scope list.
 */

import { type BaseTextKey } from '@n8n/i18n';
import { GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS, type Scope } from '@n8n/permissions';
export { GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS as INSTANCE_SCOPE_GROUPS } from '@n8n/permissions';

export type InstanceResource = keyof typeof GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS;

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
	'Manage project roles': 'instanceRoles.option.manageProjectRoles',
};

/**
 * Per-resource label overrides. "Manage" is shared across resources, but under
 * Roles it must read "Manage all roles (instance and project)" to distinguish it
 * from "Manage project roles".
 */
export const INSTANCE_OPTION_LABEL_OVERRIDES: Partial<
	Record<InstanceResource, Record<string, BaseTextKey>>
> = {
	role: { Manage: 'instanceRoles.option.manageAllRoles' },
};

/**
 * i18n key for the tooltip that explains what each permission option grants.
 * Option meaning differs per resource (a "Manage" toggle grants different things
 * under Members vs Tags), so descriptions are keyed by resource *and* option.
 */
export const INSTANCE_OPTION_DESCRIPTION_KEYS: Partial<
	Record<InstanceResource, Record<string, BaseTextKey>>
> = {
	settings: { Manage: 'instanceRoles.description.settings.manage' },
	user: { Manage: 'instanceRoles.description.user.manage' },
	role: {
		'Manage project roles': 'instanceRoles.description.role.manageProjectRoles',
		Manage: 'instanceRoles.description.role.manage',
	},
	apiKey: {
		'Manage own': 'instanceRoles.description.apiKey.manageOwn',
		'Manage all': 'instanceRoles.description.apiKey.manageAll',
	},
	tag: { Manage: 'instanceRoles.description.tag.manage' },
	project: { Create: 'instanceRoles.description.project.create' },
	insights: { View: 'instanceRoles.description.insights.view' },
};

/** Display order of options within a resource group. */
export const INSTANCE_OPTION_ORDER: string[] = [
	'View',
	'Create',
	'Manage project roles',
	'Manage',
	'Manage own',
	'Manage all',
];

export type InstanceScopeOption = {
	/** The option's config key, e.g. "View" or "Manage own". */
	key: string;
	labelKey: BaseTextKey;
	/** i18n key for the tooltip explaining what the option grants, if any. */
	descriptionKey?: BaseTextKey;
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
		const optionMap = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS[resource] as Record<string, readonly Scope[]>;
		const options = Object.keys(optionMap)
			.sort(sortByOrder(INSTANCE_OPTION_ORDER))
			.map<InstanceScopeOption>((key) => ({
				key,
				labelKey:
					INSTANCE_OPTION_LABEL_OVERRIDES[resource]?.[key] ?? INSTANCE_OPTION_LABEL_KEYS[key],
				descriptionKey: INSTANCE_OPTION_DESCRIPTION_KEYS[resource]?.[key],
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
	'Manage project roles': 'Manage',
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
 * Find the option that `option` supersedes within its group, if any. SUPERSEDED_BY
 * maps a sub-option to its superseding option, so the subordinate of a superseding
 * option is the key that points back to it.
 */
export function findSubordinateOption(
	option: InstanceScopeOption,
	groupOptions: InstanceScopeOption[],
): InstanceScopeOption | undefined {
	const subordinateKey = Object.keys(SUPERSEDED_BY).find(
		(key) => SUPERSEDED_BY[key] === option.key,
	);
	return subordinateKey ? groupOptions.find((o) => o.key === subordinateKey) : undefined;
}

/**
 * Toggle an option within its resource group. Checking adds the option's full
 * scope set. Unchecking an option which supersedes another (e.g. "Manage all"
 * over "Manage own", or "Manage all roles" over "Manage project roles") downgrades
 * to the subordinate option instead of clearing it too: the option's own scopes are
 * removed, then the subordinate's scopes are (re)added so the lesser permission
 * stays selected. Returns a new array; input is not mutated.
 */
export function toggleOptionInGroup(
	scopes: readonly string[],
	option: InstanceScopeOption,
	groupOptions: InstanceScopeOption[],
): string[] {
	const fullyChecked = option.scopes.every((scope) => scopes.includes(scope));
	if (!fullyChecked) {
		// Checking: add the option's full scope set.
		return [...new Set([...scopes, ...option.scopes])];
	}

	// Unchecking: drop the option's scopes, then downgrade to its subordinate
	// (if any) so the lesser permission remains selected rather than clearing
	// the scopes the two share.
	const next = new Set(scopes);
	for (const scope of option.scopes) next.delete(scope);
	const subordinate = findSubordinateOption(option, groupOptions);
	if (subordinate) {
		for (const scope of subordinate.scopes) next.add(scope);
	}
	return [...next];
}

/** Resource groups whose scopes enable privilege escalation, with the warning to show. */
export const ESCALATION_WARNING_SCOPES: Partial<
	Record<InstanceResource, { scopes: Scope[]; messageKey: BaseTextKey }>
> = {
	user: {
		scopes: [...GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.Manage],
		messageKey: 'instanceRoles.warning.manageMembers',
	},
	role: {
		// Only full instance-role management ("Manage all roles") enables self-escalation;
		// managing project roles alone cannot edit the holder's own instance role.
		scopes: ['role:manage'],
		messageKey: 'instanceRoles.warning.manageRoles',
	},
};

/** Warning i18n key for a resource group given the current scopes, or undefined. */
export function getEscalationWarningKey(
	resource: InstanceResource,
	scopes: readonly string[],
): BaseTextKey | undefined {
	const cfg = ESCALATION_WARNING_SCOPES[resource];
	return cfg?.scopes.some((s) => scopes.includes(s)) ? cfg.messageKey : undefined;
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
