import { hasScope } from '@/hasScope';
import type { Scope } from '@/types';

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
});
