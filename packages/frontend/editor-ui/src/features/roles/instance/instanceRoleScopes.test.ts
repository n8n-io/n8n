import {
	ALL_SCOPES,
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_CHAT_USER_SCOPES,
	GLOBAL_CUSTOM_ROLE_COMPANION_SCOPES,
	GLOBAL_MEMBER_SCOPES,
} from '@n8n/permissions';
import {
	INSTANCE_SCOPE_GROUPS,
	INSTANCE_SCOPE_GROUP_LIST,
	INSTANCE_RESOURCE_ORDER,
	ALL_INSTANCE_SCOPES,
	TOTAL_INSTANCE_PERMISSIONS,
	countGrantedInstancePermissions,
	getCoveredOptions,
	getOptionGrantedScopes,
	getOptionState,
	getEscalationWarningKey,
	getPresetScopes,
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
				for (const scope of getOptionGrantedScopes(option)) {
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

		it('MCP and n8n Assistant "use" options are strict subsets of their "manage" options', () => {
			for (const [use, manage] of [
				['Mcp use', 'Mcp manage'],
				['AiAssistant use', 'AiAssistant manage'],
			] as const) {
				const useScopes: readonly string[] = INSTANCE_SCOPE_GROUPS.settings[use];
				const manageScopes: readonly string[] = INSTANCE_SCOPE_GROUPS.settings[manage];
				expect(useScopes.every((scope) => manageScopes.includes(scope))).toBe(true);
				expect(manageScopes.length).toBeGreaterThan(useScopes.length);
			}
		});

		it('exposes the configured option labels per resource', () => {
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.apiKey)).toEqual(['Manage own', 'Manage all']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.tag)).toEqual(['View', 'Manage']);
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

	it('returns indeterminate for a partial subset (API-created roles)', () => {
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

	it('returns checked for an implied option whose own scopes the role does not list', () => {
		// Admin holds role:manage, not role:manageProject; "Manage project roles" is
		// granted through "Manage all roles" and must not render half-checked.
		const roleGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'role')!;
		const manageProjectRoles = roleGroup.options.find((o) => o.key === 'Manage project roles')!;
		expect(
			resolveOptionState(manageProjectRoles, roleGroup.options, ['role:read', 'role:manage']),
		).toBe('checked');
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

		it('keeps "Mcp manage" and "AiAssistant manage" toggleable while "Manage all settings" is checked (not implied by it)', () => {
			// "Manage all settings" checks them via plain scope-superset arithmetic,
			// not implication, so unchecking either must stay a single, direct click.
			const scopes = toggleOptionInGroup([], manageAllSettings, settingsGroup.options);
			expect(isOptionImplied(mcpManage, settingsGroup.options, scopes)).toBe(false);
			expect(isOptionImplied(aiAssistantManage, settingsGroup.options, scopes)).toBe(false);
		});

		it('implies "Mcp use" and "AiAssistant use" through their manage counterparts while "Manage all settings" is checked', () => {
			const scopes = toggleOptionInGroup([], manageAllSettings, settingsGroup.options);
			expect(isOptionImplied(mcpUse, settingsGroup.options, scopes)).toBe(true);
			expect(isOptionImplied(aiAssistantUse, settingsGroup.options, scopes)).toBe(true);
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

		it('unchecking "AiAssistant manage" while "Manage all settings" is checked drops it out of the checked state and keeps "AiAssistant use"', () => {
			const fullyChecked = toggleOptionInGroup([], manageAllSettings, settingsGroup.options);
			const afterUncheck = toggleOptionInGroup(
				fullyChecked,
				aiAssistantManage,
				settingsGroup.options,
			);
			expect(resolveOptionState(manageAllSettings, settingsGroup.options, afterUncheck)).not.toBe(
				'checked',
			);
			expect(afterUncheck).not.toContain('aiAssistant:manage');
			expect(getOptionState(afterUncheck, aiAssistantUse.scopes)).toBe('checked');
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

describe('MCP and n8n Assistant use/manage tiering', () => {
	const settingsGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'settings')!;
	const manageAllSettings = settingsGroup.options.find((o) => o.key === 'Manage')!;
	const mcpUse = settingsGroup.options.find((o) => o.key === 'Mcp use')!;
	const mcpManage = settingsGroup.options.find((o) => o.key === 'Mcp manage')!;
	const aiAssistantUse = settingsGroup.options.find((o) => o.key === 'AiAssistant use')!;
	const aiAssistantManage = settingsGroup.options.find((o) => o.key === 'AiAssistant manage')!;

	it('resolves "manage" as unchecked (not indeterminate) when only "use" is present', () => {
		// The Member role holds exactly the "use" scopes of both.
		expect(resolveOptionState(mcpManage, settingsGroup.options, mcpUse.scopes)).toBe('unchecked');
		expect(
			resolveOptionState(aiAssistantManage, settingsGroup.options, aiAssistantUse.scopes),
		).toBe('unchecked');
	});

	it('implies "use" while "manage" is fully checked, and not otherwise', () => {
		expect(isOptionImplied(mcpUse, settingsGroup.options, mcpManage.scopes)).toBe(true);
		expect(isOptionImplied(aiAssistantUse, settingsGroup.options, aiAssistantManage.scopes)).toBe(
			true,
		);
		expect(isOptionImplied(mcpUse, settingsGroup.options, mcpUse.scopes)).toBe(false);
	});

	it('downgrades to "use" when unchecking "manage"', () => {
		expect(
			new Set(toggleOptionInGroup(mcpManage.scopes, mcpManage, settingsGroup.options)),
		).toEqual(new Set(mcpUse.scopes));
		expect(
			new Set(
				toggleOptionInGroup(aiAssistantManage.scopes, aiAssistantManage, settingsGroup.options),
			),
		).toEqual(new Set(aiAssistantUse.scopes));
	});

	it('lets "Manage all settings" cover the four MCP/n8n Assistant options without implying them', () => {
		expect(
			getCoveredOptions(manageAllSettings, settingsGroup.options)
				.map((o) => o.key)
				.sort(),
		).toEqual(['AiAssistant manage', 'AiAssistant use', 'Mcp manage', 'Mcp use']);
		expect(isOptionImplied(mcpManage, settingsGroup.options, manageAllSettings.scopes)).toBe(false);
		expect(
			isOptionImplied(aiAssistantManage, settingsGroup.options, manageAllSettings.scopes),
		).toBe(false);
	});
});

describe('companion scopes', () => {
	const settingsGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'settings')!;
	const manageAllSettings = settingsGroup.options.find((o) => o.key === 'Manage')!;

	it('splits the settings "Manage" bundle into counted and companion scopes', () => {
		expect(new Set(manageAllSettings.companionScopes)).toEqual(
			new Set(GLOBAL_CUSTOM_ROLE_COMPANION_SCOPES),
		);
		for (const scope of manageAllSettings.scopes) {
			expect(GLOBAL_CUSTOM_ROLE_COMPANION_SCOPES.has(scope)).toBe(false);
		}
		expect(new Set(getOptionGrantedScopes(manageAllSettings))).toEqual(
			new Set(INSTANCE_SCOPE_GROUPS.settings.Manage),
		);
	});

	it('gives no other option companion scopes', () => {
		for (const group of INSTANCE_SCOPE_GROUP_LIST) {
			for (const option of group.options) {
				if (group.resource === 'settings' && option.key === 'Manage') continue;
				expect(option.companionScopes).toEqual([]);
			}
		}
	});

	it('keeps companion scopes in ALL_INSTANCE_SCOPES, so a stored role does not lose them on save', () => {
		for (const scope of GLOBAL_CUSTOM_ROLE_COMPANION_SCOPES) {
			expect(ALL_INSTANCE_SCOPES).toContain(scope);
		}
	});

	it('does not count companions toward the option state', () => {
		// The Chat role holds chatHub:message and nothing else from the bundle.
		const companionsOnly = [...GLOBAL_CUSTOM_ROLE_COMPANION_SCOPES];
		expect(resolveOptionState(manageAllSettings, settingsGroup.options, companionsOnly)).toBe(
			'unchecked',
		);
		expect(countGrantedInstancePermissions(companionsOnly)).toBe(0);
	});

	it('adds companions when checking and removes them when unchecking "Manage all settings"', () => {
		const checked = toggleOptionInGroup([], manageAllSettings, settingsGroup.options);
		const unchecked = toggleOptionInGroup(checked, manageAllSettings, settingsGroup.options);
		for (const scope of GLOBAL_CUSTOM_ROLE_COMPANION_SCOPES) {
			expect(checked).toContain(scope);
			expect(unchecked).not.toContain(scope);
		}
	});
});

describe('system roles', () => {
	const optionsInState = (roleScopes: readonly string[], state: string) =>
		INSTANCE_SCOPE_GROUP_LIST.flatMap((group) =>
			group.options
				.filter((option) => resolveOptionState(option, group.options, roleScopes) === state)
				.map((option) => `${group.resource}: ${option.key}`),
		);

	it('Admin resolves every option as checked, "Manage project roles" through "Manage all roles"', () => {
		// Admin holds role:manage but not role:manageProject.
		expect(GLOBAL_ADMIN_SCOPES).not.toContain('role:manageProject');
		expect(optionsInState(GLOBAL_ADMIN_SCOPES, 'checked')).toHaveLength(TOTAL_INSTANCE_PERMISSIONS);
		expect(countGrantedInstancePermissions(GLOBAL_ADMIN_SCOPES)).toBe(TOTAL_INSTANCE_PERMISSIONS);
	});

	it('Chat resolves no option as indeterminate', () => {
		expect(optionsInState(GLOBAL_CHAT_USER_SCOPES, 'indeterminate')).toEqual([]);
	});

	it('Member resolves no option as indeterminate, except Tags "Manage"', () => {
		// Member holds every Tags scope but tag:delete. The Tags row is redefined
		// separately (IAM-967); drop this exception once Member covers it in full.
		expect(optionsInState(GLOBAL_MEMBER_SCOPES, 'indeterminate')).toEqual(['tag: Manage']);
	});

	it('Member fully grants MCP use, n8n Assistant use, Users View, Tags View and API keys Manage own, and nothing else', () => {
		expect(optionsInState(GLOBAL_MEMBER_SCOPES, 'checked').sort()).toEqual([
			'apiKey: Manage own',
			'settings: AiAssistant use',
			'settings: Mcp use',
			'tag: View',
			'user: View',
		]);
	});
});

describe('getPresetScopes', () => {
	it('copies every option Admin grants in full; the implied "Manage project roles" is left to "Manage all roles"', () => {
		// Admin holds role:manage but not role:manageProject, and the preset copies
		// what the role holds, not what the editor implies from it.
		expect(new Set(getPresetScopes(GLOBAL_ADMIN_SCOPES))).toEqual(
			new Set(ALL_INSTANCE_SCOPES.filter((scope) => scope !== 'role:manageProject')),
		);
	});

	it('copies only the options Member grants in full and drops scopes the editor does not expose', () => {
		const settingsGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'settings')!;
		const apiKeyGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'apiKey')!;
		const mcpUse = settingsGroup.options.find((o) => o.key === 'Mcp use')!;
		const aiAssistantUse = settingsGroup.options.find((o) => o.key === 'AiAssistant use')!;
		const manageOwn = apiKeyGroup.options.find((o) => o.key === 'Manage own')!;

		const preset = getPresetScopes(GLOBAL_MEMBER_SCOPES);

		// user:list and tag:read/tag:list are the mandatory Users View and Tags View.
		expect(new Set(preset)).toEqual(
			new Set([
				...mcpUse.scopes,
				...aiAssistantUse.scopes,
				...manageOwn.scopes,
				'user:list',
				'tag:read',
				'tag:list',
			]),
		);
		// Member's partial Tags "Manage" subset and its chatHub:* / annotationTag:* scopes are left out.
		expect(preset).not.toContain('tag:create');
		expect(preset).not.toContain('chatHub:message');
	});

	it('always includes the mandatory scopes, even for a role that grants no option', () => {
		expect(getPresetScopes(GLOBAL_CHAT_USER_SCOPES)).toEqual(withMandatoryInstanceScopes([]));
	});

	it('never yields a half-checked option', () => {
		for (const roleScopes of [GLOBAL_ADMIN_SCOPES, GLOBAL_MEMBER_SCOPES, GLOBAL_CHAT_USER_SCOPES]) {
			const preset = getPresetScopes(roleScopes);
			for (const group of INSTANCE_SCOPE_GROUP_LIST) {
				for (const option of group.options) {
					expect(resolveOptionState(option, group.options, preset)).not.toBe('indeterminate');
				}
			}
		}
	});
});
