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

import { MockProviders } from '../../shared/external-secrets/utils';
import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

const mockProvidersInstance = new MockProviders();
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
	let teamProject1: Project;
	let teamProject2: Project;

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);

		teamProject1 = await createTeamProject('Engineering');
		teamProject2 = await createTeamProject('Marketing');
	});

	beforeEach(async () => {
		await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
	});

	describe('Create connection', () => {
		test('should create a global connection by default with encrypted settings', async () => {
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

			const response = await ownerAgent
				.post('/secret-providers/connections')
				.send(payload)
				.expect(200);

			expect(response.body.data).toEqual({
				id: expect.any(String),
				name: 'aws-prod',
				type: 'awsSecretsManager',
				isEnabled: false,
				projects: [],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});

			// Validate encrypted items in the DB
			const savedConnection = await Container.get(
				SecretsProviderConnectionRepository,
			).findOneByOrFail({ providerKey: 'aws-prod' });

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
				providerKey: 'aws-shared',
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
				.get('/secret-providers/connections/aws-shared')
				.expect(200);

			expect(getResponse.body.data.projects).toHaveLength(2);
		});

		test('should reject duplicate provider key', async () => {
			const payload = {
				providerKey: 'duplicate-test',
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
					providerKey: 'update-type-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			const response = await ownerAgent
				.patch('/secret-providers/connections/update-type-test')
				.send({
					type: 'gcpSecretsManager',
					settings: { projectId: 'my-project' },
				})
				.expect(200);

			expect(response.body.data.type).toBe('gcpSecretsManager');
			expect(response.body.data.projects).toHaveLength(1);

			const getResponse = await ownerAgent
				.get('/secret-providers/connections/update-type-test')
				.expect(200);

			expect(getResponse.body.data.type).toBe('gcpSecretsManager');
		});

		test('should completely replace settings (not merge)', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
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

			await ownerAgent
				.patch('/secret-providers/connections/replace-settings-test')
				.send({
					settings: {
						region: 'eu-west-1',
						secretAccessKey: 'NEW_SECRET',
					},
				})
				.expect(200);

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
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'update-projects-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			const response = await ownerAgent
				.patch('/secret-providers/connections/update-projects-test')
				.send({ projectIds: [teamProject2.id] })
				.expect(200);

			expect(response.body.data.projects).toEqual([{ id: teamProject2.id, name: 'Marketing' }]);

			const getResponse = await ownerAgent
				.get('/secret-providers/connections/update-projects-test')
				.expect(200);

			expect(getResponse.body.data.projects).toHaveLength(1);
			expect(getResponse.body.data.projects[0].id).toBe(teamProject2.id);
		});

		test('should convert to global by passing empty projectIds', async () => {
			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'to-global-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			const response = await ownerAgent
				.patch('/secret-providers/connections/to-global-test')
				.send({ projectIds: [] })
				.expect(200);

			expect(response.body.data.projects).toEqual([]);

			const getResponse = await ownerAgent
				.get('/secret-providers/connections/to-global-test')
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
					providerKey: 'delete-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			// Save the connection ID for verification after deletion
			const savedConnection = await Container.get(
				SecretsProviderConnectionRepository,
			).findOneByOrFail({ providerKey: 'delete-test' });
			const connectionId = savedConnection.id;

			const response = await ownerAgent
				.delete('/secret-providers/connections/delete-test')
				.expect(200);

			expect(response.body.data.name).toBe('delete-test');
			expect(response.body.data.projects).toHaveLength(2);

			// Verify deletion via GET
			await ownerAgent.get('/secret-providers/connections/delete-test').expect(404);

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
					providerKey: 'list-test-1',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'list-test-2',
					type: 'gcpSecretsManager',
					projectIds: [teamProject2.id],
					settings: { projectId: 'my-project' },
				})
				.expect(200);

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'list-test-3',
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
					isEnabled: expect.any(Boolean),
					projects: expect.any(Array),
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				});
			}

			const connection1 = response.body.data.find(
				(c: { name: string }) => c.name === 'list-test-1',
			);
			expect(connection1.projects).toHaveLength(1);

			const connection3 = response.body.data.find(
				(c: { name: string }) => c.name === 'list-test-3',
			);
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
					providerKey: 'get-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id, teamProject2.id],
					settings: {
						region: 'us-east-1',
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					},
				})
				.expect(200);

			const response = await ownerAgent.get('/secret-providers/connections/get-test').expect(200);

			expect(response.body.data).toMatchObject({
				id: expect.any(String),
				name: 'get-test',
				type: 'awsSecretsManager',
				isEnabled: false,
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
		test('should never return settings in any endpoint', async () => {
			const sensitiveSettings = {
				region: 'us-east-1',
				accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				sessionToken: 'very-secret-session-token',
			};

			// Create
			const createResponse = await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'security-test',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: sensitiveSettings,
				})
				.expect(200);

			expect(createResponse.body.data).not.toHaveProperty('settings');
			expect(JSON.stringify(createResponse.body.data)).not.toContain('AKIAIOSFODNN7EXAMPLE');
			expect(JSON.stringify(createResponse.body.data)).not.toContain('very-secret-session-token');

			// GET
			const getResponse = await ownerAgent
				.get('/secret-providers/connections/security-test')
				.expect(200);

			expect(getResponse.body.data).not.toHaveProperty('settings');
			expect(JSON.stringify(getResponse.body.data)).not.toContain('AKIAIOSFODNN7EXAMPLE');

			// LIST
			const listResponse = await ownerAgent.get('/secret-providers/connections').expect(200);

			const securityConnection = listResponse.body.data.find(
				(c: { name: string }) => c.name === 'security-test',
			);
			expect(securityConnection).not.toHaveProperty('settings');
			expect(JSON.stringify(listResponse.body.data)).not.toContain('AKIAIOSFODNN7EXAMPLE');

			// UPDATE
			const updateResponse = await ownerAgent
				.patch('/secret-providers/connections/security-test')
				.send({
					type: 'awsSecretsManager',
					settings: { region: 'eu-west-1' },
				})
				.expect(200);

			expect(updateResponse.body.data).not.toHaveProperty('settings');

			// DELETE
			const deleteResponse = await ownerAgent
				.delete('/secret-providers/connections/security-test')
				.expect(200);

			expect(deleteResponse.body.data).not.toHaveProperty('settings');
		});
	});

	describe('Access Control', () => {
		let memberAgent: SuperAgentTest;
		let adminAgent: SuperAgentTest;
		let agents: Record<string, SuperAgentTest>;

		const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';

		beforeAll(async () => {
			const [member, admin] = await Promise.all([createMember(), createAdmin()]);

			memberAgent = testServer.authAgentFor(member);
			adminAgent = testServer.authAgentFor(admin);

			agents = {
				owner: ownerAgent,
				admin: adminAgent,
				member: memberAgent,
			};
		});

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
				const providerKey = `${role}-create-test`;
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
				await createTestConnection('read-test-connection', [teamProject1.id]);
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
							(c: { name: string }) => c.name === 'read-test-connection',
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
							.get('/secret-providers/connections/read-test-connection')
							.expect(allowed ? 200 : 403);

						if (allowed) {
							expect(response.body.data.name).toBe('read-test-connection');
						} else {
							expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
						}
					},
				);
			});
		});

		describe('update connections', () => {
			beforeEach(async () => {
				await createTestConnection('update-auth-test');
			});

			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to update connection', async ({ role, allowed }) => {
				const response = await agents[role]
					.patch('/secret-providers/connections/update-auth-test')
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
						async (role) => await createTestConnection(`delete-auth-${role}-test`),
					),
				);
			});

			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])('should allow=$allowed for $role to delete connection', async ({ role, allowed }) => {
				const providerKey = `delete-auth-${role}-test`;
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
					providerKey: 'provider-1',
					type: 'awsSecretsManager',
					projectIds: [teamProject1.id],
					settings: { region: 'us-east-1' },
				})
				.expect(200);

			await ownerAgent
				.post('/secret-providers/connections')
				.send({
					providerKey: 'provider-2',
					type: 'gcpSecretsManager',
					projectIds: [teamProject1.id],
					settings: { projectId: 'my-project' },
				})
				.expect(200);

			const response = await ownerAgent.get('/secret-providers/connections').expect(200);

			const provider1 = response.body.data.find((c: { name: string }) => c.name === 'provider-1');
			const provider2 = response.body.data.find((c: { name: string }) => c.name === 'provider-2');

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
					providerKey: 'orphan-test',
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
			const response = await ownerAgent
				.get('/secret-providers/connections/orphan-test')
				.expect(200);
			expect(response.body.data.projects).toEqual([]);
		});
	});
});
