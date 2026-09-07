import { createTeamProject, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { PromotionConfigRepository } from '@/modules/promotions.ee/database/repositories/promotion-config.repository';
import { PromotionConnectionProjectRepository } from '@/modules/promotions.ee/database/repositories/promotion-connection-project.repository';
import { PromotionConnectionRepository } from '@/modules/promotions.ee/database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '@/modules/promotions.ee/database/repositories/promotion-provider.repository';
import { PromotionProvidersService } from '@/modules/promotions.ee/promotion-providers.service';
import { PromotionsService } from '@/modules/promotions.ee/promotions.service';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Promotions in Public API', () => {
	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:gitConnections'],
		modules: ['promotions'],
	});
	let owner: User;

	type Agent = ReturnType<typeof testServer.publicApiAgentFor>;

	const tokenProviderPayload = {
		name: 'Bot user',
		type: 'git',
		auth: { authType: 'token', username: 'git-user', password: 'secret' },
	};

	async function createProvider(agent: Agent, payload: object = tokenProviderPayload) {
		const response = await agent.post('/promotions/providers').send(payload);
		expect(response.status, JSON.stringify(response.body)).toBe(201);
		return response.body.provider.id as string;
	}

	async function createConnection(
		agent: Agent,
		over: Record<string, unknown> = {},
	): Promise<string> {
		const providerId = (over.providerId as string) ?? (await createProvider(agent));
		const response = await agent.post('/promotions/connections').send({
			name: 'Deployments',
			scope: 'instance',
			providerId,
			target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
			configs: {
				apply: { settings: { schemaVersion: 1, branchName: 'main' } },
				promote: {
					settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
				},
			},
			...over,
		});
		expect(response.status, JSON.stringify(response.body)).toBe(201);
		return response.body.id as string;
	}

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		testServer.license.reset();
		// Delete children before parents to satisfy the foreign keys.
		await Container.get(PromotionConnectionProjectRepository).delete({});
		await Container.get(PromotionConfigRepository).delete({});
		await Container.get(PromotionConnectionRepository).delete({});
		await Container.get(PromotionProviderRepository).delete({});
		owner = await createOwnerWithApiKey();
	});

	it('walks a connection through create, read, list, update, disconnect, and delete', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);
		const createResponse = await agent.post('/promotions/connections').send({
			name: 'Deployments',
			scope: 'instance',
			providerId,
			target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
			configs: {
				apply: { settings: { schemaVersion: 1, branchName: 'main' } },
				promote: {
					name: 'To production',
					settings: { schemaVersion: 1, baseBranchName: 'release', createBranchOnPromotion: true },
				},
			},
		});

		expect(createResponse.status, JSON.stringify(createResponse.body)).toBe(201);
		expect(createResponse.body).toMatchObject({
			name: 'Deployments',
			scope: 'instance',
			target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
			provider: { id: providerId, type: 'git', authType: 'token' },
			configs: {
				apply: { name: 'Apply', settings: { schemaVersion: 1, branchName: 'main' } },
				promote: {
					name: 'To production',
					settings: { schemaVersion: 1, baseBranchName: 'release', createBranchOnPromotion: true },
				},
			},
		});
		// The provider summary inside a connection never carries the public config.
		expect(createResponse.body.provider).not.toHaveProperty('config');
		expect(JSON.stringify(createResponse.body)).not.toContain('secret');
		const id = createResponse.body.id as string;

		const getResponse = await agent.get(`/promotions/connections/${id}`);
		expect(getResponse.status).toBe(200);
		expect(getResponse.body.id).toBe(id);

		const listResponse = await agent.get('/promotions/connections?limit=1');
		expect(listResponse.status).toBe(200);
		expect(listResponse.body.data).toHaveLength(1);
		expect(listResponse.body.data[0].configs.apply.settings.branchName).toBe('main');

		const updateResponse = await agent
			.put(`/promotions/connections/${id}`)
			.send({ name: 'Renamed' });
		expect(updateResponse.status, JSON.stringify(updateResponse.body)).toBe(200);
		expect(updateResponse.body.name).toBe('Renamed');

		const disconnectResponse = await agent.post(`/promotions/connections/${id}/apply/disconnect`);
		expect(disconnectResponse.status, JSON.stringify(disconnectResponse.body)).toBe(200);
		expect(disconnectResponse.body).toMatchObject({
			connectionId: id,
			direction: 'apply',
			branchName: 'main',
			hasCheckout: false,
		});

		const deleteResponse = await agent.delete(`/promotions/connections/${id}`);
		expect(deleteResponse.status).toBe(204);
		expect(await Container.get(PromotionConnectionRepository).findOneBy({ id })).toBeNull();
		// The provider outlives its connection.
		expect(
			await Container.get(PromotionProviderRepository).findOneBy({ id: providerId }),
		).not.toBeNull();
	});

	it('rejects a key that has no promotion scope', async () => {
		const unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
		const agent = testServer.publicApiAgentFor(unscopedOwner);

		const list = await agent.get('/promotions/connections');
		const apply = await agent.post('/promotions/connections/someId/apply');

		expect(list.status).toBe(403);
		expect(apply.status).toBe(403);
	});

	it('rejects every request when the feature is not licensed', async () => {
		testServer.license.disable('feat:gitConnections');
		const response = await testServer.publicApiAgentFor(owner).get('/promotions/connections');
		expect(response.status).toBe(403);
	});

	it('returns the generated public key and keeps the private key hidden', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/promotions/providers')
			.send({
				name: 'Deploy key',
				type: 'git',
				auth: { authType: 'ssh-key' },
			});

		expect(response.status, JSON.stringify(response.body)).toBe(201);
		expect(response.body.publicKey).toMatch(/^ssh-ed25519 /);
		expect(response.body.provider.authType).toBe('ssh-key');
		expect(response.body.provider.config).toMatchObject({ schemaVersion: 1, keyType: 'ed25519' });
		expect(response.body.provider).not.toHaveProperty('auth');
		expect(JSON.stringify(response.body)).not.toContain('PRIVATE KEY');

		const stored = await Container.get(PromotionProviderRepository).findOneByOrFail({
			id: response.body.provider.id,
		});
		expect(stored.auth).toBeTruthy();
		expect(stored.auth).not.toContain('PRIVATE KEY');
	});

	it('keeps the stored credentials when only half of them is sent', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);
		const before = await Container.get(PromotionProviderRepository).findOneByOrFail({
			id: providerId,
		});

		const response = await agent
			.put(`/promotions/providers/${providerId}`)
			.send({ auth: { authType: 'token', username: 'replacement' } });

		expect(response.status).toBe(400);
		const after = await Container.get(PromotionProviderRepository).findOneByOrFail({
			id: providerId,
		});
		expect(after.auth).toBe(before.auth);
	});

	it('replaces both token credentials without returning them', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);
		const before = await Container.get(PromotionProviderRepository).findById(providerId);

		const response = await agent.put(`/promotions/providers/${providerId}`).send({
			auth: { authType: 'token', username: 'replacement-user', password: 'replacement-password' },
		});

		expect(response.status).toBe(200);
		expect(response.body).not.toHaveProperty('auth');
		expect(JSON.stringify(response.body)).not.toContain('replacement-password');
		const stored = await Container.get(PromotionProvidersService).getEntity(providerId);
		expect(stored.auth).not.toBe(before?.auth);
		expect(stored.auth).not.toContain('replacement-password');
		await expect(
			Container.get(PromotionProvidersService).decryptCredentials(stored),
		).resolves.toEqual({
			authType: 'token',
			username: 'replacement-user',
			password: 'replacement-password',
		});
	});

	it('rejects an empty provider update', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);

		const response = await agent.put(`/promotions/providers/${providerId}`).send({});

		expect(response.status).toBe(400);
		expect(response.body.message).toBe('request/body At least one field is required');
	});

	it.each(['providers', 'connections'])(
		'returns no cursor for a zero-limit %s list',
		async (resource) => {
			const agent = testServer.publicApiAgentFor(owner);
			await createConnection(agent);

			const response = await agent.get(`/promotions/${resource}?limit=0`);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ data: [], nextCursor: null });
		},
	);

	it.each([false, true])(
		'passes the API key variable permission to Promote: %s',
		async (canExportVariableValues) => {
			const scopedOwner = await createOwnerWithApiKey({
				scopes: canExportVariableValues
					? ['gitConnection:push', 'variable:list']
					: ['gitConnection:push'],
			});
			const promote = vi
				.spyOn(Container.get(PromotionsService), 'promote')
				.mockRejectedValueOnce(new BadRequestError('Operation stopped for test'));
			try {
				const response = await testServer
					.publicApiAgentFor(scopedOwner)
					.post('/promotions/connections/conn1/promote')
					.send({ commitMessage: 'Export projects' });

				expect(response.status).toBe(400);
				expect(promote).toHaveBeenCalledWith(
					'conn1',
					expect.objectContaining({ id: scopedOwner.id }),
					{
						commitMessage: 'Export projects',
						canExportVariableValues,
					},
				);
			} finally {
				promote.mockRestore();
			}
		},
	);

	it('refuses to change the authentication method of a provider', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);

		const response = await agent
			.put(`/promotions/providers/${providerId}`)
			.send({ auth: { authType: 'ssh-key' } });

		expect(response.status).toBe(400);
	});

	it('deletes a provider only once no connection uses it', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);
		const connectionId = await createConnection(agent, { providerId });

		const inUse = await agent.delete(`/promotions/providers/${providerId}`);
		await agent.delete(`/promotions/connections/${connectionId}`);
		const unused = await agent.delete(`/promotions/providers/${providerId}`);

		expect(inUse.status).toBe(409);
		expect(unused.status).toBe(204);
		expect(
			await Container.get(PromotionProviderRepository).findOneBy({ id: providerId }),
		).toBeNull();
	});

	it('stores nothing when the connection names an unknown provider', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/promotions/connections')
			.send({
				name: 'Deployments',
				scope: 'instance',
				providerId: 'doesNotExist',
				target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
			});

		expect(response.status).toBe(404);
		expect(await Container.get(PromotionConnectionRepository).count()).toBe(0);
	});

	it('allows only one instance connection', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		await createConnection(agent);
		const providerId = await createProvider(agent, {
			...tokenProviderPayload,
			name: 'Other bot',
		});

		const response = await agent.post('/promotions/connections').send({
			name: 'Second',
			scope: 'instance',
			providerId,
			target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/other.git' },
		});

		expect(response.status).toBe(409);
		expect(await Container.get(PromotionConnectionRepository).count()).toBe(1);
	});

	it('stores nothing when the remote URL does not suit the provider', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);

		const response = await agent.post('/promotions/connections').send({
			name: 'Invalid',
			scope: 'instance',
			providerId,
			target: { schemaVersion: 1, remoteUrl: 'git@example.com:org/repo.git' },
		});

		expect(response.status).toBe(400);
		expect(await Container.get(PromotionConnectionRepository).count()).toBe(0);
	});

	describe('provider sharing', () => {
		async function createProjectConnection(agent: Agent, name: string, providerId: string) {
			const response = await agent.post('/promotions/connections').send({
				name,
				scope: 'projects',
				providerId,
				target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
			});
			expect(response.status, JSON.stringify(response.body)).toBe(201);
			return response.body.id as string;
		}

		it('lists the connections that a provider edit would affect', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const shared = await createProvider(agent, { ...tokenProviderPayload, name: 'Shared' });
			const other = await createProvider(agent, { ...tokenProviderPayload, name: 'Other' });
			const instanceId = await createConnection(agent, { providerId: shared });
			const teamId = await createProjectConnection(agent, 'Team', shared);
			await createProjectConnection(agent, 'Unrelated', other);

			const byProvider = await agent.get(`/promotions/connections?providerId=${shared}`);
			const instanceOnly = await agent.get('/promotions/connections?scope=instance');
			const combined = await agent.get(
				`/promotions/connections?providerId=${shared}&scope=projects`,
			);

			expect(byProvider.body.data.map((row: { id: string }) => row.id).sort()).toEqual(
				[instanceId, teamId].sort(),
			);
			expect(instanceOnly.body.data.map((row: { id: string }) => row.id)).toEqual([instanceId]);
			expect(combined.body.data.map((row: { id: string }) => row.id)).toEqual([teamId]);
		});

		it('moves one connection to another provider and leaves the rest alone', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const first = await createProvider(agent, { ...tokenProviderPayload, name: 'First' });
			const second = await createProvider(agent, { ...tokenProviderPayload, name: 'Second' });
			const movedId = await createProjectConnection(agent, 'Moved', first);
			const keptId = await createProjectConnection(agent, 'Kept', first);

			const moved = await agent
				.put(`/promotions/connections/${movedId}`)
				.send({ providerId: second });
			const kept = await agent.get(`/promotions/connections/${keptId}`);

			expect(moved.status, JSON.stringify(moved.body)).toBe(200);
			expect(moved.body.provider.id).toBe(second);
			expect(kept.body.provider.id).toBe(first);
		});

		it('rechecks the remote URL when a connection moves to another provider', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const tokenId = await createProvider(agent);
			const sshId = await createProvider(agent, {
				name: 'Deploy key',
				type: 'git',
				auth: { authType: 'ssh-key' },
			});
			// The HTTP(S) URL suits the username-and-password provider, but not an SSH key.
			const connectionId = await createConnection(agent, { providerId: tokenId });

			const response = await agent
				.put(`/promotions/connections/${connectionId}`)
				.send({ providerId: sshId });

			expect(response.status).toBe(400);
			const unchanged = await agent.get(`/promotions/connections/${connectionId}`);
			expect(unchanged.body.provider.id).toBe(tokenId);
		});
	});

	describe('configurations', () => {
		it('rejects one of two concurrent first writes for the same direction', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const providerId = await createProvider(agent);
			const create = await agent.post('/promotions/connections').send({
				name: 'Deployments',
				scope: 'instance',
				providerId,
				target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
			});
			const id = create.body.id as string;
			const payload = { settings: { schemaVersion: 1, branchName: 'main' } };
			const configRepository = Container.get(PromotionConfigRepository);
			const originalFind = configRepository.findByConnectionAndDirection.bind(configRepository);
			const bothReadsCompleted = createDeferredPromise();
			let completedReads = 0;
			const findSpy = vi
				.spyOn(configRepository, 'findByConnectionAndDirection')
				.mockImplementation(async (...args) => {
					const config = await originalFind(...args);
					completedReads += 1;
					if (completedReads === 2) bothReadsCompleted.resolve();
					await bothReadsCompleted.promise;
					return config;
				});

			const responses = await Promise.all([
				agent.put(`/promotions/connections/${id}/configs/apply`).send(payload),
				agent.put(`/promotions/connections/${id}/configs/apply`).send(payload),
			]).finally(() => findSpy.mockRestore());

			expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
			expect(await configRepository.findByConnectionIds([id])).toHaveLength(1);
		});

		it('creates, replaces, and removes one direction', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const providerId = await createProvider(agent);
			const create = await agent.post('/promotions/connections').send({
				name: 'Deployments',
				scope: 'instance',
				providerId,
				target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
			});
			const id = create.body.id as string;
			expect(create.body.configs).toEqual({});

			const first = await agent
				.put(`/promotions/connections/${id}/configs/apply`)
				.send({ name: 'From dev', settings: { schemaVersion: 1, branchName: 'dev' } });
			expect(first.status, JSON.stringify(first.body)).toBe(200);
			expect(first.body).toMatchObject({
				name: 'From dev',
				settings: { schemaVersion: 1, branchName: 'dev' },
			});

			// A write replaces the whole config, so an omitted name falls back to the label.
			const replaced = await agent
				.put(`/promotions/connections/${id}/configs/apply`)
				.send({ settings: { schemaVersion: 1, branchName: 'release' } });
			expect(replaced.status).toBe(200);
			expect(replaced.body).toMatchObject({
				id: first.body.id,
				name: 'Apply',
				settings: { schemaVersion: 1, branchName: 'release' },
			});

			const removed = await agent.delete(`/promotions/connections/${id}/configs/apply`);
			expect(removed.status).toBe(204);
			const after = await agent.get(`/promotions/connections/${id}`);
			expect(after.body.configs).toEqual({});
		});

		it("rejects the other direction's branch field", async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createConnection(agent);

			const response = await agent
				.put(`/promotions/connections/${id}/configs/apply`)
				.send({ settings: { schemaVersion: 1, baseBranchName: 'dev' } });

			expect(response.status).toBe(400);
		});

		it('requires createBranchOnPromotion on every Promote write', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createConnection(agent);

			const response = await agent
				.put(`/promotions/connections/${id}/configs/promote`)
				.send({ settings: { schemaVersion: 1, baseBranchName: 'staging' } });

			expect(response.status).toBe(400);
		});

		it('rejects configurations sent to the connection update route', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createConnection(agent);

			const response = await agent.put(`/promotions/connections/${id}`).send({
				name: 'Renamed',
				configs: { apply: { settings: { schemaVersion: 1, branchName: 'dev' } } },
			});

			expect(response.status).toBe(400);
		});

		it('returns 404 for an unknown direction', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createConnection(agent);

			const response = await agent.delete(`/promotions/connections/${id}/configs/sideways`);

			expect(response.status).toBe(404);
		});
	});

	describe('project links', () => {
		async function createProjectConnection(agent: Agent, name: string) {
			const providerId = await createProvider(agent, { ...tokenProviderPayload, name });
			const response = await agent.post('/promotions/connections').send({
				name,
				scope: 'projects',
				providerId,
				target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
				configs: { apply: { settings: { schemaVersion: 1, branchName: 'main' } } },
			});
			expect(response.status, JSON.stringify(response.body)).toBe(201);
			return response.body.id as string;
		}

		it('adds, lists, and removes a team project', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectConnection(agent, 'First');
			const project = await createTeamProject('Team project', owner);

			const add = await agent.post(`/promotions/connections/${id}/projects/${project.id}`);
			expect(add.status, JSON.stringify(add.body)).toBe(200);
			expect(add.body).toEqual({ projectId: project.id, connectionId: id });

			const list = await agent.get(`/promotions/connections/${id}/projects`);
			expect(list.status).toBe(200);
			expect(list.body).toEqual({ projectIds: [project.id] });

			const remove = await agent.delete(`/promotions/connections/${id}/projects/${project.id}`);
			expect(remove.status).toBe(204);

			const listAfter = await agent.get(`/promotions/connections/${id}/projects`);
			expect(listAfter.body).toEqual({ projectIds: [] });
		});

		it('treats re-adding to the same connection as idempotent', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectConnection(agent, 'First');
			const project = await createTeamProject('Team project', owner);

			await agent.post(`/promotions/connections/${id}/projects/${project.id}`);
			const again = await agent.post(`/promotions/connections/${id}/projects/${project.id}`);

			expect(again.status).toBe(200);
			expect(again.body).toEqual({ projectId: project.id, connectionId: id });
		});

		it('rejects adding a project already linked to another connection', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const first = await createProjectConnection(agent, 'First');
			const second = await createProjectConnection(agent, 'Second');
			const project = await createTeamProject('Team project', owner);

			await agent.post(`/promotions/connections/${first}/projects/${project.id}`);
			const conflict = await agent.post(`/promotions/connections/${second}/projects/${project.id}`);

			expect(conflict.status).toBe(409);
		});

		it('does not reassign a project when different connections add it concurrently', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const first = await createProjectConnection(agent, 'First');
			const second = await createProjectConnection(agent, 'Second');
			const project = await createTeamProject('Team project', owner);

			const responses = await Promise.all([
				agent.post(`/promotions/connections/${first}/projects/${project.id}`),
				agent.post(`/promotions/connections/${second}/projects/${project.id}`),
			]);

			expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
			const successfulResponse = responses.find(({ status }) => status === 200);
			const link = await Container.get(PromotionConnectionProjectRepository).findByProjectId(
				project.id,
			);
			expect(link?.connectionId).toBe(successfulResponse?.body.connectionId);
		});

		it('rejects removing a project through a different connection', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const first = await createProjectConnection(agent, 'First');
			const second = await createProjectConnection(agent, 'Second');
			const project = await createTeamProject('Team project', owner);
			await agent.post(`/promotions/connections/${first}/projects/${project.id}`);

			const response = await agent.delete(
				`/promotions/connections/${second}/projects/${project.id}`,
			);

			expect(response.status).toBe(409);
			expect(
				await Container.get(PromotionConnectionProjectRepository).findByProjectId(project.id),
			).toMatchObject({ connectionId: first });
		});

		it('rejects a personal project', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectConnection(agent, 'First');
			const personalProject = await getPersonalProject(owner);

			const response = await agent.post(
				`/promotions/connections/${id}/projects/${personalProject.id}`,
			);
			expect(response.status).toBe(400);
		});

		it('rejects the instance connection', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createConnection(agent);
			const project = await createTeamProject('Team project', owner);

			const response = await agent.post(`/promotions/connections/${id}/projects/${project.id}`);
			expect(response.status).toBe(400);
		});

		it('returns 404 for an unknown project', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectConnection(agent, 'First');

			const response = await agent.post(`/promotions/connections/${id}/projects/doesNotExist`);
			expect(response.status).toBe(404);
		});

		it('removes the link when the connection is deleted', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectConnection(agent, 'First');
			const project = await createTeamProject('Team project', owner);
			await agent.post(`/promotions/connections/${id}/projects/${project.id}`);

			await agent.delete(`/promotions/connections/${id}`);

			expect(
				await Container.get(PromotionConnectionProjectRepository).findByProjectId(project.id),
			).toBeNull();
		});

		it('removes the link when the project is deleted', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectConnection(agent, 'First');
			const project = await createTeamProject('Team project', owner);
			await agent.post(`/promotions/connections/${id}/projects/${project.id}`);

			await Container.get(ProjectRepository).delete({ id: project.id });

			expect(
				await Container.get(PromotionConnectionProjectRepository).findByProjectId(project.id),
			).toBeNull();
		});
	});

	describe('package operations', () => {
		it('explains that Promote needs a clone first', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createConnection(agent);

			const response = await agent
				.post(`/promotions/connections/${id}/promote`)
				.send({ commitMessage: 'sync projects' });
			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not cloned');
		});

		it('explains that Apply needs a clone first', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createConnection(agent);

			const response = await agent.post(`/promotions/connections/${id}/apply`);
			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not cloned');
		});

		it('returns 404 for a direction that is not configured', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const providerId = await createProvider(agent);
			const create = await agent.post('/promotions/connections').send({
				name: 'Deployments',
				scope: 'instance',
				providerId,
				target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
			});

			const response = await agent.post(`/promotions/connections/${create.body.id}/apply`);
			expect(response.status).toBe(404);
		});

		it('refuses Promote and Apply on a project connection', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const providerId = await createProvider(agent);
			const create = await agent.post('/promotions/connections').send({
				name: 'Team repo',
				scope: 'projects',
				providerId,
				target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
				configs: {
					apply: { settings: { schemaVersion: 1, branchName: 'main' } },
					promote: {
						settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
					},
				},
			});
			const id = create.body.id as string;

			const promote = await agent
				.post(`/promotions/connections/${id}/promote`)
				.send({ commitMessage: 'm' });
			const apply = await agent.post(`/promotions/connections/${id}/apply`);

			expect(promote.status).toBe(400);
			expect(promote.body.message).toContain('instance connection');
			expect(apply.status).toBe(400);
			expect(apply.body.message).toContain('instance connection');
		});
	});
});
