import type { User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { assertCanManageRoleType } from '@/services/role-authorization';

describe('assertCanManageRoleType', () => {
	const userWithScopes = (...scopes: Scope[]) =>
		mock<User>({ role: { scopes: scopes.map((slug) => ({ slug })) } });

	describe('without apiKeyScopes (Internal API - user scopes only)', () => {
		it('allows any role type for a user with role:manage', () => {
			const user = userWithScopes('role:manage');

			expect(() => assertCanManageRoleType({ user, roleType: 'global' })).not.toThrow();
			expect(() => assertCanManageRoleType({ user, roleType: 'project' })).not.toThrow();
		});

		it('allows only project roles for a user with role:manageProject', () => {
			const user = userWithScopes('role:manageProject');

			expect(() => assertCanManageRoleType({ user, roleType: 'project' })).not.toThrow();
			expect(() => assertCanManageRoleType({ user, roleType: 'global' })).toThrow(ForbiddenError);
		});

		it('rejects a user with neither scope', () => {
			const user = userWithScopes('role:read');

			expect(() => assertCanManageRoleType({ user, roleType: 'project' })).toThrow(ForbiddenError);
			expect(() => assertCanManageRoleType({ user, roleType: 'global' })).toThrow(ForbiddenError);
		});
	});

	describe('with apiKeyScopes (Public API - decided entirely by the API key)', () => {
		const user = userWithScopes('role:read');

		it('allows a global role when the API key holds role:manage', () => {
			expect(() =>
				assertCanManageRoleType({ user, roleType: 'global', apiKeyScopes: ['role:manage'] }),
			).not.toThrow();
		});

		it('allows a project role when the API key holds role:manageProject', () => {
			expect(() =>
				assertCanManageRoleType({
					user,
					roleType: 'project',
					apiKeyScopes: ['role:manageProject'],
				}),
			).not.toThrow();
		});

		it('rejects a global role when the API key is scoped down to role:manageProject only', () => {
			expect(() =>
				assertCanManageRoleType({
					user,
					roleType: 'global',
					apiKeyScopes: ['role:manageProject'],
				}),
			).toThrow(ForbiddenError);
		});

		it('rejects when the API key has no scopes at all', () => {
			expect(() =>
				assertCanManageRoleType({ user, roleType: 'project', apiKeyScopes: [] }),
			).toThrow(ForbiddenError);
		});

		it('rejects when the API key holds neither role-management scope', () => {
			expect(() =>
				assertCanManageRoleType({ user, roleType: 'project', apiKeyScopes: ['role:read'] }),
			).toThrow(ForbiddenError);
		});
	});
});
