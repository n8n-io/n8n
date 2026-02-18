import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import {
	ProjectRepository,
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';

import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';

import { MockProviders, createDummyProvider } from '../../shared/external-secrets/utils';
import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

const mockProvidersInstance = new MockProviders();
// Register mock providers for types used in tests
mockProvidersInstance.setProviders({
	awsSecretsManager: createDummyProvider({
		name: 'awsSecretsManager',
		properties: [
			{
				name: 'region',
				displayName: 'Region',
				type: 'string',
				default: '',
			},
			{
				name: 'accessKeyId',
				displayName: 'Access Key ID',
				type: 'string',
				default: '',
				typeOptions: {
					password: true,
				},
			},
			{
				name: 'secretAccessKey',
				displayName: 'Secret Access Key',
				type: 'string',
				default: '',
				typeOptions: {
					password: true,
				},
			},
			{
				name: 'sessionToken',
				displayName: 'Session Token',
				type: 'string',
				default: '',
				typeOptions: {
					password: true,
				},
			},
		],
	}),
	gcpSecretsManager: createDummyProvider({ name: 'gcpSecretsManager' }),
	vault: createDummyProvider({ name: 'vault' }),
});
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

mockInstance(ExternalSecretsConfig, {
	externalSecretsForProjects: true,
});

describe('Secret Providers Connections API', () => {
	const testServer = utils.setupTestServer({
		endpointGroups: ['externalSecrets'],
		enabledFeatures: ['feat:externalSecrets'],
		modules: ['external-secrets'],
	});

	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let adminAgent: SuperAgentTest;
	let agents: Record<string, SuperAgentTest>;
	let teamProject1: Project;
	let teamProject2: Project;

	const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);

		const [member, admin] = await Promise.all([createMember(), createAdmin()]);
		memberAgent = testServer.authAgentFor(member);
		adminAgent = testServer.authAgentFor(admin);

		agents = {
			owner: ownerAgent,
			admin: adminAgent,
			member: memberAgent,
		};

		teamProject1 = await createTeamProject('Engineering');
		teamProject2 = await createTeamProject('Marketing');
	});

	beforeEach(async () => {
		await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
	});

	describe('Create connection', () => {
		test('should create a global connection by default with encrypted settings', async () => {
			const payload = {
				providerKey: 'awsProd',
				type: 'awsSecretsManager',
				projectIds: [],
				settings: {
					region: 'us-east-1',
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				},
			};

			const response = await ownerAgent
				.post('/secret-providers/connections')
				.send(payload)
				.expect(200);

			expect(response.body.data).toEqual({
				id: expect.any(String),
				name: 'awsProd',
				type: 'awsSecretsManager',
				secretsCount: 2,
				state: 'connected',
				secrets: [{ name: 'test1' }, { name: 'test2' }],
				projects: [],
				settings: expect.any(Object),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});

			// Validate encrypted items in the DB
			const savedConnection = await Container.get(
				SecretsProviderConnectionRepository,
			).findOneByOrFail({ providerKey: 'awsProd' });

			expect(savedConnection.encryptedSettings).toBeTruthy();
			expect(savedConnection.encryptedSettings).not.toContain('us-east-1');
			expect(savedConnection.encryptedSettings).not.toContain('AKIAIOSFODNN7EXAMPLE');

			// Check we can decrypt them
			const cipher = Container.get(Cipher);
			const decryptedSettings = JSON.parse(cipher.decrypt(savedConnection.encryptedSettings));
			expect(decryptedSettings).toEqual(payload.settings);
		});

		test('should create a connection and assign its projects', async () => {
			const payload = {
				providerKey: 'awsShared',
				type: 'awsSecretsManager',
				projectIds: [teamProject1.id, teamProject2.id],
				settings: {
					region: 'us-west-2',
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'secret123',
				},
			};

			const response = await ownerAgent
				.post('/secret-providers/connections')
				.send(payload)
				.expect(200);

			expect(response.body.data.projects).toHaveLength(2);
			expect(response.body.data.projects).toEqual(
				expect.arrayContaining([
					{ id: teamProject1.id, name: 'Engineering' },
					{ id: teamProject2.id, name: 'Marketing' },
				]),
			);

			const getResponse = await ownerAgent
				.get('/secret-providers/connections/awsShared')
				.expect(200);

			expect(getResponse.body.data.projects).toHaveLength(2);
		});

		test('should reject duplicate provider key', async () => {
			const payload = {
				providerKey: 'duplicateTest',
				type: 'awsSecretsManager',
				projectIds: [],
				settings: { region: 'us-east-1' },
			};

			await ownerAgent.post('/secret-providers/connections').send(payload).expect(200);

			const response = await ownerAgent
				.post('/secret-providers/connections')
				.send(payload)
				.expect(400);

			expect(response.body.message).toBe('There is already an entry with this name');
		});
	});

	describe('Update connection', () => {
		test('should update connection type', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'updateTypeTest',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			const response = await ownerAgent
				.patch('/secret-providers/connections/updateTypeTest')
				.send({
					type: 'gcpSecretsManager',
					settings: { projectId: 'my-project' },
				})
				.expect(200);

			expect(response.body.data.type).toBe('gcpSecretsManager');
			expect(response.body.data.projects).toHaveLength(1);

			const getResponse = await ownerAgent
				.get('/secret-providers/connections/updateTypeTest')
				.expect(200);

			expect(getResponse.body.data.type).toBe('gcpSecretsManager');
		});

		test('should completely replace settings (not merge)', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'replaceSettingsTest',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: {
						region: 'us-east-1',
						accessKeyId: 'OLD_KEY',
						secretAccessKey: 'OLD_SECRET',
					},
				})
				.expect(200);

			await ownerAgent
				.patch('/secret-providers/connections/replaceSettingsTest')
				.send({
					settings: {
						region: 'eu-west-1',
						secretAccessKey: 'NEW_SECRET',
					},
				})
				.expect(200);

			const updated = await Container.get(SecretsProviderConnectionRepository).findOneByOrFail({
				providerKey: 'replaceSettingsTest',
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
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'updateProjectsTest',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			const response = await ownerAgent
				.patch('/secret-providers/connections/updateProjectsTest')
				.send({ projectIds: [teamProject2.id] })
				.expect(200);

			expect(response.body.data.projects).toEqual([{ id: teamProject2.id, name: 'Marketing' }]);

			const getResponse = await ownerAgent
				.get('/secret-providers/connections/updateProjectsTest')
				.expect(200);

			expect(getResponse.body.data.projects).toHaveLength(1);
			expect(getResponse.body.data.projects[0].id).toBe(teamProject2.id);
		});

		test('should convert to global by passing empty projectIds', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'toGlobalTest',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			const response = await ownerAgent
				.patch('/secret-providers/connections/toGlobalTest')
				.send({ projectIds: [] })
				.expect(200);

			expect(response.body.data.projects).toEqual([]);

			const getResponse = await ownerAgent
				.get('/secret-providers/connections/toGlobalTest')
				.expect(200);

			expect(getResponse.body.data.projects).toEqual([]);
		});

		test('should fail for non-existent connection', async () => {
			const response = await ownerAgent
				.patch('/secret-providers/connections/non-existent')
				.send({ type: 'gcpSecretsManager' })
				.expect(404);

			expect(response.body.message).toBe('Connection with key "non-existent" not found');
		});
	});

	describe('Delete connection', () => {
		test('should delete connection and cascade project access', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'deleteTest',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			// Save the connection ID for verification after deletion
			const savedConnection = await Container.get(
				SecretsProviderConnectionRepository,
			).findOneByOrFail({ providerKey: 'deleteTest' });
			const connectionId = savedConnection.id;

			const response = await ownerAgent
				.delete('/secret-providers/connections/deleteTest')
				.expect(200);

			expect(response.body.data.name).toBe('deleteTest');
			expect(response.body.data.projects).toHaveLength(2);

			// Verify deletion via GET
			await ownerAgent.get('/secret-providers/connections/deleteTest').expect(404);

			// Verify cascade delete
			const remainingAccess = await Container.get(ProjectSecretsProviderAccessRepository).find({
				where: { secretsProviderConnectionId: connectionId },
			});
			expect(remainingAccess).toHaveLength(0);
		});

		test('should fail for non-existent connection', async () => {
			const response = await ownerAgent
				.delete('/secret-providers/connections/non-existent')
				.expect(404);

			expect(response.body.message).toBe('Connection with key "non-existent" not found');
		});
	});

	describe('List connections', () => {
		test('should list all connections with eager-loaded projects', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'listTest1',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'listTest2',
					type: 'gcpSecretsManager',
					projectIds: [teamProject2.id],
					settings: { projectId: 'my-project' },
				})
				.expect(200);

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'listTest3',
					type: 'vault',
					projectIds: [],
					settings: { vaultUrl: 'https://vault.example.com' },
				})
				.expect(200);

			const response = await ownerAgent.get('/secret-providers/connections').expect(200);

			expect(response.body.data).toHaveLength(3);

			for (const connection of response.body.data) {
				expect(connection).toMatchObject({
					id: expect.any(String),
					name: expect.any(String),
					type: expect.any(String),
					state: expect.any(String),
					projects: expect.any(Array),
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				});
				// LIST endpoint should NOT include settings (lightweight response)
				expect(connection).not.toHaveProperty('settings');
			}

			const connection1 = response.body.data.find((c: { name: string }) => c.name === 'listTest1');
			expect(connection1.projects).toHaveLength(1);

			const connection3 = response.body.data.find((c: { name: string }) => c.name === 'listTest3');
			expect(connection3.projects).toEqual([]);
		});

		test('should return empty array when no connections exist', async () => {
			const response = await ownerAgent.get('/secret-providers/connections').expect(200);

			expect(response.body.data).toEqual([]);
		});
	});

	describe('Get single connection', () => {
		test('should return full connection details', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'getTest',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: {
						region: 'us-east-1',
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					},
				})
				.expect(200);

			const response = await ownerAgent.get('/secret-providers/connections/getTest').expect(200);

			expect(response.body.data).toMatchObject({
				id: expect.any(String),
				name: 'getTest',
				type: 'awsSecretsManager',
				state: expect.any(String),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(response.body.data.projects).toHaveLength(2);
		});

		test('should fail for non-existent connection', async () => {
			const response = await ownerAgent
				.get('/secret-providers/connections/does-not-exist')
				.expect(404);

			expect(response.body.message).toBe('Connection with key "does-not-exist" not found');
		});
	});

	describe('Security', () => {
		test('should return redacted settings without exposing sensitive data', async () => {
			const sensitiveSettings = {
				region: 'us-east-1',
				accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				sessionToken: 'very-secret-session-token',
			};

			// Create connection with sensitive settings
			const createResponse = await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'securityTest',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: sensitiveSettings,
				})
				.expect(200);

			// Detail endpoint (POST) should include settings field
			expect(createResponse.body.data).toHaveProperty('settings');
			expect(createResponse.body.data.settings).toEqual(expect.any(Object));

			// Password fields should be redacted (contain BLANK_VALUE marker)
			const responseSettings = createResponse.body.data.settings;
			const responseString = JSON.stringify(responseSettings);
			expect(responseString).toContain('__n8n_BLANK_VALUE_');

			// Actual secret values should NOT appear in response
			expect(responseString).not.toContain('AKIAIOSFODNN7EXAMPLE');
			expect(responseString).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
			expect(responseString).not.toContain('very-secret-session-token');

			// GET detail endpoint should also include redacted settings
			const getResponse = await ownerAgent
				.get('/secret-providers/connections/securityTest')
				.expect(200);

			expect(getResponse.body.data).toHaveProperty('settings');
			const getResponseString = JSON.stringify(getResponse.body.data.settings);
			expect(getResponseString).toContain('__n8n_BLANK_VALUE_');
			expect(getResponseString).not.toContain('AKIAIOSFODNN7EXAMPLE');
			expect(getResponseString).not.toContain('very-secret-session-token');

			// LIST endpoint should NOT include settings
			const listResponse = await ownerAgent.get('/secret-providers/connections').expect(200);

			const securityTestConnection = listResponse.body.data.find(
				(conn: { name: string }) => conn.name === 'securityTest',
			);
			expect(securityTestConnection).toBeDefined();
			expect(securityTestConnection).not.toHaveProperty('settings');

			// Verify entire list response doesn't contain secrets
			const listResponseString = JSON.stringify(listResponse.body.data);
			expect(listResponseString).not.toContain('AKIAIOSFODNN7EXAMPLE');
			expect(listResponseString).not.toContain('very-secret-session-token');

			// DELETE endpoint should include redacted settings in response
			const deleteResponse = await ownerAgent
				.delete('/secret-providers/connections/securityTest')
				.expect(200);

			expect(deleteResponse.body.data).toHaveProperty('settings');
			const deleteResponseString = JSON.stringify(deleteResponse.body.data.settings);
			expect(deleteResponseString).toContain('__n8n_BLANK_VALUE_');
			expect(deleteResponseString).not.toContain('AKIAIOSFODNN7EXAMPLE');
			expect(deleteResponseString).not.toContain('very-secret-session-token');
		});
	});

	describe('Access Control', () => {
		async function createTestConnection(providerKey: string, projectIds: string[] = []) {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey,
					type: 'awsSecretsManager',
					projectIds,
					settings: { region: 'us-east-1' },
				})
				.expect(200);
		}

		describe('Create connection', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to create connection', async ({ role, allowed }) => {
				const providerKey = `createTest${role.charAt(0).toUpperCase() + role.slice(1)}`;
				const response = await agents[role]
					.post('/secret-providers/connections')
					.send({
						providerKey,
						type: 'awsSecretsManager',
						projectIds: [],
						settings: { region: 'us-east-1' },
					})
					.expect(allowed ? 200 : 403);

				if (allowed) {
					expect(response.body.data.name).toBe(providerKey);
				} else {
					expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
				}
			});
		});

		describe('read connections', () => {
			beforeEach(async () => {
				await createTestConnection('readTestConnection', [teamProject1.id]);
			});

			describe('list all connections', () => {
				test.each([
					{ role: 'owner', allowed: true },
					{ role: 'admin', allowed: true },
					{ role: 'member', allowed: false },
				])('should allow=$allowed for $role to list connections', async ({ role, allowed }) => {
					const response = await agents[role]
						.get('/secret-providers/connections')
						.expect(allowed ? 200 : 403);

					if (allowed) {
						expect(Array.isArray(response.body.data)).toBe(true);
						const connection = response.body.data.find(
							(c: { name: string }) => c.name === 'readTestConnection',
						);
						expect(connection).toBeDefined();
					} else {
						expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					}
				});
			});

			describe('get single connection', () => {
				test.each([
					{ role: 'owner', allowed: true },
					{ role: 'admin', allowed: true },
					{ role: 'member', allowed: false },
				])(
					'should allow=$allowed for $role to get single connection',
					async ({ role, allowed }) => {
						const response = await agents[role]
							.get('/secret-providers/connections/readTestConnection')
							.expect(allowed ? 200 : 403);

						if (allowed) {
							expect(response.body.data.name).toBe('readTestConnection');
						} else {
							expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
						}
					},
				);
			});
		});

		describe('update connections', () => {
			beforeEach(async () => {
				await createTestConnection('updateAuthTest');
			});

			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to update connection', async ({ role, allowed }) => {
				const response = await agents[role]
					.patch('/secret-providers/connections/updateAuthTest')
					.send({ projectIds: [teamProject1.id] })
					.expect(allowed ? 200 : 403);

				if (allowed) {
					expect(response.body.data.projects).toHaveLength(1);
				} else {
					expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
				}
			});
		});

		describe('delete connections', () => {
			beforeEach(async () => {
				await Promise.all(
					['owner', 'admin', 'member'].map(
						async (role) =>
							await createTestConnection(
								`deleteAuth${role.charAt(0).toUpperCase() + role.slice(1)}Test`,
							),
					),
				);
			});

			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to delete connection', async ({ role, allowed }) => {
				const providerKey = `deleteAuth${role.charAt(0).toUpperCase() + role.slice(1)}Test`;
				const response = await agents[role]
					.delete(`/secret-providers/connections/${providerKey}`)
					.expect(allowed ? 200 : 403);

				if (allowed) {
					expect(response.body.data.name).toBe(providerKey);
					await ownerAgent.get(`/secret-providers/connections/${providerKey}`).expect(404);
				} else {
					expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					await ownerAgent.get(`/secret-providers/connections/${providerKey}`).expect(200);
				}
			});
		});
	});

	describe('Relationships with Project entity', () => {
		test('multiple providers can be associated with the same project', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'provider1',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'provider2',
					type: 'gcpSecretsManager',
					projectIds: [teamProject1.id],
					settings: { projectId: 'my-project' },
				})
				.expect(200);

			const response = await ownerAgent.get('/secret-providers/connections').expect(200);

			const provider1 = response.body.data.find((c: { name: string }) => c.name === 'provider1');
			const provider2 = response.body.data.find((c: { name: string }) => c.name === 'provider2');

			expect(provider1).toBeDefined();
			expect(provider2).toBeDefined();
			expect(provider1.projects[0].id).toBe(teamProject1.id);
			expect(provider2.projects[0].id).toBe(teamProject1.id);

			// Database validation
			const accessForProject = await Container.get(ProjectSecretsProviderAccessRepository).find({
				where: { projectId: teamProject1.id },
			});
			expect(accessForProject).toHaveLength(2);
		});

		test('should clean up project access when project is deleted', async () => {
			const tempProject = await createTeamProject('Temporary');
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'orphanTest',
					type: 'awsSecretsManager',
					projectIds: [tempProject.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			await Container.get(ProjectRepository).delete(tempProject.id);

			// Verify no orphaned access entries
			const orphaned = await Container.get(ProjectSecretsProviderAccessRepository).find({
				where: { projectId: tempProject.id },
			});
			expect(orphaned).toHaveLength(0);

			// Connection should still exist but with empty projects
			const response = await ownerAgent.get('/secret-providers/connections/orphanTest').expect(200);
			expect(response.body.data.projects).toEqual([]);
		});
	});

	describe('Reload connection secrets', () => {
		beforeAll(async () => {
			const { DummyProvider } = await import('../../shared/external-secrets/utils');
			mockProvidersInstance.setProviders({ awsSecretsManager: DummyProvider });
		});

		afterEach(async () => {
			const { DummyProvider } = await import('../../shared/external-secrets/utils');
			mockProvidersInstance.setProviders({ awsSecretsManager: DummyProvider });
		});

		test('should successfully reload connection secrets', async () => {
			const { ExternalSecretsManager } = await import(
				'@/modules/external-secrets.ee/external-secrets-manager.ee'
			);

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'reloadSuccess',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: { username: 'user', password: 'pass' },
				})
				.expect(200);

			const manager = Container.get(ExternalSecretsManager);
			await manager.reloadAllProviders();

			const provider = manager.getProvider('reloadSuccess');
			expect(provider).toBeDefined();
			expect(provider?.state).toBe('connected');

			const updateSpy = jest.spyOn(provider!, 'update');

			const reloadResponse = await ownerAgent
				.post('/secret-providers/connections/reloadSuccess/reload')
				.expect(200);

			expect(reloadResponse.body.data).toEqual({ success: true });
			expect(updateSpy).toHaveBeenCalled();
		});

		test('should return 404 for non-existent connection', async () => {
			const response = await ownerAgent
				.post('/secret-providers/connections/non-existent/reload')
				.expect(404);

			expect(response.body.message).toBe('Connection with key "non-existent" not found');
		});

		describe('access control', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to reload connection', async ({ role, allowed }) => {
				const { ExternalSecretsManager } = await import(
					'@/modules/external-secrets.ee/external-secrets-manager.ee'
				);

				const providerKey = `reloadAccess${role.charAt(0).toUpperCase() + role.slice(1)}`;
				await ownerAgent
					.post('/secret-providers/connections')
					.send({
						providerKey,
						type: 'awsSecretsManager',
						projectIds: [],
						settings: { region: 'us-east-1' },
					})
					.expect(200);

				await Container.get(ExternalSecretsManager).reloadAllProviders();

				const response = await agents[role]
					.post(`/secret-providers/connections/${providerKey}/reload`)
					.expect(allowed ? 200 : 403);

				if (allowed) {
					expect(response.body.data).toEqual({ success: true });
				} else {
					expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
				}
			});
		});
	});

	describe('Test connection', () => {
		beforeAll(async () => {
			const { DummyProvider } = await import('../../shared/external-secrets/utils');
			mockProvidersInstance.setProviders({ awsSecretsManager: DummyProvider });
		});

		afterEach(async () => {
			const { DummyProvider } = await import('../../shared/external-secrets/utils');
			mockProvidersInstance.setProviders({ awsSecretsManager: DummyProvider });
		});

		test('should successfully test connection with valid settings', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'testSuccess',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: { username: 'user', password: 'pass' },
				})
				.expect(200);

			const testResponse = await ownerAgent
				.post('/secret-providers/connections/testSuccess/test')
				.expect(200);

			expect(testResponse.body.data).toMatchObject({ success: true });
		});

		test('should return failure when provider test fails', async () => {
			const { TestFailProvider } = await import('../../shared/external-secrets/utils');

			mockProvidersInstance.setProviders({ awsSecretsManager: TestFailProvider });

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'testFail',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			const testResponse = await ownerAgent
				.post('/secret-providers/connections/testFail/test')
				.expect(200);

			expect(testResponse.body.data).toMatchObject({ success: false });
		});

		test('should return error when connection fails', async () => {
			const { FailedProvider } = await import('../../shared/external-secrets/utils');

			mockProvidersInstance.setProviders({ awsSecretsManager: FailedProvider });

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'testConnectionFail',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			const testResponse = await ownerAgent
				.post('/secret-providers/connections/testConnectionFail/test')
				.expect(200);

			expect(testResponse.body.data.success).toBe(false);
			expect(testResponse.body.data.error).toBeDefined();
		});

		test('should return 404 for non-existent connection', async () => {
			const response = await ownerAgent
				.post('/secret-providers/connections/non-existent/test')
				.expect(404);

			expect(response.body.message).toBe('Connection with key "non-existent" not found');
		});

		describe('access control', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to test connection', async ({ role, allowed }) => {
				const providerKey = `testAccess${role.charAt(0).toUpperCase() + role.slice(1)}`;
				await ownerAgent
					.post('/secret-providers/connections')
					.send({
						providerKey,
						type: 'awsSecretsManager',
						projectIds: [],
						settings: { region: 'us-east-1' },
					})
					.expect(200);

				const response = await agents[role]
					.post(`/secret-providers/connections/${providerKey}/test`)
					.expect(allowed ? 200 : 403);

				if (allowed) {
					expect(response.body.data).toHaveProperty('success');
				} else {
					expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
				}
			});
		});
	});
});
