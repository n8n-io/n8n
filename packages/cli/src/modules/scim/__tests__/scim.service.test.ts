import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { Mocked } from 'vitest';
import type { Role, RoleRepository, User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@n8n/backend-services';
import type { PasswordUtility } from '@/services/password.utility';
import type { UrlService } from '@n8n/backend-services';

import {
	ScimConflictError,
	ScimInvalidFilterError,
	ScimInvalidValueError,
	ScimResourceNotFoundError,
} from '../scim.errors';
import type { ScimUserRepository } from '../database/scim-user.repository';
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
	let roleRepository: Mocked<RoleRepository>;
	let urlService: Mocked<UrlService>;
	let eventService: Mocked<EventService>;
	let passwordUtility: Mocked<PasswordUtility>;
	let globalConfig: GlobalConfig;
	let scimUserRepository: Mocked<ScimUserRepository>;
	let service: ScimService;

	beforeEach(() => {
		userRepository = mock<UserRepository>();
		scimUserRepository = mock<ScimUserRepository>();
		roleRepository = mock<RoleRepository>();
		urlService = mock<UrlService>();
		eventService = mock<EventService>();
		passwordUtility = mock<PasswordUtility>();
		globalConfig = {
			sso: { oidc: { loginEnabled: false }, saml: { loginEnabled: true } },
		} as GlobalConfig;

		urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
		passwordUtility.hash.mockResolvedValue('hashed-password');

		service = new ScimService(
			mock<Logger>(),
			userRepository,
			scimUserRepository,
			roleRepository,
			urlService,
			globalConfig,
			passwordUtility,
			eventService,
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

		it('should create the user with the global role sent in roles', async () => {
			const adminRole = { slug: 'global:admin', roleType: 'global' } as Role;
			const createdUser = createTestUser({ id: 'new-user', role: adminRole });
			userRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue(createdUser);
			roleRepository.findOne.mockResolvedValue(adminRole);
			provisions(createdUser);

			await service.createUser({
				...scimUserCreate,
				roles: [{ value: 'global:admin', primary: true }],
			});

			expect(roleRepository.findOne).toHaveBeenCalledWith({
				where: { slug: 'global:admin', roleType: 'global' },
			});
			expect(scimUserRepository.createProvisioned).toHaveBeenCalledWith(
				expect.objectContaining({ role: { slug: 'global:admin' } }),
				expect.anything(),
				{},
			);
		});

		it('should reject a role that is not an existing global role', async () => {
			userRepository.findOne.mockResolvedValue(null);
			roleRepository.findOne.mockResolvedValue(null);

			await expect(
				service.createUser({ ...scimUserCreate, roles: [{ value: 'project:admin' }] }),
			).rejects.toThrow(ScimInvalidValueError);
			expect(scimUserRepository.createProvisioned).not.toHaveBeenCalled();
		});

		it('should reject more than one role entry', async () => {
			userRepository.findOne.mockResolvedValue(null);

			await expect(
				service.createUser({
					...scimUserCreate,
					roles: [{ value: 'global:admin' }, { value: 'global:member' }],
				}),
			).rejects.toThrow(ScimInvalidValueError);
			expect(roleRepository.findOne).not.toHaveBeenCalled();
			expect(scimUserRepository.createProvisioned).not.toHaveBeenCalled();
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
			expect(userRepository.save).toHaveBeenCalledWith(user);
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

			expect(userRepository.save).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
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

		it('should throw not-found for unknown users', async () => {
			userRepository.findOne.mockResolvedValue(null);

			await expect(service.updateUser('missing', putBody)).rejects.toThrow(
				ScimResourceNotFoundError,
			);
		});
	});

	describe('role provisioning', () => {
		const memberRole = { slug: 'global:member', roleType: 'global' } as Role;
		const adminRole = { slug: 'global:admin', roleType: 'global' } as Role;

		const putBodyWithRole = (slug: string) => ({
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
			userName: 'user@example.com',
			roles: [{ value: slug, primary: true }],
			active: true,
		});

		it('should apply a valid role change via PUT', async () => {
			const user = createTestUser({ role: memberRole });
			userRepository.findOne.mockResolvedValue(user);
			roleRepository.findOne.mockResolvedValue(adminRole);

			await service.updateUser('user-1', putBodyWithRole('global:admin'));

			expect(roleRepository.findOne).toHaveBeenCalledWith({
				where: { slug: 'global:admin', roleType: 'global' },
			});
			expect(user.role).toBe(adminRole);
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: ['role'],
			});
		});

		it('should apply a role change via PATCH with a roles path', async () => {
			const user = createTestUser({ role: memberRole });
			userRepository.findOne.mockResolvedValue(user);
			roleRepository.findOne.mockResolvedValue(adminRole);

			await service.patchUser('user-1', {
				schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
				Operations: [
					{ op: 'replace', path: 'roles', value: [{ value: 'global:admin', primary: true }] },
				],
			} as Parameters<ScimService['patchUser']>[1]);

			expect(user.role).toBe(adminRole);
		});

		it('should reject an unknown role', async () => {
			const user = createTestUser({ role: memberRole });
			userRepository.findOne.mockResolvedValue(user);
			roleRepository.findOne.mockResolvedValue(null);

			await expect(
				service.updateUser('user-1', putBodyWithRole('global:superuser')),
			).rejects.toThrow(ScimInvalidValueError);
		});

		it('should reject multiple role entries', async () => {
			const user = createTestUser({ role: memberRole });
			userRepository.findOne.mockResolvedValue(user);

			await expect(
				service.updateUser('user-1', {
					schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
					userName: 'user@example.com',
					roles: [{ value: 'global:admin' }, { value: 'global:member' }],
					active: true,
				}),
			).rejects.toThrow(ScimInvalidValueError);
			expect(roleRepository.findOne).not.toHaveBeenCalled();
		});

		it('should never assign the owner role', async () => {
			const user = createTestUser({ role: memberRole });
			userRepository.findOne.mockResolvedValue(user);

			await expect(service.updateUser('user-1', putBodyWithRole('global:owner'))).rejects.toThrow(
				ScimInvalidValueError,
			);
			expect(roleRepository.findOne).not.toHaveBeenCalled();
		});

		it('should never change the role of the instance owner', async () => {
			const owner = createTestUser({
				role: { slug: 'global:owner', roleType: 'global' } as Role,
			});
			userRepository.findOne.mockResolvedValue(owner);
			roleRepository.findOne.mockResolvedValue(adminRole);

			await expect(service.updateUser('user-1', putBodyWithRole('global:admin'))).rejects.toThrow(
				ScimInvalidValueError,
			);
		});

		it('should not persist anything when the role is unchanged', async () => {
			const user = createTestUser({ role: memberRole });
			userRepository.findOne.mockResolvedValue(user);
			roleRepository.findOne.mockResolvedValue(memberRole);

			await service.updateUser('user-1', putBodyWithRole('global:member'));

			expect(userRepository.save).not.toHaveBeenCalled();
		});
	});

	describe('deleteUser', () => {
		it('should soft-delete by disabling the user', async () => {
			const user = createTestUser();
			userRepository.findOne.mockResolvedValue(user);

			await service.deleteUser('user-1');

			expect(user.disabled).toBe(true);
			expect(userRepository.save).toHaveBeenCalledWith(user);
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: ['disabled'],
			});
		});

		it('should throw not-found for unknown users', async () => {
			userRepository.findOne.mockResolvedValue(null);

			await expect(service.deleteUser('missing')).rejects.toThrow(ScimResourceNotFoundError);
		});
	});
});
