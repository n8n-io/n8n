import { LicenseState, Logger } from '@n8n/backend-common';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	mockLogger,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, Role, User } from '@n8n/db';
import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';
import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';

import { createDummyProvider, MockProviders } from '../../shared/external-secrets/utils';
import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';
import { Cipher } from 'n8n-core';
import { mockCipher } from '@test/mocking';

const resetManager = async () => {
	const manager = Container.get(ExternalSecretsManager);
	manager.shutdown();
	await manager.init();
};

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

mockInstance(ExternalSecretsConfig, {
	externalSecretsForProjects: true,
});

mockInstance(Cipher, mockCipher());

describe('Secret Providers Completions API', () => {
	let owner: User;
	let member: User;
	let admin: User;
	let memberWithCustomRole: User;
	let memberWithoutCustomRole: User;
	let ownerAgent: SuperAgentTest;
	let adminAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let memberWithCustomRoleAgent: SuperAgentTest;
	let memberWithoutCustomRoleAgent: SuperAgentTest;

	let customSecretListRole: Role;
	let customNoSecretRole: Role;
	let customProjectA: Project;
	let customProjectB: Project;

	const testServer = setupTestServer({
		endpointGroups: ['externalSecrets'],
		enabledFeatures: ['feat:externalSecrets', 'feat:customRoles'],
		modules: ['external-secrets'],
		quotas: {
			'quota:maxTeamProjects': -1,
		},
	});

	let connectionRepository: SecretsProviderConnectionRepository;
	let projectAccessRepository: ProjectSecretsProviderAccessRepository;

	let projectWithConnections: Project;
	let projectWithoutConnections: Project;

	beforeAll(async () => {
		Container.set(Logger, mockLogger());

		owner = await createOwner();
		member = await createMember();
		admin = await createAdmin();
		memberWithCustomRole = await createMember();
		memberWithoutCustomRole = await createMember();

		ownerAgent = testServer.authAgentFor(owner);
		adminAgent = testServer.authAgentFor(admin);
		memberAgent = testServer.authAgentFor(member);
		memberWithCustomRoleAgent = testServer.authAgentFor(memberWithCustomRole);
		memberWithoutCustomRoleAgent = testServer.authAgentFor(memberWithoutCustomRole);

		connectionRepository = Container.get(SecretsProviderConnectionRepository);
		projectAccessRepository = Container.get(ProjectSecretsProviderAccessRepository);

		projectWithConnections = await createTeamProject('With Connections', owner);
		projectWithoutConnections = await createTeamProject('Without Connections', owner);

		customSecretListRole = await createCustomRoleWithScopeSlugs(['externalSecret:list'], {
			roleType: 'project',
			displayName: 'Custom Secret Lister',
			description: 'Can list external secrets',
		});

		customNoSecretRole = await createCustomRoleWithScopeSlugs(['workflow:list'], {
			roleType: 'project',
			displayName: 'Custom No Secret Access',
			description: 'Cannot list external secrets',
		});

		customProjectA = await createTeamProject('Custom Project A', owner);
		customProjectB = await createTeamProject('Custom Project B', owner);

		await linkUserToProject(memberWithCustomRole, customProjectA, customSecretListRole.slug);
		await linkUserToProject(memberWithoutCustomRole, customProjectB, customNoSecretRole.slug);
	});

	beforeEach(async () => {
		await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
	});

	describe('GET /secret-providers/completions/secrets/global', () => {
		describe('Authorization', () => {
			const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
			let agents: Record<string, SuperAgentTest>;

			beforeAll(() => {
				agents = {
					owner: ownerAgent,
					admin: adminAgent,
					member: memberAgent,
				};
			});

			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to list global secrets', async ({ role, allowed }) => {
				const response = await agents[role]
					.get('/secret-providers/completions/secrets/global')
					.expect(allowed ? 200 : 403);

				if (!allowed) {
					expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
				}
			});

			it('should deny member with custom project-level externalSecret:list role to list global secrets', async () => {
				const response = await memberWithCustomRoleAgent
					.get('/secret-providers/completions/secrets/global')
					.expect(403);

				expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
			});

			it('should deny member without custom externalSecret:list role to list global secrets', async () => {
				const response = await memberWithoutCustomRoleAgent
					.get('/secret-providers/completions/secrets/global')
					.expect(403);

				expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
			});
		});

		describe('with global connections', () => {
			it('should return global secrets', async () => {
				const GlobalProvider1 = createDummyProvider({
					name: 'global_provider_1',
					secrets: { globalSecret1: 'value1', globalSecret2: 'value2' },
				});
				const GlobalProvider2 = createDummyProvider({
					name: 'global_provider_2',
					secrets: { globalSecret3: 'value3' },
				});
				const ProjectProvider = createDummyProvider({
					name: 'project_provider',
					secrets: { projectSecret1: 'value1' },
				});

				mockProvidersInstance.setProviders({
					global_provider_1: GlobalProvider1,
					global_provider_2: GlobalProvider2,
					project_provider: ProjectProvider,
				});

				// Create enabled global connections (should be returned)
				await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'global-connection-1',
						type: 'global_provider_1',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);
				await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'global-connection-2',
						type: 'global_provider_2',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);
				// Create project-scoped connection (should NOT be returned)
				const projectConnection = await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'project-connection',
						type: 'project_provider',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);
				await projectAccessRepository.save(
					projectAccessRepository.create({
						projectId: projectWithConnections.id,
						secretsProviderConnectionId: projectConnection.id,
					}),
				);

				await resetManager();

				const response = await ownerAgent
					.get('/secret-providers/completions/secrets/global')
					.expect(200);

				expect(response.body.data).toEqual({
					'global-connection-1': ['globalSecret1', 'globalSecret2'],
					'global-connection-2': ['globalSecret3'],
				});
			});
		});

		describe('without global connections', () => {
			it('should return an empty object', async () => {
				const ProjectProvider = createDummyProvider({
					name: 'project_provider',
					secrets: { projectSecret1: 'value1' },
				});

				mockProvidersInstance.setProviders({
					project_provider: ProjectProvider,
				});

				// Create project-scoped connection (should NOT be returned)
				const projectConnection = await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'project-connection',
						type: 'project_provider',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);

				await projectAccessRepository.save(
					projectAccessRepository.create({
						projectId: projectWithConnections.id,
						secretsProviderConnectionId: projectConnection.id,
					}),
				);

				await resetManager();

				const response = await ownerAgent
					.get('/secret-providers/completions/secrets/global')
					.expect(200);

				expect(response.body.data).toEqual({});
			});
		});
	});

	describe('GET /secret-providers/completions/secrets/global/:projectId', () => {
		describe('Authorization', () => {
			const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
			let agents: Record<string, SuperAgentTest>;

			beforeAll(() => {
				agents = {
					owner: ownerAgent,
					admin: adminAgent,
					member: memberAgent,
				};
			});

			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])(
				'should allow=$allowed for $role to list global secrets for project',
				async ({ role, allowed }) => {
					const response = await agents[role]
						.get(`/secret-providers/completions/secrets/global/${projectWithConnections.id}`)
						.expect(allowed ? 200 : 403);

					if (!allowed) {
						expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					}
				},
			);

			it('should allow member with custom externalSecret:list role to list global secrets for project', async () => {
				await memberWithCustomRoleAgent
					.get(`/secret-providers/completions/secrets/global/${customProjectA.id}`)
					.expect(200);
			});

			it('should deny member with custom externalSecret:list role for different project', async () => {
				const response = await memberWithCustomRoleAgent
					.get(`/secret-providers/completions/secrets/global/${customProjectB.id}`)
					.expect(403);

				expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
			});
		});

		describe('response shape', () => {
			it('should return same global secrets data as GET /secrets/global', async () => {
				const GlobalProvider = createDummyProvider({
					name: 'global_provider',
					secrets: { globalSecret1: 'value1', globalSecret2: 'value2' },
				});
				mockProvidersInstance.setProviders({ global_provider: GlobalProvider });
				await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'global-conn',
						type: 'global_provider',
						encryptedSettings: JSON.stringify({ mocked: 'mocked' }),
					}),
				);
				await resetManager();

				const response = await ownerAgent
					.get(`/secret-providers/completions/secrets/global/${projectWithConnections.id}`)
					.expect(200);

				expect(response.body.data).toEqual({
					'global-conn': ['globalSecret1', 'globalSecret2'],
				});
			});
		});
	});

	describe('GET /secret-providers/completions/secrets/project/:projectId', () => {
		describe('Authorization', () => {
			const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
			let agents: Record<string, SuperAgentTest>;

			beforeAll(() => {
				agents = {
					owner: ownerAgent,
					admin: adminAgent,
					member: memberAgent,
				};
			});

			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to list project secrets', async ({ role, allowed }) => {
				const response = await agents[role]
					.get('/secret-providers/completions/secrets/project/123')
					.expect(allowed ? 200 : 403);

				if (!allowed) {
					expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
				}
			});

			it('should allow member with custom externalSecret:list role to list project secrets', async () => {
				await memberWithCustomRoleAgent
					.get(`/secret-providers/completions/secrets/project/${customProjectA.id}`)
					.expect(200);
			});

			it('should deny member with custom externalSecret:list role to list project secrets in a different project', async () => {
				const response = await memberWithCustomRoleAgent
					.get(`/secret-providers/completions/secrets/project/${customProjectB.id}`)
					.expect(403);

				expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
			});
		});

		describe('with existing project connections', () => {
			it('should return project secrets', async () => {
				const ProjectProvider1 = createDummyProvider({
					name: 'project_provider_1',
					secrets: { secret1: 'value1', secret2: 'value2' },
				});
				const ProjectProvider2 = createDummyProvider({
					name: 'project_provider_2',
					secrets: { secret3: 'value3', secret4: 'value4' },
				});
				const GlobalProvider = createDummyProvider({
					name: 'global_provider',
					secrets: { globalSecret1: 'value1' },
				});
				const OtherProjectProvider = createDummyProvider({
					name: 'other_project_provider',
					secrets: { otherSecret1: 'value1' },
				});

				mockProvidersInstance.setProviders({
					project_provider_1: ProjectProvider1,
					project_provider_2: ProjectProvider2,
					global_provider: GlobalProvider,
					other_project_provider: OtherProjectProvider,
				});

				// Create enabled project-scoped connections for projectWithConnections (should be returned)
				const connection1 = await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'test-project-secret-connection-1',
						type: 'project_provider_1',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);
				const connection2 = await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'test-project-secret-connection-2',
						type: 'project_provider_2',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);

				await projectAccessRepository.save(
					projectAccessRepository.create({
						projectId: projectWithConnections.id,
						secretsProviderConnectionId: connection1.id,
					}),
				);
				await projectAccessRepository.save(
					projectAccessRepository.create({
						projectId: projectWithConnections.id,
						secretsProviderConnectionId: connection2.id,
					}),
				);

				// Create connection for another project (should NOT be returned)
				const otherProjectConnection = await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'other-project-connection',
						type: 'other_project_provider',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);
				await projectAccessRepository.save(
					projectAccessRepository.create({
						projectId: projectWithoutConnections.id,
						secretsProviderConnectionId: otherProjectConnection.id,
					}),
				);

				// Create global connection (should NOT be returned)
				await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'global-connection',
						type: 'global_provider',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);

				await resetManager();

				const response = await ownerAgent
					.get(`/secret-providers/completions/secrets/project/${projectWithConnections.id}`)
					.expect(200);

				expect(response.body.data).toEqual({
					'test-project-secret-connection-1': ['secret1', 'secret2'],
					'test-project-secret-connection-2': ['secret3', 'secret4'],
				});
			});
		});

		describe('with no project connections', () => {
			it('should return an empty object', async () => {
				const ProjectProvider = createDummyProvider({
					name: 'project_provider',
					secrets: { secret1: 'value1' },
				});
				const GlobalProvider = createDummyProvider({
					name: 'global_provider',
					secrets: { globalSecret1: 'value1' },
				});

				mockProvidersInstance.setProviders({
					project_provider: ProjectProvider,
					global_provider: GlobalProvider,
				});

				// Create connection for another project (should NOT be returned)
				const otherProjectConnection = await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'other-project-connection',
						type: 'project_provider',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);
				await projectAccessRepository.save(
					projectAccessRepository.create({
						projectId: projectWithConnections.id,
						secretsProviderConnectionId: otherProjectConnection.id,
					}),
				);

				// Create global connection (should NOT be returned)
				await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'global-connection',
						type: 'global_provider',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);

				await resetManager();

				const response = await ownerAgent
					.get(`/secret-providers/completions/secrets/project/${projectWithoutConnections.id}`)
					.expect(200);

				expect(response.body.data).toEqual({});
			});
		});

		describe('with no project', () => {
			it('should return an empty object', async () => {
				const ProjectProvider = createDummyProvider({
					name: 'project_provider',
					secrets: { secret1: 'value1' },
				});

				mockProvidersInstance.setProviders({
					project_provider: ProjectProvider,
				});

				// Create connections that should NOT be returned for non-existent project
				const connection = await connectionRepository.save(
					connectionRepository.create({
						providerKey: 'project-connection',
						type: 'project_provider',
						encryptedSettings: JSON.stringify({ mocked: 'mocked-encrypted-settings' }),
					}),
				);
				await projectAccessRepository.save(
					projectAccessRepository.create({
						projectId: projectWithConnections.id,
						secretsProviderConnectionId: connection.id,
					}),
				);

				await resetManager();

				const nonExistentProjectId = '00000000-0000-0000-0000-000000000000';
				const response = await ownerAgent
					.get(`/secret-providers/completions/secrets/project/${nonExistentProjectId}`)
					.expect(200);

				expect(response.body.data).toEqual({});
			});
		});
	});
});
