import type { MaskLevels, Scope, ScopeLevels } from '../../types.ee';
import { hasScope } from '../hasScope.ee';

const ownerPermissions: Scope[] = [
	'workflow:create',
	'workflow:read',
	'workflow:update',
	'workflow:delete',
	'workflow:list',
	'user:create',
	'user:read',
	'user:update',
	'user:delete',
	'user:list',
	'credential:create',
	'credential:read',
	'credential:update',
	'credential:delete',
	'credential:list',
	'variable:create',
	'variable:read',
	'variable:update',
	'variable:delete',
	'variable:list',
];
const memberPermissions: Scope[] = ['user:list', 'variable:list', 'variable:read'];

describe('hasScope', () => {
	test('should work with a single permission on both modes with only global scopes', () => {
		expect(
			hasScope(
				'user:list',
				{
					global: memberPermissions,
				},
				undefined,
				{ mode: 'oneOf' },
			),
		).toBe(true);

		expect(
			hasScope(
				'user:list',
				{
					global: memberPermissions,
				},
				undefined,
				{ mode: 'allOf' },
			),
		).toBe(true);

		expect(
			hasScope(
				'workflow:read',
				{
					global: memberPermissions,
				},
				undefined,
				{ mode: 'oneOf' },
			),
		).toBe(false);

		expect(
			hasScope(
				'workflow:read',
				{
					global: memberPermissions,
				},
				undefined,
				{ mode: 'allOf' },
			),
		).toBe(false);
	});

	test('should work with oneOf mode', () => {
		expect(
			hasScope(['workflow:create', 'workflow:read'], {
				global: ownerPermissions,
			}),
		).toBe(true);

		expect(
			hasScope(['workflow:create', 'workflow:read'], {
				global: memberPermissions,
			}),
		).toBe(false);

		expect(
			hasScope([], {
				global: memberPermissions,
			}),
		).toBe(false);
	});

	test('should work with allOf mode', () => {
		expect(
			hasScope(
				['workflow:create', 'workflow:read'],
				{
					global: ownerPermissions,
				},
				undefined,
				{ mode: 'allOf' },
			),
		).toBe(true);

		expect(
			hasScope(
				['workflow:create', 'workflow:read'],
				{
					global: memberPermissions,
				},
				undefined,
				{ mode: 'allOf' },
			),
		).toBe(false);

		expect(
			hasScope(
				['workflow:create', 'user:list'],
				{
					global: memberPermissions,
				},
				undefined,
				{ mode: 'allOf' },
			),
		).toBe(false);

		expect(
			hasScope(
				[],
				{
					global: memberPermissions,
				},
				undefined,
				{ mode: 'allOf' },
			),
		).toBe(false);
	});

	test('should work with default options', () => {
		expect(
			hasScope(['workflow:create', 'user:list'], {
				global: memberPermissions,
			}),
		).toBe(true);

		expect(
			hasScope(['workflow:create', 'workflow:read'], {
				global: memberPermissions,
			}),
		).toBe(false);
	});

	test('should handle mixed resource/scope combinations', () => {
		const mixedScopes: ScopeLevels = {
			global: ['user:list'],
			project: ['workflow:read', 'variable:read'],
			resource: ['credential:read'],
		};

		expect(hasScope('user:list', mixedScopes)).toBe(true);
		expect(hasScope('workflow:read', mixedScopes)).toBe(true);
		expect(hasScope('credential:read', mixedScopes)).toBe(true);
		expect(hasScope('variable:read', mixedScopes)).toBe(true);
		expect(hasScope('workflow:update', mixedScopes)).toBe(false);
	});
});

describe('hasScope masking', () => {
	test('should return true without mask when scopes present', () => {
		expect(
			hasScope('workflow:read', {
				global: ['user:list'],
				project: ['workflow:read'],
				resource: [],
			}),
		).toBe(true);
	});

	test('should return false without mask when scopes are not present', () => {
		expect(
			hasScope('workflow:update', {
				global: ['user:list'],
				project: ['workflow:read'],
				resource: [],
			}),
		).toBe(false);
	});

	test('should return false when mask does not include scope but scopes list does contain required scope', () => {
		expect(
			hasScope(
				'workflow:update',
				{
					global: ['user:list'],
					project: ['workflow:read', 'workflow:update'],
					resource: [],
				},
				{
					sharing: ['workflow:read'],
				},
			),
		).toBe(false);
	});

	test('should return true when mask does include scope and scope list includes scope', () => {
		expect(
			hasScope(
				'workflow:update',
				{
					global: ['user:list'],
					project: ['workflow:read', 'workflow:update'],
					resource: [],
				},
				{
					sharing: ['workflow:read', 'workflow:update'],
				},
			),
		).toBe(true);
	});

	test('should return true when mask does include scope and scopes list includes scope on multiple levels', () => {
		expect(
			hasScope(
				'workflow:update',
				{
					global: ['user:list'],
					project: ['workflow:read', 'workflow:update'],
					resource: ['workflow:update'],
				},
				{
					sharing: ['workflow:read', 'workflow:update'],
				},
			),
		).toBe(true);
	});

	test('should not mask out global scopes', () => {
		expect(
			hasScope(
				'workflow:update',
				{
					global: ['workflow:read', 'workflow:update'],
					project: ['workflow:read'],
					resource: ['workflow:read'],
				},
				{
					sharing: ['workflow:read'],
				},
			),
		).toBe(true);
	});

	test('should return false when scope is not in mask or scope list', () => {
		expect(
			hasScope(
				'workflow:update',
				{
					global: ['workflow:read'],
					project: ['workflow:read'],
					resource: ['workflow:read'],
				},
				{
					sharing: ['workflow:read'],
				},
			),
		).toBe(false);
	});

	test('should return false when scope is in mask or not scope list', () => {
		expect(
			hasScope(
				'workflow:update',
				{
					global: ['workflow:read'],
					project: ['workflow:read'],
					resource: ['workflow:read'],
				},
				{
					sharing: ['workflow:read', 'workflow:update'],
				},
			),
		).toBe(false);
	});

	test('should handle masks with oneOf and allOf modes correctly', () => {
		const userScopes: ScopeLevels = {
			global: [],
			project: ['workflow:read', 'workflow:update', 'workflow:delete'],
			resource: [],
		};

		const masks: MaskLevels = {
			sharing: ['workflow:read', 'workflow:update'],
		};

		// oneOf mode - one of the scopes should be in both mask and user scopes
		expect(
			hasScope(['workflow:read', 'workflow:delete'], userScopes, masks, { mode: 'oneOf' }),
		).toBe(true);

		// allOf mode - all scopes should be in both mask and user scopes
		expect(
			hasScope(['workflow:read', 'workflow:delete'], userScopes, masks, { mode: 'allOf' }),
		).toBe(false);

		expect(
			hasScope(['workflow:read', 'workflow:update'], userScopes, masks, { mode: 'allOf' }),
		).toBe(true);
	});

	test('should handle multiple mask levels if provided', () => {
		const userScopes: ScopeLevels = {
			global: [],
			project: ['workflow:read', 'workflow:update', 'credential:read'],
			resource: [],
		};

		const masks: MaskLevels = {
			sharing: ['workflow:read', 'workflow:update', 'credential:read'],
		};

		expect(
			hasScope(['workflow:read', 'credential:read'], userScopes, masks, { mode: 'allOf' }),
		).toBe(true);
	});
});

describe('hasScope edge cases', () => {
	test('should handle empty scopes correctly', () => {
		const userScopes = {
			global: ownerPermissions,
			project: [],
			resource: [],
		};

		expect(hasScope([], userScopes)).toBe(false);
		expect(hasScope([], userScopes, undefined, { mode: 'allOf' })).toBe(false);
	});

	test('should handle empty user scopes correctly', () => {
		const emptyUserScopes = {
			global: [],
			project: [],
			resource: [],
		};

		expect(hasScope('workflow:read', emptyUserScopes)).toBe(false);
		expect(
			hasScope(['workflow:read', 'workflow:update'], emptyUserScopes, undefined, {
				mode: 'allOf',
			}),
		).toBe(false);
	});
});
