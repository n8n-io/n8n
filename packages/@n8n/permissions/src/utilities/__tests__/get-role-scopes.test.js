'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const get_role_scopes_ee_1 = require('../get-role-scopes.ee');
describe('getRoleScopes', () => {
	describe('role scope retrieval', () => {
		test.each(['global:owner', 'global:admin', 'project:admin'])(
			'should return scopes for %s',
			(role) => {
				const scopes = (0, get_role_scopes_ee_1.getRoleScopes)(role);
				expect(scopes).toEqual(get_role_scopes_ee_1.COMBINED_ROLE_MAP[role]);
			},
		);
	});
	describe('resource filtering', () => {
		test.each(['workflow', 'credential', 'user'])('should filter %s scopes', (resource) => {
			const filtered = (0, get_role_scopes_ee_1.getRoleScopes)('global:owner', [resource]);
			expect(filtered.every((s) => s.startsWith(`${resource}:`))).toBe(true);
		});
		test('should handle multiple filters', () => {
			const filtered = (0, get_role_scopes_ee_1.getRoleScopes)('global:owner', [
				'workflow',
				'credential',
			]);
			expect(filtered.some((s) => s.startsWith('workflow:'))).toBe(true);
			expect(filtered.some((s) => s.startsWith('credential:'))).toBe(true);
			expect(filtered.every((s) => !s.startsWith('tag:'))).toBe(true);
			expect(filtered.every((s) => !s.startsWith('user:'))).toBe(true);
		});
		test('should return empty array for no matches', () => {
			expect((0, get_role_scopes_ee_1.getRoleScopes)('global:member', ['nonexistent'])).toEqual([]);
		});
	});
});
//# sourceMappingURL=get-role-scopes.test.js.map
