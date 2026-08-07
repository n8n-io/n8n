import type { LicenseState } from '@n8n/backend-common';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { RoleRepository, ScopeRepository } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { RoleCacheService } from '@/services/role-cache.service';
import { RoleDeletionCheckProxy } from '@/services/role-deletion-check-proxy.service';
import { RoleService } from '@/services/role.service';

describe('RoleService.assertCanManageRoleType', () => {
	const licenseState = mock<LicenseState>();
	const roleRepository = mockInstance(RoleRepository);
	const scopeRepository = mockInstance(ScopeRepository);
	const roleCacheService = mockInstance(RoleCacheService);
	const logger = mockInstance(Logger);
	const roleDeletionCheckProxy = mockInstance(RoleDeletionCheckProxy);

	const roleService = new RoleService(
		licenseState,
		roleRepository,
		scopeRepository,
		roleCacheService,
		logger,
		roleDeletionCheckProxy,
	);

	const userWithScopes = (...scopes: Scope[]) =>
		mock<User>({ role: { scopes: scopes.map((slug) => ({ slug })) } });

	it('allows any role type for a user with role:manage', () => {
		const user = userWithScopes('role:manage');

		expect(() => roleService.assertCanManageRoleType(user, 'global')).not.toThrow();
		expect(() => roleService.assertCanManageRoleType(user, 'project')).not.toThrow();
	});

	it('allows only project roles for a user with role:manageProject', () => {
		const user = userWithScopes('role:manageProject');

		expect(() => roleService.assertCanManageRoleType(user, 'project')).not.toThrow();
		expect(() => roleService.assertCanManageRoleType(user, 'global')).toThrow(ForbiddenError);
	});

	it('rejects a user with neither scope', () => {
		const user = userWithScopes('role:read');

		expect(() => roleService.assertCanManageRoleType(user, 'project')).toThrow(ForbiddenError);
		expect(() => roleService.assertCanManageRoleType(user, 'global')).toThrow(ForbiddenError);
	});
});
