import { ALL_SCOPES } from '@n8n/permissions';
import {
	INSTANCE_SCOPE_GROUPS,
	INSTANCE_SCOPE_GROUP_LIST,
	INSTANCE_RESOURCE_ORDER,
	ALL_INSTANCE_SCOPES,
	getOptionState,
	getEscalationWarningKey,
	isOptionImplied,
	isOptionMandatory,
	mandatoryOptionTooltipKey,
	resolveOptionState,
	toggleOptionInGroup,
	withMandatoryInstanceScopes,
} from './instanceRoleScopes';

const ALL_SCOPES_SET = new Set<string>(ALL_SCOPES as string[]);

describe('instanceRoleScopes config', () => {
	it('references only scopes that exist in ALL_SCOPES', () => {
		for (const scope of ALL_INSTANCE_SCOPES) {
			expect(ALL_SCOPES_SET.has(scope)).toBe(true);
		}
	});

	it('places every scope under exactly one group', () => {
		const scopeToGroups = new Map<string, Set<string>>();
		for (const group of INSTANCE_SCOPE_GROUP_LIST) {
			for (const option of group.options) {
				for (const scope of option.scopes) {
					if (!scopeToGroups.has(scope)) scopeToGroups.set(scope, new Set());
					scopeToGroups.get(scope)!.add(group.resource);
				}
			}
		}
		for (const [, groups] of scopeToGroups) {
			expect(groups.size).toBe(1);
		}
	});

	it('keeps resource-keyed group scopes matching their resource (the `settings` umbrella is exempt)', () => {
		for (const group of INSTANCE_SCOPE_GROUP_LIST) {
			if (group.resource === 'settings') continue;
			for (const option of group.options) {
				for (const scope of option.scopes) {
					expect(scope.split(':')[0]).toBe(group.resource);
				}
			}
		}
	});

	it('has at least one option per resource and no duplicate scopes within an option', () => {
		for (const group of INSTANCE_SCOPE_GROUP_LIST) {
			expect(group.options.length).toBeGreaterThan(0);
			for (const option of group.options) {
				expect(option.scopes.length).toBeGreaterThan(0);
				expect(new Set(option.scopes).size).toBe(option.scopes.length);
			}
		}
	});

	it('renders resource groups in the configured display order', () => {
		expect(INSTANCE_SCOPE_GROUP_LIST.map((g) => g.resource)).toEqual(INSTANCE_RESOURCE_ORDER);
	});

	it('gives every permission option a tooltip description key', () => {
		for (const group of INSTANCE_SCOPE_GROUP_LIST) {
			for (const option of group.options) {
				expect(option.descriptionKey).toBeTruthy();
			}
		}
	});

	describe('relationship rules', () => {
		it('apiKey "Manage own" is a strict subset of "Manage all"', () => {
			const own = INSTANCE_SCOPE_GROUPS.apiKey['Manage own'];
			const all = INSTANCE_SCOPE_GROUPS.apiKey['Manage all'];
			expect(own.every((scope) => all.includes(scope))).toBe(true);
			expect(all.length).toBeGreaterThan(own.length);
		});

		it('exposes the configured option labels per resource', () => {
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.apiKey)).toEqual(['Manage own', 'Manage all']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.tag)).toEqual(['View', 'Manage']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.variable)).toEqual(['View', 'Manage']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.role)).toEqual(['Manage project roles', 'Manage']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.project)).toEqual(['Create']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.settings)).toEqual([
				'Manage',
				'Mcp use',
				'Mcp manage',
				'AiAssistant use',
				'AiAssistant manage',
			]);
		});
	});
});

describe('getOptionState', () => {
	const option = ['tag:read', 'tag:list'];

	it('returns unchecked when none of the option scopes are present', () => {
		expect(getOptionState([], option)).toBe('unchecked');
		expect(getOptionState(['user:read'], option)).toBe('unchecked');
	});

	it('returns checked when all option scopes are present', () => {
		expect(getOptionState(['tag:read', 'tag:list', 'user:read'], option)).toBe('checked');
	});

	it('returns indeterminate for a partial subset (round-trip of presets / API roles)', () => {
		expect(getOptionState(['tag:read'], option)).toBe('indeterminate');
		expect(getOptionState(['tag:list', 'user:read'], option)).toBe('indeterminate');
	});
});

describe('isOptionImplied', () => {
	const apiKeyGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'apiKey')!;
	const manageOwn = apiKeyGroup.options.find((o) => o.key === 'Manage own')!;
	const manageAll = apiKeyGroup.options.find((o) => o.key === 'Manage all')!;
	const allScopes = [...INSTANCE_SCOPE_GROUPS.apiKey['Manage all']];
	const ownScopes = [...INSTANCE_SCOPE_GROUPS.apiKey['Manage own']];

	it('returns false for an option that has no SUPERSEDED_BY entry', () => {
		expect(isOptionImplied(manageAll, apiKeyGroup.options, allScopes)).toBe(false);
	});

	it('returns false when the superseding option is unchecked', () => {
		expect(isOptionImplied(manageOwn, apiKeyGroup.options, [])).toBe(false);
	});

	it('returns false when the superseding option is only indeterminate', () => {
		// only apiKey:manage present — "Manage all" is indeterminate (1/5)
		expect(isOptionImplied(manageOwn, apiKeyGroup.options, ['apiKey:manage'])).toBe(false);
	});

	it('returns true when the superseding option is fully checked', () => {
		expect(isOptionImplied(manageOwn, apiKeyGroup.options, allScopes)).toBe(true);
	});

	it('returns false for a superseding option, even with its own scopes fully present', () => {
		const tagGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'tag')!;
		const tagManage = tagGroup.options.find((o) => o.key === 'Manage')!;
		expect(
			isOptionImplied(tagManage, tagGroup.options, [
				'tag:read',
				'tag:list',
				'tag:create',
				'tag:update',
				'tag:delete',
			]),
		).toBe(false);
	});

	it('returns false when the superseding option is present but "Manage own" is checked via own scopes only', () => {
		expect(isOptionImplied(manageOwn, apiKeyGroup.options, ownScopes)).toBe(false);
	});

	it('renders variable "View" as implied under a fully-checked variable "Manage"', () => {
		const variableGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'variable')!;
		const view = variableGroup.options.find((o) => o.key === 'View')!;
		const manage = variableGroup.options.find((o) => o.key === 'Manage')!;
		expect(isOptionImplied(view, variableGroup.options, [...manage.scopes])).toBe(true);
		expect(isOptionImplied(view, variableGroup.options, [...view.scopes])).toBe(false);
	});
});

describe('resolveOptionState', () => {
	const apiKeyGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'apiKey')!;
	const manageOwn = apiKeyGroup.options.find((o) => o.key === 'Manage own')!;
	const manageAll = apiKeyGroup.options.find((o) => o.key === 'Manage all')!;
	const allScopes = [...INSTANCE_SCOPE_GROUPS.apiKey['Manage all']];
	const ownScopes = [...INSTANCE_SCOPE_GROUPS.apiKey['Manage own']];

	it('returns checked when all scopes are present (passthrough)', () => {
		expect(resolveOptionState(manageAll, apiKeyGroup.options, allScopes)).toBe('checked');
		expect(resolveOptionState(manageOwn, apiKeyGroup.options, ownScopes)).toBe('checked');
	});

	it('returns unchecked when no scopes are present (passthrough)', () => {
		expect(resolveOptionState(manageAll, apiKeyGroup.options, [])).toBe('unchecked');
		expect(resolveOptionState(manageOwn, apiKeyGroup.options, [])).toBe('unchecked');
	});

	it('returns indeterminate for a genuine partial subset with no fully-checked sub-option', () => {
		// Only 1 of 2 "Manage own" scopes present — "Manage own" sub-option is not fully checked
		expect(resolveOptionState(manageAll, apiKeyGroup.options, ['apiKey:create'])).toBe(
			'indeterminate',
		);
	});

	it('suppresses false indeterminate on "Manage all" when "Manage own" is fully checked', () => {
		// "Manage own" (2 scopes) fully checked → "Manage all" would be 2/3 (indeterminate)
		// but both matching scopes come from the fully-checked sub-option → unchecked
		expect(resolveOptionState(manageAll, apiKeyGroup.options, ownScopes)).toBe('unchecked');
	});

	it('keeps indeterminate on "Manage all" when the sub-option is only partially checked', () => {
		// 1 of 2 "Manage own" scopes present — "Manage own" is indeterminate, not fully checked
		const partialOwn = ownScopes.slice(0, 1);
		expect(resolveOptionState(manageAll, apiKeyGroup.options, partialOwn)).toBe('indeterminate');
	});

	it('applies the same View/Manage arithmetic to tags', () => {
		const tagGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'tag')!;
		const tagManage = tagGroup.options.find((o) => o.key === 'Manage')!;
		// 1 of View's 2 scopes — View isn't fully checked, so this stays a genuine partial.
		expect(resolveOptionState(tagManage, tagGroup.options, ['tag:read'])).toBe('indeterminate');
		// View fully checked: "Manage" would read 2/5, but both scopes are View's.
		expect(resolveOptionState(tagManage, tagGroup.options, ['tag:read', 'tag:list'])).toBe(
			'unchecked',
		);
		expect(
			resolveOptionState(tagManage, tagGroup.options, [
				'tag:read',
				'tag:list',
				'tag:create',
				'tag:update',
				'tag:delete',
			]),
		).toBe('checked');
	});
});

describe('getEscalationWarningKey', () => {
	it('returns the members warning when a user Manage scope is present', () => {
		expect(getEscalationWarningKey('user', ['user:changeRole'])).toBe(
			'instanceRoles.warning.manageMembers',
		);
	});

	it('returns the roles warning when role:manage is present', () => {
		expect(getEscalationWarningKey('role', ['role:read', 'role:manage'])).toBe(
			'instanceRoles.warning.manageRoles',
		);
	});

	it('returns the project-roles warning for "Manage project roles" alone (role:manageProject without role:manage)', () => {
		expect(getEscalationWarningKey('role', ['role:read', 'role:manageProject'])).toBe(
			'instanceRoles.warning.manageProjectRoles',
		);
	});

	it('prefers the roles warning over the project-roles warning when both scopes are present', () => {
		expect(
			getEscalationWarningKey('role', ['role:read', 'role:manage', 'role:manageProject']),
		).toBe('instanceRoles.warning.manageRoles');
	});

	it('returns undefined for a non-escalating resource', () => {
		expect(getEscalationWarningKey('tag', ['tag:read', 'tag:list'])).toBeUndefined();
	});

	it('returns undefined for an empty scope list', () => {
		expect(getEscalationWarningKey('user', [])).toBeUndefined();
		expect(getEscalationWarningKey('role', [])).toBeUndefined();
	});

	it('returns undefined for role when only the non-escalating role:read scope is present', () => {
		expect(getEscalationWarningKey('role', ['role:read'])).toBeUndefined();
	});

	it('returns undefined for user when only the non-escalating View scope (user:list) is present', () => {
		expect(getEscalationWarningKey('user', ['user:list'])).toBeUndefined();
	});
});

describe('toggleOptionInGroup', () => {
	const apiKeyGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'apiKey')!;
	const manageOwn = apiKeyGroup.options.find((o) => o.key === 'Manage own')!;
	const manageAll = apiKeyGroup.options.find((o) => o.key === 'Manage all')!;

	const roleGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'role')!;
	const manageProjectRoles = roleGroup.options.find((o) => o.key === 'Manage project roles')!;
	const manageAllRoles = roleGroup.options.find((o) => o.key === 'Manage')!;

	it('adds the full scope set when checking an unchecked option', () => {
		const result = toggleOptionInGroup([], manageAll, apiKeyGroup.options);
		expect(result).toEqual(expect.arrayContaining([...manageAll.scopes]));
		expect(result).toHaveLength(manageAll.scopes.length);
	});

	it('downgrades to "Manage own" when unchecking "Manage all" (keeps own selected)', () => {
		const result = toggleOptionInGroup([...manageAll.scopes], manageAll, apiKeyGroup.options);
		expect(new Set(result)).toEqual(new Set(manageOwn.scopes));
		// The exclusive "manage" scope is gone, but every "Manage own" scope survives.
		expect(result).not.toContain('apiKey:manage');
		for (const scope of manageOwn.scopes) expect(result).toContain(scope);
	});

	it('downgrades to "Manage project roles" when unchecking "Manage all roles"', () => {
		const result = toggleOptionInGroup(
			[...manageAllRoles.scopes],
			manageAllRoles,
			roleGroup.options,
		);
		expect(new Set(result)).toEqual(new Set(manageProjectRoles.scopes));
		expect(result).not.toContain('role:manage');
		for (const scope of manageProjectRoles.scopes) expect(result).toContain(scope);
	});

	it('fully clears a subordinate option when it is unchecked directly', () => {
		const result = toggleOptionInGroup([...manageOwn.scopes], manageOwn, apiKeyGroup.options);
		expect(result).toEqual([]);
	});

	it('removes the whole scope set when the option has no subordinate', () => {
		const insightsGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'insights')!;
		const insightsView = insightsGroup.options.find((o) => o.key === 'View')!;
		const result = toggleOptionInGroup(
			['user:read', ...insightsView.scopes],
			insightsView,
			insightsGroup.options,
		);
		expect(result).toEqual(['user:read']);
	});

	it('downgrades to "View" when unchecking variable "Manage"', () => {
		const variableGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'variable')!;
		const manageVariables = variableGroup.options.find((o) => o.key === 'Manage')!;
		const result = toggleOptionInGroup(
			['user:list', ...manageVariables.scopes],
			manageVariables,
			variableGroup.options,
		);
		expect(result).toEqual(['user:list', 'variable:list', 'variable:read']);
	});

	it('downgrades to "View" when unchecking tag "Manage", keeping the mandatory scopes', () => {
		const tagGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'tag')!;
		const manageTags = tagGroup.options.find((o) => o.key === 'Manage')!;
		const result = toggleOptionInGroup(
			['user:read', ...manageTags.scopes],
			manageTags,
			tagGroup.options,
		);
		expect(result).toEqual(['user:read', 'tag:read', 'tag:list']);
	});

	it('does not mutate the input array', () => {
		const input = [...manageAll.scopes];
		toggleOptionInGroup(input, manageAll, apiKeyGroup.options);
		expect(input).toEqual([...manageAll.scopes]);
	});

	describe('settings "Manage all settings" acts as a select-all over MCP/n8n Assistant', () => {
		const settingsGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'settings')!;
		const manageAllSettings = settingsGroup.options.find((o) => o.key === 'Manage')!;
		const mcpUse = settingsGroup.options.find((o) => o.key === 'Mcp use')!;
		const mcpManage = settingsGroup.options.find((o) => o.key === 'Mcp manage')!;
		const aiAssistantUse = settingsGroup.options.find((o) => o.key === 'AiAssistant use')!;
		const aiAssistantManage = settingsGroup.options.find((o) => o.key === 'AiAssistant manage')!;

		it('checking "Manage all settings" checks MCP and n8n Assistant use/manage too', () => {
			const scopes = toggleOptionInGroup([], manageAllSettings, settingsGroup.options);
			expect(getOptionState(scopes, mcpUse.scopes)).toBe('checked');
			expect(getOptionState(scopes, mcpManage.scopes)).toBe('checked');
			expect(getOptionState(scopes, aiAssistantUse.scopes)).toBe('checked');
			expect(getOptionState(scopes, aiAssistantManage.scopes)).toBe('checked');
		});

		it('all four MCP/n8n Assistant options stay independently toggleable while "Manage all settings" is checked (none implied/disabled by it)', () => {
			// Unlike apiKey's "Manage own"/"Manage all" tiering, none of these four
			// are superseded by another option in this group — "Manage all settings"
			// checks them via plain scope-superset arithmetic, not implication, so
			// unchecking any one of the four must stay a single, direct click.
			const scopes = toggleOptionInGroup([], manageAllSettings, settingsGroup.options);
			expect(isOptionImplied(mcpUse, settingsGroup.options, scopes)).toBe(false);
			expect(isOptionImplied(mcpManage, settingsGroup.options, scopes)).toBe(false);
			expect(isOptionImplied(aiAssistantUse, settingsGroup.options, scopes)).toBe(false);
			expect(isOptionImplied(aiAssistantManage, settingsGroup.options, scopes)).toBe(false);
		});

		it('unchecking "Mcp manage" while "Manage all settings" is checked drops it out of the checked state', () => {
			const fullyChecked = toggleOptionInGroup([], manageAllSettings, settingsGroup.options);
			const afterUncheck = toggleOptionInGroup(fullyChecked, mcpManage, settingsGroup.options);
			expect(resolveOptionState(manageAllSettings, settingsGroup.options, afterUncheck)).not.toBe(
				'checked',
			);
			// The rest of the "Manage all settings" bundle survives the uncheck.
			expect(afterUncheck).toContain('securitySettings:manage');
		});

		it('unchecking "AiAssistant use" while "Manage all settings" is checked drops it out of the checked state', () => {
			const fullyChecked = toggleOptionInGroup([], manageAllSettings, settingsGroup.options);
			const afterUncheck = toggleOptionInGroup(fullyChecked, aiAssistantUse, settingsGroup.options);
			expect(resolveOptionState(manageAllSettings, settingsGroup.options, afterUncheck)).not.toBe(
				'checked',
			);
		});
	});
});

describe('mandatory instance options', () => {
	const userGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'user')!;
	const userView = userGroup.options.find((o) => o.key === 'View')!;
	const userManage = userGroup.options.find((o) => o.key === 'Manage')!;

	const tagGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'tag')!;
	const tagView = tagGroup.options.find((o) => o.key === 'View')!;
	const tagManage = tagGroup.options.find((o) => o.key === 'Manage')!;

	const MANDATORY = [
		['user', 'View'],
		['tag', 'View'],
	] as const;

	it('flags "Users: View" and "Tags: View" as mandatory and every other option as not', () => {
		expect(isOptionMandatory('user', userView)).toBe(true);
		expect(isOptionMandatory('tag', tagView)).toBe(true);
		expect(isOptionMandatory('user', userManage)).toBe(false);
		expect(isOptionMandatory('tag', tagManage)).toBe(false);

		for (const group of INSTANCE_SCOPE_GROUP_LIST) {
			for (const option of group.options) {
				if (MANDATORY.some(([r, k]) => r === group.resource && k === option.key)) continue;
				expect(isOptionMandatory(group.resource, option)).toBe(false);
			}
		}
	});

	it('resolves every mandatory entry to a real option in its group (typo guard)', () => {
		for (const [resource, key] of MANDATORY) {
			const group = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === resource);
			expect(group?.options.some((o) => o.key === key)).toBe(true);
		}
	});

	it('gives a mandatory option its override tooltip, or its own description as fallback', () => {
		expect(mandatoryOptionTooltipKey('user', userView)).toBe('instanceRoles.option.mandatory');
		expect(mandatoryOptionTooltipKey('tag', tagView)).toBe('instanceRoles.description.tag.view');
	});

	it('returns no mandatory tooltip key for an optional option', () => {
		expect(mandatoryOptionTooltipKey('user', userManage)).toBeUndefined();
		expect(mandatoryOptionTooltipKey('tag', tagManage)).toBeUndefined();
	});

	it("withMandatoryInstanceScopes adds every mandatory option's scopes to an empty list", () => {
		expect(withMandatoryInstanceScopes([])).toEqual(['user:list', 'tag:read', 'tag:list']);
	});

	it('withMandatoryInstanceScopes does not duplicate scopes already present', () => {
		const withDuplicate = withMandatoryInstanceScopes(['user:list', 'tag:read']);
		expect(withDuplicate.filter((s) => s === 'user:list')).toHaveLength(1);
		expect(withDuplicate.filter((s) => s === 'tag:read')).toHaveLength(1);
		expect(withDuplicate).toEqual(expect.arrayContaining(['user:list', 'tag:read']));
	});

	it('withMandatoryInstanceScopes preserves unrelated scopes untouched', () => {
		const result = withMandatoryInstanceScopes(['insights:read', 'insights:list']);
		expect(result).toEqual(
			expect.arrayContaining([
				'insights:read',
				'insights:list',
				...userView.scopes,
				...tagView.scopes,
			]),
		);
	});
});
