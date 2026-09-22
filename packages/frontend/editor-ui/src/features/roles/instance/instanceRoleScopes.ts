/**
 * FE-only config for the instance (global) role editor.
 *
 * The user only ever sees per-resource permission *options* (e.g. View / Manage,
 * or "Manage own" / "Manage all"); they never see individual scopes. Each option
 * maps to a fixed set of real scopes, resolved under the hood. The role still
 * saves a flat scope list.
 */

import { type BaseTextKey } from '@n8n/i18n';
import {
	BASELINE_INSTANCE_SCOPES,
	GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS,
	isMandatoryInstanceOption,
	type Scope,
	withMandatoryInstanceScopes,
} from '@n8n/permissions';
export { GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS as INSTANCE_SCOPE_GROUPS } from '@n8n/permissions';
export { withMandatoryInstanceScopes } from '@n8n/permissions';

export type InstanceResource = keyof typeof GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS;

/** Display order of the resource groups in the editor. */
export const INSTANCE_RESOURCE_ORDER: InstanceResource[] = [
	'settings',
	'user',
	'role',
	'apiKey',
	'tag',
	'variable',
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
	variable: 'instanceRoles.resource.variable',
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
	'Mcp use': 'instanceRoles.option.mcpUse',
	'Mcp manage': 'instanceRoles.option.mcpManage',
	'AiAssistant use': 'instanceRoles.option.aiAssistantUse',
	'AiAssistant manage': 'instanceRoles.option.aiAssistantManage',
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
	settings: { Manage: 'instanceRoles.option.manageAllSettings' },
};

/**
 * i18n key for the tooltip that explains what each permission option grants.
 * Option meaning differs per resource (a "Manage" toggle grants different things
 * under Members vs Tags), so descriptions are keyed by resource *and* option.
 */
export const INSTANCE_OPTION_DESCRIPTION_KEYS: Partial<
	Record<InstanceResource, Record<string, BaseTextKey>>
> = {
	settings: {
		Manage: 'instanceRoles.description.settings.manage',
		'Mcp use': 'instanceRoles.description.settings.mcpUse',
		'Mcp manage': 'instanceRoles.description.settings.mcpManage',
		'AiAssistant use': 'instanceRoles.description.settings.aiAssistantUse',
		'AiAssistant manage': 'instanceRoles.description.settings.aiAssistantManage',
	},
	user: {
		View: 'instanceRoles.description.user.view',
		Manage: 'instanceRoles.description.user.manage',
	},
	role: {
		'Manage project roles': 'instanceRoles.description.role.manageProjectRoles',
		Manage: 'instanceRoles.description.role.manage',
	},
	apiKey: {
		'Manage own': 'instanceRoles.description.apiKey.manageOwn',
		'Manage all': 'instanceRoles.description.apiKey.manageAll',
	},
	tag: {
		View: 'instanceRoles.description.tag.view',
		Manage: 'instanceRoles.description.tag.manage',
	},
	variable: {
		View: 'instanceRoles.description.variable.view',
		Manage: 'instanceRoles.description.variable.manage',
	},
	project: { Create: 'instanceRoles.description.project.create' },
	insights: { View: 'instanceRoles.description.insights.view' },
};

/** Display order of options within a resource group. */
export const INSTANCE_OPTION_ORDER: string[] = [
	'View',
	'Create',
	'Manage project roles',
	'Mcp use',
	'Mcp manage',
	'AiAssistant use',
	'AiAssistant manage',
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

/**
 * Every scope the editor may save: the option scopes plus the baseline scopes
 * every instance role carries without a checkbox. The form filters stored roles
 * through this list, so the baseline survives a save untouched.
 */
export const ALL_INSTANCE_SCOPES: Scope[] = [
	...new Set<Scope>([
		...INSTANCE_SCOPE_GROUP_LIST.flatMap((g) => g.options.flatMap((o) => o.scopes)),
		...BASELINE_INSTANCE_SCOPES,
	]),
];

/**
 * Tooltip overrides for the mandatory options declared in `@n8n/permissions`.
 * The wording that explains *why* an option is locked lives here because
 * `@n8n/permissions` must stay free of i18n types.
 */
const MANDATORY_OPTION_TOOLTIP_KEYS: Partial<
	Record<InstanceResource, Record<string, BaseTextKey>>
> = {
	user: { View: 'instanceRoles.option.mandatory' },
	// tag View falls back to instanceRoles.description.tag.view
};

/** Tooltip key for a mandatory option, or undefined when the option is not mandatory. */
export function mandatoryOptionTooltipKey(
	resource: InstanceResource,
	option: InstanceScopeOption,
): BaseTextKey | undefined {
	if (!isOptionMandatory(resource, option)) return undefined;
	return MANDATORY_OPTION_TOOLTIP_KEYS[resource]?.[option.key] ?? option.descriptionKey;
}

export function isOptionMandatory(resource: InstanceResource, option: InstanceScopeOption) {
	return isMandatoryInstanceOption(resource, option.key);
}

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
	View: 'Manage',
	'Mcp use': 'Mcp manage',
	'AiAssistant use': 'AiAssistant manage',
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

function isStrictSubset(subset: readonly string[], superset: readonly string[]): boolean {
	return (
		subset.length > 0 &&
		subset.length < superset.length &&
		subset.every((scope) => superset.includes(scope))
	);
}

/**
 * Options in the same group that `option` covers: the ones SUPERSEDED_BY declares
 * subordinate to it, plus every sibling whose scopes are a strict subset of its
 * own. The latter is the select-all case — "Manage all settings" over the MCP and
 * n8n Assistant options — which stays out of SUPERSEDED_BY on purpose, so those
 * options remain toggleable while the select-all is checked.
 */
export function getCoveredOptions(
	option: InstanceScopeOption,
	groupOptions: InstanceScopeOption[],
): InstanceScopeOption[] {
	return groupOptions.filter(
		(other) =>
			other.key !== option.key &&
			(SUPERSEDED_BY[other.key] === option.key || isStrictSubset(other.scopes, option.scopes)),
	);
}

/**
 * Resolve the state of an option against a saved flat scope list.
 *
 * An implied option (see SUPERSEDED_BY) renders checked even when the role does
 * not list its own scopes: Admin holds role:manage but not role:manageProject,
 * yet "Manage project roles" is granted through "Manage all roles".
 *
 * When option A covers option B and B is fully checked, A appears indeterminate
 * via raw scope arithmetic because B's scopes are already present. That
 * indeterminate is misleading — the user selected B only, not A — so this
 * returns 'unchecked' when every present scope of A belongs to a fully-checked
 * covered option. Genuine partial selections (e.g. API-created roles with an
 * arbitrary subset) still show indeterminate.
 */
export function resolveOptionState(
	option: InstanceScopeOption,
	groupOptions: InstanceScopeOption[],
	roleScopes: readonly string[],
): OptionState {
	if (isOptionImplied(option, groupOptions, roleScopes)) return 'checked';

	const base = getOptionState(roleScopes, option.scopes);
	if (base !== 'indeterminate') return base;

	const coveredCheckedScopes = new Set(
		getCoveredOptions(option, groupOptions)
			.filter((other) => getOptionState(roleScopes, other.scopes) === 'checked')
			.flatMap((other) => other.scopes),
	);
	if (coveredCheckedScopes.size === 0) return base;

	const presentScopes = option.scopes.filter((scope) => roleScopes.includes(scope));
	return presentScopes.every((scope) => coveredCheckedScopes.has(scope)) ? 'unchecked' : base;
}

/**
 * Find the option that `option` supersedes within its group, if any. SUPERSEDED_BY
 * maps a sub-option to its superseding option, so the subordinate of a superseding
 * option is the key that points back to it. Different resources can reuse the same
 * superseding key (e.g. "Manage" backs both role's "Manage project roles" and user's
 * "View"), so the reverse lookup must only consider keys present in this group.
 */
export function findSubordinateOption(
	option: InstanceScopeOption,
	groupOptions: InstanceScopeOption[],
): InstanceScopeOption | undefined {
	const subordinateKey = Object.keys(SUPERSEDED_BY).find(
		(key) => SUPERSEDED_BY[key] === option.key && groupOptions.some((o) => o.key === key),
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

/**
 * Scopes a preset copies from a system role: the full scope set of every option
 * the role grants in full, plus the mandatory scopes. Options the role covers only
 * in part (Member holds four of the five Tags scopes) and scopes the editor does
 * not expose (e.g. chatHub agents) are left out, so a preset never produces a
 * half-checked box the user could not set themselves.
 */
export function getPresetScopes(roleScopes: readonly string[]): string[] {
	const granted = INSTANCE_SCOPE_GROUP_LIST.flatMap((group) =>
		group.options
			.filter((option) => getOptionState(roleScopes, option.scopes) === 'checked')
			.flatMap((option) => option.scopes),
	);
	return withMandatoryInstanceScopes(granted);
}

const userViewScopes: ReadonlySet<Scope> = new Set(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.View);

/**
 * Resource groups whose scopes enable privilege escalation, with the warning to show.
 * Entries are checked in order; the first matching scope's message wins.
 */
export const ESCALATION_WARNING_SCOPES: Partial<
	Record<InstanceResource, Array<{ scopes: Scope[]; messageKey: BaseTextKey }>>
> = {
	user: [
		{
			// Excludes View's `user:read`/`user:list` — looking users up isn't an
			// escalation risk on its own, only Manage's write scopes are.
			scopes: GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.Manage.filter(
				(scope: Scope) => !userViewScopes.has(scope),
			),
			messageKey: 'instanceRoles.warning.manageMembers',
		},
	],
	role: [
		{
			// Full instance-role management: can edit the holder's own instance role.
			scopes: ['role:manage'],
			messageKey: 'instanceRoles.warning.manageRoles',
		},
		{
			// Project-role management alone: can edit the scopes of any custom
			// project role, including one the holder is themselves assigned in a project.
			scopes: ['role:manageProject'],
			messageKey: 'instanceRoles.warning.manageProjectRoles',
		},
	],
};

/** Warning i18n key for a resource group given the current scopes, or undefined. */
export function getEscalationWarningKey(
	resource: InstanceResource,
	scopes: readonly string[],
): BaseTextKey | undefined {
	const cfgs = ESCALATION_WARNING_SCOPES[resource];
	return cfgs?.find((cfg) => cfg.scopes.some((s) => scopes.includes(s)))?.messageKey;
}

/** Total number of permission options shown in the instance role editor. */
export const TOTAL_INSTANCE_PERMISSIONS = INSTANCE_SCOPE_GROUP_LIST.reduce(
	(sum, group) => sum + group.options.length,
	0,
);

/** Count how many permission options a saved flat scope list grants, implied options included. */
export function countGrantedInstancePermissions(scopes: readonly string[]): number {
	let count = 0;
	for (const group of INSTANCE_SCOPE_GROUP_LIST) {
		for (const option of group.options) {
			if (resolveOptionState(option, group.options, scopes) === 'checked') count++;
		}
	}
	return count;
}
