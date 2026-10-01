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

import type { RoleService } from '@n8n/backend-services';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';

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
});
