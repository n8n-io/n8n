import { mock } from 'vitest-mock-extended';

import {
	type CredentialAccessRepository,
	type CredentialsEntity,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	type OperationContext,
	type Project,
	type Role,
	type Scope as DbScope,
	type User,
} from '@n8n/db';
import type { Scope } from '@n8n/permissions';

import type { RoleService } from '../../services/role.service';
import { CredentialsFinderService } from '../credentials-finder.service';

const member = mock<User>({ id: 'user-1', role: GLOBAL_MEMBER_ROLE });
const owner = mock<User>({ id: 'owner-1', role: GLOBAL_OWNER_ROLE });

const makeCustomUser = (id: string, scopes: Scope[]) =>
	mock<User>({
		id,
		role: mock<Role>({
			slug: 'global:custom',
			scopes: scopes.map((slug) => mock<DbScope>({ slug })),
		}),
	});

describe('CredentialsFinderService', () => {
	const accessRepository = mock<CredentialAccessRepository>();
	const roleService = mock<RoleService>();
	const service = new CredentialsFinderService(accessRepository, roleService);
	const useRepositoryRoleLoader = () => {
		accessRepository.findRolesForAccessCheck.mockResolvedValue([]);
		roleService.rolesWithScope.mockImplementation(async (namespace, _scopes, loadRoles) => {
			await loadRoles?.();
			return namespace === 'project' ? ['project:admin'] : ['credential:user'];
		});
	};
	const expectRepositoryRoleLoader = () => {
		expect(accessRepository.findRolesForAccessCheck).toHaveBeenCalledTimes(2);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		roleService.rolesWithScope.mockImplementation(async (namespace) =>
			namespace === 'project'
				? ['project:owner', 'project:admin']
				: ['credential:owner', 'credential:user'],
		);
		accessRepository.findProjectCredentialsForUser.mockResolvedValue([]);
		accessRepository.findProjectCredentialForUser.mockResolvedValue(null);
		accessRepository.findProjectCredentialIdsForUser.mockResolvedValue(new Set());
		accessRepository.findGlobalProjectCredentials.mockResolvedValue([]);
		accessRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);
		accessRepository.findAllProjectCredentialsForUser.mockResolvedValue([]);
		accessRepository.findCredentialNames.mockResolvedValue([]);
		accessRepository.findOwnerProjectsByCredentialIds.mockResolvedValue(new Map());
		accessRepository.findExistingCredentialIds.mockResolvedValue([]);
		accessRepository.findCredentialIdsByUserAndRoles.mockResolvedValue([]);
	});

	it('finds a credential by id with explicit options', async () => {
		await service.findById('credential-1', {
			includeInstanceCredentials: true,
			includeSharedProject: true,
		});

		expect(accessRepository.findCredentialById).toHaveBeenCalledWith('credential-1', {
			includeInstanceCredentials: true,
			includeSharedProject: true,
		});
	});

	it('uses project and credential roles for a member', async () => {
		await service.findCredentialsForUser(member, ['credential:read']);

		expect(accessRepository.findProjectCredentialsForUser).toHaveBeenCalledWith({
			userId: member.id,
			projectRoles: ['project:owner', 'project:admin'],
			credentialRoles: ['credential:owner', 'credential:user'],
		});
	});

	it('uses the global override for an owner who can use credentials', async () => {
		await service.findCredentialsForUser(owner, ['credential:read']);

		expect(accessRepository.findProjectCredentialsForUser).toHaveBeenCalledWith(null);
		expect(roleService.rolesWithScope).not.toHaveBeenCalled();
	});

	it('does not use the global override for a visibility scope without credential use', async () => {
		const visibilityUser = makeCustomUser('visibility-user', ['credential:read']);

		await service.findCredentialsForUser(visibilityUser, ['credential:read']);

		expect(accessRepository.findProjectCredentialsForUser).toHaveBeenCalledWith(
			expect.objectContaining({ userId: visibilityUser.id }),
		);
	});

	it('allows a visibility-only metadata read to use the global override', async () => {
		const visibilityUser = makeCustomUser('visibility-user', ['credential:read']);

		await service.findCredentialsForUser(visibilityUser, ['credential:read'], {
			visibilityOnly: true,
		});

		expect(accessRepository.findProjectCredentialsForUser).toHaveBeenCalledWith(null);
	});

	it('adds global credentials for an exact read scope', async () => {
		const shared = mock<CredentialsEntity>({ id: 'shared' });
		const global = mock<CredentialsEntity>({ id: 'global' });
		accessRepository.findProjectCredentialsForUser.mockResolvedValue([shared]);
		accessRepository.findGlobalProjectCredentials.mockResolvedValue([global]);

		await expect(service.findCredentialsForUser(member, ['credential:read'])).resolves.toEqual([
			shared,
			global,
		]);
	});

	it('finds an instance credential only for a manager who requests it', async () => {
		const credential = mock<CredentialsEntity>({ id: 'instance', usageScope: 'instance' });
		accessRepository.findInstanceCredentialById.mockResolvedValue(credential);

		await expect(
			service.findCredentialForUser('instance', owner, ['credential:read'], {
				includeInstanceCredentials: true,
			}),
		).resolves.toBe(credential);
	});

	it('allows connect access only to resolvable global credentials', async () => {
		const staticCredential = mock<CredentialsEntity>({ isResolvable: false });
		accessRepository.findGlobalProjectCredentialById.mockResolvedValue(staticCredential);

		await expect(
			service.findCredentialForUser('global', member, ['credential:connect']),
		).resolves.toBeNull();

		const resolvableCredential = mock<CredentialsEntity>({ isResolvable: true });
		accessRepository.findGlobalProjectCredentialById.mockResolvedValue(resolvableCredential);
		await expect(
			service.findCredentialForUser('global', member, ['credential:connect']),
		).resolves.toBe(resolvableCredential);
	});

	it('keeps all credential reads in the supplied operation context', async () => {
		const ctx = mock<OperationContext>();
		accessRepository.findAllProjectCredentialsForUser.mockResolvedValue([]);
		accessRepository.findGlobalProjectCredentials.mockResolvedValue([]);

		await service.findAllCredentialsForUser(member, ['credential:read'], ctx, {
			includeGlobalCredentials: true,
		});

		expect(accessRepository.findAllProjectCredentialsForUser).toHaveBeenCalledWith(
			expect.any(Object),
			ctx,
		);
		expect(accessRepository.findGlobalProjectCredentials).toHaveBeenCalledWith(ctx);
	});

	it('deduplicates global credentials and skips globals without an owner project', async () => {
		const shared = { ...mock<CredentialsEntity>({ id: 'shared' }), projectId: 'project-1' };
		const duplicate = mock<CredentialsEntity>({ id: 'shared' });
		const ownerProject = mock<Project>({ id: 'project-2' });
		const global = mock<CredentialsEntity>({
			id: 'global',
			shared: [{ role: 'credential:owner', projectId: ownerProject.id }],
		});
		const ownerless = mock<CredentialsEntity>({ id: 'ownerless', shared: [] });
		accessRepository.findAllProjectCredentialsForUser.mockResolvedValue([shared]);
		accessRepository.findGlobalProjectCredentials.mockResolvedValue([duplicate, global, ownerless]);

		const result = await service.findAllCredentialsForUser(
			member,
			['credential:read'],
			{},
			{
				includeGlobalCredentials: true,
			},
		);

		expect(result.map(({ id }) => id)).toEqual(['shared', 'global']);
		expect(result[1]?.projectId).toBe(ownerProject.id);
	});

	it('describes missing credentials with their id', async () => {
		const project = mock<Project>();
		accessRepository.findCredentialNames.mockResolvedValue([{ id: 'existing', name: 'Stored' }]);
		accessRepository.findOwnerProjectsByCredentialIds.mockResolvedValue(
			new Map([['existing', project]]),
		);

		await expect(service.describeCredentials(['existing', 'missing'])).resolves.toEqual([
			{ id: 'existing', name: 'Stored', exists: true, ownerProject: project },
			{ id: 'missing', name: 'missing', exists: false, ownerProject: null },
		]);
	});

	it('returns only unusable credentials for a user', async () => {
		accessRepository.findProjectCredentialIdsForUser.mockResolvedValue(new Set(['usable']));
		accessRepository.findCredentialNames.mockResolvedValue([
			{ id: 'unusable', name: 'Unavailable' },
		]);
		accessRepository.findOwnerProjectsByCredentialIds.mockResolvedValue(new Map());

		await expect(
			service.findUnusableCredentialsForUser(member, ['usable', 'unusable']),
		).resolves.toEqual([{ id: 'unusable', name: 'Unavailable', exists: true, ownerProject: null }]);
	});

	it('adds global credential ids for read and resolvable ids for connect', async () => {
		accessRepository.findProjectCredentialIdsForUser.mockResolvedValue(new Set(['shared']));
		accessRepository.findGlobalProjectCredentialIds.mockResolvedValue(['global']);

		await expect(
			service.findCredentialIdsWithScopeForUser(['shared', 'global'], member, ['credential:read']),
		).resolves.toEqual(new Set(['shared', 'global']));
		expect(accessRepository.findGlobalProjectCredentialIds).toHaveBeenLastCalledWith(
			['shared', 'global'],
			false,
		);

		await service.findCredentialIdsWithScopeForUser(['shared', 'global'], member, [
			'credential:connect',
		]);
		expect(accessRepository.findGlobalProjectCredentialIds).toHaveBeenLastCalledWith(
			['shared', 'global'],
			true,
		);
	});

	it('forwards the operation context when finding ids by user and role', async () => {
		const ctx = mock<OperationContext>();
		accessRepository.findCredentialIdsByUserAndRoles.mockResolvedValue(['credential-1']);

		await expect(
			service.getCredentialIdsByUserAndRole(
				['user-1'],
				{
					projectRoles: ['project:personalOwner'],
					credentialRoles: ['credential:owner'],
				},
				ctx,
			),
		).resolves.toEqual(['credential-1']);
		expect(accessRepository.findCredentialIdsByUserAndRoles).toHaveBeenCalledWith(
			['user-1'],
			['project:personalOwner'],
			['credential:owner'],
			ctx,
		);
	});

	describe('scope classification', () => {
		it.each([
			{ scopes: ['credential:read'] as Scope[], expected: true },
			{ scopes: ['credential:read', 'credential:list'] as Scope[], expected: false },
			{ scopes: ['credential:update'] as Scope[], expected: false },
			{ scopes: [] as Scope[], expected: false },
		])('classifies read-only access for $scopes', ({ scopes, expected }) => {
			expect(service.hasGlobalReadOnlyAccess(scopes)).toBe(expected);
		});

		it.each([
			{ scopes: ['credential:connect'] as Scope[], expected: true },
			{ scopes: ['credential:connect', 'credential:read'] as Scope[], expected: false },
			{ scopes: ['credential:read'] as Scope[], expected: false },
			{ scopes: [] as Scope[], expected: false },
		])('classifies connect access for $scopes', ({ scopes, expected }) => {
			expect(service.hasGlobalConnectAccess(scopes)).toBe(expected);
		});
	});

	describe('findCredentialForUser', () => {
		it('does not load instance credentials unless the caller requests them', async () => {
			await service.findCredentialForUser('credential-1', owner, ['credential:read']);

			expect(accessRepository.findInstanceCredentialById).not.toHaveBeenCalled();
		});

		it('does not load instance credentials for a member', async () => {
			await service.findCredentialForUser('credential-1', member, ['credential:read'], {
				includeInstanceCredentials: true,
			});

			expect(accessRepository.findInstanceCredentialById).not.toHaveBeenCalled();
		});

		it('does not fall back to a global credential for write scopes', async () => {
			await expect(
				service.findCredentialForUser('credential-1', member, ['credential:update']),
			).resolves.toBeNull();

			expect(accessRepository.findGlobalProjectCredentialById).not.toHaveBeenCalled();
		});

		it('does not fall back to a global credential for multiple scopes', async () => {
			await service.findCredentialForUser('credential-1', member, [
				'credential:read',
				'credential:list',
			]);

			expect(accessRepository.findGlobalProjectCredentialById).not.toHaveBeenCalled();
		});

		it('returns a project credential before checking global access', async () => {
			const credential = mock<CredentialsEntity>({ id: 'credential-1' });
			accessRepository.findProjectCredentialForUser.mockResolvedValue(credential);

			await expect(
				service.findCredentialForUser('credential-1', member, ['credential:read']),
			).resolves.toBe(credential);
			expect(accessRepository.findGlobalProjectCredentialById).not.toHaveBeenCalled();
		});

		it('propagates role resolution failures', async () => {
			roleService.rolesWithScope.mockRejectedValueOnce(new Error('role lookup failed'));

			await expect(
				service.findCredentialForUser('credential-1', member, ['credential:read']),
			).rejects.toThrow('role lookup failed');
		});

		it('uses custom roles returned by the role service', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'project' ? ['project:custom'] : ['credential:custom'],
			);

			await service.findCredentialForUser('credential-1', member, ['credential:read']);

			expect(accessRepository.findProjectCredentialForUser).toHaveBeenCalledWith('credential-1', {
				userId: member.id,
				projectRoles: ['project:custom'],
				credentialRoles: ['credential:custom'],
			});
		});
	});

	describe('global visibility and use', () => {
		const viewOnlyUser = makeCustomUser('view-only', ['credential:read']);
		const useUser = makeCustomUser('use-user', ['credential:read', 'credential:use']);

		it('uses sharing access for a view-only credential lookup', async () => {
			await service.findCredentialForUser('credential-1', viewOnlyUser, ['credential:read']);

			expect(accessRepository.findProjectCredentialForUser).toHaveBeenCalledWith(
				'credential-1',
				expect.objectContaining({ userId: viewOnlyUser.id }),
			);
		});

		it('uses the global override for a visibility-only credential lookup', async () => {
			await service.findCredentialForUser('credential-1', viewOnlyUser, ['credential:read'], {
				visibilityOnly: true,
			});

			expect(accessRepository.findProjectCredentialForUser).toHaveBeenCalledWith(
				'credential-1',
				null,
			);
		});

		it('uses the global override when credential use is granted', async () => {
			await service.findCredentialForUser('credential-1', useUser, ['credential:read']);

			expect(accessRepository.findProjectCredentialForUser).toHaveBeenCalledWith(
				'credential-1',
				null,
			);
		});

		it('uses sharing access for view-only credential ids', async () => {
			await service.findCredentialIdsWithScopeForUser(['credential-1'], viewOnlyUser, [
				'credential:read',
			]);

			expect(accessRepository.findProjectCredentialIdsForUser).toHaveBeenCalledWith(
				['credential-1'],
				expect.objectContaining({ userId: viewOnlyUser.id }),
			);
		});

		it('uses the global override for visibility-only credential ids', async () => {
			await service.findCredentialIdsWithScopeForUser(
				['credential-1'],
				viewOnlyUser,
				['credential:read'],
				{ visibilityOnly: true },
			);

			expect(accessRepository.findProjectCredentialIdsForUser).toHaveBeenCalledWith(
				['credential-1'],
				null,
			);
		});
	});

	describe('findCredentialsForUser', () => {
		it('loads access roles through the repository callback', async () => {
			useRepositoryRoleLoader();

			await service.findCredentialsForUser(member, ['credential:read']);

			expectRepositoryRoleLoader();
		});

		it('does not include global credentials for a write scope', async () => {
			await service.findCredentialsForUser(member, ['credential:update']);

			expect(accessRepository.findGlobalProjectCredentials).not.toHaveBeenCalled();
		});

		it('does not include global credentials for multiple scopes', async () => {
			await service.findCredentialsForUser(member, ['credential:read', 'credential:list']);

			expect(accessRepository.findGlobalProjectCredentials).not.toHaveBeenCalled();
		});

		it('keeps project and credential role namespaces separate', async () => {
			roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'project' ? ['project:custom'] : ['credential:custom'],
			);

			await service.findCredentialsForUser(member, ['credential:read']);

			expect(accessRepository.findProjectCredentialsForUser).toHaveBeenCalledWith({
				userId: member.id,
				projectRoles: ['project:custom'],
				credentialRoles: ['credential:custom'],
			});
		});

		it('propagates partial role resolution failures', async () => {
			roleService.rolesWithScope
				.mockResolvedValueOnce(['project:admin'])
				.mockRejectedValueOnce(new Error('credential roles failed'));

			await expect(service.findCredentialsForUser(member, ['credential:read'])).rejects.toThrow(
				'credential roles failed',
			);
		});
	});

	describe('findAllCredentialsForUser', () => {
		it('does not load global credentials without the include flag', async () => {
			await service.findAllCredentialsForUser(member, ['credential:read']);

			expect(accessRepository.findGlobalProjectCredentials).not.toHaveBeenCalled();
		});

		it('uses the global override for an owner', async () => {
			await service.findAllCredentialsForUser(owner, ['credential:read']);

			expect(accessRepository.findAllProjectCredentialsForUser).toHaveBeenCalledWith(null, {});
			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
		});
	});

	describe('findCredentialIdsWithScopeForUser', () => {
		it('short-circuits empty input', async () => {
			await expect(
				service.findCredentialIdsWithScopeForUser([], member, ['credential:read']),
			).resolves.toEqual(new Set());

			expect(accessRepository.findProjectCredentialIdsForUser).not.toHaveBeenCalled();
		});

		it('uses the global override for an owner', async () => {
			await service.findCredentialIdsWithScopeForUser(['credential-1'], owner, ['credential:read']);

			expect(accessRepository.findProjectCredentialIdsForUser).toHaveBeenCalledWith(
				['credential-1'],
				null,
			);
		});

		it('forces sharing access when the global override is ignored', async () => {
			await service.findCredentialIdsWithScopeForUser(
				['credential-1'],
				owner,
				['credential:read'],
				{ ignoreGlobalOverride: true },
			);

			expect(accessRepository.findProjectCredentialIdsForUser).toHaveBeenCalledWith(
				['credential-1'],
				expect.objectContaining({ userId: owner.id }),
			);
			expect(accessRepository.findGlobalProjectCredentialIds).not.toHaveBeenCalled();
		});

		it('does not load global ids for write scopes', async () => {
			await service.findCredentialIdsWithScopeForUser(['credential-1'], member, [
				'credential:update',
			]);

			expect(accessRepository.findGlobalProjectCredentialIds).not.toHaveBeenCalled();
		});
	});

	describe('findUnusableCredentialsForUser', () => {
		it('short-circuits empty input', async () => {
			await expect(service.findUnusableCredentialsForUser(member, [])).resolves.toEqual([]);
			expect(accessRepository.findCredentialNames).not.toHaveBeenCalled();
		});

		it('describes every credential when the user cannot be resolved', async () => {
			accessRepository.findCredentialNames.mockResolvedValue([
				{ id: 'credential-1', name: 'Credential' },
			]);

			await expect(
				service.findUnusableCredentialsForUser(null, ['credential-1', 'missing']),
			).resolves.toEqual([
				{ id: 'credential-1', name: 'Credential', exists: true, ownerProject: null },
				{ id: 'missing', name: 'missing', exists: false, ownerProject: null },
			]);
			expect(accessRepository.findProjectCredentialIdsForUser).not.toHaveBeenCalled();
		});

		it('reports deleted credentials to a user with global use access', async () => {
			accessRepository.findExistingCredentialIds.mockResolvedValue(['existing']);

			await expect(
				service.findUnusableCredentialsForUser(owner, ['existing', 'missing']),
			).resolves.toEqual([{ id: 'missing', name: 'missing', exists: false, ownerProject: null }]);
		});

		it('does not use instance-wide access when it is ignored', async () => {
			accessRepository.findProjectCredentialIdsForUser.mockResolvedValue(new Set());

			await service.findUnusableCredentialsForUser(owner, ['credential-1'], {
				ignoreGlobalUseScope: true,
			});

			expect(accessRepository.findExistingCredentialIds).not.toHaveBeenCalled();
			expect(accessRepository.findProjectCredentialIdsForUser).toHaveBeenCalled();
		});

		it('returns no unusable credentials when personal access remains', async () => {
			accessRepository.findProjectCredentialIdsForUser.mockResolvedValue(new Set(['credential-1']));

			await expect(
				service.findUnusableCredentialsForUser(owner, ['credential-1'], {
					ignoreGlobalUseScope: true,
				}),
			).resolves.toEqual([]);
			expect(accessRepository.findCredentialNames).not.toHaveBeenCalled();
		});

		it('does not grant universal use to a view-only global role', async () => {
			const viewOnlyUser = makeCustomUser('view-only-user', ['credential:read']);
			accessRepository.findProjectCredentialIdsForUser.mockResolvedValue(new Set());

			await service.findUnusableCredentialsForUser(viewOnlyUser, ['credential-1']);

			expect(accessRepository.findExistingCredentialIds).not.toHaveBeenCalled();
			expect(accessRepository.findProjectCredentialIdsForUser).toHaveBeenCalledWith(
				['credential-1'],
				expect.objectContaining({ userId: viewOnlyUser.id }),
			);
		});
	});

	describe('getCredentialIdsByUserAndRole', () => {
		it('loads roles through the repository callback', async () => {
			useRepositoryRoleLoader();

			await service.getCredentialIdsByUserAndRole(['user-1'], {
				scopes: ['credential:read'],
			});

			expectRepositoryRoleLoader();
		});

		it('resolves roles when scopes are provided', async () => {
			await service.getCredentialIdsByUserAndRole(['user-1'], {
				scopes: ['credential:read'],
			});

			expect(roleService.rolesWithScope).toHaveBeenCalledWith(
				'project',
				['credential:read'],
				expect.any(Function),
			);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith(
				'credential',
				['credential:read'],
				expect.any(Function),
			);
		});

		it('does not resolve roles when direct roles are provided', async () => {
			await service.getCredentialIdsByUserAndRole(['user-1'], {
				projectRoles: ['project:admin'],
				credentialRoles: ['credential:user'],
			});

			expect(roleService.rolesWithScope).not.toHaveBeenCalled();
		});

		it('propagates role resolution failures', async () => {
			roleService.rolesWithScope.mockRejectedValueOnce(new Error('role lookup failed'));

			await expect(
				service.getCredentialIdsByUserAndRole(['user-1'], {
					scopes: ['credential:read'],
				}),
			).rejects.toThrow('role lookup failed');
		});
	});

	describe('findGlobalCredentialById', () => {
		it('requests shared projects only when required', async () => {
			await service.findGlobalCredentialById('credential-1', { shared: { project: true } });

			expect(accessRepository.findGlobalProjectCredentialById).toHaveBeenCalledWith(
				'credential-1',
				true,
			);
		});

		it('propagates repository errors', async () => {
			accessRepository.findGlobalProjectCredentialById.mockRejectedValueOnce(
				new Error('database failed'),
			);

			await expect(service.findGlobalCredentialById('credential-1')).rejects.toThrow(
				'database failed',
			);
		});
	});
});
