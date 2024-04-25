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
				{ mode: 'oneOf' },
			),
		).toBe(true);

		expect(
			hasScope(
				'user:list',
				{
					global: memberPermissions,
				},
				{ mode: 'allOf' },
			),
		).toBe(true);

		expect(
			hasScope(
				'workflow:read',
				{
					global: memberPermissions,
				},
				{ mode: 'oneOf' },
			),
		).toBe(false);

		expect(
			hasScope(
				'workflow:read',
				{
					global: memberPermissions,
				},
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
				{ mode: 'allOf' },
			),
		).toBe(true);

		expect(
			hasScope(
				['workflow:create', 'workflow:read'],
				{
					global: memberPermissions,
				},
				{ mode: 'allOf' },
			),
		).toBe(false);

		expect(
			hasScope(
				['workflow:create', 'user:list'],
				{
					global: memberPermissions,
				},
				{ mode: 'allOf' },
			),
		).toBe(false);

		expect(
			hasScope(
				[],
				{
					global: memberPermissions,
				},
				{ mode: 'allOf' },
			),
		).toBe(false);
	});
});
