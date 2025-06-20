import type { GlobalRole, Scope } from '../../types.ee';
import { rolesWithScope } from '../roles-with-scope.ee';

describe('rolesWithScope', () => {
	describe('global roles', () => {
		test.each([
			['workflow:create', ['global:owner', 'global:admin']],
			['user:list', ['global:owner', 'global:admin', 'global:member']],
			['invalid:scope', []],
		] as Array<[Scope, GlobalRole[]]>)('%s -> %s', (scope, expected) => {
			expect(rolesWithScope('global', scope)).toEqual(expected);
		});
	});

	describe('multiple scopes', () => {
		test('returns roles with all scopes', () => {
			expect(
				rolesWithScope('global', [
					// all global roles have this scope
					'tag:create',
					// only owner and admin have this scope
					'user:delete',
				]),
			).toEqual(['global:owner', 'global:admin']);
		});
	});
});
