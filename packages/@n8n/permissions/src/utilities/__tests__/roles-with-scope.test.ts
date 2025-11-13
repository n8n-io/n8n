import type { GlobalRole, Scope } from '../../types.ee';
import { staticRolesWithScope } from '../static-roles-with-scope.ee';

describe('rolesWithScope', () => {
	describe('global roles', () => {
		test.each([
			['workflow:create', ['global:owner', 'global:admin']],
			['user:list', ['global:owner', 'global:admin', 'global:member']],
			['invalid:scope', []],
		] as Array<[Scope, GlobalRole[]]>)('%s -> %s', (scope, expected) => {
			expect(staticRolesWithScope('global', scope)).toEqual(expected);
		});
	});

	describe('multiple scopes', () => {
		test('returns roles with all scopes', () => {
			expect(
				staticRolesWithScope('global', [
					// all global roles have this scope
					'tag:create',
					// only owner and admin have this scope
					'user:delete',
				]),
			).toEqual(['global:owner', 'global:admin']);
		});
	});
});
