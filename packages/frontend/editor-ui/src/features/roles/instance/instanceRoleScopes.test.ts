import {
	ALL_SCOPES,
	BASELINE_INSTANCE_SCOPES,
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_CHAT_USER_SCOPES,
	GLOBAL_MEMBER_SCOPES,
	MANDATORY_INSTANCE_SCOPES,
} from '@n8n/permissions';
import {
	INSTANCE_SCOPE_GROUPS,
	INSTANCE_SCOPE_GROUP_LIST,
	INSTANCE_RESOURCE_ORDER,
	ALL_INSTANCE_SCOPES,
	TOTAL_INSTANCE_PERMISSIONS,
	countGrantedInstancePermissions,
	getCoveredOptions,
	getOptionState,
	getPresetScopes,
	getEscalationWarningKey,
	findSubordinateOption,
	impliedByOption,
	isOptionImplied,
	isOptionMandatory,
	mandatoryOptionTooltipKey,
	resolveOptionState,
	toggleOptionInGroup,
	supersedingKey,
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

	it('returns false for an option that nothing supersedes', () => {
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

	it("withMandatoryInstanceScopes adds every mandatory option's scopes and the baseline scopes to an empty list", () => {
		expect(withMandatoryInstanceScopes([])).toEqual([
			'user:list',
			'tag:read',
			'tag:list',
			...BASELINE_INSTANCE_SCOPES,
		]);
		expect(withMandatoryInstanceScopes([])).toEqual([...MANDATORY_INSTANCE_SCOPES]);
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

describe('baseline instance scopes in the editor', () => {
	it('keeps them in ALL_INSTANCE_SCOPES so a stored role does not lose them on save', () => {
		for (const scope of BASELINE_INSTANCE_SCOPES) {
			expect(ALL_INSTANCE_SCOPES).toContain(scope);
		}
	});

	it('does not count them toward any option', () => {
		// The Chat role holds chatHub:message and nothing else the editor knows.
		for (const group of INSTANCE_SCOPE_GROUP_LIST) {
			for (const option of group.options) {
				expect(resolveOptionState(option, group.options, [...BASELINE_INSTANCE_SCOPES])).toBe(
					'unchecked',
				);
			}
		}
		expect(countGrantedInstancePermissions([...BASELINE_INSTANCE_SCOPES])).toBe(0);
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

describe('implied options', () => {
	it('returns checked for an implied option whose own scopes the role does not list', () => {
		// Admin holds role:manage, not role:manageProject; "Manage project roles" is
		// granted through "Manage all roles" and must not render half-checked.
		const roleGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'role')!;
		const manageProjectRoles = roleGroup.options.find((o) => o.key === 'Manage project roles')!;
		expect(
			resolveOptionState(manageProjectRoles, roleGroup.options, ['role:read', 'role:manage']),
		).toBe('checked');
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
		// Member holds every Tags scope but tag:delete. Whether Manage stops
		// including delete or Member gains it is a product call; drop this
		// exception once Member covers the option in full.
		expect(optionsInState(GLOBAL_MEMBER_SCOPES, 'indeterminate')).toEqual(['tag: Manage']);
	});

	it('Member fully grants MCP use, n8n Assistant use, Users View, Tags View, Variables View and API keys Manage own, and nothing else', () => {
		expect(optionsInState(GLOBAL_MEMBER_SCOPES, 'checked').sort()).toEqual([
			'apiKey: Manage own',
			'settings: AiAssistant use',
			'settings: Mcp use',
			'tag: View',
			'user: View',
			'variable: View',
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
		const variableGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'variable')!;
		const mcpUse = settingsGroup.options.find((o) => o.key === 'Mcp use')!;
		const aiAssistantUse = settingsGroup.options.find((o) => o.key === 'AiAssistant use')!;
		const manageOwn = apiKeyGroup.options.find((o) => o.key === 'Manage own')!;
		const variableView = variableGroup.options.find((o) => o.key === 'View')!;

		const preset = getPresetScopes(GLOBAL_MEMBER_SCOPES);

		expect(new Set(preset)).toEqual(
			new Set([
				...mcpUse.scopes,
				...aiAssistantUse.scopes,
				...manageOwn.scopes,
				...variableView.scopes,
				...MANDATORY_INSTANCE_SCOPES,
			]),
		);
		// Member's partial Tags "Manage" subset and its chat agent / annotation scopes are left out.
		expect(preset).not.toContain('tag:create');
		expect(preset).not.toContain('chatHubAgent:create');
		expect(preset).not.toContain('annotationTag:read');
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

describe('credential three-rung ladder (View / Use / Manage)', () => {
	const group = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'credential')!;
	const view = group.options.find((o) => o.key === 'View')!;
	const use = group.options.find((o) => o.key === 'Use')!;
	const manage = group.options.find((o) => o.key === 'Manage')!;

	it('renders the three rungs in View, Use, Manage order', () => {
		expect(group.options.map((o) => o.key)).toEqual(['View', 'Use', 'Manage']);
	});

	it('declares the ladder View -> Use -> Manage', () => {
		// One shared map serves every group. Without the Use rung between them,
		// unchecking Manage would skip Use and drop straight to View.
		expect(supersedingKey('View')).toBe('Use');
		expect(supersedingKey('Use')).toBe('Manage');
		expect(supersedingKey('Manage')).toBeUndefined();
	});

	it('implies View under a checked Use', () => {
		expect(isOptionImplied(view, group.options, [...use.scopes])).toBe(true);
	});

	it('implies both View and Use under a checked Manage (transitive walk)', () => {
		// Manage supersedes Use directly and View only through Use. A non-transitive
		// lookup would leave View enabled and clickable under a checked Manage.
		const scopes = [...manage.scopes];
		expect(isOptionImplied(use, group.options, scopes)).toBe(true);
		expect(isOptionImplied(view, group.options, scopes)).toBe(true);
	});

	it('implies nothing when only View is checked', () => {
		const scopes = [...view.scopes];
		expect(isOptionImplied(view, group.options, scopes)).toBe(false);
		expect(isOptionImplied(use, group.options, scopes)).toBe(false);
		expect(isOptionImplied(manage, group.options, scopes)).toBe(false);
	});

	it('resolves each rung as checked from its own scopes alone', () => {
		expect(resolveOptionState(view, group.options, [...view.scopes])).toBe('checked');
		expect(resolveOptionState(use, group.options, [...use.scopes])).toBe('checked');
		expect(resolveOptionState(manage, group.options, [...manage.scopes])).toBe('checked');
	});

	it('suppresses the false indeterminate on both higher rungs when View is checked', () => {
		// View's scopes are a subset of Use's and Manage's, so raw arithmetic reads
		// both as indeterminate. Only the transitive artifact check clears Manage.
		const scopes = [...view.scopes];
		expect(resolveOptionState(use, group.options, scopes)).toBe('unchecked');
		expect(resolveOptionState(manage, group.options, scopes)).toBe('unchecked');
	});

	it('suppresses the false indeterminate on Manage when Use is checked', () => {
		expect(resolveOptionState(manage, group.options, [...use.scopes])).toBe('unchecked');
	});

	it('keeps a genuine partial subset indeterminate', () => {
		// One of View's two scopes: no rung is fully checked, so this is a real
		// partial (an API-created role, or a preset carrying a subset).
		expect(resolveOptionState(manage, group.options, ['credential:read'])).toBe('indeterminate');
	});

	it('downgrades Manage to Use, not to View', () => {
		const result = toggleOptionInGroup(['user:list', ...manage.scopes], manage, group.options);
		expect(new Set(result)).toEqual(new Set(['user:list', ...use.scopes]));
		expect(result).toContain('credential:use');
		expect(result).not.toContain('credential:update');
	});

	it('downgrades Use to View', () => {
		const result = toggleOptionInGroup(['user:list', ...use.scopes], use, group.options);
		expect(new Set(result)).toEqual(new Set(['user:list', ...view.scopes]));
		expect(result).not.toContain('credential:use');
	});

	it('clears View entirely when unchecked directly', () => {
		const result = toggleOptionInGroup(['user:list', ...view.scopes], view, group.options);
		expect(result).toEqual(['user:list']);
	});

	it('steps Manage down to View in two clicks', () => {
		const afterFirst = toggleOptionInGroup([...manage.scopes], manage, group.options);
		const afterSecond = toggleOptionInGroup(afterFirst, use, group.options);
		expect(new Set(afterSecond)).toEqual(new Set(view.scopes));
	});

	it('warns about plaintext decrypt on Manage but not on View or Use', () => {
		expect(getEscalationWarningKey('credential', [...manage.scopes])).toBe(
			'instanceRoles.warning.manageCredentials',
		);
		expect(getEscalationWarningKey('credential', [...use.scopes])).toBeUndefined();
		expect(getEscalationWarningKey('credential', [...view.scopes])).toBeUndefined();
	});
});

describe('two-rung groups are unchanged by the shared ladder', () => {
	// Regression guard on the SUPERSEDED_BY refactor: every group that had exactly
	// two tiered rungs before must still resolve to the same pair.
	const cases: Array<{
		resource: 'apiKey' | 'tag' | 'variable' | 'role';
		sub: string;
		sup: string;
	}> = [
		{ resource: 'apiKey', sub: 'Manage own', sup: 'Manage all' },
		{ resource: 'tag', sub: 'View', sup: 'Manage' },
		{ resource: 'variable', sub: 'View', sup: 'Manage' },
		{ resource: 'role', sub: 'Manage project roles', sup: 'Manage' },
	];

	it.each(cases)('$resource resolves "$sub" up the ladder to "$sup"', ({ resource, sub, sup }) => {
		const group = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === resource)!;
		const subordinate = group.options.find((o) => o.key === sub)!;
		const superseding = group.options.find((o) => o.key === sup)!;

		// The shared map can route through a rung a group does not declare — tag's
		// View points at Use — so assert the option the group actually resolves to,
		// in both directions.
		expect(impliedByOption(subordinate, group.options, [...superseding.scopes])).toBe(superseding);
		expect(findSubordinateOption(superseding, group.options)).toBe(subordinate);
	});

	it.each(cases)(
		'$resource implies "$sub" under a checked "$sup" and downgrades back to it',
		({ resource, sub, sup }) => {
			const group = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === resource)!;
			const subordinate = group.options.find((o) => o.key === sub)!;
			const superseding = group.options.find((o) => o.key === sup)!;

			expect(isOptionImplied(subordinate, group.options, [...superseding.scopes])).toBe(true);
			expect(isOptionImplied(subordinate, group.options, [...subordinate.scopes])).toBe(false);
			expect(resolveOptionState(superseding, group.options, [...subordinate.scopes])).toBe(
				'unchecked',
			);

			const downgraded = toggleOptionInGroup([...superseding.scopes], superseding, group.options);
			expect(new Set(downgraded)).toEqual(new Set(subordinate.scopes));
		},
	);

	it('leaves "Manage all settings" untiered', () => {
		// The select-all covers the four MCP / n8n Assistant options by plain scope
		// superset, not by implication, so unchecking it downgrades to nothing. The
		// tiering inside each of those pairs is covered above.
		const group = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'settings')!;
		const manageAllSettings = group.options.find((o) => o.key === 'Manage')!;
		expect(supersedingKey('Manage')).toBeUndefined();
		expect(findSubordinateOption(manageAllSettings, group.options)).toBeUndefined();
	});
});
