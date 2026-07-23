'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const has_global_scope_ee_1 = require('../has-global-scope.ee');
const utils_1 = require('./utils');
describe('hasGlobalScope', () => {
	describe('single scope checks', () => {
		test.each([
			{ role: 'global:owner', scope: 'workflow:create', expected: true },
			{ role: 'global:admin', scope: 'user:delete', expected: true },
			{ role: 'global:member', scope: 'workflow:read', expected: false },
			{ role: 'non:existent', scope: 'workflow:read', expected: false },
		])('$role with $scope -> $expected', ({ role, scope, expected }) => {
			expect(
				(0, has_global_scope_ee_1.hasGlobalScope)((0, utils_1.createAuthPrincipal)(role), scope),
			).toBe(expected);
		});
	});
	describe('multiple scopes', () => {
		test('oneOf mode (default)', () => {
			expect(
				(0, has_global_scope_ee_1.hasGlobalScope)(
					(0, utils_1.createAuthPrincipal)('global:member'),
					['tag:create', 'user:list', 'user:create'],
				),
			).toBe(true);
		});
		test('allOf mode', () => {
			expect(
				(0, has_global_scope_ee_1.hasGlobalScope)(
					(0, utils_1.createAuthPrincipal)('global:member'),
					['tag:create', 'user:list', 'user:create'],
					{ mode: 'allOf' },
				),
			).toBe(false);
		});
	});
	test('edge cases', () => {
		expect(
			(0, has_global_scope_ee_1.hasGlobalScope)(
				(0, utils_1.createAuthPrincipal)('global:owner'),
				[],
			),
		).toBe(false);
	});
});
//# sourceMappingURL=has-global-scope.test.js.map
