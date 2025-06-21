import type { AllRoleTypes, Resource } from '../../types.ee';
import { getRoleScopes, COMBINED_ROLE_MAP } from '../get-role-scopes.ee';
import {
	PROJECT_VIEWER_SCOPES,
	PROJECT_EXECUTOR_SCOPES,
} from '../../roles/scopes/project-scopes.ee';

describe('getRoleScopes', () => {
	describe('role scope retrieval', () => {
		test.each([
			'global:owner',
			'global:admin',
			'project:admin',
			// Add other roles as needed or test them specifically
		] satisfies AllRoleTypes[])('should return scopes for %s from COMBINED_ROLE_MAP', (role) => {
			const scopes = getRoleScopes(role);
			expect(scopes).toEqual(COMBINED_ROLE_MAP[role]);
		});

		test('should return correct scopes for project:viewer', () => {
			const scopes = getRoleScopes('project:viewer');
			expect(scopes).toEqual(expect.arrayContaining(PROJECT_VIEWER_SCOPES));
			expect(scopes.length).toEqual(PROJECT_VIEWER_SCOPES.length);
		});

		test('should return correct scopes for project:executor', () => {
			const scopes = getRoleScopes('project:executor');
			// Check that all viewer scopes are present
			expect(scopes).toEqual(expect.arrayContaining(PROJECT_VIEWER_SCOPES));
			// Check that the execute scope is present
			expect(scopes).toContain('workflow:execute');
			// Check the total number of scopes to match PROJECT_EXECUTOR_SCOPES
			expect(scopes.length).toEqual(PROJECT_EXECUTOR_SCOPES.length);
			// For a more precise check, ensure set equality
			expect(new Set(scopes)).toEqual(new Set(PROJECT_EXECUTOR_SCOPES));
		});
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
