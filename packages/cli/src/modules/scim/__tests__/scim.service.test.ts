import type { ScimUserCreateDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { Mocked } from 'vitest';
import { GLOBAL_MEMBER_ROLE } from '@n8n/db';
import type { PersonRepository, Role, User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@n8n/backend-services';
import type { PasswordUtility } from '@/services/password.utility';
import type { UrlService } from '@n8n/backend-services';

import {
	ScimConflictError,
	ScimForbiddenError,
	ScimInvalidFilterError,
	ScimInvalidValueError,
	ScimResourceNotFoundError,
} from '../scim.errors';
import type { ScimUserRepository } from '../database/scim-user.repository';
import type { ScimDeprovisioningService } from '../scim-deprovisioning.service';
import { DEFAULT_SCIM_DEPROVISIONING_POLICY } from '../scim-settings.service';
import { ScimService } from '../scim.service';

const createTestUser = (overrides: Partial<User> = {}): User =>
	({
		id: 'user-1',
		email: 'user@example.com',
		firstName: 'First',
		lastName: 'Last',
		disabled: false,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-02T00:00:00.000Z'),
		authIdentities: [],
		...overrides,
	}) as User;

describe('ScimService', () => {
	let userRepository: Mocked<UserRepository>;
	let personRepository: Mocked<PersonRepository>;
	let urlService: Mocked<UrlService>;
	let eventService: Mocked<EventService>;
	let passwordUtility: Mocked<PasswordUtility>;
	let globalConfig: GlobalConfig;
	let scimUserRepository: Mocked<ScimUserRepository>;
	let scimDeprovisioningService: Mocked<ScimDeprovisioningService>;
	let service: ScimService;

	beforeEach(() => {
		userRepository = mock<UserRepository>();
		personRepository = mock<PersonRepository>();
		// The service loads people through `PersonRepository` and checks emails through
		// `UserRepository`. Both read one ordered mock, so a test sets one call sequence.
		const findOne = async (id: string) => await userRepository.findOne({ where: { id } });
		personRepository.findByIdWithRole.mockImplementation(findOne);
		personRepository.findByIdWithAuthIdentities.mockImplementation(findOne);
		scimUserRepository = mock<ScimUserRepository>();
		urlService = mock<UrlService>();
		eventService = mock<EventService>();
		passwordUtility = mock<PasswordUtility>();
		globalConfig = {
			sso: { oidc: { loginEnabled: false }, saml: { loginEnabled: true } },
		} as GlobalConfig;

		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
		passwordUtility.hash.mockResolvedValue('hashed-password');
		scimDeprovisioningService = mock<ScimDeprovisioningService>();
		scimDeprovisioningService.getPolicy.mockResolvedValue({
			...DEFAULT_SCIM_DEPROVISIONING_POLICY,
		});

		service = new ScimService(
			mock<Logger>(),
			userRepository,
			scimUserRepository,
			urlService,
			globalConfig,
			passwordUtility,
			eventService,
			personRepository,
			scimDeprovisioningService,
		);
	});

	describe('getUserById', () => {
		it('should map the user entity to a SCIM user', async () => {
			const user = createTestUser({
				authIdentities: [
					{ providerId: 'okta-external-id', providerType: 'saml' },
				] as User['authIdentities'],
			});
			userRepository.findOne.mockResolvedValue(user);

			const result = await service.getUserById('user-1');

			expect(result).toMatchObject({
				schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
				id: 'user-1',
				userName: 'user@example.com',
				externalId: 'okta-external-id',
				name: { givenName: 'First', familyName: 'Last' },
				active: true,
				meta: {
					resourceType: 'User',
					location: 'https://n8n.example.com/scim/v2/Users/user-1',
				},
			});
		});

		it('should not expose the role, which SCIM does not manage', async () => {
			userRepository.findOne.mockResolvedValue(
				createTestUser({ role: { slug: 'global:admin' } as Role }),
			);

			const result = await service.getUserById('user-1');

			expect(result).not.toHaveProperty('roles');
		});

		it('should mark disabled users as inactive', async () => {
			userRepository.findOne.mockResolvedValue(createTestUser({ disabled: true }));

			const result = await service.getUserById('user-1');

			expect(result?.active).toBe(false);
		});

		it('should return null when the user does not exist', async () => {
			userRepository.findOne.mockResolvedValue(null);

			expect(await service.getUserById('missing')).toBeNull();
		});
	});

	describe('people only', () => {
		// `UserRepository` would return the account. SCIM must read people through
		// `PersonRepository`, which skips service accounts.
		let serviceAccount: User;

		beforeEach(() => {
			serviceAccount = createTestUser({ id: 'sa-1', email: 'sa@example.com' });
			userRepository.findOne.mockResolvedValue(serviceAccount);
			personRepository.findByIdWithRole.mockResolvedValue(null);
			personRepository.findByIdWithAuthIdentities.mockResolvedValue(null);
		});

		it('does not return a service account', async () => {
			expect(await service.getUserById('sa-1')).toBeNull();
			expect(personRepository.findByIdWithAuthIdentities).toHaveBeenCalledWith('sa-1');
		});

		it('does not change or delete a service account', async () => {
			const patch = { schemas: [], Operations: [{ op: 'replace', path: 'active', value: false }] };

			await expect(service.patchUser('sa-1', patch as never)).rejects.toThrow(
				ScimResourceNotFoundError,
			);
			await expect(
				service.updateUser('sa-1', { schemas: [], userName: 'sa@example.com' } as never),
			).rejects.toThrow(ScimResourceNotFoundError);
			await expect(service.deleteUser('sa-1')).rejects.toThrow(ScimResourceNotFoundError);
			expect(personRepository.findByIdWithRole).toHaveBeenCalledTimes(3);
			expect(serviceAccount).toEqual(createTestUser({ id: 'sa-1', email: 'sa@example.com' }));
			expect(personRepository.save).not.toHaveBeenCalled();
			expect(userRepository.save).not.toHaveBeenCalled();
		});
	});

	describe('getUsers', () => {
		const pageOf = (users: User[], total = users.length) =>
			scimUserRepository.findPage.mockResolvedValue([users, total]);

		it('should return a SCIM list response with pagination metadata', async () => {
			pageOf([createTestUser()], 5);

			const result = await service.getUsers({ startIndex: 3, count: 2 });

			expect(scimUserRepository.findPage).toHaveBeenCalledWith(
				expect.objectContaining({ skip: 2, take: 2 }),
				{},
			);
			expect(result).toMatchObject({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
				totalResults: 5,
				startIndex: 3,
				itemsPerPage: 1,
			});
		});

		it('should filter by userName', async () => {
			pageOf([createTestUser()]);

			await service.getUsers({ filter: 'userName eq "User@Example.com"' });

			expect(scimUserRepository.findPage).toHaveBeenCalledWith(
				expect.objectContaining({
					filter: { attribute: 'userName', value: 'User@Example.com' },
				}),
				{},
			);
		});

		it('should filter by externalId against SSO auth identities only', async () => {
			pageOf([]);

			await service.getUsers({ filter: 'externalId eq "okta-123"' });

			expect(scimUserRepository.findPage).toHaveBeenCalledWith(
				expect.objectContaining({
					filter: {
						attribute: 'externalId',
						value: 'okta-123',
						providerTypes: ['saml', 'oidc'],
					},
				}),
				{},
			);
		});

		it('should reject unsupported filter expressions', async () => {
			pageOf([]);

			await expect(service.getUsers({ filter: 'displayName co "foo"' })).rejects.toThrow(
				ScimInvalidFilterError,
			);
		});
	});

	// SCIM's `userName` is only a unique identifier (RFC 7643 section 4.1.1), and
	// providers like authentik send a login name there with the address in
	// `emails`. Treating `userName` as the address 500s on every such user.
	describe('email resolution', () => {
		const payload = (over: Record<string, unknown>) => ({
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
			userName: 'grace.hopper',
			name: { givenName: 'Grace', familyName: 'Hopper' },
			active: true,
			...over,
		});

		beforeEach(() => {
			userRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue(createTestUser());
			scimUserRepository.createProvisioned.mockResolvedValue(createTestUser({ id: 'u1' }));
		});

		const emailUsed = () =>
			scimUserRepository.createProvisioned.mock.calls[0][0] as { email: string };

		it('takes the primary address when userName is a login name', async () => {
			await service.createUser(
				payload({
					emails: [
						{ value: 'other@example.com' },
						{ value: 'Grace.Hopper@example.com', primary: true },
					],
				}) as never,
			);

			expect(emailUsed().email).toBe('grace.hopper@example.com');
		});

		it('falls back to the first address when none is marked primary', async () => {
			await service.createUser(payload({ emails: [{ value: 'first@example.com' }] }) as never);

			expect(emailUsed().email).toBe('first@example.com');
		});

		it('still accepts providers that put the address in userName', async () => {
			await service.createUser(payload({ userName: 'Ada@example.com' }) as never);

			expect(emailUsed().email).toBe('ada@example.com');
		});

		it('rejects an unusable userName with a 400, not a 500', async () => {
			await expect(service.createUser(payload({}) as never)).rejects.toThrow(ScimInvalidValueError);
		});
	});

	describe('createUser', () => {
		const scimUserCreate = {
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
			userName: 'New.User@Example.com',
			externalId: 'okta-123',
			name: { givenName: 'New', familyName: 'User' },
			active: true,
		};

		const provisions = (user: User) => scimUserRepository.createProvisioned.mockResolvedValue(user);

		it('should reject duplicate userName with a conflict', async () => {
			userRepository.findOne.mockResolvedValue(createTestUser());

			await expect(service.createUser(scimUserCreate)).rejects.toThrow(ScimConflictError);
		});

		it('should create a member with a personal project and an unusable password', async () => {
			const createdUser = createTestUser({ id: 'new-user', email: 'new.user@example.com' });
			userRepository.findOne
				.mockResolvedValueOnce(null) // duplicate check
				.mockResolvedValue(createdUser); // getUserById after creation
			provisions(createdUser);

			const result = await service.createUser(scimUserCreate);

			expect(scimUserRepository.createProvisioned).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'new.user@example.com',
					firstName: 'New',
					lastName: 'User',
					role: { slug: 'global:member' },
					password: 'hashed-password',
					disabled: false,
				}),
				expect.anything(),
				{},
			);
			expect(result.id).toBe('new-user');
		});

		it('should link an SSO auth identity when externalId is provided', async () => {
			const createdUser = createTestUser({ id: 'new-user' });
			userRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue(createdUser);
			provisions(createdUser);

			await service.createUser(scimUserCreate);

			// The identity is created in the same unit of work as the user.
			expect(scimUserRepository.createProvisioned).toHaveBeenCalledWith(
				expect.anything(),
				{ providerId: 'okta-123', providerType: 'saml' },
				{},
			);
		});

		it('should emit a user-signed-up event', async () => {
			const createdUser = createTestUser({ id: 'new-user' });
			userRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue(createdUser);
			provisions(createdUser);

			await service.createUser(scimUserCreate);

			expect(eventService.emit).toHaveBeenCalledWith('user-signed-up', {
				user: createdUser,
				userType: 'saml',
				wasDisabledLdapUser: false,
			});
		});

		it('should create a member when roles are sent, since SCIM does not manage roles', async () => {
			const createdUser = createTestUser({ id: 'new-user' });
			userRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue(createdUser);
			provisions(createdUser);

			await service.createUser({
				...scimUserCreate,
				roles: [{ value: 'global:admin', primary: true }],
			} as ScimUserCreateDto);

			expect(scimUserRepository.createProvisioned).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: 'global:member' } }),
				expect.anything(),
				{},
			);
		});

		it('should create an active user when active is omitted', async () => {
			const createdUser = createTestUser({ id: 'new-user' });
			userRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue(createdUser);
			provisions(createdUser);

			const { active: _, ...withoutActive } = scimUserCreate;
			await service.createUser(withoutActive);

			expect(scimUserRepository.createProvisioned).toHaveBeenCalledWith(
				expect.objectContaining({ disabled: false }),
				expect.anything(),
				{},
			);
		});
	});

	describe('patchUser', () => {
		const patchRequest = (operations: Array<{ op: string; path?: string; value?: unknown }>) =>
			({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
				Operations: operations,
			}) as Parameters<ScimService['patchUser']>[1];

		it('should throw not-found for unknown users', async () => {
			userRepository.findOne.mockResolvedValue(null);

			await expect(
				service.patchUser(
					'missing',
					patchRequest([{ op: 'replace', path: 'active', value: false }]),
				),
			).rejects.toThrow(ScimResourceNotFoundError);
		});

		it('should deactivate a user via an explicit active path', async () => {
			const user = createTestUser();
			userRepository.findOne.mockResolvedValue(user);

			await service.patchUser(
				'user-1',
				patchRequest([{ op: 'replace', path: 'active', value: false }]),
			);

			expect(user.disabled).toBe(true);
			expect(personRepository.save).toHaveBeenCalledWith(user);
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: ['disabled'],
			});
		});

		it('should apply path-less object values as sent by Entra ID', async () => {
			const user = createTestUser();
			userRepository.findOne.mockResolvedValue(user);

			await service.patchUser(
				'user-1',
				patchRequest([
					{
						op: 'replace',
						value: { active: false, name: { givenName: 'Updated' } },
					},
				]),
			);

			expect(user.disabled).toBe(true);
			expect(user.firstName).toBe('Updated');
		});

		it('should update the email via a work-email path as sent by Okta', async () => {
			const user = createTestUser();
			userRepository.findOne.mockResolvedValue(user);

			await service.patchUser(
				'user-1',
				patchRequest([
					{ op: 'replace', path: 'emails[type eq "work"].value', value: 'Renamed@Example.com' },
				]),
			);

			expect(user.email).toBe('renamed@example.com');
		});

		it('should update the email via a userName replace', async () => {
			const user = createTestUser();
			userRepository.findOne.mockResolvedValue(user);

			await service.patchUser(
				'user-1',
				patchRequest([{ op: 'replace', path: 'userName', value: 'renamed@example.com' }]),
			);

			expect(user.email).toBe('renamed@example.com');
		});

		it('should reject an email change that collides with another user', async () => {
			const user = createTestUser();
			const otherUser = createTestUser({ id: 'user-2', email: 'taken@example.com' });
			userRepository.findOne
				.mockResolvedValueOnce(user) // load target user
				.mockResolvedValueOnce(otherUser); // conflict check on save

			await expect(
				service.patchUser(
					'user-1',
					patchRequest([{ op: 'replace', path: 'userName', value: 'taken@example.com' }]),
				),
			).rejects.toThrow(ScimConflictError);
		});

		it('should not persist anything when no supported attribute changed', async () => {
			const user = createTestUser();
			userRepository.findOne.mockResolvedValue(user);

			await service.patchUser('user-1', patchRequest([{ op: 'remove', path: 'phoneNumbers' }]));

			expect(personRepository.save).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('should not persist anything when the values equal the stored state', async () => {
			const user = createTestUser({ disabled: true });
			userRepository.findOne.mockResolvedValue(user);

			await service.patchUser(
				'user-1',
				patchRequest([
					{ op: 'replace', path: 'active', value: false },
					{ op: 'replace', path: 'userName', value: user.email.toUpperCase() },
					{ op: 'replace', value: { name: { givenName: user.firstName } } },
				]),
			);

			expect(personRepository.save).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('should record only the fields that changed', async () => {
			const user = createTestUser();
			userRepository.findOne.mockResolvedValue(user);

			await service.patchUser(
				'user-1',
				patchRequest([
					{ op: 'replace', path: 'active', value: true },
					{ op: 'replace', path: 'name.givenName', value: 'Updated' },
				]),
			);

			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: ['firstName'],
			});
		});
	});

	describe('updateUser', () => {
		const putBody = {
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
			userName: 'renamed@example.com',
			name: { givenName: 'Renamed', familyName: 'Person' },
			active: false,
		};

		it('should replace email, name and active state', async () => {
			const user = createTestUser();
			userRepository.findOne
				.mockResolvedValueOnce(user) // load target user
				.mockResolvedValueOnce(null) // conflict check on save
				.mockResolvedValue(user); // getUserById after save

			await service.updateUser('user-1', putBody);

			expect(user.email).toBe('renamed@example.com');
			expect(user.firstName).toBe('Renamed');
			expect(user.lastName).toBe('Person');
			expect(user.disabled).toBe(true);
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: expect.arrayContaining(['email', 'firstName', 'lastName', 'disabled']),
			});
		});

		it('should keep a disabled user disabled when active is omitted', async () => {
			const user = createTestUser({ disabled: true });
			userRepository.findOne.mockResolvedValue(user);

			const { active: _, ...withoutActive } = putBody;
			await service.updateUser('user-1', { ...withoutActive, userName: user.email });

			expect(user.disabled).toBe(true);
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: expect.not.arrayContaining(['disabled']),
			});
		});

		it('should throw not-found for unknown users', async () => {
			userRepository.findOne.mockResolvedValue(null);

			await expect(service.updateUser('missing', putBody)).rejects.toThrow(
				ScimResourceNotFoundError,
			);
		});
	});

	// SSO role mapping owns the instance role. SCIM accepts `roles` so that an
	// IdP does not fail, but never applies it.
	describe('roles', () => {
		const memberRole = { slug: 'global:member', roleType: 'global' } as Role;
		const patchRequest = (operations: Array<{ op: string; path?: string; value?: unknown }>) =>
			({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
				Operations: operations,
			}) as Parameters<ScimService['patchUser']>[1];

		it('should ignore roles sent via PUT', async () => {
			const user = createTestUser({ role: memberRole });
			userRepository.findOne.mockResolvedValue(user);

			await service.updateUser('user-1', {
				schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
				userName: 'user@example.com',
				roles: [{ value: 'global:admin', primary: true }],
				active: true,
			} as ScimUserCreateDto);

			expect(user.role).toBe(memberRole);
			expect(personRepository.save).not.toHaveBeenCalled();
		});

		it.each([
			['a roles path', [{ op: 'replace', path: 'roles', value: [{ value: 'global:admin' }] }]],
			['a path-less value', [{ op: 'replace', value: { roles: [{ value: 'global:admin' }] } }]],
		])('should ignore roles sent via PATCH with %s', async (_, operations) => {
			const user = createTestUser({ role: memberRole });
			userRepository.findOne.mockResolvedValue(user);

			await service.patchUser('user-1', patchRequest(operations));

			expect(user.role).toBe(memberRole);
			expect(personRepository.save).not.toHaveBeenCalled();
		});
	});

	describe('owner guard', () => {
		const ownerRole = { slug: 'global:owner', roleType: 'global' } as Role;
		const createOwner = () =>
			createTestUser({ id: 'owner-1', email: 'owner@example.com', role: ownerRole });
		const patchRequest = (operations: Array<{ op: string; path?: string; value?: unknown }>) =>
			({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
				Operations: operations,
			}) as Parameters<ScimService['patchUser']>[1];
		const putBody = (over: Partial<ScimUserCreateDto> = {}): ScimUserCreateDto => ({
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
			userName: 'owner@example.com',
			...over,
		});

		it.each([
			['userName', [{ op: 'replace', path: 'userName', value: 'new@example.com' }]],
			[
				'a work email',
				[{ op: 'replace', path: 'emails[type eq "work"].value', value: 'new@example.com' }],
			],
			['active', [{ op: 'replace', path: 'active', value: false }]],
			['a path-less active', [{ op: 'replace', value: { active: false } }]],
		])('should reject a PATCH of %s on the owner', async (_, operations) => {
			userRepository.findOne.mockResolvedValue(createOwner());

			await expect(service.patchUser('owner-1', patchRequest(operations))).rejects.toThrow(
				ScimForbiddenError,
			);
			expect(personRepository.save).not.toHaveBeenCalled();
		});

		it.each([
			['a new userName', putBody({ userName: 'new@example.com' })],
			['active false', putBody({ active: false })],
		])('should reject a PUT with %s on the owner', async (_, body) => {
			userRepository.findOne.mockResolvedValue(createOwner());

			await expect(service.updateUser('owner-1', body)).rejects.toThrow(ScimForbiddenError);
			expect(personRepository.save).not.toHaveBeenCalled();
		});

		// The guard blocks a change. Repeating the stored state is not a change.
		it.each([
			[
				'PATCH',
				async () =>
					await service.patchUser(
						'owner-1',
						patchRequest([{ op: 'replace', path: 'active', value: false }]),
					),
			],
			['PUT', async () => await service.updateUser('owner-1', putBody({ active: false }))],
		])('should treat a %s with active false on a disabled owner as a no-op', async (_, request) => {
			const owner = createTestUser({
				id: 'owner-1',
				email: 'owner@example.com',
				role: ownerRole,
				disabled: true,
			});
			userRepository.findOne.mockResolvedValue(owner);

			await request();

			expect(personRepository.save).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('should reject a DELETE of the owner', async () => {
			userRepository.findOne.mockResolvedValue(createOwner());

			await expect(service.deleteUser('owner-1')).rejects.toThrow(ScimForbiddenError);
			expect(personRepository.save).not.toHaveBeenCalled();
		});

		it('should allow a name change and an unchanged email on the owner', async () => {
			const owner = createOwner();
			userRepository.findOne.mockResolvedValue(owner);

			await service.patchUser(
				'owner-1',
				patchRequest([
					{ op: 'replace', path: 'userName', value: 'Owner@Example.com' },
					{ op: 'replace', path: 'name.givenName', value: 'Renamed' },
					{ op: 'replace', path: 'active', value: true },
				]),
			);

			expect(owner.firstName).toBe('Renamed');
			expect(owner.email).toBe('owner@example.com');
			expect(owner.disabled).toBe(false);
			expect(personRepository.save).toHaveBeenCalledWith(owner);
		});
	});

	describe('deleteUser', () => {
		it('should soft-delete by disabling the user', async () => {
			const user = createTestUser();
			userRepository.findOne.mockResolvedValue(user);

			await service.deleteUser('user-1');

			expect(user.disabled).toBe(true);
			expect(personRepository.save).toHaveBeenCalledWith(user);
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: ['disabled'],
			});
		});

		it('should throw not-found for unknown users', async () => {
			userRepository.findOne.mockResolvedValue(null);

			await expect(service.deleteUser('missing')).rejects.toThrow(ScimResourceNotFoundError);
		});

		// The identity provider sends the DELETE again after a failed delete.
		it('should apply the delete policy to a user that an earlier DELETE deactivated', async () => {
			const policy = {
				onDelete: 'delete',
				dataAction: 'transfer',
				transferProjectId: null,
			} as const;
			scimDeprovisioningService.getPolicy.mockResolvedValue(policy);
			const user = createTestUser({ role: GLOBAL_MEMBER_ROLE, disabled: true });
			userRepository.findOne.mockResolvedValue(user);

			await service.deleteUser('user-1');

			expect(scimDeprovisioningService.deleteUser).toHaveBeenCalledWith(user, policy);
		});
	});
});
