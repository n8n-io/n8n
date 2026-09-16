import type { LicenseState, Logger } from '@n8n/backend-common';
import type {
	CredentialsEntity,
	ScopesField,
	User,
	RoleRepository,
	ScopeRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '../../events/event.service';
import type { RoleCacheService } from '../role-cache.service';
import type { RoleDeletionCheckProxy } from '../role-deletion-check-proxy.service';
import { RoleService } from '../role.service';

describe('RoleService.addScopes', () => {
	const licenseState = mock<LicenseState>();
	const roleRepository = mock<RoleRepository>();
	const scopeRepository = mock<ScopeRepository>();
	const roleCacheService = mock<RoleCacheService>();
	const logger = mock<Logger>();
	const roleDeletionCheckProxy = mock<RoleDeletionCheckProxy>();
	const eventService = mock<EventService>();

	const roleService = new RoleService(
		licenseState,
		roleRepository,
		scopeRepository,
		roleCacheService,
		logger,
		roleDeletionCheckProxy,
		eventService,
	);

	// No global scopes and no project relations, so a global credential's
	// scopes come entirely from the isGlobal-driven fallback under test.
	const memberWithNoAccess = { role: { scopes: [] } } as unknown as User;

	const makeGlobalCredential = (isResolvable: boolean) =>
		({
			type: 'someNodeCredentialsType',
			isGlobal: true,
			isResolvable,
			shared: [],
		}) as unknown as CredentialsEntity & ScopesField;

	it('grants credential:read and credential:connect for a global end-user credential', () => {
		const entity = roleService.addScopes(makeGlobalCredential(true), memberWithNoAccess, []);

		expect(entity.scopes).toEqual(
			expect.arrayContaining(['credential:read', 'credential:connect']),
		);
	});

	it('grants only credential:read for a global static credential', () => {
		const entity = roleService.addScopes(makeGlobalCredential(false), memberWithNoAccess, []);

		expect(entity.scopes).toContain('credential:read');
		expect(entity.scopes).not.toContain('credential:connect');
	});

	it('does not force any scopes onto a non-global credential', () => {
		const entity = {
			type: 'someNodeCredentialsType',
			isGlobal: false,
			isResolvable: true,
			shared: [],
		} as unknown as CredentialsEntity & ScopesField;

		const result = roleService.addScopes(entity, memberWithNoAccess, []);

		expect(result.scopes).toEqual([]);
	});

	it('does not duplicate credential:connect when already present through a resource role', () => {
		const entity = {
			type: 'someNodeCredentialsType',
			isGlobal: true,
			isResolvable: true,
			shared: [],
		} as unknown as CredentialsEntity & ScopesField;
		// Owner-level global scope grants credential:connect independently of the isGlobal fallback
		const owner = {
			role: { scopes: [{ slug: 'credential:connect' }] },
		} as unknown as User;

		const result = roleService.addScopes(entity, owner, []);

		expect(result.scopes.filter((s) => s === 'credential:connect')).toHaveLength(1);
	});
});
