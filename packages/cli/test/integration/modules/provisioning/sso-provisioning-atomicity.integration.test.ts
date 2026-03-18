const discoveryMock = jest.fn();
const authorizationCodeGrantMock = jest.fn();
const fetchUserInfoMock = jest.fn();

jest.mock('openid-client', () => ({
	...jest.requireActual('openid-client'),
	discovery: discoveryMock,
	authorizationCodeGrant: authorizationCodeGrantMock,
	fetchUserInfo: fetchUserInfoMock,
}));

import type { OidcConfigDto } from '@n8n/api-types';
import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type * as mocked_oidc_client from 'openid-client';
const real_oidc_client = jest.requireActual('openid-client');

import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { OidcService } from '@/modules/sso-oidc/oidc.service.ee';
import { ProjectService } from '@/services/project.service.ee';
import { UserService } from '@/services/user.service';
import { createOwner } from '@test-integration/db/users';

let mockConfiguration: mocked_oidc_client.Configuration;

beforeAll(async () => {
	await testDb.init();

	mockConfiguration = new real_oidc_client.Configuration(
		{
			issuer: 'https://example.com/auth/realms/n8n',
			client_id: 'test-client-id',
			redirect_uris: ['http://n8n.io/sso/oidc/callback'],
			response_types: ['code'],
			scopes: ['openid', 'profile', 'email'],
			authorization_endpoint: 'https://example.com/auth',
		},
		'test-client-id',
	);
});

afterAll(async () => {
	await testDb.terminate();
});

/**
 * Helper: create OIDC mock tokens with given claims
 */
function createMockTokens(
	claims: Record<string, unknown>,
): mocked_oidc_client.TokenEndpointResponse & mocked_oidc_client.TokenEndpointResponseHelpers {
	return {
		access_token: `mock-access-token-${Math.random()}`,
		id_token: `mock-id-token-${Math.random()}`,
		token_type: 'bearer',
		claims: () =>
			({
				sub: claims.sub as string,
				iss: 'https://example.com/auth/realms/n8n',
				aud: 'test-client-id',
				iat: Math.floor(Date.now() / 1000) - 1000,
				exp: Math.floor(Date.now() / 1000) + 3600,
				...claims,
			}) as mocked_oidc_client.IDToken,
		expiresIn: () => 3600,
	} as mocked_oidc_client.TokenEndpointResponse & mocked_oidc_client.TokenEndpointResponseHelpers;
}

// On SQLite, nested transactions cause deadlocks (the bug manifests as a hang).
// On PostgreSQL, they cause FK constraint violations.
// Either way, these tests should fail before the fix and pass after.
jest.setTimeout(60_000);

describe('SSO Provisioning Atomicity', () => {
	let oidcService: OidcService;
	let userRepository: UserRepository;
	let projectRelationRepository: ProjectRelationRepository;
	let provisioningService: ProvisioningService;
	let owner: Awaited<ReturnType<typeof createOwner>>;

	beforeAll(async () => {
		oidcService = Container.get(OidcService);
		userRepository = Container.get(UserRepository);
		projectRelationRepository = Container.get(ProjectRelationRepository);
		provisioningService = Container.get(ProvisioningService);

		await oidcService.init();
		await provisioningService.init();

		discoveryMock.mockResolvedValue(mockConfiguration);

		const oidcConfig: OidcConfigDto = {
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
			loginEnabled: true,
			prompt: 'consent',
			authenticationContextClassReference: [],
		};
		await oidcService.updateConfig(oidcConfig);

		// Create owner (needed for team projects)
		owner = await createOwner();

		// Enable provisioning
		// @ts-expect-error - provisioningConfig is private
		provisioningService.provisioningConfig = {
			scopesProvisionInstanceRole: true,
			scopesProvisionProjectRoles: true,
			scopesName: 'n8n',
			scopesInstanceRoleClaimName: 'n8n_instance_role',
			scopesProjectsRolesClaimName: 'n8n_projects',
		};
	});

	beforeEach(() => {
		discoveryMock.mockResolvedValue(mockConfiguration);
	});

	/**
	 * Helper: perform OIDC login for a new user with given claims
	 */
	async function oidcLoginNewUser(email: string, extraClaims: Record<string, unknown>) {
		const state = oidcService.generateState();
		const nonce = oidcService.generateNonce();
		const callbackUrl = new URL(
			`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
		);

		const claims = { sub: `oidc-sub-${Math.random()}`, ...extraClaims };
		authorizationCodeGrantMock.mockResolvedValueOnce(createMockTokens(claims));
		fetchUserInfoMock.mockResolvedValueOnce({ email_verified: true, email });

		return await oidcService.loginUser(callbackUrl, state.signed, nonce.signed);
	}

	describe('OIDC new user provisioning', () => {
		it('should create user with project role when provisioning project roles', async () => {
			const project = await createTeamProject('OIDC Project Test', owner);

			const user = await oidcLoginNewUser('oidc-project@test.com', {
				n8n_projects: [`${project.id}:editor`],
			});

			expect(user).toBeDefined();
			expect(user.email).toEqual('oidc-project@test.com');

			// Verify user was assigned to the project
			const relation = await projectRelationRepository.findOne({
				where: { userId: user.id, projectId: project.id },
				relations: ['role'],
			});
			expect(relation).toBeDefined();
			expect(relation!.role.slug).toEqual('project:editor');
		});

		it('should create user with correct instance role when provisioning instance roles', async () => {
			const user = await oidcLoginNewUser('oidc-instance@test.com', {
				n8n_instance_role: 'global:admin',
			});

			expect(user).toBeDefined();
			expect(user.email).toEqual('oidc-instance@test.com');

			// Verify user has the correct instance role
			const userFromDb = await userRepository.findOneOrFail({
				where: { id: user.id },
				relations: ['role'],
			});
			expect(userFromDb.role.slug).toEqual('global:admin');
		});

		it('should create user with both instance role and project role', async () => {
			const project = await createTeamProject('OIDC Both Test', owner);

			const user = await oidcLoginNewUser('oidc-both@test.com', {
				n8n_instance_role: 'global:admin',
				n8n_projects: [`${project.id}:editor`],
			});

			expect(user).toBeDefined();
			expect(user.email).toEqual('oidc-both@test.com');

			// Verify instance role
			const userFromDb = await userRepository.findOneOrFail({
				where: { id: user.id },
				relations: ['role'],
			});
			expect(userFromDb.role.slug).toEqual('global:admin');

			// Verify project role
			const relation = await projectRelationRepository.findOne({
				where: { userId: user.id, projectId: project.id },
				relations: ['role'],
			});
			expect(relation).toBeDefined();
			expect(relation!.role.slug).toEqual('project:editor');
		});
	});

	describe('SAML new user provisioning (atomicity)', () => {
		it('should roll back user creation when project role provisioning fails', async () => {
			const project = await createTeamProject('SAML Project Fail Test', owner);

			// Make addUser throw to simulate provisioning failure
			const projectService = Container.get(ProjectService);
			jest.spyOn(projectService, 'addUser').mockRejectedValueOnce(new Error('Provisioning failed'));

			const { createUserFromSamlAttributes } = await import('@/modules/sso-saml/saml-helpers');

			const samlAttributes = {
				email: 'saml-project-fail@test.com',
				firstName: 'Test',
				lastName: 'User',
				userPrincipalName: 'saml-project-fail@test.com',
				n8nProjectRoles: [`${project.id}:editor`],
			};

			// Attempt to create user with provisioning that will fail
			await expect(
				createUserFromSamlAttributes(samlAttributes, async (user, trx) => {
					await provisioningService.provisionProjectRolesForUser(
						user.id,
						samlAttributes.n8nProjectRoles,
						trx,
					);
				}),
			).rejects.toThrow();

			// User should NOT exist — the entire transaction should have rolled back
			const userInDb = await userRepository.findOne({
				where: { email: 'saml-project-fail@test.com' },
			});
			expect(userInDb).toBeNull();
		});

		it('should roll back user creation when instance role provisioning fails', async () => {
			// Make changeUserRole throw to simulate provisioning failure
			const userService = Container.get(UserService);
			jest
				.spyOn(userService, 'changeUserRole')
				.mockRejectedValueOnce(new Error('Role change failed'));

			const { createUserFromSamlAttributes } = await import('@/modules/sso-saml/saml-helpers');

			const samlAttributes = {
				email: 'saml-instance-fail@test.com',
				firstName: 'Test',
				lastName: 'User',
				userPrincipalName: 'saml-instance-fail@test.com',
				n8nInstanceRole: 'global:admin',
			};

			await expect(
				createUserFromSamlAttributes(samlAttributes, async (user, trx) => {
					await provisioningService.provisionInstanceRoleForUser(
						user,
						samlAttributes.n8nInstanceRole,
						trx,
					);
				}),
			).rejects.toThrow();

			// User should NOT exist — the entire transaction should have rolled back
			const userInDb = await userRepository.findOne({
				where: { email: 'saml-instance-fail@test.com' },
			});
			expect(userInDb).toBeNull();
		});

		it('should roll back everything when project provisioning fails after instance role succeeds', async () => {
			const project = await createTeamProject('SAML Both Fail Test', owner);

			// Make addUser throw ONLY (instance role provisioning succeeds, project role fails)
			const projectService = Container.get(ProjectService);
			jest.spyOn(projectService, 'addUser').mockRejectedValueOnce(new Error('Provisioning failed'));

			const { createUserFromSamlAttributes } = await import('@/modules/sso-saml/saml-helpers');

			const samlAttributes = {
				email: 'saml-both-fail@test.com',
				firstName: 'Test',
				lastName: 'User',
				userPrincipalName: 'saml-both-fail@test.com',
				n8nInstanceRole: 'global:admin',
				n8nProjectRoles: [`${project.id}:editor`],
			};

			await expect(
				createUserFromSamlAttributes(samlAttributes, async (user, trx) => {
					// Instance role provisioning succeeds
					await provisioningService.provisionInstanceRoleForUser(
						user,
						samlAttributes.n8nInstanceRole,
						trx,
					);
					// Project role provisioning fails
					await provisioningService.provisionProjectRolesForUser(
						user.id,
						samlAttributes.n8nProjectRoles,
						trx,
					);
				}),
			).rejects.toThrow();

			// User should NOT exist — entire transaction including instance role change should be rolled back
			const userInDb = await userRepository.findOne({
				where: { email: 'saml-both-fail@test.com' },
			});
			expect(userInDb).toBeNull();
		});
	});
});
