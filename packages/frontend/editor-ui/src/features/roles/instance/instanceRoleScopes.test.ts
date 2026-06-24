import { ALL_SCOPES } from '@n8n/permissions';
import {
	INSTANCE_SCOPE_GROUPS,
	INSTANCE_SCOPE_GROUP_LIST,
	INSTANCE_RESOURCE_ORDER,
	ALL_INSTANCE_SCOPES,
	getOptionState,
	toggleOption,
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
			expect(Object.keys(INSTANCE_SCOPE_GROUPS.role)).toEqual(['Manage']);
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

describe('toggleOption', () => {
	const option = ['tag:create', 'tag:update', 'tag:delete'];

	it('adds the full resolved scope set when unchecked', () => {
		const result = toggleOption(['user:read'], option);
		expect(result).toEqual(expect.arrayContaining(['user:read', ...option]));
		expect(result).toHaveLength(4);
	});

	it('adds the full resolved scope set when indeterminate', () => {
		const result = toggleOption(['tag:create'], option);
		expect(result).toEqual(expect.arrayContaining(option));
		expect(result).toHaveLength(3);
	});

	it('removes the full resolved scope set when fully checked', () => {
		const result = toggleOption(['user:read', ...option], option);
		expect(result).toEqual(['user:read']);
	});

	it('does not mutate the input array', () => {
		const input = ['user:read'];
		toggleOption(input, option);
		expect(input).toEqual(['user:read']);
	});
});
