import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import {
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

	beforeEach(async () => {
		connectionRepository = Container.get(SecretsProviderConnectionRepository);
		projectAccessRepository = Container.get(ProjectSecretsProviderAccessRepository);
		await testDb.truncate([
			'User',
			'Project',
			'SecretsProviderConnection',
			'ProjectSecretsProviderAccess',
		]);
	});

	test('owner creates global connection shared with a project, project admin deletes project: connection is disabled and access is removed', async () => {
		const owner = await createOwner();
		const projectAdmin = await createMember();
		const project = await createTeamProject('Team Project', owner);
		await linkUserToProject(projectAdmin, project, 'project:admin');

		await testServer
			.authAgentFor(owner)
			.post('/secret-providers/connections')
			.send({
				providerKey: 'ownerCreatedGlobalConnection',
				type: 'awsSecretsManager',
				projectIds: [project.id],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		await testServer.authAgentFor(projectAdmin).delete(`/projects/${project.id}`).expect(200);

		const remainingConnection = await connectionRepository.findOneBy({
			providerKey: 'ownerCreatedGlobalConnection',
		});
		expect(remainingConnection).not.toBeNull();
		expect(remainingConnection?.isEnabled).toBe(false);

		const accessEntries = await projectAccessRepository.find({
			where: { secretsProviderConnectionId: remainingConnection!.id },
		});
		expect(accessEntries).toHaveLength(0);
	});

	test('owner creates project connection and deletes project: connection and access are removed', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project Owner Team', owner);

		await testServer
			.authAgentFor(owner)
			.post(`/secret-providers/projects/${project.id}/connections`)
			.send({
				providerKey: 'projectOwnerOwnedConnection',
				type: 'awsSecretsManager',
				projectIds: [],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		const projectConnection = await connectionRepository.findOneByOrFail({
			providerKey: 'projectOwnerOwnedConnection',
		});

		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(200);

		const deletedConnection = await connectionRepository.findOneBy({
			providerKey: 'projectOwnerOwnedConnection',
		});
		expect(deletedConnection).toBeNull();

		const deletedAccessEntries = await projectAccessRepository.find({
			where: { secretsProviderConnectionId: projectConnection.id },
		});
		expect(deletedAccessEntries).toHaveLength(0);
	});

	test('owner creates project connection and project admin deletes project: connection is disabled and access is removed', async () => {
		const owner = await createOwner();
		const projectAdmin = await createMember();
		const project = await createTeamProject('Project Admin Team', owner);
		await linkUserToProject(projectAdmin, project, 'project:admin');

		await testServer
			.authAgentFor(owner)
			.post(`/secret-providers/projects/${project.id}/connections`)
			.send({
				providerKey: 'projectAdminOwnedConnection',
				type: 'awsSecretsManager',
				projectIds: [],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		const projectConnection = await connectionRepository.findOneByOrFail({
			providerKey: 'projectAdminOwnedConnection',
		});

		await testServer.authAgentFor(projectAdmin).delete(`/projects/${project.id}`).expect(200);

		const remainingConnection = await connectionRepository.findOneBy({
			providerKey: 'projectAdminOwnedConnection',
		});
		expect(remainingConnection).not.toBeNull();
		expect(remainingConnection?.isEnabled).toBe(false);

		const deletedAccessEntries = await projectAccessRepository.find({
			where: { secretsProviderConnectionId: projectConnection.id },
		});
		expect(deletedAccessEntries).toHaveLength(0);
	});

	test('owner deletes project with global and project-scoped connections: all connections are removed', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Team Project With Multiple Connections', owner);

		await testServer
			.authAgentFor(owner)
			.post('/secret-providers/connections')
			.send({
				providerKey: 'multiDeleteConnection1',
				type: 'awsSecretsManager',
				projectIds: [project.id],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		await testServer
			.authAgentFor(owner)
			.post('/secret-providers/connections')
			.send({
				providerKey: 'multiDeleteConnection2',
				type: 'awsSecretsManager',
				projectIds: [project.id],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		await testServer
			.authAgentFor(owner)
			.post(`/secret-providers/projects/${project.id}/connections`)
			.send({
				providerKey: 'projectScopedDeleteConnection',
				type: 'awsSecretsManager',
				projectIds: [],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(200);

		const [deletedConnection1, deletedConnection2, deletedProjectScopedConnection] =
			await Promise.all([
				connectionRepository.findOneBy({ providerKey: 'multiDeleteConnection1' }),
				connectionRepository.findOneBy({ providerKey: 'multiDeleteConnection2' }),
				connectionRepository.findOneBy({ providerKey: 'projectScopedDeleteConnection' }),
			]);
		expect(deletedConnection1).toBeNull();
		expect(deletedConnection2).toBeNull();
		expect(deletedProjectScopedConnection).toBeNull();
	});
});
