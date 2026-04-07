import { testDb } from '@n8n/backend-test-utils';
import {
	AuthIdentity,
	AuthIdentityRepository,
	GLOBAL_ADMIN_ROLE,
	ProjectRepository,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import type { ExternalTokenClaims } from '@/modules/token-exchange/token-exchange.schemas';
import { IdentityResolutionService } from '@/modules/token-exchange/services/identity-resolution.service';

import { createOwner, createUser } from '../shared/db/users';

let service: IdentityResolutionService;
let userRepository: UserRepository;
let authIdentityRepository: AuthIdentityRepository;
let projectRepository: ProjectRepository;

beforeAll(async () => {
	await testDb.init();

	service = Container.get(IdentityResolutionService);
	userRepository = Container.get(UserRepository);
	authIdentityRepository = Container.get(AuthIdentityRepository);
	projectRepository = Container.get(ProjectRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['AuthIdentity', 'ProjectRelation', 'Project', 'User']);
});

const baseClaims: ExternalTokenClaims = {
	sub: 'ext-sub-1',
	iss: 'https://issuer.example.com',
	aud: 'n8n',
	iat: Math.floor(Date.now() / 1000),
	exp: Math.floor(Date.now() / 1000) + 30,
	jti: 'jti-1',
	email: 'resolve-test@example.com',
	given_name: 'Jane',
	family_name: 'Doe',
};

describe('IdentityResolutionService (integration)', () => {
	describe('Path 1 — known sub', () => {
		it('should resolve user by auth identity and return role with scopes', async () => {
			const user = await createUser({ email: 'known@example.com' });
			await authIdentityRepository.save(AuthIdentity.create(user, 'ext-known', 'token-exchange'));

			const result = await service.resolve({
				...baseClaims,
				sub: 'ext-known',
				email: 'known@example.com',
			});

			expect(result.id).toBe(user.id);
			expect(result.email).toBe('known@example.com');
			expect(result.role).toBeDefined();
			expect(result.role.slug).toBe('global:member');
			expect(result.role.scopes.length).toBeGreaterThan(0);
		});

		it('should not update profile when given_name and family_name are unchanged', async () => {
			const user = await createUser({
				email: 'unchanged@example.com',
				firstName: 'Same',
				lastName: 'Name',
			});
			await authIdentityRepository.save(
				AuthIdentity.create(user, 'ext-unchanged', 'token-exchange'),
			);

			const result = await service.resolve({
				...baseClaims,
				sub: 'ext-unchanged',
				email: 'unchanged@example.com',
				given_name: 'Same',
				family_name: 'Name',
			});

			expect(result.id).toBe(user.id);

			const dbUser = await userRepository.findOneBy({ id: user.id });
			expect(dbUser!.firstName).toBe('Same');
			expect(dbUser!.lastName).toBe('Name');
		});
	});

	describe('Path 2 — email fallback', () => {
		it('should link identity to existing user and resolve by sub on next call', async () => {
			const user = await createUser({ email: 'fallback@example.com' });
			const claims: ExternalTokenClaims = {
				...baseClaims,
				sub: 'ext-new-sub',
				email: 'fallback@example.com',
			};

			// First call: email fallback creates the identity link
			const result = await service.resolve(claims);
			expect(result.id).toBe(user.id);

			// Second call: should now resolve via Path 1 (known sub),
			// proving the identity was correctly linked to the user
			const secondResult = await service.resolve(claims);
			expect(secondResult.id).toBe(user.id);
			expect(secondResult.role).toBeDefined();
			expect(secondResult.role.slug).toBe('global:member');
		});

		it('should update role when linking identity via email fallback', async () => {
			const user = await createUser({ email: 'fallback-role@example.com' });

			const result = await service.resolve(
				{
					...baseClaims,
					sub: 'ext-fallback-role',
					email: 'fallback-role@example.com',
					role: 'global:admin',
				},
				['global:admin'],
			);

			expect(result.id).toBe(user.id);
			expect(result.role.slug).toBe('global:admin');

			const dbUser = await userRepository.findOne({
				where: { id: user.id },
				relations: ['role'],
			});
			expect(dbUser!.role.slug).toBe('global:admin');
		});

		it('should match existing user when email claim has different casing', async () => {
			const user = await createUser({ email: 'casetest@example.com' });

			const result = await service.resolve({
				...baseClaims,
				sub: 'ext-case',
				email: 'CaseTest@Example.COM',
			});

			expect(result.id).toBe(user.id);

			const identity = await authIdentityRepository.findOne({
				where: { providerId: 'ext-case', providerType: 'token-exchange' },
			});
			expect(identity).toBeDefined();
			expect(identity!.userId).toBe(user.id);
		});
	});

	describe('Path 3 — JIT provisioning', () => {
		it('should create user, personal project, and auth identity in a transaction', async () => {
			const claims: ExternalTokenClaims = {
				...baseClaims,
				sub: 'ext-jit',
				email: 'jit@example.com',
				given_name: 'Jay',
				family_name: 'Tee',
			};

			const result = await service.resolve(claims);

			expect(result.email).toBe('jit@example.com');
			expect(result.firstName).toBe('Jay');
			expect(result.lastName).toBe('Tee');
			expect(result.role.slug).toBe('global:member');
			expect(result.role.scopes.length).toBeGreaterThan(0);

			const dbUser = await userRepository.findOne({
				where: { id: result.id },
				select: ['id', 'password'],
			});
			expect(dbUser!.password).toBe('!token-exchange-no-password');

			const identity = await authIdentityRepository.findOne({
				where: { providerId: 'ext-jit', providerType: 'token-exchange' },
			});
			expect(identity).toBeDefined();
			expect(identity!.userId).toBe(result.id);

			const project = await projectRepository.getPersonalProjectForUser(result.id);
			expect(project).toBeDefined();
		});

		it.each([
			{
				scenario: 'global:owner role',
				role: 'global:owner',
				allowedRoles: undefined,
				errorMsg: 'Cannot provision global:owner role via token exchange',
			},
			{
				scenario: 'role not in allowedRoles',
				role: 'global:admin',
				allowedRoles: ['global:member'],
				errorMsg: "Role 'global:admin' is not allowed for this token exchange key",
			},
		])('should reject $scenario for new users', async ({ role, allowedRoles, errorMsg }) => {
			await expect(
				service.resolve(
					{ ...baseClaims, sub: 'ext-rejected', email: 'rejected@example.com', role },
					allowedRoles,
				),
			).rejects.toThrow(errorMsg);
		});

		it('should throw when email is missing and no identity match exists', async () => {
			const claimsWithoutEmail = { ...baseClaims, sub: 'ext-no-email', email: undefined };

			await expect(service.resolve(claimsWithoutEmail)).rejects.toThrow(
				'Email claim is required for user provisioning',
			);
		});

		it('should throw on unknown role claim for new user', async () => {
			await expect(
				service.resolve({
					...baseClaims,
					sub: 'ext-jit-unknown-role',
					email: 'jit-unknown-role@example.com',
					role: 'global:nonsense',
				}),
			).rejects.toThrow("Unrecognized role 'global:nonsense' cannot be assigned to new user");
		});

		it('should assign role from allowedRoles when provisioning new user', async () => {
			const result = await service.resolve(
				{
					...baseClaims,
					sub: 'ext-jit-admin',
					email: 'jit-admin@example.com',
					role: 'global:admin',
				},
				['global:admin', 'global:member'],
			);

			expect(result.role.slug).toBe('global:admin');

			const dbUser = await userRepository.findOne({
				where: { id: result.id },
				relations: ['role'],
			});
			expect(dbUser!.role.slug).toBe('global:admin');
		});
	});

	describe('profile and role sync', () => {
		it('should allow global:owner user to log in without changing their role', async () => {
			const owner = await createOwner();
			await authIdentityRepository.save(AuthIdentity.create(owner, 'ext-owner', 'token-exchange'));

			const result = await service.resolve({
				...baseClaims,
				sub: 'ext-owner',
				email: owner.email,
				role: 'global:owner',
			});

			expect(result.id).toBe(owner.id);
			expect(result.role.slug).toBe('global:owner');

			const dbUser = await userRepository.findOne({
				where: { id: owner.id },
				relations: ['role'],
			});
			expect(dbUser!.role.slug).toBe('global:owner');
		});

		it('should throw when claimed role is not in allowedRoles for known identity', async () => {
			const admin = await createUser({ email: 'admin-keep@example.com', role: GLOBAL_ADMIN_ROLE });
			await authIdentityRepository.save(
				AuthIdentity.create(admin, 'ext-admin-keep', 'token-exchange'),
			);

			await expect(
				service.resolve(
					{
						...baseClaims,
						sub: 'ext-admin-keep',
						email: 'admin-keep@example.com',
						role: 'global:admin',
					},
					['global:member'],
				),
			).rejects.toThrow("Role 'global:admin' is not allowed for this token exchange key");
		});

		it('should throw when claimed role is not in allowedRoles for email fallback', async () => {
			await createUser({ email: 'admin-email@example.com', role: GLOBAL_ADMIN_ROLE });

			await expect(
				service.resolve(
					{
						...baseClaims,
						sub: 'ext-admin-email',
						email: 'admin-email@example.com',
						role: 'global:admin',
					},
					['global:member'],
				),
			).rejects.toThrow("Role 'global:admin' is not allowed for this token exchange key");

			// Ensure no orphaned AuthIdentity was persisted before the role check
			const orphanedIdentity = await authIdentityRepository.findOne({
				where: { providerId: 'ext-admin-email', providerType: 'token-exchange' },
			});
			expect(orphanedIdentity).toBeNull();
		});

		it('should ignore unknown role claim for existing user', async () => {
			const user = await createUser({ email: 'unknown-role@example.com' });
			await authIdentityRepository.save(
				AuthIdentity.create(user, 'ext-unknown-role', 'token-exchange'),
			);

			const result = await service.resolve({
				...baseClaims,
				sub: 'ext-unknown-role',
				email: 'unknown-role@example.com',
				role: 'global:nonsense',
			});

			expect(result.id).toBe(user.id);
			expect(result.role.slug).toBe('global:member');
		});

		it('should ignore global:owner role claim for non-owner user', async () => {
			const user = await createUser({ email: 'escalation@example.com' });
			await authIdentityRepository.save(
				AuthIdentity.create(user, 'ext-escalation', 'token-exchange'),
			);

			const result = await service.resolve({
				...baseClaims,
				sub: 'ext-escalation',
				email: 'escalation@example.com',
				role: 'global:owner',
			});

			expect(result.id).toBe(user.id);
			expect(result.role.slug).toBe('global:member');
		});

		it('should downgrade admin to member when role claim is global:member', async () => {
			const admin = await createUser({
				email: 'downgrade@example.com',
				role: GLOBAL_ADMIN_ROLE,
			});
			await authIdentityRepository.save(
				AuthIdentity.create(admin, 'ext-downgrade', 'token-exchange'),
			);

			const result = await service.resolve(
				{
					...baseClaims,
					sub: 'ext-downgrade',
					email: 'downgrade@example.com',
					role: 'global:member',
				},
				['global:admin', 'global:member'],
			);

			expect(result.id).toBe(admin.id);
			expect(result.role.slug).toBe('global:member');

			const dbUser = await userRepository.findOne({
				where: { id: admin.id },
				relations: ['role'],
			});
			expect(dbUser!.role.slug).toBe('global:member');
		});

		it('should update profile fields and role, persisting changes to the database', async () => {
			const user = await createUser({
				email: 'sync@example.com',
				firstName: 'Old',
				lastName: 'Name',
			});
			await authIdentityRepository.save(AuthIdentity.create(user, 'ext-sync', 'token-exchange'));

			const result = await service.resolve(
				{
					...baseClaims,
					sub: 'ext-sync',
					email: 'sync@example.com',
					given_name: 'New',
					family_name: 'Last',
					role: 'global:admin',
				},
				['global:admin'],
			);

			expect(result.firstName).toBe('New');
			expect(result.lastName).toBe('Last');
			expect(result.role).toEqual(expect.objectContaining({ slug: 'global:admin' }));

			const dbUser = await userRepository.findOne({
				where: { id: user.id },
				relations: ['role'],
			});
			expect(dbUser!.firstName).toBe('New');
			expect(dbUser!.lastName).toBe('Last');
			expect(dbUser!.role.slug).toBe('global:admin');
			expect(dbUser!.role.scopes.length).toBeGreaterThan(0);
		});
	});
});
