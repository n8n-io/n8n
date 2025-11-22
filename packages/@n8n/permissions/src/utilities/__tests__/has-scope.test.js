'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const has_scope_ee_1 = require('../has-scope.ee');
describe('hasScope', () => {
	const userScopes = {
		global: ['user:list'],
		project: ['workflow:read', 'workflow:update'],
		resource: ['credential:read'],
	};
	describe('scope checking', () => {
		test.each([
			['workflow:read', true],
			['workflow:delete', false],
			['user:list', true],
		])('%s -> %s', (scope, expected) => {
			expect((0, has_scope_ee_1.hasScope)(scope, userScopes)).toBe(expected);
		});
	});
	describe('masking behavior', () => {
		test('filters non-global scopes', () => {
			expect(
				(0, has_scope_ee_1.hasScope)('workflow:read', userScopes, { sharing: ['workflow:update'] }),
			).toBe(false);
		});
		test('ignores global scopes', () => {
			expect((0, has_scope_ee_1.hasScope)('user:list', userScopes, { sharing: [] })).toBe(true);
		});
	});
	describe('checking modes', () => {
		test('oneOf (default)', () => {
			expect((0, has_scope_ee_1.hasScope)(['workflow:read', 'invalid:scope'], userScopes)).toBe(
				true,
			);
		});
		test('allOf', () => {
			expect(
				(0, has_scope_ee_1.hasScope)(['workflow:read', 'workflow:update'], userScopes, undefined, {
					mode: 'allOf',
				}),
			).toBe(true);
		});
		test('edge cases', () => {
			expect((0, has_scope_ee_1.hasScope)([], userScopes, undefined, { mode: 'allOf' })).toBe(
				false,
			);
			expect((0, has_scope_ee_1.hasScope)([], userScopes, undefined, { mode: 'oneOf' })).toBe(
				false,
			);
		});
	});
});
//# sourceMappingURL=has-scope.test.js.map
