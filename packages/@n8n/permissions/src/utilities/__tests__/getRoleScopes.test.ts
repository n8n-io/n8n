import {
	credentialSharingRoleSchema,
	globalRoleSchema,
	projectRoleSchema,
	workflowSharingRoleSchema,
} from '../../schemas.ee';
import type { GlobalRole, Resource, AllRoleTypes } from '../../types.ee';
import { getRoleScopes, COMBINED_ROLE_MAP } from '../getRoleScopes.ee';

describe('getRoleScopes', () => {
	test('should return all scopes for a given role without filters', () => {
		const role: GlobalRole = 'global:owner';
		const scopes = getRoleScopes(role);

		expect(scopes).toEqual(COMBINED_ROLE_MAP[role]);
		expect(scopes.length).toBeGreaterThan(0);
	});

	describe.each([
		['global', globalRoleSchema],
		['project', projectRoleSchema],
		['credential sharing', credentialSharingRoleSchema],
		['workflow sharing', workflowSharingRoleSchema],
	] as const)('%s', (_, { options }) => {
		test.each(options)('should return correct scopes for %s', (role) => {
			const scopes = getRoleScopes(role);

			expect(scopes).toEqual(COMBINED_ROLE_MAP[role]);
			expect(Array.isArray(scopes)).toBe(true);
			expect(scopes.length).toBeGreaterThan(0);
		});
	});

	test.each<[Resource]>([['workflow'], ['credential'], ['user'], ['project'], ['tag']])(
		'should filter scopes by resource %s',
		(resource) => {
			const role: GlobalRole = 'global:owner';
			const filteredScopes = getRoleScopes(role, [resource]);

			// Check that all returned scopes start with the filtered resource
			expect(filteredScopes.every((scope) => scope.startsWith(`${resource}:`))).toBe(true);

			// Should be a subset of all scopes for the role
			const allScopes = COMBINED_ROLE_MAP[role];
			expect(filteredScopes.every((scope) => allScopes.includes(scope))).toBe(true);
		},
	);

	test('should handle multiple resource filters', () => {
		const role: GlobalRole = 'global:owner';
		const resources: Resource[] = ['workflow', 'credential'];
		const filteredScopes = getRoleScopes(role, resources);

		// All scopes should start with one of the filtered resources
		expect(
			filteredScopes.every((scope) =>
				resources.some((resource) => scope.startsWith(`${resource}:`)),
			),
		).toBe(true);

		// Should contain scopes from both resources
		const workflowScopes = filteredScopes.filter((scope) => scope.startsWith('workflow:'));
		const credentialScopes = filteredScopes.filter((scope) => scope.startsWith('credential:'));
		expect(workflowScopes.length).toBeGreaterThan(0);
		expect(credentialScopes.length).toBeGreaterThan(0);
	});

	test('should return empty array when no scopes match the filter', () => {
		// Create a filter with a non-existing resource
		const filteredScopes = getRoleScopes('global:member', ['nonexistent' as Resource]);
		expect(filteredScopes).toEqual([]);
	});

	test.each<[AllRoleTypes, Resource, boolean]>([
		['global:owner', 'workflow', true],
		['global:admin', 'credential', true],
		['global:member', 'user', false],
		['project:admin', 'project', true],
		['workflow:editor', 'credential', false],
	])('should correctly filter %s scopes by %s resource', (role, resource, shouldHaveScopes) => {
		const filteredScopes = getRoleScopes(role, [resource]);

		if (shouldHaveScopes) {
			expect(filteredScopes.length).toBeGreaterThan(0);
			expect(filteredScopes.every((scope) => scope.startsWith(`${resource}:`))).toBe(true);
		} else {
			// Some roles might not have specific resource scopes
			// This test verifies the filtering behavior in both cases
			if (filteredScopes.length > 0) {
				expect(filteredScopes.every((scope) => scope.startsWith(`${resource}:`))).toBe(true);
			}
		}
	});

	test('should maintain the structure of scope strings', () => {
		const role: GlobalRole = 'global:owner';
		const scopes = getRoleScopes(role);

		// Each scope should follow the format: resource:operation
		scopes.forEach((scope) => {
			expect(scope).toMatch(/^[a-zA-Z]+:[a-zA-Z*]+$/);
		});
	});
});
