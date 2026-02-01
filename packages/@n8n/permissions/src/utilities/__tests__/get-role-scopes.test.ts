import type { AllRoleTypes, Resource } from '../../types.ee';
import { getRoleScopes, COMBINED_ROLE_MAP } from '../get-role-scopes.ee';

describe('getRoleScopes', () => {
	describe('role scope retrieval', () => {
		test.each(['global:owner', 'global:admin', 'project:admin'] satisfies AllRoleTypes[])(
			'should return scopes for %s',
			(role) => {
				const scopes = getRoleScopes(role);
				expect(scopes).toEqual(COMBINED_ROLE_MAP[role]);
			},
		);
	});

	describe('resource filtering', () => {
		test.each(['workflow', 'credential', 'user'] satisfies Resource[])(
			'should filter %s scopes',
			(resource) => {
				const filtered = getRoleScopes('global:owner', [resource]);
				expect(filtered.every((s) => s.startsWith(`${resource}:`))).toBe(true);
			},
		);

		test('should handle multiple filters', () => {
			const filtered = getRoleScopes('global:owner', ['workflow', 'credential']);
			expect(filtered.some((s) => s.startsWith('workflow:'))).toBe(true);
			expect(filtered.some((s) => s.startsWith('credential:'))).toBe(true);
			expect(filtered.every((s) => !s.startsWith('tag:'))).toBe(true);
			expect(filtered.every((s) => !s.startsWith('user:'))).toBe(true);
		});

		test('should return empty array for no matches', () => {
			expect(getRoleScopes('global:member', ['nonexistent' as Resource])).toEqual([]);
		});
	});
});
