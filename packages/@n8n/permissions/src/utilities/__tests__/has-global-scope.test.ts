import type { GlobalRole, Scope } from '../../types.ee';
import { hasGlobalScope } from '../has-global-scope.ee';

describe('hasGlobalScope', () => {
	describe('single scope checks', () => {
		test.each([
			{ role: 'global:owner', scope: 'workflow:create', expected: true },
			{ role: 'global:admin', scope: 'user:delete', expected: true },
			{ role: 'global:member', scope: 'workflow:read', expected: false },
			{ role: 'non:existent', scope: 'workflow:read', expected: false },
		] as Array<{ role: GlobalRole; scope: Scope; expected: boolean }>)(
			'$role with $scope -> $expected',
			({ role, scope, expected }) => {
				expect(hasGlobalScope({ role }, scope)).toBe(expected);
			},
		);
	});

	describe('multiple scopes', () => {
		test('oneOf mode (default)', () => {
			expect(
				hasGlobalScope({ role: 'global:member' }, [
					'tag:create',
					'user:list',
					// a member cannot create users
					'user:create',
				]),
			).toBe(true);
		});

		test('allOf mode', () => {
			expect(
				hasGlobalScope(
					{ role: 'global:member' },
					[
						'tag:create',
						'user:list',
						// a member cannot create users
						'user:create',
					],
					{ mode: 'allOf' },
				),
			).toBe(false);
		});
	});

	test('edge cases', () => {
		expect(hasGlobalScope({ role: 'global:owner' }, [])).toBe(false);
	});
});
