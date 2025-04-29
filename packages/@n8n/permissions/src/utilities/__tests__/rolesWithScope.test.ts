import { RESOURCES } from '../../constants.ee';
import { GLOBAL_SCOPE_MAP, WORKFLOW_SHARING_SCOPE_MAP } from '../../roles/role-maps.ee';
import { globalRoleSchema } from '../../schemas.ee';
import type { Scope } from '../../types.ee';
import { rolesWithScope } from '../rolesWithScope.ee';

describe('rolesWithScope', () => {
	describe('should return all global roles for', () => {
		for (const [resource, _scopes] of Object.entries(RESOURCES)) {
			describe(resource, () => {
				const scopes = _scopes.map((scope) => `${resource}:${scope}`);
				test.each(scopes)('%s', (scope) => {
					const roles = rolesWithScope('global', scope as Scope);
					roles.forEach((role) => {
						expect(GLOBAL_SCOPE_MAP[role]).toContain(scope);
					});
				});
			});
		}
	});

	test('should accept an array of scopes and return roles that have all of them', () => {
		const scopes: Scope[] = ['workflow:create', 'workflow:read'];
		const roles = rolesWithScope('workflow', scopes);

		// Verify that each returned role has ALL the scopes
		roles.forEach((role) => {
			scopes.forEach((scope) => {
				expect(WORKFLOW_SHARING_SCOPE_MAP[role]).toContain(scope);
			});
		});
	});

	test('should return empty array when no roles match the scope', () => {
		const scope: Scope = 'nonexistent:scope' as Scope;
		const roles = rolesWithScope('global', scope);
		expect(roles).toEqual([]);
	});

	test('should handle different namespaces with type safety', () => {
		const globalRoles = rolesWithScope('global', 'workflow:create');
		expect(Array.isArray(globalRoles)).toBe(true);

		const projectRoles = rolesWithScope('project', 'project:read');
		expect(Array.isArray(projectRoles)).toBe(true);

		const credentialRoles = rolesWithScope('credential', 'credential:read');
		expect(Array.isArray(credentialRoles)).toBe(true);

		const workflowRoles = rolesWithScope('workflow', 'workflow:share');
		expect(Array.isArray(workflowRoles)).toBe(true);
	});

	test('should handle multiple scopes correctly', () => {
		// Pick scopes that would filter down to fewer roles
		const scopes: Scope[] = ['workflow:create', 'workflow:delete', 'credential:create'];
		const roles = rolesWithScope('global', scopes);

		// Verify that each returned role has ALL the scopes
		roles.forEach((role) => {
			scopes.forEach((scope) => {
				expect(GLOBAL_SCOPE_MAP[role]).toContain(scope);
			});
		});

		// Roles that have only some of the scopes should not be included
		const allGlobalRoles = globalRoleSchema.options;
		const excludedRoles = allGlobalRoles.filter((role) => !roles.includes(role));

		excludedRoles.forEach((role) => {
			// At least one of the scopes should be missing
			const missingAnyScope = scopes.some((scope) => !GLOBAL_SCOPE_MAP[role].includes(scope));
			expect(missingAnyScope).toBe(true);
		});
	});
});
