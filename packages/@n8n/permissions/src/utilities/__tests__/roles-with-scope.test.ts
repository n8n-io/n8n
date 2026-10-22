import type { GlobalRole, Scope } from '../../types.ee';
import { staticRolesWithScope } from '../static-roles-with-scope.ee';

describe('rolesWithScope', () => {
	describe('global roles', () => {
		test.each([
			['workflow:create', ['global:owner', 'global:admin']],
			['user:list', ['global:owner', 'global:admin', 'global:member']],
			['chatHub:message', ['global:owner', 'global:admin', 'global:member', 'global:chatUser']],
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

	describe('extra any-of scopes', () => {
		test('keeps only roles that hold every scope and at least one of the extra scopes', () => {
			const roles = staticRolesWithScope(
				'project',
				['credential:read'],
				['credential:connect', 'credential:update'],
			);

			expect(roles).toEqual(['project:admin', 'project:personalOwner', 'project:editor']);
		});

		test('returns no role when none holds one of the extra scopes', () => {
			expect(staticRolesWithScope('project', ['credential:read'], ['credential:use'])).toEqual([]);
		});
	});
});
