import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import {
	CredentialsRepository,
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
	SharedCredentialsRepository,
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
		await testDb.truncate([
			'SecretsProviderConnection',
			'ProjectSecretsProviderAccess',
			'SharedCredentials',
			'CredentialsEntity',
		]);
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

	async function createCredential(ownerProjectId: string) {
		const credentialsRepository = Container.get(CredentialsRepository);
		const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
		const cipher = Container.get(Cipher);

		const credential = await credentialsRepository.save(
			credentialsRepository.create({
				name: 'Test Credential',
				type: 'githubApi',
				data: cipher.encrypt({}),
			}),
		);

		await sharedCredentialsRepository.save(
			sharedCredentialsRepository.create({
				credentialsId: credential.id,
				projectId: ownerProjectId,
				role: 'credential:owner',
			}),
		);

		return credential;
	}

	describe('findEnabledGlobalConnections', () => {
		it('returns only connections without project access', async () => {
			await Promise.all([
				createConnection('global1', 'awsSecretsManager'),
				createConnection('global2', 'hashicorpVault'),
				createConnection('project1', 'awsSecretsManager', [project1.id]),
			]);

			const connections = await connectionRepository.findEnabledGlobalConnections();

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

			const connections = await connectionRepository.findEnabledGlobalConnections({
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

			const connections = await connectionRepository.findEnabledGlobalConnections();

			expect(connections).toEqual([]);
		});

		it('returns empty array when providerKeys filter is an empty array', async () => {
			await Promise.all([
				createConnection('globalAws', 'awsSecretsManager'),
				createConnection('globalVault', 'hashicorpVault'),
				createConnection('globalGcp', 'gcpSecretsManager'),
			]);

			const connections = await connectionRepository.findEnabledGlobalConnections({
				providerKeys: [],
			});

			expect(connections).toEqual([]);
		});
	});

	describe('findEnabledByProjectId', () => {
		it('returns only connections assigned to the project', async () => {
			await Promise.all([
				createConnection('global', 'awsSecretsManager'),
				createConnection('proj1A', 'awsSecretsManager', [project1.id]),
				createConnection('proj1B', 'hashicorpVault', [project1.id]),
				createConnection('proj2A', 'gcpSecretsManager', [project2.id]),
			]);

			const connections = await connectionRepository.findEnabledByProjectId(project1.id);

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

			const connections = await connectionRepository.findEnabledByProjectId(project1.id, {
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

			const connections = await connectionRepository.findEnabledByProjectId(project1.id);

			expect(connections).toEqual([]);
		});

		it('returns empty array when providerKeys filter is an empty array', async () => {
			await Promise.all([
				createConnection('projAws', 'awsSecretsManager', [project1.id]),
				createConnection('projVault', 'hashicorpVault', [project1.id]),
				createConnection('projGcp', 'gcpSecretsManager', [project1.id]),
			]);

			const connections = await connectionRepository.findEnabledByProjectId(project1.id, {
				providerKeys: [],
			});

			expect(connections).toEqual([]);
		});
	});

	describe('findAllAccessibleProviderKeysByCredentialId', () => {
		it('should always include global vaults', async () => {
			await createConnection('globalVault', 'awsSecretsManager');
			const credential = await createCredential(project1.id);

			const providerKeys = await connectionRepository.findAllAccessibleProviderKeysByCredentialId(
				credential.id,
			);

			expect(providerKeys).toContain('globalVault');
		});

		it('should include project-scoped vaults if the project that owns the credential has access to them', async () => {
			await createConnection('project1Vault', 'awsSecretsManager', [project1.id]);
			const credential = await createCredential(project1.id);

			const providerKeys = await connectionRepository.findAllAccessibleProviderKeysByCredentialId(
				credential.id,
			);

			expect(providerKeys).toContain('project1Vault');
		});

		it('should not include project-scoped vault that the owning project of the credential does not have access to', async () => {
			await createConnection('project2Vault', 'awsSecretsManager', [project2.id]);
			const credential = await createCredential(project1.id);

			const providerKeys = await connectionRepository.findAllAccessibleProviderKeysByCredentialId(
				credential.id,
			);

			expect(providerKeys).not.toContain('project2Vault');
		});
	});
});
