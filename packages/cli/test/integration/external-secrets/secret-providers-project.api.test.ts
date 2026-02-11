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

import { MockProviders } from '../../shared/external-secrets/utils';
import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

const mockProvidersInstance = new MockProviders();
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
});
