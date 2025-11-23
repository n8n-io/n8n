import type { Scope, ScopeLevels } from '../../types.ee';
import { hasScope } from '../has-scope.ee';

describe('hasScope', () => {
	const userScopes: ScopeLevels = {
		global: ['user:list'],
		project: ['workflow:read', 'workflow:update'],
		resource: ['credential:read'],
	};

	describe('scope checking', () => {
		test.each([
			['workflow:read', true],
			['workflow:delete', false],
			['user:list', true],
		] satisfies Array<[Scope, boolean]>)('%s -> %s', (scope, expected) => {
			expect(hasScope(scope, userScopes)).toBe(expected);
		});
	});

	describe('masking behavior', () => {
		test('filters non-global scopes', () => {
			expect(hasScope('workflow:read', userScopes, { sharing: ['workflow:update'] })).toBe(false);
		});

		test('ignores global scopes', () => {
			expect(hasScope('user:list', userScopes, { sharing: [] })).toBe(true);
		});
	});

	describe('checking modes', () => {
		test('oneOf (default)', () => {
			expect(hasScope(['workflow:read', 'invalid:scope'] as Scope[], userScopes)).toBe(true);
		});

		test('allOf', () => {
			expect(
				hasScope(['workflow:read', 'workflow:update'], userScopes, undefined, { mode: 'allOf' }),
			).toBe(true);
		});

		test('edge cases', () => {
			expect(hasScope([], userScopes, undefined, { mode: 'allOf' })).toBe(false);
			expect(hasScope([], userScopes, undefined, { mode: 'oneOf' })).toBe(false);
		});
	});
});
