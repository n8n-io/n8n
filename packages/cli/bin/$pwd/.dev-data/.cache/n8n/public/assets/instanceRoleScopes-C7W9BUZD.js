import { cD as isMandatoryInstanceOption, lD as withMandatoryInstanceScopes, oD as GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS, rD as BASELINE_INSTANCE_SCOPES } from "./app-D5flEmb-.js";
//#region src/features/roles/instance/instanceRoleScopes.ts
/** Display order of the resource groups in the editor. */
var INSTANCE_RESOURCE_ORDER = [
	"settings",
	"user",
	"role",
	"apiKey",
	"tag",
	"variable",
	"credential",
	"project",
	"app",
	"insights"
];
/** i18n label key per resource group. */
var INSTANCE_RESOURCE_LABEL_KEYS = {
	settings: "instanceRoles.resource.settings",
	user: "instanceRoles.resource.user",
	role: "instanceRoles.resource.role",
	apiKey: "instanceRoles.resource.apiKey",
	tag: "instanceRoles.resource.tag",
	variable: "instanceRoles.resource.variable",
	credential: "instanceRoles.resource.credential",
	project: "instanceRoles.resource.project",
	app: "instanceRoles.resource.app",
	insights: "instanceRoles.resource.insights"
};
/**
* i18n label key per option label. Option labels are shared across resources, so
* "View"/"Manage" reuse one key while api keys get their own "Manage own"/"Manage all".
*/
var INSTANCE_OPTION_LABEL_KEYS = {
	View: "instanceRoles.option.view",
	Use: "instanceRoles.option.use",
	Create: "instanceRoles.option.create",
	Manage: "instanceRoles.option.manage",
	"Manage own": "instanceRoles.option.manageOwn",
	"Manage all": "instanceRoles.option.manageAll",
	"Manage project roles": "instanceRoles.option.manageProjectRoles",
	"Mcp use": "instanceRoles.option.mcpUse",
	"Mcp manage": "instanceRoles.option.mcpManage",
	"AiAssistant use": "instanceRoles.option.aiAssistantUse",
	"AiAssistant manage": "instanceRoles.option.aiAssistantManage"
};
/**
* Per-resource label overrides. "Manage" is shared across resources, but under
* Roles it must read "Manage all roles (instance and project)" to distinguish it
* from "Manage project roles".
*/
var INSTANCE_OPTION_LABEL_OVERRIDES = {
	role: { Manage: "instanceRoles.option.manageAllRoles" },
	settings: { Manage: "instanceRoles.option.manageAllSettings" }
};
/**
* i18n key for the tooltip that explains what each permission option grants.
* Option meaning differs per resource (a "Manage" toggle grants different things
* under Members vs Tags), so descriptions are keyed by resource *and* option.
*/
var INSTANCE_OPTION_DESCRIPTION_KEYS = {
	settings: {
		Manage: "instanceRoles.description.settings.manage",
		"Mcp use": "instanceRoles.description.settings.mcpUse",
		"Mcp manage": "instanceRoles.description.settings.mcpManage",
		"AiAssistant use": "instanceRoles.description.settings.aiAssistantUse",
		"AiAssistant manage": "instanceRoles.description.settings.aiAssistantManage"
	},
	user: {
		View: "instanceRoles.description.user.view",
		Manage: "instanceRoles.description.user.manage"
	},
	role: {
		"Manage project roles": "instanceRoles.description.role.manageProjectRoles",
		Manage: "instanceRoles.description.role.manage"
	},
	apiKey: {
		"Manage own": "instanceRoles.description.apiKey.manageOwn",
		"Manage all": "instanceRoles.description.apiKey.manageAll"
	},
	tag: {
		View: "instanceRoles.description.tag.view",
		Manage: "instanceRoles.description.tag.manage"
	},
	variable: {
		View: "instanceRoles.description.variable.view",
		Manage: "instanceRoles.description.variable.manage"
	},
	credential: {
		View: "instanceRoles.description.credential.view",
		Use: "instanceRoles.description.credential.use",
		Manage: "instanceRoles.description.credential.manage"
	},
	project: { Create: "instanceRoles.description.project.create" },
	app: {
		View: "instanceRoles.description.app.view",
		Manage: "instanceRoles.description.app.manage"
	},
	insights: { View: "instanceRoles.description.insights.view" }
};
/** Display order of options within a resource group. */
var INSTANCE_OPTION_ORDER = [
	"View",
	"Use",
	"Create",
	"Manage project roles",
	"Mcp use",
	"Mcp manage",
	"AiAssistant use",
	"AiAssistant manage",
	"Manage",
	"Manage own",
	"Manage all"
];
var sortByOrder = (order) => (a, b) => {
	const ia = order.indexOf(a);
	const ib = order.indexOf(b);
	return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
};
/**
* Flattened, ordered structure the selector renders from: resource groups in
* display order, each with its options in display order.
*/
var INSTANCE_SCOPE_GROUP_LIST = INSTANCE_RESOURCE_ORDER.map((resource) => {
	const optionMap = GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS[resource];
	const options = Object.keys(optionMap).sort(sortByOrder(INSTANCE_OPTION_ORDER)).map((key) => ({
		key,
		labelKey: INSTANCE_OPTION_LABEL_OVERRIDES[resource]?.[key] ?? INSTANCE_OPTION_LABEL_KEYS[key],
		descriptionKey: INSTANCE_OPTION_DESCRIPTION_KEYS[resource]?.[key],
		scopes: [...optionMap[key]]
	}));
	return {
		resource,
		labelKey: INSTANCE_RESOURCE_LABEL_KEYS[resource],
		options
	};
});
/**
* Every scope the editor may save: the option scopes plus the baseline scopes
* every instance role carries without a checkbox. The form filters stored roles
* through this list, so the baseline survives a save untouched.
*/
var ALL_INSTANCE_SCOPES = [.../* @__PURE__ */ new Set([...INSTANCE_SCOPE_GROUP_LIST.flatMap((g) => g.options.flatMap((o) => o.scopes)), ...BASELINE_INSTANCE_SCOPES])];
/**
* Tooltip overrides for the mandatory options declared in `@n8n/permissions`.
* The wording that explains *why* an option is locked lives here because
* `@n8n/permissions` must stay free of i18n types.
*/
var MANDATORY_OPTION_TOOLTIP_KEYS = { user: { View: "instanceRoles.option.mandatory" } };
/** Tooltip key for a mandatory option, or undefined when the option is not mandatory. */
function mandatoryOptionTooltipKey(resource, option) {
	if (!isOptionMandatory(resource, option)) return void 0;
	return MANDATORY_OPTION_TOOLTIP_KEYS[resource]?.[option.key] ?? option.descriptionKey;
}
function isOptionMandatory(resource, option) {
	return isMandatoryInstanceOption(resource, option.key);
}
/**
* Declares when one option is visually superseded by another within the same
* resource group. If the superseding option is fully checked, the superseded
* option is implied — it should render as disabled ✔︎ with an explanatory
* tooltip rather than as an independently active selection.
*
* Option labels are shared across resources, so the map is keyed by option label
* alone. Groups sit at different heights on the same ladder — `credential` has
* View, Use and Manage while `tag` has only View and Manage — which the
* transitive walk below handles: it steps over the rungs a group does not
* declare, so tag's View still resolves to its Manage.
*/
var SUPERSEDED_BY = {
	"Manage own": "Manage all",
	"Manage project roles": "Manage",
	View: "Use",
	Use: "Manage",
	"Mcp use": "Mcp manage",
	"AiAssistant use": "AiAssistant manage"
};
/** The option one rung above `optionKey` on the ladder, if any. */
function supersedingKey(optionKey) {
	return SUPERSEDED_BY[optionKey];
}
/**
* The chain of options that supersede `optionKey`, nearest first. Walking the
* whole chain is what lets one flat map serve groups of different heights, and
* `chain.includes` guards against a mis-declared cycle.
*/
function supersedingChain(optionKey) {
	const chain = [];
	let current = supersedingKey(optionKey);
	while (current && !chain.includes(current)) {
		chain.push(current);
		current = supersedingKey(current);
	}
	return chain;
}
/**
* The option that implies `option` — the nearest one up the ladder that this group
* actually declares and that is fully checked. The caller should render an implied
* option as disabled with a tooltip naming this one.
*/
function impliedByOption(option, groupOptions, roleScopes) {
	for (const key of supersedingChain(option.key)) {
		const superseding = groupOptions.find((o) => o.key === key);
		if (superseding && getOptionState(roleScopes, superseding.scopes) === "checked") return superseding;
	}
}
/**
* Returns true when another option in the same group is fully checked and
* supersedes this option, directly or transitively.
*/
function isOptionImplied(option, groupOptions, roleScopes) {
	return !!impliedByOption(option, groupOptions, roleScopes);
}
/**
* Resolve how an option should render against a saved flat scope list.
* - all of the option's scopes present -> checked
* - some but not all present          -> indeterminate (e.g. system-role presets
*                                         or API-created roles that carry a partial subset)
* - none present                      -> unchecked
*/
function getOptionState(scopes, optionScopes) {
	const present = optionScopes.filter((scope) => scopes.includes(scope)).length;
	if (present === 0) return "unchecked";
	if (present === optionScopes.length) return "checked";
	return "indeterminate";
}
function isStrictSubset(subset, superset) {
	return subset.length > 0 && subset.length < superset.length && subset.every((scope) => superset.includes(scope));
}
/**
* Options in the same group that `option` covers: the ones SUPERSEDED_BY declares
* subordinate to it, plus every sibling whose scopes are a strict subset of its
* own. The latter is the select-all case — "Manage all settings" over the MCP and
* n8n Assistant options — which stays out of SUPERSEDED_BY on purpose, so those
* options remain toggleable while the select-all is checked.
*/
function getCoveredOptions(option, groupOptions) {
	return groupOptions.filter((other) => other.key !== option.key && (SUPERSEDED_BY[other.key] === option.key || isStrictSubset(other.scopes, option.scopes)));
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
function resolveOptionState(option, groupOptions, roleScopes) {
	if (isOptionImplied(option, groupOptions, roleScopes)) return "checked";
	const base = getOptionState(roleScopes, option.scopes);
	if (base !== "indeterminate") return base;
	const coveredCheckedScopes = new Set(getCoveredOptions(option, groupOptions).filter((other) => getOptionState(roleScopes, other.scopes) === "checked").flatMap((other) => other.scopes));
	if (coveredCheckedScopes.size === 0) return base;
	return option.scopes.filter((scope) => roleScopes.includes(scope)).every((scope) => coveredCheckedScopes.has(scope)) ? "unchecked" : base;
}
/**
* Find the option `option` supersedes most closely within its group — the one
* whose superseding chain reaches `option` in the fewest steps. Distance decides
* it because a group can hold several rungs below one option: credential Manage
* supersedes Use and View both, and unchecking it must fall back to Use rather
* than skip a rung down to View.
*/
function findSubordinateOption(option, groupOptions) {
	let nearest;
	for (const candidate of groupOptions) {
		const distance = supersedingChain(candidate.key).indexOf(option.key);
		if (distance === -1) continue;
		if (!nearest || distance < nearest.distance) nearest = {
			option: candidate,
			distance
		};
	}
	return nearest?.option;
}
/**
* Toggle an option within its resource group. Checking adds the option's full
* scope set. Unchecking an option which supersedes another (e.g. "Manage all"
* over "Manage own", or "Manage all roles" over "Manage project roles") downgrades
* to the subordinate option instead of clearing it too: the option's own scopes are
* removed, then the subordinate's scopes are (re)added so the lesser permission
* stays selected. Returns a new array; input is not mutated.
*/
function toggleOptionInGroup(scopes, option, groupOptions) {
	if (!option.scopes.every((scope) => scopes.includes(scope))) return [.../* @__PURE__ */ new Set([...scopes, ...option.scopes])];
	const next = new Set(scopes);
	for (const scope of option.scopes) next.delete(scope);
	const subordinate = findSubordinateOption(option, groupOptions);
	if (subordinate) for (const scope of subordinate.scopes) next.add(scope);
	return [...next];
}
/**
* Scopes a preset copies from a system role: the full scope set of every option
* the role grants in full, plus the mandatory scopes. Options the role covers only
* in part (Member holds four of the five Tags scopes) and scopes the editor does
* not expose (e.g. chatHub agents) are left out, so a preset never produces a
* half-checked box the user could not set themselves.
*/
function getPresetScopes(roleScopes) {
	const granted = INSTANCE_SCOPE_GROUP_LIST.flatMap((group) => group.options.filter((option) => getOptionState(roleScopes, option.scopes) === "checked").flatMap((option) => option.scopes));
	return withMandatoryInstanceScopes(granted);
}
var userViewScopes = new Set(GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.View);
/**
* Resource groups whose scopes enable privilege escalation, with the warning to show.
* Entries are checked in order; the first matching scope's message wins.
*/
var ESCALATION_WARNING_SCOPES = {
	user: [{
		scopes: GLOBAL_CUSTOM_ROLE_SCOPE_GROUPS.user.Manage.filter((scope) => !userViewScopes.has(scope)),
		messageKey: "instanceRoles.warning.manageMembers"
	}],
	credential: [{
		scopes: ["credential:update"],
		messageKey: "instanceRoles.warning.manageCredentials"
	}],
	role: [{
		scopes: ["role:manage"],
		messageKey: "instanceRoles.warning.manageRoles"
	}, {
		scopes: ["role:manageProject"],
		messageKey: "instanceRoles.warning.manageProjectRoles"
	}]
};
/** Warning i18n key for a resource group given the current scopes, or undefined. */
function getEscalationWarningKey(resource, scopes) {
	return ESCALATION_WARNING_SCOPES[resource]?.find((cfg) => cfg.scopes.some((s) => scopes.includes(s)))?.messageKey;
}
/** Total number of permission options shown in the instance role editor. */
var TOTAL_INSTANCE_PERMISSIONS = INSTANCE_SCOPE_GROUP_LIST.reduce((sum, group) => sum + group.options.length, 0);
/** Count how many permission options a saved flat scope list grants, implied options included. */
function countGrantedInstancePermissions(scopes) {
	let count = 0;
	for (const group of INSTANCE_SCOPE_GROUP_LIST) for (const option of group.options) if (resolveOptionState(option, group.options, scopes) === "checked") count++;
	return count;
}
//#endregion
export { getEscalationWarningKey as a, isOptionImplied as c, resolveOptionState as d, toggleOptionInGroup as f, countGrantedInstancePermissions as i, isOptionMandatory as l, INSTANCE_SCOPE_GROUP_LIST as n, getPresetScopes as o, TOTAL_INSTANCE_PERMISSIONS as r, impliedByOption as s, ALL_INSTANCE_SCOPES as t, mandatoryOptionTooltipKey as u };
