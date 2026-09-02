import type { User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { assertCanManageRoleType } from '@/services/role-authorization';

describe('assertCanManageRoleType', () => {
	const userWithScopes = (...scopes: Scope[]) =>
		mock<User>({ role: { scopes: scopes.map((slug) => ({ slug })) } });

	it('allows any role type for a user with role:manage', () => {
		const user = userWithScopes('role:manage');

		expect(() => assertCanManageRoleType(user, 'global')).not.toThrow();
		expect(() => assertCanManageRoleType(user, 'project')).not.toThrow();
	});

	it('allows only project roles for a user with role:manageProject', () => {
		const user = userWithScopes('role:manageProject');

		expect(() => assertCanManageRoleType(user, 'project')).not.toThrow();
		expect(() => assertCanManageRoleType(user, 'global')).toThrow(ForbiddenError);
	});

	it('rejects a user with neither scope', () => {
		const user = userWithScopes('role:read');

		expect(() => assertCanManageRoleType(user, 'project')).toThrow(ForbiddenError);
		expect(() => assertCanManageRoleType(user, 'global')).toThrow(ForbiddenError);
	});
});
