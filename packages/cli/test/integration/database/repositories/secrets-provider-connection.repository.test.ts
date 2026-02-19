import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';

describe('SecretsProviderConnectionRepository', () => {
	let connectionRepository: SecretsProviderConnectionRepository;
	let projectAccessRepository: ProjectSecretsProviderAccessRepository;

	let project1: Project;
	let project2: Project;

	beforeAll(async () => {
		const licenseMock = mock<LicenseState>();
		licenseMock.isLicensed.mockReturnValue(true);
		Container.set(LicenseState, licenseMock);

		await testDb.init();

		connectionRepository = Container.get(SecretsProviderConnectionRepository);
		projectAccessRepository = Container.get(ProjectSecretsProviderAccessRepository);

		project1 = await createTeamProject('Project 1');
		project2 = await createTeamProject('Project 2');
	});

	beforeEach(async () => {
		await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createConnection(providerKey: string, type: string, projectIds: string[] = []) {
		const cipher = Container.get(Cipher);
		const encryptedSettings = cipher.encrypt({});

		const connection = await connectionRepository.save(
			connectionRepository.create({
				providerKey,
				type,
				encryptedSettings,
				isEnabled: true,
			}),
		);

		if (projectIds.length > 0) {
			await projectAccessRepository.save(
				projectIds.map((projectId) =>
					projectAccessRepository.create({
						secretsProviderConnectionId: connection.id,
						projectId,
					}),
				),
			);
		}

		return connection;
	}

	describe('findGlobalConnections', () => {
		it('returns only connections without project access', async () => {
			await Promise.all([
				createConnection('global1', 'awsSecretsManager'),
				createConnection('global2', 'hashicorpVault'),
				createConnection('project1', 'awsSecretsManager', [project1.id]),
			]);

			const connections = await connectionRepository.findGlobalConnections();

			expect(connections).toHaveLength(2);
			expect(connections.map((connection) => connection.providerKey).sort()).toEqual([
				'global1',
				'global2',
			]);
		});

		it('filters by provider keys when provided', async () => {
			await Promise.all([
				createConnection('globalAws', 'awsSecretsManager'),
				createConnection('globalVault', 'hashicorpVault'),
				createConnection('globalGcp', 'gcpSecretsManager'),
			]);

			const connections = await connectionRepository.findGlobalConnections({
				providerKeys: ['globalAws', 'globalVault'],
			});

			expect(connections).toHaveLength(2);
			expect(connections.map((connection) => connection.providerKey).sort()).toEqual([
				'globalAws',
				'globalVault',
			]);
		});

		it('returns empty array when no global connections exist', async () => {
			await createConnection('projectOnly', 'awsSecretsManager', [project1.id]);

			const connections = await connectionRepository.findGlobalConnections();

			expect(connections).toEqual([]);
		});

		it('returns empty array when providerKeys filter is an empty array', async () => {
			await Promise.all([
				createConnection('globalAws', 'awsSecretsManager'),
				createConnection('globalVault', 'hashicorpVault'),
				createConnection('globalGcp', 'gcpSecretsManager'),
			]);

			const connections = await connectionRepository.findGlobalConnections({
				providerKeys: [],
			});

			expect(connections).toEqual([]);
		});
	});

	describe('findByProjectId', () => {
		it('returns only connections assigned to the project', async () => {
			await Promise.all([
				createConnection('global', 'awsSecretsManager'),
				createConnection('proj1A', 'awsSecretsManager', [project1.id]),
				createConnection('proj1B', 'hashicorpVault', [project1.id]),
				createConnection('proj2A', 'gcpSecretsManager', [project2.id]),
			]);

			const connections = await connectionRepository.findByProjectId(project1.id);

			expect(connections).toHaveLength(2);
			expect(connections.map((connection) => connection.providerKey).sort()).toEqual([
				'proj1A',
				'proj1B',
			]);
		});

		it('filters by provider keys when provided', async () => {
			await Promise.all([
				createConnection('projAws', 'awsSecretsManager', [project1.id]),
				createConnection('projVault', 'hashicorpVault', [project1.id]),
				createConnection('projGcp', 'gcpSecretsManager', [project1.id]),
			]);

			const connections = await connectionRepository.findByProjectId(project1.id, {
				providerKeys: ['projAws', 'projGcp'],
			});

			expect(connections).toHaveLength(2);
			expect(connections.map((connection) => connection.providerKey).sort()).toEqual([
				'projAws',
				'projGcp',
			]);
		});

		it('returns empty array when no connections exist for project', async () => {
			await createConnection('otherProject', 'awsSecretsManager', [project2.id]);

			const connections = await connectionRepository.findByProjectId(project1.id);

			expect(connections).toEqual([]);
		});

		it('returns empty array when providerKeys filter is an empty array', async () => {
			await Promise.all([
				createConnection('projAws', 'awsSecretsManager', [project1.id]),
				createConnection('projVault', 'hashicorpVault', [project1.id]),
				createConnection('projGcp', 'gcpSecretsManager', [project1.id]),
			]);

			const connections = await connectionRepository.findByProjectId(project1.id, {
				providerKeys: [],
			});

			expect(connections).toEqual([]);
		});
	});
});
