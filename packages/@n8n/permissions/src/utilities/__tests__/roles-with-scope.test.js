'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const static_roles_with_scope_ee_1 = require('../static-roles-with-scope.ee');
describe('rolesWithScope', () => {
	describe('global roles', () => {
		test.each([
			['workflow:create', ['global:owner', 'global:admin']],
			['user:list', ['global:owner', 'global:admin', 'global:member']],
			['invalid:scope', []],
		])('%s -> %s', (scope, expected) => {
			expect((0, static_roles_with_scope_ee_1.staticRolesWithScope)('global', scope)).toEqual(
				expected,
			);
		});
	});
	describe('multiple scopes', () => {
		test('returns roles with all scopes', () => {
			expect(
				(0, static_roles_with_scope_ee_1.staticRolesWithScope)('global', [
					'tag:create',
					'user:delete',
				]),
			).toEqual(['global:owner', 'global:admin']);
		});
	});
});
//# sourceMappingURL=roles-with-scope.test.js.map
