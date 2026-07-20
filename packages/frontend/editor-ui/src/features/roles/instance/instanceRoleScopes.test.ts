import { ALL_SCOPES } from '@n8n/permissions';
import {
	INSTANCE_SCOPE_GROUPS,
	INSTANCE_SCOPE_GROUP_LIST,
	INSTANCE_RESOURCE_ORDER,
	ALL_INSTANCE_SCOPES,
	getOptionState,
	getEscalationWarningKey,
	isOptionImplied,
	resolveOptionState,
	toggleOptionInGroup,
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
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.tag)).toEqual(['Manage']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.role)).toEqual(['Manage project roles', 'Manage']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.project)).toEqual(['Create']);
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.settings)).toEqual(['Manage']);
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

	it('returns false for options in groups with no superseding relationships', () => {
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
		// Only 1 of 4 "Manage own" scopes present — "Manage own" sub-option is not fully checked
		expect(resolveOptionState(manageAll, apiKeyGroup.options, ['apiKey:create'])).toBe(
			'indeterminate',
		);
	});

	it('suppresses false indeterminate on "Manage all" when "Manage own" is fully checked', () => {
		// "Manage own" (4 scopes) fully checked → "Manage all" would be 4/5 (indeterminate)
		// but all 4 matching scopes come from the fully-checked sub-option → unchecked
		expect(resolveOptionState(manageAll, apiKeyGroup.options, ownScopes)).toBe('unchecked');
	});

	it('keeps indeterminate on "Manage all" when the sub-option is only partially checked', () => {
		// 3 of 4 "Manage own" scopes present — "Manage own" is indeterminate, not fully checked
		const partialOwn = ownScopes.slice(0, 3);
		expect(resolveOptionState(manageAll, apiKeyGroup.options, partialOwn)).toBe('indeterminate');
	});

	it('does not affect unrelated groups', () => {
		const tagGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'tag')!;
		const tagManage = tagGroup.options.find((o) => o.key === 'Manage')!;
		expect(resolveOptionState(tagManage, tagGroup.options, ['tag:read'])).toBe('indeterminate');
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

	it('does not warn for "Manage project roles" alone (role:manageProject without role:manage)', () => {
		expect(getEscalationWarningKey('role', ['role:read', 'role:manageProject'])).toBeUndefined();
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
		const tagGroup = INSTANCE_SCOPE_GROUP_LIST.find((g) => g.resource === 'tag')!;
		const manageTags = tagGroup.options.find((o) => o.key === 'Manage')!;
		const result = toggleOptionInGroup(
			['user:read', ...manageTags.scopes],
			manageTags,
			tagGroup.options,
		);
		expect(result).toEqual(['user:read']);
	});

	it('does not mutate the input array', () => {
		const input = [...manageAll.scopes];
		toggleOptionInGroup(input, manageAll, apiKeyGroup.options);
		expect(input).toEqual([...manageAll.scopes]);
	});
});
