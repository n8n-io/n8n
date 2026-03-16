import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import {
	ProjectRepository,
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';

import { MockProviders, createDummyProvider } from '../../shared/external-secrets/utils';
import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

const mockProvidersInstance = new MockProviders();
mockProvidersInstance.setProviders({
	awsSecretsManager: createDummyProvider({ name: 'awsSecretsManager' }),
});
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

mockInstance(ExternalSecretsConfig, {
	externalSecretsForProjects: true,
});

describe('Project deletion with external secrets', () => {
	const testServer = setupTestServer({
		endpointGroups: ['project', 'externalSecrets'],
		enabledFeatures: [
			'feat:externalSecrets',
			'feat:advancedPermissions',
			'feat:projectRole:admin',
			'feat:projectRole:editor',
			'feat:projectRole:viewer',
		],
		modules: ['external-secrets'],
	});

	let connectionRepository: SecretsProviderConnectionRepository;
	let projectAccessRepository: ProjectSecretsProviderAccessRepository;
	let projectRepository: ProjectRepository;

	beforeEach(async () => {
		connectionRepository = Container.get(SecretsProviderConnectionRepository);
		projectAccessRepository = Container.get(ProjectSecretsProviderAccessRepository);
		projectRepository = Container.get(ProjectRepository);
		await testDb.truncate([
			'User',
			'Project',
			'SecretsProviderConnection',
			'ProjectSecretsProviderAccess',
		]);
	});

	type TestUser = Awaited<ReturnType<typeof createOwner>>;

	const createGlobalSharedConnection = async (
		owner: TestUser,
		projectId: string,
		providerKey: string,
	) => {
		await testServer
			.authAgentFor(owner)
			.post('/secret-providers/connections')
			.send({
				providerKey,
				type: 'awsSecretsManager',
				projectIds: [projectId],
				settings: { region: 'us-east-1' },
			})
			.expect(200);
	};

	const createProjectConnection = async (
		owner: TestUser,
		projectId: string,
		providerKey: string,
	) => {
		await testServer
			.authAgentFor(owner)
			.post(`/secret-providers/projects/${projectId}/connections`)
			.send({
				providerKey,
				type: 'awsSecretsManager',
				projectIds: [],
				settings: { region: 'us-east-1' },
			})
			.expect(200);
	};

	test('deletes owner-role connection when project is deleted', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Owner Role Project', owner);

		await createProjectConnection(owner, project.id, 'ownerRoleConnection');
		const connection = await connectionRepository.findOneByOrFail({
			providerKey: 'ownerRoleConnection',
		});

		const ownerAccess = await projectAccessRepository.findOneByOrFail({
			projectId: project.id,
			secretsProviderConnectionId: connection.id,
		});
		expect(ownerAccess.role).toBe('secretsProviderConnection:owner');

		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(200);

		const deletedConnection = await connectionRepository.findOneBy({
			providerKey: 'ownerRoleConnection',
		});
		expect(deletedConnection).toBeNull();
	});

	test('disables user-role connection and removes project access when project is deleted', async () => {
		const owner = await createOwner();
		const projectAdmin = await createMember();
		const project = await createTeamProject('User Role Project', owner);
		await linkUserToProject(projectAdmin, project, 'project:admin');

		await createGlobalSharedConnection(owner, project.id, 'userRoleConnection');
		const connection = await connectionRepository.findOneByOrFail({
			providerKey: 'userRoleConnection',
		});

		const userAccess = await projectAccessRepository.findOneByOrFail({
			projectId: project.id,
			secretsProviderConnectionId: connection.id,
		});
		expect(userAccess.role).toBe('secretsProviderConnection:user');

		await testServer.authAgentFor(projectAdmin).delete(`/projects/${project.id}`).expect(200);

		const remainingConnection = await connectionRepository.findOneBy({
			providerKey: 'userRoleConnection',
		});
		expect(remainingConnection).not.toBeNull();
		expect(remainingConnection?.isEnabled).toBe(false);

		const accessEntries = await projectAccessRepository.find({
			where: { secretsProviderConnectionId: connection.id },
		});
		expect(accessEntries).toHaveLength(0);
	});

	test('deletes owner-role connections and disables user-role connections for the same deleted project', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Mixed Role Project', owner);

		await createProjectConnection(owner, project.id, 'mixedOwnerConnection');
		await createGlobalSharedConnection(owner, project.id, 'mixedUserConnection');

		const userConnection = await connectionRepository.findOneByOrFail({
			providerKey: 'mixedUserConnection',
		});

		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(200);

		const [deletedOwnerConnection, remainingUserConnection] = await Promise.all([
			connectionRepository.findOneBy({ providerKey: 'mixedOwnerConnection' }),
			connectionRepository.findOneBy({ providerKey: 'mixedUserConnection' }),
		]);

		expect(deletedOwnerConnection).toBeNull();
		expect(remainingUserConnection).not.toBeNull();
		expect(remainingUserConnection?.isEnabled).toBe(false);

		const userAccessEntries = await projectAccessRepository.find({
			where: { secretsProviderConnectionId: userConnection.id },
		});
		expect(userAccessEntries).toHaveLength(0);
	});

	test('if owner-connection deletion fails, access rows are not deleted', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Rollback Owner Delete Project', owner);

		await createProjectConnection(owner, project.id, 'rollbackOwnerConnection');
		const connection = await connectionRepository.findOneByOrFail({
			providerKey: 'rollbackOwnerConnection',
		});

		const originalConnectionTarget = connectionRepository.target;
		Object.defineProperty(connectionRepository, 'target', {
			value: 'does_not_exist_connection_target',
			configurable: true,
		});

		try {
			await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(500);
		} finally {
			Object.defineProperty(connectionRepository, 'target', {
				value: originalConnectionTarget,
				configurable: true,
			});
		}

		const [remainingProject, remainingConnection, remainingAccess] = await Promise.all([
			projectRepository.findOneBy({ id: project.id }),
			connectionRepository.findOneBy({ providerKey: 'rollbackOwnerConnection' }),
			projectAccessRepository.findOneBy({
				projectId: project.id,
				secretsProviderConnectionId: connection.id,
			}),
		]);

		expect(remainingProject).not.toBeNull();
		expect(remainingConnection).not.toBeNull();
		expect(remainingAccess).not.toBeNull();
	});

	test('if access deletion fails, owner connection deletion is rolled back', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Rollback Access Delete Project', owner);

		await createProjectConnection(owner, project.id, 'rollbackOwnerConnection2');
		await createGlobalSharedConnection(owner, project.id, 'rollbackUserConnection2');

		const [ownerConnection, userConnection] = await Promise.all([
			connectionRepository.findOneByOrFail({
				providerKey: 'rollbackOwnerConnection2',
			}),
			connectionRepository.findOneByOrFail({
				providerKey: 'rollbackUserConnection2',
			}),
		]);

		const originalProjectAccessTarget = projectAccessRepository.target;
		Object.defineProperty(projectAccessRepository, 'target', {
			value: 'does_not_exist_access_target',
			configurable: true,
		});

		try {
			await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(500);
		} finally {
			Object.defineProperty(projectAccessRepository, 'target', {
				value: originalProjectAccessTarget,
				configurable: true,
			});
		}

		const [remainingProject, remainingOwnerConnection, remainingOwnerAccess, remainingUserAccess] =
			await Promise.all([
				projectRepository.findOneBy({ id: project.id }),
				connectionRepository.findOneBy({ providerKey: 'rollbackOwnerConnection2' }),
				projectAccessRepository.findOneBy({
					projectId: project.id,
					secretsProviderConnectionId: ownerConnection.id,
				}),
				projectAccessRepository.findOneBy({
					projectId: project.id,
					secretsProviderConnectionId: userConnection.id,
				}),
			]);

		expect(remainingProject).not.toBeNull();
		expect(remainingOwnerConnection).not.toBeNull();
		expect(remainingOwnerAccess).not.toBeNull();
		expect(remainingUserAccess).not.toBeNull();
	});
});
