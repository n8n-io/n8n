import { createTeamProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Project } from '@n8n/db';
import {
	ProjectRepository,
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Cipher } from 'n8n-core';

import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';

import { createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils';

describe('Secret Providers Connections API', () => {
	let testServer = utils.setupTestServer({
		endpointGroups: [],
		enabledFeatures: [],
		modules: ['external-secrets'],
	});

	let ownerAgent: SuperAgentTest;
	let teamProject1: Project;
	let teamProject2: Project;

	beforeAll(async () => {
		// Mock config to enable feature flag
		mockInstance(ExternalSecretsConfig, {
			externalSecretsForProjects: true,
		});

		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);

		teamProject1 = await createTeamProject('Engineering');
		teamProject2 = await createTeamProject('Marketing');
	});

	beforeEach(async () => {
		await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
	});

	describe('Feature flag off = API off', () => {
		beforeAll(() => {
			mockInstance(ExternalSecretsConfig, { externalSecretsForProjects: false });
		});

		afterAll(() => {
			mockInstance(ExternalSecretsConfig, { externalSecretsForProjects: true });
		});

		test('PUT', async () => {
			// Given
			const payload = {
				providerKey: 'test-provider',
				type: 'awsSecretsManager',
				projectIds: [],
				settings: { region: 'us-east-1' },
			};

			// When
			const response = await ownerAgent
				.put('/secret-providers/connections/test-provider')
				.send(payload)
				.expect(400);

			// Then
			expect(response.body.message).toBe('External secrets for projects feature is not enabled');
		});

		test('GET', async () => {
			// When
			const response = await ownerAgent.get('/secret-providers/connections/delete-test');

			// Then
			expect(response.body.message).toBe('External secrets for projects feature is not enabled');
		});
	});

	describe('Create connection', () => {
		test('should create a global connection by default with encrypted settings', async () => {
			// Given
			const payload = {
				providerKey: 'aws-prod',
				type: 'awsSecretsManager',
				projectIds: [],
				settings: {
					region: 'us-east-1',
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				},
			};

			// When
			const response = await ownerAgent
				.put('/secret-providers/connections/aws-prod')
				.send(payload)
				.expect(200);

			// Then
			expect(response.body).toEqual({
				id: 'aws-prod',
				name: 'aws-prod',
				type: 'awsSecretsManager',
				state: 'initializing',
				isEnabled: false,
				projects: [],
				settings: {},
				secretsCount: 0,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});

			// Then - Validate encrypted items in the DB as we can't get hold of these via the API
			const savedConnection = await Container.get(
				SecretsProviderConnectionRepository,
			).findOneByOrFail({ providerKey: 'aws-prod' });

			expect(savedConnection.encryptedSettings).toBeTruthy();
			expect(savedConnection.encryptedSettings).not.toContain('us-east-1');
			expect(savedConnection.encryptedSettings).not.toContain('AKIAIOSFODNN7EXAMPLE');

			// Also check we can decrypt them - or we'll have some big problems lter
			const cipher = Container.get(Cipher);
			const decryptedSettings = JSON.parse(cipher.decrypt(savedConnection.encryptedSettings));
			expect(decryptedSettings).toEqual(payload.settings);
		});

		test('should create a connection and assign its projects', async () => {
			// Given
			const payload = {
				providerKey: 'aws-shared',
				type: 'awsSecretsManager',
				projectIds: [teamProject1.id, teamProject2.id],
				settings: {
					region: 'us-west-2',
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'secret123',
				},
			};

			// When
			const response = await ownerAgent
				.put('/secret-providers/connections/aws-shared')
				.send(payload)
				.expect(200);

			// Then
			expect(response.body.projects).toHaveLength(2);
			expect(response.body.projects).toEqual(
				expect.arrayContaining([
					{ id: teamProject1.id, name: 'Engineering' },
					{ id: teamProject2.id, name: 'Marketing' },
				]),
			);

			const getResponse = await ownerAgent
				.get('/secret-providers/connections/aws-shared')
				.expect(200);

			expect(getResponse.body.projects).toHaveLength(2);
		});
	});

	describe('Update connection', () => {
		test('should update connection type', async () => {
			// Given
			await ownerAgent
				.put('/secret-providers/connections/update-type-test')
				.send({
					providerKey: 'update-type-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			// When
			const response = await ownerAgent
				.patch('/secret-providers/connections/update-type-test')
				.send({ type: 'gcpSecretsManager' })
				.expect(200);

			// Then
			expect(response.body.type).toBe('gcpSecretsManager');
			expect(response.body.projects).toHaveLength(1);

			// Then - Verify via GET
			const getResponse = await ownerAgent
				.get('/secret-providers/connections/update-type-test')
				.expect(200);

			expect(getResponse.body.type).toBe('gcpSecretsManager');
		});

		test('should completely replace settings (not merge)', async () => {
			// Given
			await ownerAgent
				.put('/secret-providers/connections/replace-settings-test')
				.send({
					providerKey: 'replace-settings-test',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: {
						region: 'us-east-1',
						accessKeyId: 'OLD_KEY',
						secretAccessKey: 'OLD_SECRET',
					},
				})
				.expect(200);

			// When
			await ownerAgent
				.patch('/secret-providers/connections/replace-settings-test')
				.send({
					settings: {
						region: 'eu-west-1',
						secretAccessKey: 'NEW_SECRET',
					},
				})
				.expect(200);

			// Then - Settings are write only - so we expect a full replacement here
			const updated = await Container.get(SecretsProviderConnectionRepository).findOneByOrFail({
				providerKey: 'replace-settings-test',
			});

			const cipher = Container.get(Cipher);
			const decryptedSettings = JSON.parse(cipher.decrypt(updated.encryptedSettings));

			expect(decryptedSettings).toEqual({
				region: 'eu-west-1',
				secretAccessKey: 'NEW_SECRET',
			});
			expect(decryptedSettings).not.toHaveProperty('accessKeyId');
		});

		test('should update project access', async () => {
			// Given
			await ownerAgent
				.put('/secret-providers/connections/update-projects-test')
				.send({
					providerKey: 'update-projects-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			// When
			const response = await ownerAgent
				.patch('/secret-providers/connections/update-projects-test')
				.send({ projectIds: [teamProject2.id] })
				.expect(200);

			// Then
			expect(response.body.projects).toEqual([{ id: teamProject2.id, name: 'Marketing' }]);

			// Then - Verify via GET
			const getResponse = await ownerAgent
				.get('/secret-providers/connections/update-projects-test')
				.expect(200);

			expect(getResponse.body.projects).toHaveLength(1);
			expect(getResponse.body.projects[0].id).toBe(teamProject2.id);
		});

		test('should convert to global by passing empty projectIds', async () => {
			// Given
			await ownerAgent
				.put('/secret-providers/connections/to-global-test')
				.send({
					providerKey: 'to-global-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			// When
			const response = await ownerAgent
				.patch('/secret-providers/connections/to-global-test')
				.send({ projectIds: [] })
				.expect(200);

			// Then
			expect(response.body.projects).toEqual([]);

			// Then - Verify via GET
			const getResponse = await ownerAgent
				.get('/secret-providers/connections/to-global-test')
				.expect(200);

			expect(getResponse.body.projects).toEqual([]);
		});

		test('should fail for non-existent connection', async () => {
			// When
			const response = await ownerAgent
				.patch('/secret-providers/connections/non-existent')
				.send({ type: 'gcpSecretsManager' })
				.expect(404);

			// Then
			expect(response.body.message).toBe('Connection with key "non-existent" not found');
		});
	});

	describe('Delete connection', () => {
		test('should delete connection and cascade project access', async () => {
			// Given
			await ownerAgent
				.put('/secret-providers/connections/delete-test')
				.send({
					providerKey: 'delete-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			// When
			const response = await ownerAgent
				.delete('/secret-providers/connections/delete-test')
				.expect(200);

			// Then
			expect(response.body.id).toBe('delete-test');
			expect(response.body.projects).toHaveLength(2);

			// Then - Verify deletion via GET
			await ownerAgent.get('/secret-providers/connections/delete-test').expect(404);

			// Then - Verify cascade delete (database check necessary)
			const remainingAccess = await Container.get(ProjectSecretsProviderAccessRepository).find({
				where: { providerKey: 'delete-test' },
			});
			expect(remainingAccess).toHaveLength(0);
		});

		test('should fail for non-existent connection', async () => {
			// When
			const response = await ownerAgent
				.delete('/secret-providers/connections/non-existent')
				.expect(404);

			// Then
			expect(response.body.message).toBe('Connection with key "non-existent" not found');
		});
	});

	describe('List connections', () => {
		test('should list all connections with eager-loaded projects', async () => {
			// Given
			await ownerAgent
				.put('/secret-providers/connections/list-test-1')
				.send({
					providerKey: 'list-test-1',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			await ownerAgent
				.put('/secret-providers/connections/list-test-2')
				.send({
					providerKey: 'list-test-2',
					type: 'gcpSecretsManager',
					projectIds: [teamProject2.id],
					settings: { projectId: 'my-project' },
				})
				.expect(200);

			await ownerAgent
				.put('/secret-providers/connections/list-test-3')
				.send({
					providerKey: 'list-test-3',
					type: 'hashicorpVault',
					projectIds: [],
					settings: { vaultUrl: 'https://vault.example.com' },
				})
				.expect(200);

			// When
			const response = await ownerAgent.get('/secret-providers/connections').expect(200);

			// Then
			expect(response.body).toHaveLength(3);

			for (const connection of response.body) {
				expect(connection).toMatchObject({
					id: expect.any(String),
					name: expect.any(String),
					type: expect.any(String),
					state: 'initializing',
					isEnabled: false,
					projects: expect.any(Array),
					settings: {},
					secretsCount: 0,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				});
				expect(connection).not.toHaveProperty('secrets');
			}

			const connection1 = response.body.find((c: any) => c.id === 'list-test-1');
			expect(connection1.projects).toHaveLength(1);

			const connection3 = response.body.find((c: any) => c.id === 'list-test-3');
			expect(connection3.projects).toEqual([]);
		});

		test('should return empty array when no connections exist', async () => {
			// When
			const response = await ownerAgent.get('/secret-providers/connections').expect(200);

			// Then
			expect(response.body).toEqual([]);
		});
	});

	describe('Get single connection', () => {
		test('should return full connection details', async () => {
			// Given
			await ownerAgent
				.put('/secret-providers/connections/get-test')
				.send({
					providerKey: 'get-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: {
						region: 'us-east-1',
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					},
				})
				.expect(200);

			// When
			const response = await ownerAgent.get('/secret-providers/connections/get-test').expect(200);

			// Then
			expect(response.body).toMatchObject({
				id: 'get-test',
				name: 'get-test',
				type: 'awsSecretsManager',
				state: 'initializing',
				isEnabled: false,
				settings: {},
				secretsCount: 0,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
				secrets: [],
			});
			expect(response.body.projects).toHaveLength(2);
		});

		test('should fail for non-existent connection', async () => {
			// When
			const response = await ownerAgent
				.get('/secret-providers/connections/does-not-exist')
				.expect(404);

			// Then
			expect(response.body.message).toBe('Connection with key "does-not-exist" not found');
		});
	});

	describe('Security', () => {
		test('should never return settings in any endpoint', async () => {
			// Given
			const sensitiveSettings = {
				region: 'us-east-1',
				accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				sessionToken: 'very-secret-session-token',
			};

			// When - Create
			const createResponse = await ownerAgent
				.put('/secret-providers/connections/security-test')
				.send({
					providerKey: 'security-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: sensitiveSettings,
				})
				.expect(200);

			// Then - Create response
			expect(createResponse.body.settings).toEqual({});
			expect(JSON.stringify(createResponse.body)).not.toContain('AKIAIOSFODNN7EXAMPLE');
			expect(JSON.stringify(createResponse.body)).not.toContain('very-secret-session-token');

			// When/Then - GET response
			const getResponse = await ownerAgent
				.get('/secret-providers/connections/security-test')
				.expect(200);

			expect(getResponse.body.settings).toEqual({});
			expect(JSON.stringify(getResponse.body)).not.toContain('AKIAIOSFODNN7EXAMPLE');

			// When/Then - LIST response
			const listResponse = await ownerAgent.get('/secret-providers/connections').expect(200);

			const securityConnection = listResponse.body.find((c: any) => c.id === 'security-test');
			expect(securityConnection.settings).toEqual({});
			expect(JSON.stringify(listResponse.body)).not.toContain('AKIAIOSFODNN7EXAMPLE');

			// When/Then - UPDATE response
			const updateResponse = await ownerAgent
				.patch('/secret-providers/connections/security-test')
				.send({ type: 'awsSecretsManager' })
				.expect(200);

			expect(updateResponse.body.settings).toEqual({});

			// When/Then - DELETE response
			const deleteResponse = await ownerAgent
				.delete('/secret-providers/connections/security-test')
				.expect(200);

			expect(deleteResponse.body.settings).toEqual({});
		});
	});

	describe('Relationships with Project entity', () => {
		test('multiple providers can be associated with the same project', async () => {
			// Given
			await ownerAgent
				.put('/secret-providers/connections/provider-1')
				.send({
					providerKey: 'provider-1',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			await ownerAgent
				.put('/secret-providers/connections/provider-2')
				.send({
					providerKey: 'provider-2',
					type: 'gcpSecretsManager',
					projectIds: [teamProject1.id],
					settings: { projectId: 'my-project' },
				})
				.expect(200);

			// When
			const response = await ownerAgent.get('/secret-providers/connections').expect(200);

			// Then
			const provider1 = response.body.find((c: any) => c.id === 'provider-1');
			const provider2 = response.body.find((c: any) => c.id === 'provider-2');

			expect(provider1).toBeDefined();
			expect(provider2).toBeDefined();
			expect(provider1.projects[0].id).toBe(teamProject1.id);
			expect(provider2.projects[0].id).toBe(teamProject1.id);

			// Then - Database validation (verify no constraint violations)
			const accessForProject = await Container.get(ProjectSecretsProviderAccessRepository).find({
				where: { projectId: teamProject1.id },
			});
			expect(accessForProject).toHaveLength(2);
		});

		test('should clean up project access when project is deleted', async () => {
			// Given
			const tempProject = await createTeamProject('Temporary');
			await ownerAgent
				.put('/secret-providers/connections/orphan-test')
				.send({
					providerKey: 'orphan-test',
					type: 'awsSecretsManager',
					projectIds: [tempProject.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			// When
			await Container.get(ProjectRepository).delete(tempProject.id);

			// Then - Verify no orphaned access entries (database check)
			const orphaned = await Container.get(ProjectSecretsProviderAccessRepository).find({
				where: { projectId: tempProject.id },
			});
			expect(orphaned).toHaveLength(0);

			// Then - Connection should still exist but with empty projects
			const response = await ownerAgent
				.get('/secret-providers/connections/orphan-test')
				.expect(200);
			expect(response.body.projects).toEqual([]);
		});
	});
});
