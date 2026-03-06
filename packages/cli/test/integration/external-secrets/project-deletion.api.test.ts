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
import { createAdmin, createMember } from '../shared/db/users';
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

	test('instance admin creates connection, project admin deletes project: connection is disabled and access is removed', async () => {
		const instanceAdmin = await createAdmin();
		const projectAdmin = await createMember();
		const project = await createTeamProject('Team Project', instanceAdmin);
		await linkUserToProject(projectAdmin, project, 'project:admin');

		await testServer
			.authAgentFor(instanceAdmin)
			.post('/secret-providers/connections')
			.send({
				providerKey: 'admin-created-connection',
				type: 'awsSecretsManager',
				projectIds: [project.id],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		await testServer.authAgentFor(projectAdmin).delete(`/projects/${project.id}`).expect(200);

		const remainingConnection = await connectionRepository.findOneBy({
			providerKey: 'admin-created-connection',
		});
		expect(remainingConnection).not.toBeNull();
		expect(remainingConnection?.isEnabled).toBe(false);

		const accessEntries = await projectAccessRepository.find({
			where: { secretsProviderConnectionId: remainingConnection!.id },
		});
		expect(accessEntries).toHaveLength(0);
	});

	test('project admin owns connection, deleting project removes both connection and access entries', async () => {
		const instanceAdmin = await createAdmin();
		const projectAdmin = await createMember();
		const project = await createTeamProject('Project Admin Team', projectAdmin);

		await testServer
			.authAgentFor(instanceAdmin)
			.post('/secret-providers/connections')
			.send({
				providerKey: 'project-owner-connection',
				type: 'awsSecretsManager',
				projectIds: [project.id],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		const projectConnection = await connectionRepository.findOneByOrFail({
			providerKey: 'project-owner-connection',
		});
		await projectAccessRepository.update(
			{
				projectId: project.id,
				secretsProviderConnectionId: projectConnection.id,
			},
			{ role: 'secretsProviderConnection:owner' },
		);

		await testServer.authAgentFor(projectAdmin).delete(`/projects/${project.id}`).expect(200);

		const deletedConnection = await connectionRepository.findOneBy({
			providerKey: 'project-owner-connection',
		});
		expect(deletedConnection).toBeNull();

		const deletedAccessEntries = await projectAccessRepository.find({
			where: { secretsProviderConnectionId: projectConnection.id },
		});
		expect(deletedAccessEntries).toHaveLength(0);
	});

	test('instance admin creates and deletes project: connection and access are removed', async () => {
		const instanceAdmin = await createAdmin();
		const project = await createTeamProject('Admin Managed Team', instanceAdmin);

		await testServer
			.authAgentFor(instanceAdmin)
			.post('/secret-providers/connections')
			.send({
				providerKey: 'admin-deleted-connection',
				type: 'awsSecretsManager',
				projectIds: [project.id],
				settings: { region: 'us-east-1' },
			})
			.expect(200);

		const connection = await connectionRepository.findOneByOrFail({
			providerKey: 'admin-deleted-connection',
		});

		await testServer.authAgentFor(instanceAdmin).delete(`/projects/${project.id}`).expect(200);

		const deletedConnection = await connectionRepository.findOneBy({
			providerKey: 'admin-deleted-connection',
		});
		expect(deletedConnection).toBeNull();

		const deletedAccessEntries = await projectAccessRepository.find({
			where: { secretsProviderConnectionId: connection.id },
		});
		expect(deletedAccessEntries).toHaveLength(0);
	});
});
