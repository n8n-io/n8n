import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';
import type { Response } from 'superagent';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';

import {
	DummyProvider,
	MockProviders,
	createDummyProvider,
} from '../../shared/external-secrets/utils';
import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

const mockProvidersInstance = new MockProviders();
mockProvidersInstance.setProviders({
	dummy: DummyProvider,
	awsSecretsManager: createDummyProvider({ name: 'awsSecretsManager' }),
	gcpSecretsManager: createDummyProvider({ name: 'gcpSecretsManager' }),
});
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

mockInstance(ExternalSecretsConfig, {
	externalSecretsForProjects: true,
});

describe('Secret Providers Project API', () => {
	const testServer = setupTestServer({
		endpointGroups: ['externalSecrets'],
		enabledFeatures: ['feat:externalSecrets'],
		modules: ['external-secrets'],
	});

	let ownerAgent: SuperAgentTest;
	let adminAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	let teamProject1: Project;
	let teamProject2: Project;
	let emptyProject: Project;

	let connectionRepository: SecretsProviderConnectionRepository;
	let projectAccessRepository: ProjectSecretsProviderAccessRepository;

	beforeAll(async () => {
		const [owner, admin, member] = await Promise.all([
			createOwner(),
			createAdmin(),
			createMember(),
		]);
		ownerAgent = testServer.authAgentFor(owner);
		adminAgent = testServer.authAgentFor(admin);
		memberAgent = testServer.authAgentFor(member);

		teamProject1 = await createTeamProject('Engineering');
		teamProject2 = await createTeamProject('Marketing');
		emptyProject = await createTeamProject('Empty');

		connectionRepository = Container.get(SecretsProviderConnectionRepository);
		projectAccessRepository = Container.get(ProjectSecretsProviderAccessRepository);
	});

	async function createProviderConnection(
		providerKey: string,
		projectIds: string[] = [],
	): Promise<number> {
		const cipher = Container.get(Cipher);
		const mockSettings = { region: 'us-east-1', accessKeyId: 'test-key' };
		const encryptedSettings = cipher.encrypt(mockSettings);

		const connection = await connectionRepository.save(
			connectionRepository.create({
				providerKey,
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			}),
		);

		if (projectIds.length > 0) {
			const entries = projectIds.map((projectId) =>
				projectAccessRepository.create({
					secretsProviderConnectionId: connection.id,
					projectId,
				}),
			);
			await projectAccessRepository.save(entries);
		}

		return connection.id;
	}

	describe('GET /secret-providers/projects/:projectId/connections', () => {
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
					.get(`/secret-providers/projects/${teamProject1.id}/connections`)
					.expect(allowed ? 200 : 403);

				if (!allowed) {
					expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
				}
			});
		});

		describe('with global connections only', () => {
			let response: Response;

			beforeAll(async () => {
				await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);

				await Promise.all([
					createProviderConnection('global-connection1', []),
					createProviderConnection('global-connection2', []),
				]);

				response = await ownerAgent
					.get(`/secret-providers/projects/${teamProject1.id}/connections`)
					.expect(200);
			});

			test('should return global connections', async () => {
				expect(response.body.data).toHaveLength(2);
				const names = response.body.data.map((c: { name: string }) => c.name);
				expect(names).toEqual(expect.arrayContaining(['global-connection1', 'global-connection2']));
			});

			test('should return the right connection data', async () => {
				const globalConnection1 = response.body.data.find(
					(c: { name: string }) => c.name === 'global-connection1',
				);

				expect(globalConnection1).toMatchObject({
					name: 'global-connection1',
					type: 'dummy',
					state: 'initializing',
					projects: [],
				});
			});
		});

		describe('with project-specific connections only', () => {
			beforeAll(async () => {
				await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);

				await Promise.all([
					createProviderConnection('connection1', [teamProject1.id]),
					createProviderConnection('connection2', [teamProject1.id]),
					createProviderConnection('connection3', [teamProject1.id]),
					createProviderConnection('connection4', [teamProject2.id]),
					createProviderConnection('connection5', [teamProject2.id]),
				]);
			});

			describe('when the project has no connections', () => {
				test('should return an empty array', async () => {
					const response = await ownerAgent
						.get(`/secret-providers/projects/${emptyProject.id}/connections`)
						.expect(200);

					expect(response.body.data).toEqual([]);
				});
			});

			describe('when the project has connections', () => {
				let response: Response;

				beforeAll(async () => {
					response = await ownerAgent
						.get(`/secret-providers/projects/${teamProject1.id}/connections`)
						.expect(200);
				});
				test('should only return connections for the project', async () => {
					expect(response.body.data).toHaveLength(3);
					const names = response.body.data.map((c: { name: string }) => c.name);
					expect(names).toEqual(
						expect.arrayContaining(['connection1', 'connection2', 'connection3']),
					);
				});

				test('should return the right connection data', async () => {
					const connection1 = response.body.data.find(
						(c: { name: string }) => c.name === 'connection1',
					);

					expect(connection1).toMatchObject({
						name: 'connection1',
						type: 'dummy',
						state: 'initializing',
						projects: [{ id: teamProject1.id, name: teamProject1.name }],
					});
				});
			});
		});

		describe('with both global and project-specific connections', () => {
			beforeAll(async () => {
				await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);

				await Promise.all([
					createProviderConnection('connection1', [teamProject1.id]),
					createProviderConnection('connection2', [teamProject1.id]),
					createProviderConnection('connection3', [teamProject1.id]),
					createProviderConnection('connection4', [teamProject2.id]),
					createProviderConnection('connection5', [teamProject2.id]),
					createProviderConnection('global-connection1', []),
					createProviderConnection('global-connection2', []),
				]);
			});

			describe('when the project has no connections', () => {
				test('should return global connections', async () => {
					const response = await ownerAgent
						.get(`/secret-providers/projects/${emptyProject.id}/connections`)
						.expect(200);

					expect(response.body.data).toHaveLength(2);
					const names = response.body.data.map((c: { name: string }) => c.name);
					expect(names).toEqual(
						expect.arrayContaining(['global-connection1', 'global-connection2']),
					);
				});
			});

			describe('when the project has connections', () => {
				test('should return both global and project-specific connections', async () => {
					const response = await ownerAgent
						.get(`/secret-providers/projects/${teamProject1.id}/connections`)
						.expect(200);

					expect(response.body.data).toHaveLength(5);
					const names = response.body.data.map((c: { name: string }) => c.name);
					expect(names).toEqual(
						expect.arrayContaining([
							'connection1',
							'connection2',
							'connection3',
							'global-connection1',
							'global-connection2',
						]),
					);
				});
			});
		});

		describe('with no connections', () => {
			test('should return an empty array', async () => {
				await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);

				const response = await ownerAgent
					.get(`/secret-providers/projects/${teamProject1.id}/connections`)
					.expect(200);

				expect(response.body.data).toEqual([]);
			});
		});
	});

	describe('POST /secret-providers/projects/:projectId/connections', () => {
		const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
		let agents: Record<string, SuperAgentTest>;

		beforeAll(() => {
			agents = { owner: ownerAgent, admin: adminAgent, member: memberAgent };
		});

		beforeEach(async () => {
			await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
		});

		test('should create a connection for the project', async () => {
			const response = await ownerAgent
				.post(`/secret-providers/projects/${teamProject1.id}/connections`)
				.send({
					providerKey: 'newConn',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: { region: 'us-east-1', accessKeyId: 'test-key' },
				})
				.expect(200);

			expect(response.body.data).toMatchObject({
				name: 'newConn',
				type: 'awsSecretsManager',
				state: 'connected',
				projects: [{ id: teamProject1.id, name: teamProject1.name }],
			});

			// Verify it exists in the DB
			const found = await connectionRepository.findOneBy({ providerKey: 'newConn' });
			expect(found).not.toBeNull();

			// Verify project access was created
			const access = await projectAccessRepository.find({
				where: { secretsProviderConnectionId: found!.id },
			});
			expect(access).toHaveLength(1);
			expect(access[0].projectId).toBe(teamProject1.id);
		});

		test('should return 400 when connection with same providerKey already exists', async () => {
			await createProviderConnection('existingConn', [teamProject1.id]);

			await ownerAgent
				.post(`/secret-providers/projects/${teamProject1.id}/connections`)
				.send({
					providerKey: 'existingConn',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: { region: 'us-east-1', accessKeyId: 'test-key' },
				})
				.expect(400);
		});

		test('should assign the connection only to the target project', async () => {
			await ownerAgent
				.post(`/secret-providers/projects/${teamProject1.id}/connections`)
				.send({
					providerKey: 'proj1Only',
					type: 'awsSecretsManager',
					projectIds: [],
					settings: { region: 'us-east-1', accessKeyId: 'test-key' },
				})
				.expect(200);

			// Connection should NOT be visible from teamProject2
			const response = await ownerAgent
				.get(`/secret-providers/projects/${teamProject2.id}/connections`)
				.expect(200);

			const names = response.body.data.map((c: { name: string }) => c.name);
			expect(names).not.toContain('proj1Only');
		});

		describe('authorization', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])(
				'should allow=$allowed for $role to create a project connection',
				async ({ role, allowed }) => {
					const response = await agents[role]
						.post(`/secret-providers/projects/${teamProject1.id}/connections`)
						.send({
							providerKey: `createAuth${role.charAt(0).toUpperCase() + role.slice(1)}`,
							type: 'awsSecretsManager',
							projectIds: [],
							settings: { region: 'us-east-1', accessKeyId: 'test-key' },
						})
						.expect(allowed ? 200 : 403);

					if (!allowed) {
						expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					}
				},
			);
		});
	});

	describe('GET /secret-providers/projects/:projectId/connections/:providerKey', () => {
		const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
		let agents: Record<string, SuperAgentTest>;

		beforeAll(() => {
			agents = { owner: ownerAgent, admin: adminAgent, member: memberAgent };
		});

		beforeEach(async () => {
			await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
		});

		test('should return a connection belonging to the project', async () => {
			await createProviderConnection('my-conn', [teamProject1.id]);

			const response = await ownerAgent
				.get(`/secret-providers/projects/${teamProject1.id}/connections/my-conn`)
				.expect(200);

			expect(response.body.data).toMatchObject({
				name: 'my-conn',
				state: 'initializing',
				projects: [{ id: teamProject1.id }],
			});
		});

		test('should return 404 for a connection belonging to another project', async () => {
			await createProviderConnection('other-proj-conn', [teamProject2.id]);

			const response = await ownerAgent
				.get(`/secret-providers/projects/${teamProject1.id}/connections/other-proj-conn`)
				.expect(404);

			expect(response.body.message).toContain('not found');
		});

		test('should return 404 for a global connection (no project access)', async () => {
			await createProviderConnection('global-conn', []);

			await ownerAgent
				.get(`/secret-providers/projects/${teamProject1.id}/connections/global-conn`)
				.expect(404);
		});

		test('should return 404 for a non-existent connection', async () => {
			await ownerAgent
				.get(`/secret-providers/projects/${teamProject1.id}/connections/does-not-exist`)
				.expect(404);
		});

		describe('authorization', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])(
				'should allow=$allowed for $role to get a project connection',
				async ({ role, allowed }) => {
					await createProviderConnection('auth-get-conn', [teamProject1.id]);

					const response = await agents[role]
						.get(`/secret-providers/projects/${teamProject1.id}/connections/auth-get-conn`)
						.expect(allowed ? 200 : 403);

					if (!allowed) {
						expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					}
				},
			);
		});
	});

	describe('PATCH /secret-providers/projects/:projectId/connections/:providerKey', () => {
		const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
		let agents: Record<string, SuperAgentTest>;

		beforeAll(() => {
			agents = { owner: ownerAgent, admin: adminAgent, member: memberAgent };
		});

		beforeEach(async () => {
			await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
		});

		test('should update connection type and settings', async () => {
			await createProviderConnection('update-conn', [teamProject1.id]);

			const response = await ownerAgent
				.patch(`/secret-providers/projects/${teamProject1.id}/connections/update-conn`)
				.send({ type: 'gcpSecretsManager', settings: { projectId: 'my-project' } })
				.expect(200);

			expect(response.body.data.type).toBe('gcpSecretsManager');
		});

		test('should ignore projectIds in the update body', async () => {
			await createProviderConnection('no-reassign', [teamProject1.id]);

			const response = await ownerAgent
				.patch(`/secret-providers/projects/${teamProject1.id}/connections/no-reassign`)
				.send({ projectIds: [teamProject2.id] })
				.expect(200);

			// Connection should still belong to teamProject1, not teamProject2
			expect(response.body.data.projects).toHaveLength(1);
			expect(response.body.data.projects[0].id).toBe(teamProject1.id);
		});

		test('should return 404 for a connection belonging to another project', async () => {
			await createProviderConnection('other-update', [teamProject2.id]);

			await ownerAgent
				.patch(`/secret-providers/projects/${teamProject1.id}/connections/other-update`)
				.send({ settings: { region: 'eu-west-1' } })
				.expect(404);
		});

		test('should return 404 for a non-existent connection', async () => {
			await ownerAgent
				.patch(`/secret-providers/projects/${teamProject1.id}/connections/missing`)
				.send({ settings: { region: 'eu-west-1' } })
				.expect(404);
		});

		describe('authorization', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])(
				'should allow=$allowed for $role to update a project connection',
				async ({ role, allowed }) => {
					await createProviderConnection('auth-update', [teamProject1.id]);

					const response = await agents[role]
						.patch(`/secret-providers/projects/${teamProject1.id}/connections/auth-update`)
						.send({ settings: { region: 'eu-west-1' } })
						.expect(allowed ? 200 : 403);

					if (!allowed) {
						expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					}
				},
			);
		});
	});

	describe('DELETE /secret-providers/projects/:projectId/connections/:providerKey', () => {
		const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
		let agents: Record<string, SuperAgentTest>;

		beforeAll(() => {
			agents = { owner: ownerAgent, admin: adminAgent, member: memberAgent };
		});

		beforeEach(async () => {
			await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
		});

		test('should delete a connection belonging to the project', async () => {
			const connectionId = await createProviderConnection('del-conn', [teamProject1.id]);

			const response = await ownerAgent
				.delete(`/secret-providers/projects/${teamProject1.id}/connections/del-conn`)
				.expect(200);

			expect(response.body.data.name).toBe('del-conn');

			// Verify it's actually gone from the DB
			const found = await connectionRepository.findOneBy({ id: connectionId });
			expect(found).toBeNull();

			// Verify cascade deletes project access
			const access = await projectAccessRepository.find({
				where: { secretsProviderConnectionId: connectionId },
			});
			expect(access).toHaveLength(0);
		});

		test('should return 404 for a connection belonging to another project', async () => {
			await createProviderConnection('otherDel', [teamProject2.id]);

			await ownerAgent
				.delete(`/secret-providers/projects/${teamProject1.id}/connections/otherDel`)
				.expect(404);

			// Verify the connection was NOT deleted
			const found = await connectionRepository.findOneBy({ providerKey: 'otherDel' });
			expect(found).not.toBeNull();
		});

		test('should return 404 for a non-existent connection', async () => {
			await ownerAgent
				.delete(`/secret-providers/projects/${teamProject1.id}/connections/missing`)
				.expect(404);
		});

		describe('authorization', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])(
				'should allow=$allowed for $role to delete a project connection',
				async ({ role, allowed }) => {
					await createProviderConnection(`auth-del-${role}`, [teamProject1.id]);

					const response = await agents[role]
						.delete(`/secret-providers/projects/${teamProject1.id}/connections/auth-del-${role}`)
						.expect(allowed ? 200 : 403);

					if (!allowed) {
						expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					}
				},
			);
		});
	});

	describe('POST /secret-providers/projects/:projectId/connections/:providerKey/test', () => {
		const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
		let agents: Record<string, SuperAgentTest>;

		beforeAll(async () => {
			agents = { owner: ownerAgent, admin: adminAgent, member: memberAgent };
			const { DummyProvider } = await import('../../shared/external-secrets/utils');
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				awsSecretsManager: DummyProvider,
			});
		});

		afterAll(() => {
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				awsSecretsManager: createDummyProvider({ name: 'awsSecretsManager' }),
				gcpSecretsManager: createDummyProvider({ name: 'gcpSecretsManager' }),
			});
		});

		beforeEach(async () => {
			await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
		});

		test('should test a connection belonging to the project', async () => {
			await createProviderConnection('test-conn', [teamProject1.id]);

			const { ExternalSecretsManager } = await import(
				'@/modules/external-secrets.ee/external-secrets-manager.ee'
			);
			await Container.get(ExternalSecretsManager).reloadAllProviders();

			const response = await ownerAgent
				.post(`/secret-providers/projects/${teamProject1.id}/connections/test-conn/test`)
				.expect(200);

			expect(response.body.data).toMatchObject({ success: true });
		});

		test('should return 404 for a connection belonging to another project', async () => {
			await createProviderConnection('other-test', [teamProject2.id]);

			await ownerAgent
				.post(`/secret-providers/projects/${teamProject1.id}/connections/other-test/test`)
				.expect(404);
		});

		test('should return 404 for a non-existent connection', async () => {
			await ownerAgent
				.post(`/secret-providers/projects/${teamProject1.id}/connections/missing/test`)
				.expect(404);
		});

		describe('authorization', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])(
				'should allow=$allowed for $role to test a project connection',
				async ({ role, allowed }) => {
					await createProviderConnection(`test-auth-${role}`, [teamProject1.id]);

					const { ExternalSecretsManager } = await import(
						'@/modules/external-secrets.ee/external-secrets-manager.ee'
					);
					await Container.get(ExternalSecretsManager).reloadAllProviders();

					const response = await agents[role]
						.post(
							`/secret-providers/projects/${teamProject1.id}/connections/test-auth-${role}/test`,
						)
						.expect(allowed ? 200 : 403);

					if (!allowed) {
						expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					}
				},
			);
		});
	});

	describe('POST /secret-providers/projects/:projectId/reload', () => {
		const FORBIDDEN_MESSAGE = 'User is missing a scope required to perform this action';
		let agents: Record<string, SuperAgentTest>;

		beforeAll(async () => {
			agents = { owner: ownerAgent, admin: adminAgent, member: memberAgent };
			const { DummyProvider } = await import('../../shared/external-secrets/utils');
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				awsSecretsManager: DummyProvider,
			});
		});

		afterAll(() => {
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				awsSecretsManager: createDummyProvider({ name: 'awsSecretsManager' }),
				gcpSecretsManager: createDummyProvider({ name: 'gcpSecretsManager' }),
			});
		});

		beforeEach(async () => {
			await testDb.truncate(['SecretsProviderConnection', 'ProjectSecretsProviderAccess']);
		});

		test('should reload all connections belonging to the project', async () => {
			await createProviderConnection('reload-conn-1', [teamProject1.id]);
			await createProviderConnection('reload-conn-2', [teamProject1.id]);

			const { ExternalSecretsManager } = await import(
				'@/modules/external-secrets.ee/external-secrets-manager.ee'
			);
			await Container.get(ExternalSecretsManager).reloadAllProviders();

			const response = await ownerAgent
				.post(`/secret-providers/projects/${teamProject1.id}/reload`)
				.expect(200);

			expect(response.body.data).toEqual({
				success: true,
				providers: {
					'reload-conn-1': { success: true },
					'reload-conn-2': { success: true },
				},
			});
		});

		test('should succeed when project has no connections', async () => {
			const { ExternalSecretsManager } = await import(
				'@/modules/external-secrets.ee/external-secrets-manager.ee'
			);
			await Container.get(ExternalSecretsManager).reloadAllProviders();

			const response = await ownerAgent
				.post(`/secret-providers/projects/${emptyProject.id}/reload`)
				.expect(200);

			expect(response.body.data).toEqual({ success: true, providers: {} });
		});

		test('should not reload connections that are not part of the project', async () => {
			await createProviderConnection('global-conn', []);
			await createProviderConnection('proj1-conn', [teamProject1.id]);
			await createProviderConnection('proj2-conn', [teamProject2.id]);

			const { ExternalSecretsManager } = await import(
				'@/modules/external-secrets.ee/external-secrets-manager.ee'
			);
			const manager = Container.get(ExternalSecretsManager);
			await manager.reloadAllProviders();

			const updateSpy = jest.spyOn(manager, 'updateProvider');

			await ownerAgent.post(`/secret-providers/projects/${teamProject1.id}/reload`).expect(200);

			expect(updateSpy).toHaveBeenCalledWith('proj1-conn');
			expect(updateSpy).not.toHaveBeenCalledWith('proj2-conn');
			expect(updateSpy).not.toHaveBeenCalledWith('global-conn');

			updateSpy.mockRestore();
		});

		describe('authorization', () => {
			test.each([
				{ role: 'owner', allowed: true },
				{ role: 'admin', allowed: true },
				{ role: 'member', allowed: false },
			])(
				'should allow=$allowed for $role to reload project connections',
				async ({ role, allowed }) => {
					await createProviderConnection(`reload-auth-${role}`, [teamProject1.id]);

					const { ExternalSecretsManager } = await import(
						'@/modules/external-secrets.ee/external-secrets-manager.ee'
					);
					await Container.get(ExternalSecretsManager).reloadAllProviders();

					const response = await agents[role]
						.post(`/secret-providers/projects/${teamProject1.id}/reload`)
						.expect(allowed ? 200 : 403);

					if (!allowed) {
						expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
					}
				},
			);
		});
	});
});
