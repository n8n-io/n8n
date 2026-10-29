import { ApplyPackageResultDto, type ContinueApplyPackageDto } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { OutboundHttp, SsrfProtectionService, type DnsResolver } from '@n8n/backend-network';
import { createTeamProject, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import { SsrfProtectionConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { onTestFinished } from 'vitest';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { Cipher } from 'n8n-core';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@n8n/errors';
import { PromotionEnvironmentProjectRepository } from '@/modules/promotions.ee/database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from '@/modules/promotions.ee/database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '@/modules/promotions.ee/database/repositories/promotion-provider.repository';
import { GitHostClients } from '@/modules/promotions.ee/git-hosts/git-host-clients';
import { GitLabHostClient } from '@/modules/promotions.ee/git-hosts/gitlab-host.client';
import { PromotionChangeService } from '@/modules/promotions.ee/promotion-change.service';
import { PromotionEnvironmentResolver } from '@/modules/promotions.ee/promotion-environment.resolver';
import { PromotionProvidersService } from '@/modules/promotions.ee/promotion-providers.service';
import { PromotionsGitService } from '@/modules/promotions.ee/promotions-git.service';
import { PromotionsService } from '@/modules/promotions.ee/promotions.service';
import {
	createAdminWithApiKey,
	createMemberWithApiKey,
	createOwnerWithApiKey,
} from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Promotions in Public API', () => {
	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:promotions'],
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

	const remote = { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' };
	const applySettings = { schemaVersion: 1, branchName: 'main' };
	const promoteEnvironment = {
		direction: 'promote',
		settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
	};

	async function createEnvironment(
		agent: Agent,
		over: Record<string, unknown> = {},
	): Promise<string> {
		const providerId = (over.providerId as string) ?? (await createProvider(agent));
		const response = await agent.post('/promotions/environments').send({
			name: 'Deployments',
			scope: 'instance',
			providerId,
			remote,
			direction: 'apply',
			settings: applySettings,
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
		await Container.get(PromotionEnvironmentProjectRepository).delete({});
		await Container.get(PromotionEnvironmentRepository).delete({});
		await Container.get(PromotionProviderRepository).delete({});
		owner = await createOwnerWithApiKey();
	});

	it('walks an environment through create, read, list, update, clone, disconnect, and delete', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);
		const settings = { schemaVersion: 1, baseBranchName: 'release', createBranchOnPromotion: true };
		const createResponse = await agent.post('/promotions/environments').send({
			name: 'Deployments',
			scope: 'instance',
			providerId,
			remote,
			direction: 'promote',
			settings,
		});

		expect(createResponse.status, JSON.stringify(createResponse.body)).toBe(201);
		expect(createResponse.body).toMatchObject({
			name: 'Deployments',
			scope: 'instance',
			direction: 'promote',
			remote,
			provider: { id: providerId, type: 'git', authType: 'token' },
			settings,
			checkout: { hasCheckout: false, matchesEnvironment: false },
		});
		// The provider summary inside an environment never carries the public config.
		expect(createResponse.body.provider).not.toHaveProperty('config');
		expect(JSON.stringify(createResponse.body)).not.toContain('secret');
		const id = createResponse.body.id as string;

		const getResponse = await agent.get(`/promotions/environments/${id}`);
		expect(getResponse.status).toBe(200);
		expect(getResponse.body.id).toBe(id);

		const listResponse = await agent.get('/promotions/environments?limit=1');
		expect(listResponse.status).toBe(200);
		expect(listResponse.body.data).toHaveLength(1);
		expect(listResponse.body.data[0].settings.baseBranchName).toBe('release');

		const updateResponse = await agent
			.put(`/promotions/environments/${id}`)
			.send({ name: 'Renamed' });
		expect(updateResponse.status, JSON.stringify(updateResponse.body)).toBe(200);
		expect(updateResponse.body.name).toBe('Renamed');

		const gitClone = vi.spyOn(Container.get(PromotionsGitService), 'clone').mockResolvedValue();
		try {
			const cloneResponse = await agent.post(`/promotions/environments/${id}/connect`);
			expect(cloneResponse.status, JSON.stringify(cloneResponse.body)).toBe(200);
			expect(cloneResponse.body).toEqual({
				environmentId: id,
				direction: 'promote',
				branchName: 'release',
				hasCheckout: true,
			});
		} finally {
			gitClone.mockRestore();
		}

		const disconnectResponse = await agent.post(`/promotions/environments/${id}/disconnect`);
		expect(disconnectResponse.status, JSON.stringify(disconnectResponse.body)).toBe(200);
		expect(disconnectResponse.body).toEqual({
			environmentId: id,
			direction: 'promote',
			branchName: 'release',
			hasCheckout: false,
		});

		const deleteResponse = await agent.delete(`/promotions/environments/${id}`);
		expect(deleteResponse.status).toBe(204);
		expect(await Container.get(PromotionEnvironmentRepository).findOneBy({ id })).toBeNull();
		// The provider outlives its environment.
		expect(
			await Container.get(PromotionProviderRepository).findOneBy({ id: providerId }),
		).not.toBeNull();
	});

	it('allows one apply and one promote instance environment with different repositories', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const otherRemote = { schemaVersion: 1, remoteUrl: 'https://example.com/org/other.git' };
		const applyId = await createEnvironment(agent);
		const promoteId = await createEnvironment(agent, {
			...promoteEnvironment,
			remote: otherRemote,
		});

		const promoteOnly = await agent.get(
			'/promotions/environments?scope=instance&direction=promote',
		);
		const apply = await agent.get(`/promotions/environments/${applyId}`);

		expect(promoteOnly.body.data).toEqual([
			expect.objectContaining({ id: promoteId, direction: 'promote', remote: otherRemote }),
		]);
		expect(apply.body).toMatchObject({ direction: 'apply', remote });
	});

	it('rejects a malformed environment id', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.get('/promotions/environments/not-a-uuid');

		expect(response.status).toBe(400);
	});

	describe('GitLab provider validation', () => {
		const payload = {
			name: 'GitLab',
			type: 'gitlab',
			auth: { authType: 'token', username: 'bot', password: 'example-token' },
			config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
		};

		function validAccess(baseUrl = payload.config.baseUrl, token = payload.auth.password) {
			const instance = new URL(baseUrl);
			const apiPath = `${instance.pathname.replace(/\/$/, '')}/api/v4`;
			return nock(instance.origin)
				.matchHeader('PRIVATE-TOKEN', token)
				.get(`${apiPath}/user`)
				.reply(200, { id: 1 })
				.get(`${apiPath}/projects`)
				.query({ membership: 'true', simple: 'true', per_page: '1', page: '1' })
				.reply(200, []);
		}

		beforeEach(() => vi.mocked(Container.get(Logger).warn).mockClear());
		afterEach(() => nock.cleanAll());

		describe('configured network policy', () => {
			const dnsResolver = mock<DnsResolver>();
			const internalBaseUrl = 'http://127.0.0.1:8929';

			function useNetworkPolicy(config: SsrfProtectionConfig) {
				dnsResolver.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
				const logger = Container.get(Logger);
				const policy = new SsrfProtectionService(config, dnsResolver, logger);
				const client = new GitLabHostClient(new OutboundHttp(policy, config, logger), logger);
				return vi.spyOn(Container.get(GitHostClients), 'clientFor').mockReturnValue(client);
			}

			it.each([
				{ enabled: false, allowed: false, expectedStatus: 201 },
				{ enabled: true, allowed: false, expectedStatus: 400 },
				{ enabled: true, allowed: true, expectedStatus: 201 },
			])('applies configured IP rules: %j', async ({ enabled, allowed, expectedStatus }) => {
				const config = new SsrfProtectionConfig();
				config.enabled = enabled;
				if (allowed) config.allowedIpRanges.push('127.0.0.1/32');
				const clientFor = useNetworkPolicy(config);
				const api = validAccess(internalBaseUrl);
				try {
					const response = await testServer
						.publicApiAgentFor(owner)
						.post('/promotions/providers')
						.send({ ...payload, config: { ...payload.config, baseUrl: internalBaseUrl } });

					expect(response.status, JSON.stringify(response.body)).toBe(expectedStatus);
					if (expectedStatus === 201) {
						expect(await Container.get(PromotionProviderRepository).count()).toBe(1);
						api.done();
					} else {
						expect(response.body.message).toContain('instance network policy');
						expect(response.body.message).toContain('Ask an administrator');
						expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
						expect(api.pendingMocks()).toHaveLength(2);
					}
				} finally {
					clientFor.mockRestore();
				}
			});

			it.each([false, true])(
				'applies configured hostname rules with allowed=%s',
				async (allowed) => {
					const config = new SsrfProtectionConfig();
					config.enabled = true;
					config.blockedHostnames.push('gitlab.example.com');
					if (allowed) config.allowedHostnames.push('gitlab.example.com');
					const clientFor = useNetworkPolicy(config);
					const api = validAccess();
					try {
						const response = await testServer
							.publicApiAgentFor(owner)
							.post('/promotions/providers')
							.send(payload);

						expect(response.status, JSON.stringify(response.body)).toBe(allowed ? 201 : 400);
						if (allowed) {
							api.done();
						} else {
							expect(response.body.message).toContain('instance network policy');
							expect(JSON.stringify(response.body)).not.toContain(payload.auth.password);
							expect(
								JSON.stringify(vi.mocked(Container.get(Logger).warn).mock.calls),
							).not.toContain(payload.auth.password);
							expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
							expect(api.pendingMocks()).toHaveLength(2);
						}
					} finally {
						clientFor.mockRestore();
					}
				},
			);

			it('keeps stored settings when an edited host is not permitted', async () => {
				validAccess();
				const agent = testServer.publicApiAgentFor(owner);
				const id = await createProvider(agent, payload);
				const before = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
				const config = new SsrfProtectionConfig();
				config.enabled = true;
				const clientFor = useNetworkPolicy(config);
				const api = validAccess(internalBaseUrl);
				try {
					const response = await agent.put(`/promotions/providers/${id}`).send({
						name: 'Changed',
						config: { schemaVersion: 1, baseUrl: internalBaseUrl },
						auth: payload.auth,
					});

					expect(response.status).toBe(400);
					expect(response.body.message).toContain('instance network policy');
					expect(await Container.get(PromotionProviderRepository).findOneByOrFail({ id })).toEqual(
						before,
					);
					expect(api.pendingMocks()).toHaveLength(2);
				} finally {
					clientFor.mockRestore();
				}
			});
		});

		it('creates and renames a provider without exposing or replacing credentials', async () => {
			const decrypt = vi.spyOn(Container.get(Cipher), 'decryptV2');
			try {
				const api = validAccess();
				const agent = testServer.publicApiAgentFor(owner);
				const created = await agent.post('/promotions/providers').send({
					...payload,
					config: { ...payload.config, baseUrl: `  ${payload.config.baseUrl}  ` },
				});
				expect(created.status, JSON.stringify(created.body)).toBe(201);
				expect(created.body.publicKey).toBeNull();
				expect(decrypt).not.toHaveBeenCalled();
				const id = created.body.provider.id as string;
				const stored = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
				const detail = await agent.get(`/promotions/providers/${id}`);
				const list = await agent.get('/promotions/providers');

				expect(stored.auth).not.toContain(payload.auth.password);
				expect(detail.status).toBe(200);
				expect(detail.body).toMatchObject({
					type: 'gitlab',
					authType: 'token',
					config: payload.config,
				});
				expect(list.body.data).toEqual([expect.objectContaining({ id, type: 'gitlab' })]);
				expect(list.body.data[0]).not.toHaveProperty('config');
				expect(JSON.stringify([created.body, detail.body, list.body])).not.toContain(
					payload.auth.password,
				);
				expect(detail.body).not.toHaveProperty('auth');
				api.done();

				const offline = nock(payload.config.baseUrl).get('/api/v4/user').reply(503);
				const renamed = await agent.put(`/promotions/providers/${id}`).send({ name: 'Renamed' });
				expect(renamed.status).toBe(200);
				expect(renamed.body.name).toBe('Renamed');
				expect(
					(await Container.get(PromotionProviderRepository).findOneByOrFail({ id })).auth,
				).toBe(stored.auth);
				expect(offline.isDone()).toBe(false);
			} finally {
				decrypt.mockRestore();
			}
		});

		it('creates GitLab credentials without a username and sends only token access to the host API', async () => {
			const access = vi.spyOn(Container.get(GitLabHostClient), 'validateAccess');
			const api = validAccess();
			try {
				const id = await createProvider(testServer.publicApiAgentFor(owner), {
					...payload,
					auth: { authType: 'token', password: payload.auth.password },
				});
				expect(access).toHaveBeenCalledWith({
					baseUrl: payload.config.baseUrl,
					accessToken: payload.auth.password,
				});
				const stored = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
				await expect(
					Container.get(PromotionProvidersService).decryptCredentials(stored),
				).resolves.toEqual({
					authType: 'token',
					username: 'n8n',
					password: payload.auth.password,
				});
				api.done();
			} finally {
				access.mockRestore();
			}
		});

		it.each([
			{ ...payload, config: undefined },
			{ ...payload, auth: { authType: 'ssh-key' } },
			{ ...payload, config: { ...payload.config, schemaVersion: 2 } },
			{ ...payload, type: 'github' },
		])('rejects invalid provider configuration before saving: %j', async (input) => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/promotions/providers')
				.send(input);

			expect(response.status).toBe(400);
			expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
		});

		it('rejects host settings on plain Git providers without changing stored settings', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const created = await agent.post('/promotions/providers').send({ ...payload, type: 'git' });
			expect(created.status).toBe(400);
			expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
			const id = await createProvider(agent);
			const before = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
			const updated = await agent
				.put(`/promotions/providers/${id}`)
				.send({ config: payload.config });
			expect(updated.status).toBe(400);
			expect(await Container.get(PromotionProviderRepository).findOneByOrFail({ id })).toEqual(
				before,
			);
		});

		it.each([
			[401, 1, 400, 'GitLab rejected the access token'],
			[404, 1, 400, 'No GitLab API was found'],
			[408, 2, 503, 'The GitLab request timed out'],
			[429, 2, 503, 'GitLab is not available'],
			[502, 2, 503, 'GitLab is not available'],
			[418, 1, 400, 'GitLab returned status 418'],
		])(
			'reports GitLab HTTP %i without saving or exposing secrets',
			async (status, attempts, expectedStatus, message) => {
				const api = nock(payload.config.baseUrl)
					.get('/api/v4/user')
					.times(attempts)
					.reply(status, { message: payload.auth.password });

				const response = await testServer
					.publicApiAgentFor(owner)
					.post('/promotions/providers')
					.send(payload);

				expect(response.status).toBe(expectedStatus);
				expect(response.body.message).toContain(message);
				expect(JSON.stringify(response.body)).not.toContain(payload.auth.password);
				expect(JSON.stringify(vi.mocked(Container.get(Logger).warn).mock.calls)).not.toContain(
					payload.auth.password,
				);
				expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
				api.done();
			},
		);

		it.each(
			[408, 429, 500, 502].flatMap((status) =>
				['user', 'projects'].map((path) => ({ status, path })),
			),
		)('saves the provider after HTTP $status on $path recovers', async ({ status, path }) => {
			const api = nock(payload.config.baseUrl).matchHeader('PRIVATE-TOKEN', payload.auth.password);
			if (path === 'projects') api.get('/api/v4/user').reply(200, { id: 1 });
			api
				.get(`/api/v4/${path}`)
				.query(true)
				.reply(status, { message: payload.auth.password })
				.get(`/api/v4/${path}`)
				.query(true)
				.reply(200, path === 'user' ? { id: 1 } : []);
			if (path === 'user') api.get('/api/v4/projects').query(true).reply(200, []);

			await createProvider(testServer.publicApiAgentFor(owner), payload);

			expect(await Container.get(PromotionProviderRepository).count()).toBe(1);
			api.done();
		});

		it('retries after a short Retry-After delay', async () => {
			const limited = nock(payload.config.baseUrl)
				.get('/api/v4/user')
				.reply(429, {}, { 'Retry-After': '1' });
			const api = validAccess();

			await createProvider(testServer.publicApiAgentFor(owner), payload);

			limited.done();
			api.done();
		});

		it('returns promptly when Retry-After exceeds the validation retry budget', async () => {
			const limited = nock(payload.config.baseUrl)
				.get('/api/v4/user')
				.reply(429, {}, { 'Retry-After': '60' });
			const retry = validAccess();

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/promotions/providers')
				.send(payload);

			expect(response.status).toBe(503);
			expect(response.body.message).toContain('GitLab is not available');
			expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
			expect(retry.isDone()).toBe(false);
			limited.done();
		});

		it('shares one retry budget across HTTP and transport failures', async () => {
			const api = nock(payload.config.baseUrl)
				.get('/api/v4/user')
				.reply(503)
				.get('/api/v4/user')
				.replyWithError(Object.assign(new Error('socket closed'), { code: 'ECONNRESET' }));

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/promotions/providers')
				.send(payload);

			expect(response.status).toBe(503);
			expect(response.body.message).toContain('Could not reach GitLab');
			expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
			api.done();
		});

		it('reports a missing API read scope rather than saving the provider', async () => {
			const api = nock(payload.config.baseUrl)
				.get('/api/v4/user')
				.reply(200, { id: 1 })
				.get('/api/v4/projects')
				.query(true)
				.reply(403, { message: 'Forbidden' });

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/promotions/providers')
				.send(payload);

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('read_api scope');
			expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
			api.done();
		});

		it.each(['user', 'projects'])(
			'rejects an unexpected %s response without saving',
			async (path) => {
				const api = nock(payload.config.baseUrl);
				if (path === 'projects') api.get('/api/v4/user').reply(200, { id: 1 });
				api.get(`/api/v4/${path}`).query(true).reply(200, '<html>Sign in</html>');

				const response = await testServer
					.publicApiAgentFor(owner)
					.post('/promotions/providers')
					.send(payload);

				expect(response.status).toBe(400);
				expect(response.body.message).toContain('GitLab returned an unexpected response');
				expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
				api.done();
			},
		);

		it('rejects redirects without forwarding the token', async () => {
			const api = nock(payload.config.baseUrl)
				.get('/api/v4/user')
				.reply(302, '', { Location: 'https://other.example.com/api/v4/user' });
			const destination = nock('https://other.example.com')
				.get('/api/v4/user')
				.reply(200, { id: 1 });

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/promotions/providers')
				.send(payload);

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('Use the final GitLab URL');
			expect(destination.isDone()).toBe(false);
			expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
			api.done();
		});

		it('rejects oversized responses without retrying or saving credentials', async () => {
			const api = nock(payload.config.baseUrl)
				.get('/api/v4/user')
				.reply(200, { id: 1, details: payload.auth.password + 'x'.repeat(1024 * 1024) });

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/promotions/providers')
				.send(payload);

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('GitLab returned a response that is too large');
			expect(JSON.stringify(response.body)).not.toContain(payload.auth.password);
			expect(JSON.stringify(vi.mocked(Container.get(Logger).warn).mock.calls)).not.toContain(
				payload.auth.password,
			);
			expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
			api.done();
		});

		it.each([
			['ECONNREFUSED', 2, 503, 'Could not reach GitLab'],
			['ETIMEDOUT', 2, 503, 'The GitLab request timed out'],
			['ENOTFOUND', 1, 400, 'n8n server DNS settings'],
			['SELF_SIGNED_CERT_IN_CHAIN', 1, 400, 'trusted certificate authority'],
			['UNRECOGNIZED', 1, 503, 'Could not complete the GitLab API request'],
		])(
			'reports %s with bounded retries and no saved credentials',
			async (code, attempts, expectedStatus, message) => {
				const api = nock(payload.config.baseUrl)
					.get('/api/v4/user')
					.times(attempts)
					.replyWithError(Object.assign(new Error(payload.auth.password), { code }));

				const response = await testServer
					.publicApiAgentFor(owner)
					.post('/promotions/providers')
					.send(payload);

				expect(response.status).toBe(expectedStatus);
				expect(response.body.message).toContain(message);
				expect(JSON.stringify(response.body)).not.toContain(payload.auth.password);
				expect(JSON.stringify(vi.mocked(Container.get(Logger).warn).mock.calls)).not.toContain(
					payload.auth.password,
				);
				expect(await Container.get(PromotionProviderRepository).count()).toBe(0);
				api.done();
			},
		);

		it('saves the provider after one transient failure recovers', async () => {
			const reset = nock(payload.config.baseUrl)
				.get('/api/v4/user')
				.replyWithError(Object.assign(new Error('socket closed'), { code: 'ECONNRESET' }));
			const api = validAccess();

			await createProvider(testServer.publicApiAgentFor(owner), payload);

			expect(await Container.get(PromotionProviderRepository).count()).toBe(1);
			reset.done();
			api.done();
		});

		it.each([
			'http://gitlab.example.com',
			'https://gitlab-updated.example.com',
			'https://gitlab.example.com:8443',
			'https://gitlab.example.com/gitlab',
		])('requires token authentication for a different API destination: %s', async (baseUrl) => {
			validAccess();
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProvider(agent, payload);
			const before = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
			const api = validAccess(baseUrl);
			const decrypt = vi.spyOn(Container.get(Cipher), 'decryptV2');
			try {
				const response = await agent.put(`/promotions/providers/${id}`).send({
					name: 'Changed',
					config: { schemaVersion: 1, baseUrl },
				});

				expect(response.status).toBe(400);
				expect(response.body.message).toContain('token authentication');
				expect(decrypt).not.toHaveBeenCalled();
				expect(api.pendingMocks()).toHaveLength(2);
				expect(await Container.get(PromotionProviderRepository).findOneByOrFail({ id })).toEqual(
					before,
				);
			} finally {
				decrypt.mockRestore();
			}
		});

		it.each(['https://GITLAB.EXAMPLE.COM:443/', '  https://gitlab.example.com/  '])(
			'keeps stored credentials for an equivalent API URL: %s',
			async (baseUrl) => {
				validAccess();
				const agent = testServer.publicApiAgentFor(owner);
				const id = await createProvider(agent, payload);
				const before = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
				const api = validAccess(baseUrl);
				const decrypt = vi.spyOn(Container.get(Cipher), 'decryptV2');
				try {
					const response = await agent.put(`/promotions/providers/${id}`).send({
						config: { schemaVersion: 1, baseUrl },
					});

					expect(response.status, JSON.stringify(response.body)).toBe(200);
					expect(response.body.config.baseUrl).toBe(baseUrl.trim());
					expect(decrypt).toHaveBeenCalledTimes(1);
					expect(
						(await Container.get(PromotionProviderRepository).findOneByOrFail({ id })).auth,
					).toBe(before.auth);
					api.done();
				} finally {
					decrypt.mockRestore();
				}
			},
		);

		it.each([
			{
				auth: { authType: 'token', password: 'replacement-token' },
				config: undefined,
			},
			{
				auth: undefined,
				config: { schemaVersion: 1, baseUrl: `${payload.config.baseUrl}/` },
			},
			{
				auth: { authType: 'token', username: 'ignored', password: 'replacement-token' },
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.internal' },
			},
			{
				auth: payload.auth,
				config: { schemaVersion: 1, baseUrl: 'http://gitlab.internal:8929/gitlab/' },
			},
		])('validates partial and combined provider updates: %j', async (input) => {
			validAccess();
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProvider(agent, payload);
			const before = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
			const baseUrl = input.config?.baseUrl ?? payload.config.baseUrl;
			const token = input.auth?.password ?? payload.auth.password;
			const api = validAccess(baseUrl, token);

			const response = await agent.put(`/promotions/providers/${id}`).send(input);

			expect(response.status, JSON.stringify(response.body)).toBe(200);
			expect(response.body.config.baseUrl).toBe(baseUrl);
			expect(JSON.stringify(response.body)).not.toContain(token);
			const stored = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
			if (!input.auth) expect(stored.auth).toBe(before.auth);
			await expect(
				Container.get(PromotionProvidersService).decryptCredentials(stored),
			).resolves.toEqual({ authType: 'token', username: 'n8n', password: token });
			api.done();
		});

		it.each([
			{
				change: 'host and token',
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.internal' },
				auth: { authType: 'token', password: 'winning-token' },
			},
			{
				change: 'token only',
				config: undefined,
				auth: { authType: 'token', password: 'winning-token' },
			},
			{
				change: 'equivalent URL only',
				config: { schemaVersion: 1, baseUrl: `${payload.config.baseUrl}/` },
				auth: undefined,
			},
		])(
			'keeps the winning $change update when another validated update resumes',
			async (winning) => {
				validAccess();
				const agent = testServer.publicApiAgentFor(owner);
				const id = await createProvider(agent, payload);
				const validated = createDeferredPromise();
				const resume = createDeferredPromise();
				const pendingToken = 'pending-token';
				const pendingApi = validAccess(payload.config.baseUrl, pendingToken);
				const winningApi = validAccess(
					winning.config?.baseUrl ?? payload.config.baseUrl,
					winning.auth?.password ?? payload.auth.password,
				);
				const client = Container.get(GitLabHostClient);
				const validateAccess = client.validateAccess.bind(client);
				const validation = vi.spyOn(client, 'validateAccess').mockImplementation(async (access) => {
					await validateAccess(access);
					if (access.accessToken === pendingToken) {
						validated.resolve();
						await resume.promise;
					}
				});
				const pending = agent
					.put(`/promotions/providers/${id}`)
					.send({
						name: 'Pending settings',
						auth: { authType: 'token', password: pendingToken },
					})
					.then((response) => response);
				try {
					await Promise.race([
						validated.promise,
						pending.then(({ status }) => {
							throw new Error(
								`The pending update returned ${status} before validation was released.`,
							);
						}),
					]);
					const result = await agent.put(`/promotions/providers/${id}`).send({
						name: 'Winning settings',
						config: winning.config,
						auth: winning.auth,
					});
					expect(result.status, JSON.stringify(result.body)).toBe(200);
					const repository = Container.get(PromotionProviderRepository);
					const stored = await repository.findOneByOrFail({ id });
					resume.resolve();
					const conflict = await pending;
					expect(conflict.status, JSON.stringify(conflict.body)).toBe(409);
					expect(conflict.body.message).toContain('Reload');
					expect(JSON.stringify(conflict.body)).not.toContain(pendingToken);
					expect(await repository.findOneByOrFail({ id })).toEqual(stored);
					pendingApi.done();
					winningApi.done();
				} finally {
					resume.resolve();
					await pending;
					validation.mockRestore();
				}
			},
		);

		it('does not change any persisted fields when a replacement fails validation', async () => {
			validAccess();
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProvider(agent, payload);
			const before = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
			const api = nock('https://gitlab.internal')
				.get('/api/v4/user')
				.reply(401, { message: 'Unauthorized' });

			const response = await agent.put(`/promotions/providers/${id}`).send({
				name: 'Changed',
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.internal' },
				auth: { authType: 'token', username: 'bot', password: 'bad-token' },
			});

			expect(response.status).toBe(400);
			expect(await Container.get(PromotionProviderRepository).findOneByOrFail({ id })).toEqual(
				before,
			);
			api.done();
		});

		it('preserves project assignment and branch settings', async () => {
			validAccess();
			const agent = testServer.publicApiAgentFor(owner);
			const providerId = await createProvider(agent, payload);
			const project = await createTeamProject('GitLab deployment', owner);
			const id = await createEnvironment(agent, {
				providerId,
				scope: 'projects',
				remote: {
					schemaVersion: 1,
					remoteUrl: 'https://gitlab.example.com/platform/workflows.git',
				},
				settings: { schemaVersion: 1, branchName: 'production' },
			});

			const link = await agent.post(`/promotions/environments/${id}/projects/${project.id}`);
			const rename = await agent.put(`/promotions/environments/${id}`).send({ name: 'Renamed' });
			const projects = await agent.get(`/promotions/environments/${id}/projects`);

			expect(link.status, JSON.stringify(link.body)).toBe(200);
			expect(rename.status, JSON.stringify(rename.body)).toBe(200);
			expect(rename.body.provider).toMatchObject({ id: providerId, type: 'gitlab' });
			expect(rename.body.settings).toEqual({ schemaVersion: 1, branchName: 'production' });
			expect(projects.body.projectIds).toEqual([project.id]);
		});
	});

	describe('GitLab discovery', () => {
		const payload = {
			name: 'GitLab discovery',
			type: 'gitlab',
			auth: { authType: 'token', password: 'discovery-token' },
			config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
		};
		const project = {
			id: 42,
			name: 'Workflows',
			path_with_namespace: 'platform/workflows',
			http_url_to_repo: 'https://gitlab.example.com/platform/workflows.git',
			default_branch: 'main',
		};
		const repositoryQuery = {
			simple: 'true',
			min_access_level: '30',
			order_by: 'id',
			sort: 'asc',
			per_page: '100',
			page: '1',
		};
		const routes = ['repositories', 'repositories/42/branches'];

		function providerValidation(baseUrl = payload.config.baseUrl) {
			const url = new URL(baseUrl);
			const apiPath = `${url.pathname.replace(/\/$/, '')}/api/v4`;
			return nock(url.origin)
				.matchHeader('PRIVATE-TOKEN', payload.auth.password)
				.get(`${apiPath}/user`)
				.reply(200, { id: 1 })
				.get(`${apiPath}/projects`)
				.query({ membership: 'true', simple: 'true', per_page: '1', page: '1' })
				.reply(200, []);
		}

		async function savedProvider(baseUrl = payload.config.baseUrl) {
			const api = providerValidation(baseUrl);
			const id = await createProvider(testServer.publicApiAgentFor(owner), {
				...payload,
				config: { ...payload.config, baseUrl },
			});
			api.done();
			return id;
		}

		function discoveryApi(
			path = '/api/v4/projects',
			query: Record<string, string> = repositoryQuery,
		) {
			return nock(payload.config.baseUrl)
				.matchHeader('PRIVATE-TOKEN', payload.auth.password)
				.get(path)
				.query(query);
		}

		async function selectedEnvironment(providerId: string) {
			const remote = { schemaVersion: 1, remoteUrl: project.http_url_to_repo };
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/promotions/environments')
				.send({
					name: 'Selected repository',
					scope: 'projects',
					providerId,
					remote,
					direction: 'apply',
					settings: applySettings,
				});
			expect(response.status, JSON.stringify(response.body)).toBe(201);
			expect(response.body.remote).toEqual({
				...remote,
				repositoryPath: project.path_with_namespace,
			});
			return response.body.id as string;
		}

		afterEach(() => nock.cleanAll());

		it('applies configured network rules to all discovery routes', async () => {
			const id = await savedProvider();
			const dnsResolver = mock<DnsResolver>();
			dnsResolver.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
			const logger = Container.get(Logger);
			const clientFor = vi.spyOn(Container.get(GitHostClients), 'clientFor');
			const api = discoveryApi().reply(200, []);
			const branchApi = discoveryApi('/api/v4/projects/42/repository/branches', {
				per_page: '100',
				page: '1',
			}).reply(200, []);
			try {
				for (const allowed of [false, true]) {
					const config = new SsrfProtectionConfig();
					config.enabled = true;
					if (allowed) config.allowedIpRanges.push('127.0.0.1/32');
					const policy = new SsrfProtectionService(config, dnsResolver, logger);
					clientFor.mockReturnValue(
						new GitLabHostClient(new OutboundHttp(policy, config, logger), logger),
					);
					for (const route of routes) {
						const response = await testServer
							.publicApiAgentFor(owner)
							.get(`/promotions/providers/${id}/${route}`);
						expect(response.status, JSON.stringify(response.body)).toBe(allowed ? 200 : 400);
						if (!allowed) {
							expect(response.body.message).toContain('instance network policy');
							expect(JSON.stringify(response.body)).not.toContain(payload.auth.password);
							expect(api.isDone()).toBe(false);
							expect(branchApi.isDone()).toBe(false);
						}
					}
				}
				api.done();
				branchApi.done();
			} finally {
				clientFor.mockRestore();
			}
		});

		it('requests Developer-level repositories without an environment and preserves credentials', async () => {
			const id = await savedProvider();
			const stored = await Container.get(PromotionProviderRepository).findById(id);
			const decrypt = vi.spyOn(Container.get(Cipher), 'decryptV2');
			const api = discoveryApi().reply(
				200,
				[
					{
						...project,
						access_token: 'not-public',
						permissions: { project_access: { access_level: 40 }, group_access: null },
					},
					{
						...project,
						id: 43,
						path_with_namespace: 'shared/workflows',
						http_url_to_repo: 'https://gitlab.example.com/shared/workflows.git',
						visibility: 'public',
						permissions: { project_access: null, group_access: { access_level: 30 } },
					},
				],
				{ 'X-Next-Page': '' },
			);
			try {
				const response = await testServer
					.publicApiAgentFor(owner)
					.get(`/promotions/providers/${id}/repositories`);
				expect(response.status, JSON.stringify(response.body)).toBe(200);
				expect(response.body).toEqual({
					data: [
						{
							id: '42',
							name: 'Workflows',
							fullPath: 'platform/workflows',
							remoteUrl: project.http_url_to_repo,
							defaultBranch: 'main',
						},
						{
							id: '43',
							name: 'Workflows',
							fullPath: 'shared/workflows',
							remoteUrl: 'https://gitlab.example.com/shared/workflows.git',
							defaultBranch: 'main',
						},
					],
					nextCursor: null,
				});
				expect(JSON.stringify(response.body)).not.toContain(payload.auth.password);
				expect(decrypt).toHaveBeenCalledTimes(1);
				expect(await Container.get(PromotionProviderRepository).findById(id)).toEqual(stored);
				expect(await Container.get(PromotionEnvironmentRepository).count()).toBe(0);
				api.done();
			} finally {
				decrypt.mockRestore();
			}
		});

		it('lists branch names and identifies the default without returning commit details', async () => {
			const id = await savedProvider();
			const api = discoveryApi('/api/v4/projects/42/repository/branches', {
				per_page: '100',
				page: '1',
			}).reply(
				200,
				[
					{ name: 'main', default: true, commit: { author_email: 'not-public' } },
					{ name: 'feature/workflows', default: false },
				],
				{ 'X-Next-Page': '' },
			);
			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/promotions/providers/${id}/repositories/42/branches`);
			expect(response.status, JSON.stringify(response.body)).toBe(200);
			expect(response.body).toEqual({
				data: [
					{ name: 'main', isDefault: true },
					{ name: 'feature/workflows', isDefault: false },
				],
				nextCursor: null,
			});
			api.done();
		});

		it.each([false, true])(
			'recovers an oversized branch page with a smaller limit afterRetry=%s',
			async (afterRetry) => {
				const id = await savedProvider();
				const stored = await Container.get(PromotionProviderRepository).findById(id);
				const path = '/api/v4/projects/42/repository/branches';
				const query = { per_page: '100', page: '1' };
				const branches = Array.from({ length: 50 }, (_, index) => ({
					name: `release/${index}`,
					default: index === 0,
					commit: { message: 'x'.repeat(24 * 1024) },
				}));
				const transient = afterRetry ? discoveryApi(path, query).reply(503) : undefined;
				const large = discoveryApi(path, query).reply(200, branches);
				const agent = testServer.publicApiAgentFor(owner);
				const root = `/promotions/providers/${id}/repositories/42/branches`;
				const response = await agent.get(root);
				expect(response.status, JSON.stringify(response.body)).toBe(400);
				expect(response.body.message).toBe(
					'The results are too large to load. Start again with fewer items.',
				);
				expect(response.body.message).not.toContain('Check the GitLab URL');
				expect(JSON.stringify(response.body)).not.toContain(payload.auth.password);
				expect(await Container.get(PromotionProviderRepository).findById(id)).toEqual(stored);
				transient?.done();
				large.done();

				const firstApi = discoveryApi(path, { per_page: '1', page: '1' }).reply(
					200,
					branches.slice(0, 1),
					{ 'X-Next-Page': '2' },
				);
				const nextApi = discoveryApi(path, { per_page: '1', page: '2' }).reply(
					200,
					branches.slice(1, 2),
					{ 'X-Next-Page': '3' },
				);
				const first = await agent.get(root).query({ limit: 1 });
				expect(first.status, JSON.stringify(first.body)).toBe(200);
				expect(first.body.data).toEqual([{ name: 'release/0', isDefault: true }]);
				expect(first.body.nextCursor).not.toBeNull();
				const next = await agent.get(root).query({ cursor: first.body.nextCursor });
				expect(next.status, JSON.stringify(next.body)).toBe(200);
				expect(next.body.data).toEqual([{ name: 'release/1', isDefault: false }]);
				expect(next.body.nextCursor).not.toBeNull();
				firstApi.done();
				nextApi.done();
			},
		);

		it.each(routes)('pages and searches %s using the cursor page size', async (route) => {
			const id = await savedProvider();
			const repositories = route === 'repositories';
			const path = repositories ? '/api/v4/projects' : '/api/v4/projects/42/repository/branches';
			const query = repositories
				? {
						...repositoryQuery,
						order_by: 'similarity',
						sort: 'desc',
						search_namespaces: 'true',
					}
				: {};
			const firstData = repositories
				? [{ ...project, id: 43, path_with_namespace: 'other/workflows' }, project]
				: [
						{ name: 'main', default: true },
						{ name: 'release', default: false },
					];
			const lastData = repositories
				? [{ ...project, id: 44 }]
				: [{ name: 'release/next', default: false }];
			const firstApi = discoveryApi(path, {
				...query,
				per_page: '2',
				page: '1',
				search: 'workflows',
			}).reply(200, firstData, { 'X-Next-Page': '2' });
			const nextApi = discoveryApi(path, {
				...query,
				per_page: '2',
				page: '2',
				search: 'workflows',
			}).reply(200, lastData, { 'X-Next-Page': '' });
			const agent = testServer.publicApiAgentFor(owner);
			const first = await agent
				.get(`/promotions/providers/${id}/${route}`)
				.query({ limit: 2, search: ' workflows ' });
			expect(first.status, JSON.stringify(first.body)).toBe(200);
			expect(first.body.data).toHaveLength(2);
			if (repositories) {
				expect(first.body.data).toEqual([
					expect.objectContaining({ id: '43' }),
					expect.objectContaining({ id: '42' }),
				]);
			}
			expect(typeof first.body.nextCursor).toBe('string');
			const next = await agent
				.get(`/promotions/providers/${id}/${route}`)
				.query({ cursor: first.body.nextCursor, limit: 100, search: 'workflows' });
			expect(next.status, JSON.stringify(next.body)).toBe(200);
			expect(next.body.data).toHaveLength(1);
			expect(next.body.nextCursor).toBeNull();
			firstApi.done();
			nextApi.done();
		});

		it.each(routes)(
			'keeps the installation path and pages through %s when the requested limit is 250',
			async (route) => {
				const id = await savedProvider(`${payload.config.baseUrl}/gitlab/`);
				const repositories = route === 'repositories';
				const path = repositories
					? '/gitlab/api/v4/projects'
					: '/gitlab/api/v4/projects/42/repository/branches';
				const query = repositories ? repositoryQuery : { per_page: '100', page: '1' };
				const items = Array.from({ length: 101 }, (_, index) =>
					repositories
						? {
								...project,
								id: index + 1,
								path_with_namespace: `platform/workflows-${index + 1}`,
								http_url_to_repo: `https://gitlab.example.com/platform/workflows-${index + 1}.git`,
								default_branch: index === 100 ? null : 'main',
							}
						: { name: `branch-${String(index + 1).padStart(3, '0')}`, default: index === 0 },
				);
				const firstApi = discoveryApi(path, query).reply(200, items.slice(0, 100), {
					'X-Next-Page': '2',
				});
				const nextApi = discoveryApi(path, { ...query, page: '2' }).reply(200, items.slice(100), {
					'X-Next-Page': '',
				});
				const agent = testServer.publicApiAgentFor(owner);
				const first = await agent.get(`/promotions/providers/${id}/${route}`).query({ limit: 250 });
				expect(first.status, JSON.stringify(first.body)).toBe(200);
				expect(first.body.data).toHaveLength(100);
				expect(JSON.parse(Buffer.from(first.body.nextCursor, 'base64').toString())).toEqual({
					offset: 100,
					limit: 100,
				});
				const next = await agent
					.get(`/promotions/providers/${id}/${route}`)
					.query({ cursor: first.body.nextCursor, limit: 250 });
				expect(next.status, JSON.stringify(next.body)).toBe(200);
				expect(next.body.data).toHaveLength(1);
				expect(next.body.nextCursor).toBeNull();
				const expectedKeys = Array.from({ length: 101 }, (_, index) =>
					repositories ? String(index + 1) : `branch-${String(index + 1).padStart(3, '0')}`,
				);
				expect([...first.body.data, ...next.body.data]).toEqual(
					expectedKeys.map((key) =>
						expect.objectContaining(repositories ? { id: key } : { name: key }),
					),
				);
				if (repositories) expect(next.body.data[0].defaultBranch).toBeNull();
				firstApi.done();
				nextApi.done();
			},
		);

		it.each(routes)('returns an empty %s list for a blank search', async (route) => {
			const id = await savedProvider();
			const path =
				route === 'repositories' ? '/api/v4/projects' : '/api/v4/projects/42/repository/branches';
			const api = discoveryApi(
				path,
				route === 'repositories' ? repositoryQuery : { per_page: '100', page: '1' },
			).reply(200, []);
			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/promotions/providers/${id}/${route}`)
				.query({ search: '  ' });
			expect(response.status).toBe(200);
			expect(response.body).toEqual({ data: [], nextCursor: null });
			api.done();
		});

		it.each([
			{ route: 'repositories', status: 401, message: 'rejected the access token' },
			{ route: 'repositories', status: 403, message: 'read_api scope' },
			{ route: 'repositories', status: 503, message: 'not available' },
			{ route: 'repositories/42/branches', status: 403, message: 'repository access' },
		])(
			'reports a GitLab $status error for $route without returning an empty list or token',
			async ({ route, status, message }) => {
				const id = await savedProvider();
				const stored = await Container.get(PromotionProviderRepository).findById(id);
				const repositories = route === 'repositories';
				const api = discoveryApi(
					repositories ? '/api/v4/projects' : '/api/v4/projects/42/repository/branches',
					repositories ? repositoryQuery : { per_page: '100', page: '1' },
				)
					.times(status === 503 ? 2 : 1)
					.reply(status, { message: payload.auth.password });
				const response = await testServer
					.publicApiAgentFor(owner)
					.get(`/promotions/providers/${id}/${route}`);
				expect(response.status).toBe(status === 503 ? 503 : 400);
				expect(response.body).not.toHaveProperty('data');
				expect(response.body.message).toContain(message);
				expect(JSON.stringify(response.body)).not.toContain(payload.auth.password);
				expect(await Container.get(PromotionProviderRepository).findById(id)).toEqual(stored);
				api.done();
			},
		);

		it('reports an inaccessible repository instead of an empty branch list', async () => {
			const id = await savedProvider();
			const api = discoveryApi('/api/v4/projects/42/repository/branches', {
				per_page: '100',
				page: '1',
			}).reply(404);
			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/promotions/providers/${id}/repositories/42/branches`);
			expect(response.status).toBe(404);
			expect(response.body.message).toContain('token can access this repository');
			api.done();
		});

		it('encodes a repository path as one GitLab project identifier', async () => {
			const id = await savedProvider();
			const api = discoveryApi('/api/v4/projects/platform%2Fworkflows/repository/branches', {
				per_page: '100',
				page: '1',
			}).reply(200, [{ name: 'main', default: true }]);
			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/promotions/providers/${id}/repositories/platform%2Fworkflows/branches`);
			expect(response.status, JSON.stringify(response.body)).toBe(200);
			api.done();
		});

		it('rejects invalid queries before it reads the provider', async () => {
			for (const route of routes) {
				const response = await testServer
					.publicApiAgentFor(owner)
					.get(`/promotions/providers/not-needed/${route}`)
					.query({ offset: 1 });
				expect(response.status).toBe(400);
			}
		});

		it('rejects unexpected pagination metadata without following its URL', async () => {
			const id = await savedProvider();
			const api = discoveryApi().reply(200, [project], {
				'X-Next-Page': 'https://other.example.com',
			});
			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/promotions/providers/${id}/repositories`);
			expect(response.status).toBe(400);
			expect(response.body.message).toContain('unexpected response');
			api.done();
		});

		it.each(routes)('rejects malformed %s responses', async (route) => {
			const id = await savedProvider();
			const repositories = route === 'repositories';
			const api = discoveryApi(
				repositories ? '/api/v4/projects' : '/api/v4/projects/42/repository/branches',
				repositories ? repositoryQuery : { per_page: '100', page: '1' },
			).reply(
				200,
				repositories
					? [{ ...project, http_url_to_repo: 'https://user:secret@example.com/repo.git' }]
					: [{ name: 'main' }],
			);
			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/promotions/providers/${id}/${route}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toContain('unexpected response');
			api.done();
		});

		it('continues a full page when a proxy omits pagination headers', async () => {
			const id = await savedProvider();
			const api = discoveryApi('/api/v4/projects', { ...repositoryQuery, per_page: '1' }).reply(
				200,
				[project],
			);
			const nextApi = discoveryApi('/api/v4/projects', {
				...repositoryQuery,
				per_page: '1',
				page: '2',
			}).reply(200, []);
			const agent = testServer.publicApiAgentFor(owner);
			const first = await agent.get(`/promotions/providers/${id}/repositories?limit=1`);
			expect(first.status).toBe(200);
			expect(first.body.nextCursor).not.toBeNull();
			const next = await agent
				.get(`/promotions/providers/${id}/repositories`)
				.query({ cursor: first.body.nextCursor });
			expect(next.status).toBe(200);
			expect(next.body).toEqual({ data: [], nextCursor: null });
			api.done();
			nextApi.done();
		});

		it('returns an input error for a cursor that does not start a page', async () => {
			const cursor = Buffer.from(JSON.stringify({ offset: 1, limit: 2 })).toString('base64');
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/promotions/providers/not-needed/repositories')
				.query({ cursor });
			expect(response.status).toBe(400);
			expect(response.body.message).toContain('invalid cursor');
		});

		it.each(routes)(
			'requires the API-key discovery scope and user permission for %s',
			async (route) => {
				const id = await savedProvider();
				const readOnlyOwner = await createOwnerWithApiKey({ scopes: ['promotions:read'] });
				const listOnlyOwner = await createOwnerWithApiKey({ scopes: ['promotions:list'] });
				const member = await createMemberWithApiKey({ scopes: ['promotions:discover'] });
				for (const user of [readOnlyOwner, listOnlyOwner, member]) {
					const response = await testServer
						.publicApiAgentFor(user)
						.get(`/promotions/providers/${id}/${route}`);
					expect(response.status).toBe(403);
				}
				expect(
					(await testServer.publicApiAgentFor(readOnlyOwner).get(`/promotions/providers/${id}`))
						.status,
				).toBe(200);
				const discoveryOwner = await createOwnerWithApiKey({ scopes: ['promotions:discover'] });
				const admin = await createAdminWithApiKey();
				for (const user of [discoveryOwner, admin]) {
					const api = (
						route === 'repositories'
							? discoveryApi()
							: discoveryApi('/api/v4/projects/42/repository/branches', {
									per_page: '100',
									page: '1',
								})
					).reply(200, []);
					const response = await testServer
						.publicApiAgentFor(user)
						.get(`/promotions/providers/${id}/${route}`);
					expect(response.status).toBe(200);
					expect(response.body).toEqual({ data: [], nextCursor: null });
					api.done();
				}
				expect(
					(await testServer.publicApiAgentFor(discoveryOwner).get(`/promotions/providers/${id}`))
						.status,
				).toBe(403);
			},
		);

		it.each(routes)('requires an active, licensed promotions module for %s', async (route) => {
			const agent = testServer.publicApiAgentFor(owner);
			testServer.license.disable('feat:promotions');
			expect((await agent.get(`/promotions/providers/not-needed/${route}`)).status).toBe(403);
			testServer.license.reset();
			const active = vi.spyOn(Container.get(ModuleRegistry), 'isActive').mockReturnValue(false);
			try {
				expect((await agent.get(`/promotions/providers/not-needed/${route}`)).status).toBe(503);
			} finally {
				active.mockRestore();
			}
		});

		it.each(routes)('reports missing and plain Git providers for %s', async (route) => {
			const agent = testServer.publicApiAgentFor(owner);
			expect((await agent.get(`/promotions/providers/missing/${route}`)).status).toBe(404);
			const id = await createProvider(agent);
			const response = await agent.get(`/promotions/providers/${id}/${route}`);
			expect(response.status).toBe(400);
			expect(response.body.message).toContain('no Git host API');
		});

		it('keeps URL-looking list searches on the text-search pathway', async () => {
			const providerId = await savedProvider();
			const api = discoveryApi('/api/v4/projects', {
				...repositoryQuery,
				order_by: 'similarity',
				sort: 'desc',
				search: project.http_url_to_repo,
				search_namespaces: 'true',
			}).reply(200, []);
			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/promotions/providers/${providerId}/repositories`)
				.query({ search: project.http_url_to_repo });
			expect(response.status).toBe(200);
			expect(response.body).toEqual({ data: [], nextCursor: null });
			api.done();
		});

		it.each([
			{ installation: '', suffix: '.git' },
			{ installation: '', suffix: '%2Egit' },
			{ installation: '', suffix: '/' },
			{ installation: '/gitlab', suffix: '' },
		])(
			'saves a repository path from a full URL: $installation $suffix',
			async ({ installation, suffix }) => {
				const baseUrl = `${payload.config.baseUrl}${installation}`;
				const providerId = await savedProvider(baseUrl);
				const response = await testServer
					.publicApiAgentFor(owner)
					.post('/promotions/environments')
					.send({
						name: 'URL form',
						scope: 'projects',
						providerId,
						remote: {
							schemaVersion: 1,
							remoteUrl: ` ${baseUrl}/${project.path_with_namespace}${suffix} `,
						},
						direction: 'apply',
						settings: applySettings,
					});
				expect(response.status, JSON.stringify(response.body)).toBe(201);
				expect(response.body.remote).toEqual({
					schemaVersion: 1,
					remoteUrl: `${baseUrl}/${project.path_with_namespace}.git`,
					repositoryPath: project.path_with_namespace,
				});
			},
		);

		it('rejects repository URLs outside the provider or without a namespace', async () => {
			const baseUrl = `${payload.config.baseUrl}/gitlab`;
			const providerId = await savedProvider(baseUrl);
			const agent = testServer.publicApiAgentFor(owner);
			for (const remoteUrl of [
				'https://other.example.com/gitlab/platform/workflows.git',
				`${payload.config.baseUrl}/gitlab-other/platform/workflows.git`,
				`${baseUrl}/only-one-segment`,
				`${baseUrl}/platform/workflows.git?token=not-public`,
				`${baseUrl}/platform/workflows.git#branch`,
				'https://user:secret@gitlab.example.com/gitlab/platform/workflows.git',
				`${baseUrl}/platform/%ZZ.git`,
				`${baseUrl}/platform/%00.git`,
				`${baseUrl}/platform%2F..%2Fworkflows.git`,
				`${payload.config.baseUrl}:8443/gitlab/platform/workflows.git`,
				'ftp://gitlab.example.com/gitlab/platform/workflows.git',
			]) {
				const response = await agent.post('/promotions/environments').send({
					name: 'Invalid URL',
					scope: 'projects',
					providerId,
					remote: { schemaVersion: 1, remoteUrl },
					direction: 'apply',
					settings: applySettings,
				});
				expect(response.status, remoteUrl).toBe(400);
			}
		});

		it('stores only a path and resolves provider changes for reads and Git operations', async () => {
			const providerId = await savedProvider();
			const id = await selectedEnvironment(providerId);
			const agent = testServer.publicApiAgentFor(owner);
			const root = `/promotions/environments/${id}`;
			const repository = Container.get(PromotionEnvironmentRepository);
			const storedRemote = { schemaVersion: 1, repositoryPath: project.path_with_namespace };
			const remote = { ...storedRemote, remoteUrl: project.http_url_to_repo };
			expect((await repository.findByIdWithProvider(id))?.remote).toEqual(storedRemote);
			const original = await agent.get(root);
			expect(original.body.remote).toEqual(remote);
			const listed = await agent.get('/promotions/environments').query({ providerId });
			expect(listed.body.data).toContainEqual(expect.objectContaining({ id, remote }));
			expect((await agent.put(root).send({ name: 'Renamed', providerId })).body.remote).toEqual(
				remote,
			);
			const team = await createTeamProject('Path deployment', owner);
			expect((await agent.post(`${root}/projects/${team.id}`)).status).toBe(200);
			const baseUrl = 'https://other-gitlab.example.com/installation';
			const api = providerValidation(baseUrl);
			const updated = await agent.put(`/promotions/providers/${providerId}`).send({
				config: { schemaVersion: 1, baseUrl },
				auth: payload.auth,
			});
			expect(updated.status).toBe(200);
			api.done();
			const expected = {
				schemaVersion: 1,
				remoteUrl: `${baseUrl}/${project.path_with_namespace}.git`,
			};
			const after = await agent.get(root);
			expect(after.body.remote).toEqual({
				...expected,
				repositoryPath: project.path_with_namespace,
			});
			expect(after.body.settings).toEqual(original.body.settings);
			expect((await agent.get(`${root}/projects`)).body.projectIds).toEqual([team.id]);
			expect((await repository.findByIdWithProvider(id))?.remote).toEqual(storedRemote);
			expect(
				(await Container.get(PromotionEnvironmentResolver).resolveForEnvironment(id)).remote,
			).toEqual(expected);
		});

		it('replaces a repository path without calling GitLab and rejects invalid replacements', async () => {
			const providerId = await savedProvider();
			const id = await selectedEnvironment(providerId);
			const agent = testServer.publicApiAgentFor(owner);
			const root = `/promotions/environments/${id}`;
			const remote = { schemaVersion: 1, remoteUrl: `${payload.config.baseUrl}/platform/next.git` };
			const updated = await agent.put(root).send({ remote });
			expect(updated.status).toBe(200);
			expect(updated.body.remote).toEqual({ ...remote, repositoryPath: 'platform/next' });
			expect(
				(await Container.get(PromotionEnvironmentRepository).findByIdWithProvider(id))?.remote,
			).toEqual({ schemaVersion: 1, repositoryPath: 'platform/next' });
			for (const remoteUrl of [
				'',
				'https://other.example.com/platform/next.git',
				`${payload.config.baseUrl}/single`,
			]) {
				const rejected = await agent
					.put(root)
					.send({ name: 'Must not save', remote: { schemaVersion: 1, remoteUrl } });
				expect(rejected.status).toBe(400);
				expect((await agent.get(root)).body).toEqual(updated.body);
			}
			const rejectedId = await agent.put(root).send({ remote: { ...remote, repositoryId: '42' } });
			expect(rejectedId.status).toBe(400);
		});

		it('keeps paths across GitLab reassignment and restores a URL for plain Git', async () => {
			const providerId = await savedProvider();
			const id = await selectedEnvironment(providerId);
			const baseUrl = 'https://other-gitlab.example.com';
			const nextProviderId = await savedProvider(baseUrl);
			const agent = testServer.publicApiAgentFor(owner);
			const root = `/promotions/environments/${id}`;
			const moved = await agent.put(root).send({ providerId: nextProviderId });
			expect(moved.status).toBe(200);
			const remote = {
				schemaVersion: 1,
				remoteUrl: `${baseUrl}/${project.path_with_namespace}.git`,
			};
			expect(moved.body.remote).toEqual({
				...remote,
				repositoryPath: project.path_with_namespace,
			});
			const plainProviderId = await createProvider(agent);
			const plain = await agent.put(root).send({ providerId: plainProviderId });
			expect(plain.status).toBe(200);
			expect(plain.body.remote).toEqual(remote);
			expect(
				(await Container.get(PromotionEnvironmentRepository).findByIdWithProvider(id))?.remote,
			).toEqual(remote);
		});

		it('rejects Git operations for a legacy URL outside the provider host', async () => {
			const providerId = await savedProvider();
			const id = await selectedEnvironment(providerId);
			const remote = {
				schemaVersion: 1 as const,
				remoteUrl: 'https://other.example.com/platform/workflows.git',
			};
			await Container.get(PromotionEnvironmentRepository).updateEnvironment(id, providerId, {
				remote,
			});
			await expect(
				Container.get(PromotionEnvironmentResolver).resolveForEnvironment(id),
			).rejects.toThrow('Select the repository again');
			const read = await testServer.publicApiAgentFor(owner).get(`/promotions/environments/${id}`);
			expect(read.status).toBe(200);
			expect(read.body.remote).toEqual(remote);
		});

		it('reads legacy URL remotes and converts them to paths when the remote is resaved', async () => {
			const providerId = await savedProvider();
			const id = await selectedEnvironment(providerId);
			const repository = Container.get(PromotionEnvironmentRepository);
			const remote = { schemaVersion: 1 as const, remoteUrl: project.http_url_to_repo };
			await repository.updateEnvironment(id, providerId, { remote });
			const agent = testServer.publicApiAgentFor(owner);
			const root = `/promotions/environments/${id}`;
			expect((await agent.get(root)).body.remote).toEqual(remote);
			expect(
				(await Container.get(PromotionEnvironmentResolver).resolveForEnvironment(id)).remote,
			).toEqual(remote);
			expect((await agent.put(root).send({ name: 'Legacy rename' })).status).toBe(200);
			expect((await repository.findByIdWithProvider(id))?.remote).toEqual(remote);
			expect((await agent.put(root).send({ remote })).status).toBe(200);
			expect((await repository.findByIdWithProvider(id))?.remote).toEqual({
				schemaVersion: 1,
				repositoryPath: project.path_with_namespace,
			});
		});

		it.each(['remote', 'provider'] as const)(
			'keeps a winning provider reassignment when a stale %s update resumes',
			async (field) => {
				const providerId = await savedProvider();
				const id = await selectedEnvironment(providerId);
				const agent = testServer.publicApiAgentFor(owner);
				const plainProviderId = await createProvider(agent);
				const repository = Container.get(PromotionEnvironmentRepository);
				const updateEnvironment = repository.updateEnvironment.bind(repository);
				const paused = createDeferredPromise();
				const resume = createDeferredPromise();
				const write = vi
					.spyOn(repository, 'updateEnvironment')
					.mockImplementationOnce(async (...args) => {
						paused.resolve();
						await resume.promise;
						return await updateEnvironment(...args);
					});
				const root = `/promotions/environments/${id}`;
				const changes =
					field === 'remote'
						? {
								remote: {
									schemaVersion: 1,
									remoteUrl: `${payload.config.baseUrl}/platform/next.git`,
								},
							}
						: { providerId };
				const pending = agent
					.put(root)
					.send({ name: 'Must not save', ...changes })
					.then((response) => response);
				try {
					await Promise.race([
						paused.promise,
						pending.then(({ status }) => {
							throw new Error(`The pending update returned ${status} before its write was paused.`);
						}),
					]);
					const winner = await agent
						.put(root)
						.send({ name: 'Winning settings', providerId: plainProviderId });
					expect(winner.status, JSON.stringify(winner.body)).toBe(200);
					const stored = await repository.findByIdWithProvider(id);
					expect(stored?.remote).toEqual(winner.body.remote);
					resume.resolve();
					const stale = await pending;
					expect(stale.status, JSON.stringify(stale.body)).toBe(409);
					expect(stale.body.message).toContain('Reload');
					expect(await repository.findByIdWithProvider(id)).toEqual(stored);
					const read = await agent.get(root);
					expect(read.status).toBe(200);
					expect(read.body).toEqual(winner.body);
					const listed = await agent.get('/promotions/environments');
					expect(listed.status).toBe(200);
					expect(listed.body.data).toContainEqual(
						expect.objectContaining({ id, remote: winner.body.remote }),
					);
					expect(
						await Container.get(PromotionEnvironmentResolver).resolveForEnvironment(id),
					).toMatchObject({ providerId: plainProviderId, remote: winner.body.remote });
				} finally {
					resume.resolve();
					await pending;
					write.mockRestore();
				}
			},
		);
	});

	it('rejects a key that has no promotion scope', async () => {
		const unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
		const agent = testServer.publicApiAgentFor(unscopedOwner);

		const list = await agent.get('/promotions/environments');
		const apply = await agent.post(`/promotions/environments/${randomUUID()}/apply`);

		expect(list.status).toBe(403);
		expect(apply.status).toBe(403);
	});

	it('rejects every request when the feature is not licensed', async () => {
		testServer.license.disable('feat:promotions');
		const response = await testServer.publicApiAgentFor(owner).get('/promotions/environments');
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

	it('requires a username on plain Git token creation and credential replacement', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const id = await createProvider(agent);
		const before = await Container.get(PromotionProviderRepository).findOneByOrFail({ id });
		const auth = { authType: 'token', password: 'replacement-password' };
		const created = await agent.post('/promotions/providers').send({
			name: 'Must not save',
			type: 'git',
			auth,
		});
		const updated = await agent
			.put(`/promotions/providers/${id}`)
			.send({ name: 'Must not save', auth });
		for (const response of [created, updated]) {
			expect(response.status, JSON.stringify(response.body)).toBe(400);
			expect(response.body.message).toContain('requires a username');
			expect(JSON.stringify(response.body)).not.toContain(auth.password);
		}
		expect(await Container.get(PromotionProviderRepository).count()).toBe(1);
		expect(await Container.get(PromotionProviderRepository).findOneByOrFail({ id })).toEqual(
			before,
		);
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

	it.each([false, true])(
		'passes the API key variable permission to Promote: %s',
		async (canExportVariableValues) => {
			const scopedOwner = await createOwnerWithApiKey({
				scopes: canExportVariableValues
					? ['promotions:promote', 'variable:list']
					: ['promotions:promote'],
			});
			const environmentId = randomUUID();
			const promote = vi
				.spyOn(Container.get(PromotionsService), 'promote')
				.mockRejectedValueOnce(new BadRequestError('Operation stopped for test'));
			try {
				const response = await testServer
					.publicApiAgentFor(scopedOwner)
					.post(`/promotions/environments/${environmentId}/promote`)
					.send({ commitMessage: 'Export projects' });

				expect(response.status).toBe(400);
				expect(promote).toHaveBeenCalledWith(
					environmentId,
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

	it('accepts a Promote without a commit message', async () => {
		const environmentId = randomUUID();
		const promote = vi
			.spyOn(Container.get(PromotionsService), 'promote')
			.mockRejectedValueOnce(new BadRequestError('Operation stopped for test'));
		try {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post(`/promotions/environments/${environmentId}/promote`)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Operation stopped for test');
			expect(promote).toHaveBeenCalledWith(
				environmentId,
				expect.objectContaining({ id: owner.id }),
				expect.not.objectContaining({ commitMessage: expect.anything() }),
			);
		} finally {
			promote.mockRestore();
		}
	});

	it('refuses to change the authentication method of a provider', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);

		const response = await agent
			.put(`/promotions/providers/${providerId}`)
			.send({ auth: { authType: 'ssh-key' } });

		expect(response.status).toBe(400);
	});

	it('deletes a provider only once no environment uses it', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);
		const environmentId = await createEnvironment(agent, { providerId });
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		onTestFinished(() => emit.mockRestore());

		const inUse = await agent.delete(`/promotions/providers/${providerId}`);
		await agent.delete(`/promotions/environments/${environmentId}`);
		const unused = await agent.delete(`/promotions/providers/${providerId}`);

		expect(inUse.status).toBe(409);
		expect(unused.status).toBe(204);
		expect(
			await Container.get(PromotionProviderRepository).findOneBy({ id: providerId }),
		).toBeNull();
		// The database reports the deleted rows, so each delete emits once and the refused one not at all.
		const deletes = emit.mock.calls.filter(([name]) =>
			['promotion-provider-deleted', 'promotion-environment-deleted'].includes(name),
		);
		expect(deletes.map(([name]) => name)).toEqual([
			'promotion-environment-deleted',
			'promotion-provider-deleted',
		]);
	});

	it('stores nothing when the environment names an unknown provider', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/promotions/environments')
			.send({
				name: 'Deployments',
				scope: 'instance',
				providerId: 'doesNotExist',
				remote,
				direction: 'apply',
				settings: applySettings,
			});

		expect(response.status).toBe(404);
		expect(await Container.get(PromotionEnvironmentRepository).count()).toBe(0);
	});

	it('rejects a second instance environment for the same direction', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		await createEnvironment(agent);
		const providerId = await createProvider(agent, {
			...tokenProviderPayload,
			name: 'Other bot',
		});

		const response = await agent.post('/promotions/environments').send({
			name: 'Second',
			scope: 'instance',
			providerId,
			remote: { schemaVersion: 1, remoteUrl: 'https://example.com/org/other.git' },
			direction: 'apply',
			settings: applySettings,
		});

		expect(response.status).toBe(409);
		expect(await Container.get(PromotionEnvironmentRepository).count()).toBe(1);
	});

	it('stores nothing when the remote URL does not suit the provider', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);

		const response = await agent.post('/promotions/environments').send({
			name: 'Invalid',
			scope: 'instance',
			providerId,
			remote: { schemaVersion: 1, remoteUrl: 'git@example.com:org/repo.git' },
			direction: 'apply',
			settings: applySettings,
		});

		expect(response.status).toBe(400);
		expect(await Container.get(PromotionEnvironmentRepository).count()).toBe(0);
	});

	it.each([{ direction: 'promote' }, { scope: 'projects' }])(
		'rejects direction and scope on update: %j',
		async (change) => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createEnvironment(agent);

			const response = await agent
				.put(`/promotions/environments/${id}`)
				.send({ name: 'Renamed', ...change });

			expect(response.status).toBe(400);
			expect((await agent.get(`/promotions/environments/${id}`)).body).toMatchObject({
				name: 'Deployments',
				direction: 'apply',
				scope: 'instance',
			});
		},
	);

	it('rejects a branch name Git does not accept', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const providerId = await createProvider(agent);

		const response = await agent.post('/promotions/environments').send({
			name: 'Deployments',
			scope: 'instance',
			providerId,
			remote,
			direction: 'apply',
			settings: { schemaVersion: 1, branchName: 'no..pe' },
		});

		expect(response.status).toBe(400);
		expect(await Container.get(PromotionEnvironmentRepository).count()).toBe(0);
	});

	it('checks updated settings against the stored direction', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const id = await createEnvironment(agent);

		const response = await agent
			.put(`/promotions/environments/${id}`)
			.send({ settings: promoteEnvironment.settings });

		expect(response.status).toBe(400);
		expect((await agent.get(`/promotions/environments/${id}`)).body.settings).toEqual(
			applySettings,
		);
	});

	it('requires createBranchOnPromotion on every Promote settings write', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const id = await createEnvironment(agent, promoteEnvironment);

		const response = await agent
			.put(`/promotions/environments/${id}`)
			.send({ settings: { schemaVersion: 1, baseBranchName: 'staging' } });

		expect(response.status).toBe(400);
	});

	describe('provider sharing', () => {
		async function createProjectEnvironment(agent: Agent, name: string, providerId: string) {
			return await createEnvironment(agent, { name, scope: 'projects', providerId });
		}

		it('lists the environments that a provider edit would affect', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const shared = await createProvider(agent, { ...tokenProviderPayload, name: 'Shared' });
			const other = await createProvider(agent, { ...tokenProviderPayload, name: 'Other' });
			const instanceId = await createEnvironment(agent, { providerId: shared });
			const teamId = await createProjectEnvironment(agent, 'Team', shared);
			await createProjectEnvironment(agent, 'Unrelated', other);

			const byProvider = await agent.get(`/promotions/environments?providerId=${shared}`);
			const instanceOnly = await agent.get('/promotions/environments?scope=instance');
			const combined = await agent.get(
				`/promotions/environments?providerId=${shared}&scope=projects`,
			);

			expect(byProvider.body.data.map((row: { id: string }) => row.id).sort()).toEqual(
				[instanceId, teamId].sort(),
			);
			expect(instanceOnly.body.data.map((row: { id: string }) => row.id)).toEqual([instanceId]);
			expect(combined.body.data.map((row: { id: string }) => row.id)).toEqual([teamId]);
		});

		it('moves one environment to another provider and leaves the rest alone', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const first = await createProvider(agent, { ...tokenProviderPayload, name: 'First' });
			const second = await createProvider(agent, { ...tokenProviderPayload, name: 'Second' });
			const movedId = await createProjectEnvironment(agent, 'Moved', first);
			const keptId = await createProjectEnvironment(agent, 'Kept', first);

			const moved = await agent
				.put(`/promotions/environments/${movedId}`)
				.send({ providerId: second });
			const kept = await agent.get(`/promotions/environments/${keptId}`);

			expect(moved.status, JSON.stringify(moved.body)).toBe(200);
			expect(moved.body.provider.id).toBe(second);
			expect(kept.body.provider.id).toBe(first);
		});

		it('rechecks the remote URL when an environment moves to another provider', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const tokenId = await createProvider(agent);
			const sshId = await createProvider(agent, {
				name: 'Deploy key',
				type: 'git',
				auth: { authType: 'ssh-key' },
			});
			// The HTTP(S) URL suits the username-and-password provider, but not an SSH key.
			const environmentId = await createEnvironment(agent, { providerId: tokenId });

			const response = await agent
				.put(`/promotions/environments/${environmentId}`)
				.send({ providerId: sshId });

			expect(response.status).toBe(400);
			const unchanged = await agent.get(`/promotions/environments/${environmentId}`);
			expect(unchanged.body.provider.id).toBe(tokenId);
		});
	});

	describe('project links', () => {
		async function createProjectEnvironment(agent: Agent, name: string, over: object = {}) {
			const providerId = await createProvider(agent, { ...tokenProviderPayload, name });
			return await createEnvironment(agent, { name, scope: 'projects', providerId, ...over });
		}

		const linkOf = async (projectId: string) =>
			await Container.get(PromotionEnvironmentProjectRepository).findForProject(projectId, 'apply');

		it('adds, lists, and removes a team project', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectEnvironment(agent, 'First');
			const project = await createTeamProject('Team project', owner);

			const add = await agent.post(`/promotions/environments/${id}/projects/${project.id}`);
			expect(add.status, JSON.stringify(add.body)).toBe(200);
			expect(add.body).toEqual({ projectId: project.id, environmentId: id });

			const list = await agent.get(`/promotions/environments/${id}/projects`);
			expect(list.status).toBe(200);
			expect(list.body).toEqual({ projectIds: [project.id] });

			const remove = await agent.delete(`/promotions/environments/${id}/projects/${project.id}`);
			expect(remove.status).toBe(204);

			const listAfter = await agent.get(`/promotions/environments/${id}/projects`);
			expect(listAfter.body).toEqual({ projectIds: [] });
		});

		it('lets a project use one apply and one promote environment', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const applyId = await createProjectEnvironment(agent, 'Apply');
			const promoteId = await createProjectEnvironment(agent, 'Promote', promoteEnvironment);
			const project = await createTeamProject('Team project', owner);

			const apply = await agent.post(`/promotions/environments/${applyId}/projects/${project.id}`);
			const promote = await agent.post(
				`/promotions/environments/${promoteId}/projects/${project.id}`,
			);

			expect(apply.status, JSON.stringify(apply.body)).toBe(200);
			expect(promote.status, JSON.stringify(promote.body)).toBe(200);
			const links = await Container.get(PromotionEnvironmentProjectRepository).find({
				where: { projectId: project.id },
				order: { direction: 'ASC' },
			});
			expect(links.map(({ direction, environmentId }) => ({ direction, environmentId }))).toEqual([
				{ direction: 'apply', environmentId: applyId },
				{ direction: 'promote', environmentId: promoteId },
			]);
		});

		it('treats re-adding to the same environment as idempotent', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectEnvironment(agent, 'First');
			const project = await createTeamProject('Team project', owner);

			await agent.post(`/promotions/environments/${id}/projects/${project.id}`);
			const again = await agent.post(`/promotions/environments/${id}/projects/${project.id}`);

			expect(again.status).toBe(200);
			expect(again.body).toEqual({ projectId: project.id, environmentId: id });
		});

		it('rejects a second environment for the same project and direction', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const first = await createProjectEnvironment(agent, 'First');
			const second = await createProjectEnvironment(agent, 'Second');
			const project = await createTeamProject('Team project', owner);

			await agent.post(`/promotions/environments/${first}/projects/${project.id}`);
			const conflict = await agent.post(
				`/promotions/environments/${second}/projects/${project.id}`,
			);

			expect(conflict.status).toBe(409);
		});

		it('does not reassign a project when environments of one direction add it concurrently', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const first = await createProjectEnvironment(agent, 'First');
			const second = await createProjectEnvironment(agent, 'Second');
			const project = await createTeamProject('Team project', owner);

			const responses = await Promise.all([
				agent.post(`/promotions/environments/${first}/projects/${project.id}`),
				agent.post(`/promotions/environments/${second}/projects/${project.id}`),
			]);

			expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
			const successfulResponse = responses.find(({ status }) => status === 200);
			expect((await linkOf(project.id))?.environmentId).toBe(
				successfulResponse?.body.environmentId,
			);
		});

		it('rejects removing a project through a different environment', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const first = await createProjectEnvironment(agent, 'First');
			const second = await createProjectEnvironment(agent, 'Second');
			const project = await createTeamProject('Team project', owner);
			await agent.post(`/promotions/environments/${first}/projects/${project.id}`);

			const response = await agent.delete(
				`/promotions/environments/${second}/projects/${project.id}`,
			);

			expect(response.status).toBe(409);
			expect(await linkOf(project.id)).toMatchObject({ environmentId: first });
		});

		it('rejects a personal project', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectEnvironment(agent, 'First');
			const personalProject = await getPersonalProject(owner);

			const response = await agent.post(
				`/promotions/environments/${id}/projects/${personalProject.id}`,
			);
			expect(response.status).toBe(400);
		});

		it('rejects the instance environment', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createEnvironment(agent);
			const project = await createTeamProject('Team project', owner);

			const response = await agent.post(`/promotions/environments/${id}/projects/${project.id}`);
			expect(response.status).toBe(400);
		});

		it('returns 404 for an unknown project', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectEnvironment(agent, 'First');

			const response = await agent.post(`/promotions/environments/${id}/projects/doesNotExist`);
			expect(response.status).toBe(404);
		});

		it('removes the link when the environment is deleted', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectEnvironment(agent, 'First');
			const project = await createTeamProject('Team project', owner);
			await agent.post(`/promotions/environments/${id}/projects/${project.id}`);

			await agent.delete(`/promotions/environments/${id}`);

			expect(await linkOf(project.id)).toBeNull();
		});

		it('removes the link when the project is deleted', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createProjectEnvironment(agent, 'First');
			const project = await createTeamProject('Team project', owner);
			await agent.post(`/promotions/environments/${id}/projects/${project.id}`);

			await Container.get(ProjectRepository).delete({ id: project.id });

			expect(await linkOf(project.id)).toBeNull();
		});
	});

	describe('change preview', () => {
		it('checks the scope of the requested direction and forwards the query', async () => {
			const source = { environmentId: 'env1', branchName: 'main' };
			const getChanges = vi
				.spyOn(Container.get(PromotionChangeService), 'getChanges')
				.mockResolvedValue({ commitSha: 'a'.repeat(40), source, changes: [] });
			try {
				const pushOnly = testServer.publicApiAgentFor(
					await createOwnerWithApiKey({ scopes: ['promotions:promote'] }),
				);
				const pullOnly = testServer.publicApiAgentFor(
					await createOwnerWithApiKey({ scopes: ['promotions:apply'] }),
				);

				const promote = await pushOnly.get('/promotions/projects/proj1/changes/promote');
				expect(promote.status, JSON.stringify(promote.body)).toBe(200);
				expect(promote.body).toEqual({ commitSha: 'a'.repeat(40), source, changes: [] });
				expect(getChanges).toHaveBeenLastCalledWith(
					expect.objectContaining({ id: expect.any(String) }),
					'proj1',
					'promote',
					expect.anything(),
				);

				expect((await pushOnly.get('/promotions/projects/proj1/changes/apply')).status).toBe(403);
				expect((await pullOnly.get('/promotions/projects/proj1/changes/promote')).status).toBe(403);

				const apply = await pullOnly.get('/promotions/projects/proj1/changes/apply?search=order');
				expect(apply.status, JSON.stringify(apply.body)).toBe(200);
				expect(getChanges).toHaveBeenLastCalledWith(
					expect.anything(),
					'proj1',
					'apply',
					expect.objectContaining({ search: 'order' }),
				);

				expect((await pullOnly.get('/promotions/projects/proj1/changes/sideways')).status).toBe(
					404,
				);
				expect(getChanges).toHaveBeenCalledTimes(2);
			} finally {
				getChanges.mockRestore();
			}
		});

		it('explains that the direction needs a clone first', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			await createEnvironment(agent);
			const project = await createTeamProject('Team project', owner);

			const response = await agent.get(`/promotions/projects/${project.id}/changes/apply`);

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not connected');
		});
	});

	describe('selective promote', () => {
		const promoteResult = {
			environmentId: 'env1',
			counts: { workflows: 2, folders: 0, credentials: 0, dataTables: 0, variables: 0, tags: 0 },
			git: { commitSha: 'a'.repeat(40), branchName: 'main' },
		};

		it('requires the promote API-key scope', async () => {
			const restrictedOwner = await createOwnerWithApiKey({ scopes: ['variable:list'] });
			const response = await testServer
				.publicApiAgentFor(restrictedOwner)
				.post('/promotions/projects/proj1/promote')
				.send({ workflowIds: ['w1'] });
			expect(response.status).toBe(403);
		});

		it('rejects a user without the promote grant', async () => {
			// The key carries the promote scope, but a member's role does not grant it.
			const member = await createMemberWithApiKey({ scopes: ['promotions:promote'] });
			const response = await testServer
				.publicApiAgentFor(member)
				.post('/promotions/projects/proj1/promote')
				.send({ workflowIds: ['w1'] });
			expect(response.status).toBe(403);
		});

		it('requires a licensed and active module', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			testServer.license.disable('feat:promotions');
			expect(
				(await agent.post('/promotions/projects/proj1/promote').send({ workflowIds: ['w1'] }))
					.status,
			).toBe(403);
			testServer.license.enable('feat:promotions');
			const active = vi.spyOn(Container.get(ModuleRegistry), 'isActive').mockReturnValue(false);
			try {
				const project = await createTeamProject('Team project', owner);
				expect(
					(
						await agent
							.post(`/promotions/projects/${project.id}/promote`)
							.send({ workflowIds: ['w1'] })
					).status,
				).toBe(503);
			} finally {
				active.mockRestore();
			}
		});

		it('rejects an empty selection with 400', async () => {
			const project = await createTeamProject('Team project', owner);
			const response = await testServer
				.publicApiAgentFor(owner)
				.post(`/promotions/projects/${project.id}/promote`)
				.send({ workflowIds: [] });
			expect(response.status).toBe(400);
		});

		it('forwards the selection and the variable-list grant to the service', async () => {
			const project = await createTeamProject('Team project', owner);
			const promote = vi
				.spyOn(Container.get(PromotionsService), 'promoteProjectSelection')
				.mockResolvedValue(promoteResult);
			try {
				const withVars = testServer.publicApiAgentFor(
					await createOwnerWithApiKey({ scopes: ['promotions:promote', 'variable:list'] }),
				);
				const withoutVars = testServer.publicApiAgentFor(
					await createOwnerWithApiKey({ scopes: ['promotions:promote'] }),
				);

				const first = await withVars
					.post(`/promotions/projects/${project.id}/promote`)
					.send({ workflowIds: ['w1', 'w2'], commitMessage: 'Promote checkout flow' });
				expect(first.status, JSON.stringify(first.body)).toBe(200);
				expect(first.body).toEqual(promoteResult);
				expect(promote).toHaveBeenLastCalledWith(
					project.id,
					expect.objectContaining({ id: expect.any(String) }),
					expect.objectContaining({
						workflowIds: ['w1', 'w2'],
						commitMessage: 'Promote checkout flow',
						canExportVariableValues: true,
					}),
				);

				const second = await withoutVars
					.post(`/promotions/projects/${project.id}/promote`)
					.send({ workflowIds: ['w1'] });
				expect(second.status, JSON.stringify(second.body)).toBe(200);
				expect(promote).toHaveBeenLastCalledWith(
					project.id,
					expect.anything(),
					// No commitMessage key when the client omits it; the service applies the default.
					expect.objectContaining({ canExportVariableValues: false }),
				);
			} finally {
				promote.mockRestore();
			}
		});

		it('reaches the service and reports the missing instance environment with 404', async () => {
			const project = await createTeamProject('Team project', owner);
			const response = await testServer
				.publicApiAgentFor(owner)
				.post(`/promotions/projects/${project.id}/promote`)
				.send({ workflowIds: ['w1'] });
			expect(response.status).toBe(404);
		});
	});

	describe('selective apply', () => {
		const selectionBody = {
			workflowIds: ['w1', 'w2'],
			expectedSource: { environmentId: 'env1', branchName: 'main', commitSha: 'a'.repeat(40) },
		};

		it.each(['apply', 'apply/continue'])('%s requires the apply API-key scope', async (route) => {
			const restrictedOwner = await createOwnerWithApiKey({ scopes: ['variable:list'] });
			const response = await testServer
				.publicApiAgentFor(restrictedOwner)
				.post(`/promotions/projects/proj1/${route}`)
				.send(selectionBody);
			expect(response.status).toBe(403);
		});

		it.each(['apply', 'apply/continue'])(
			'%s rejects a user without the apply grant',
			async (route) => {
				// The key carries the apply scope, but a member's role does not grant it.
				const member = await createMemberWithApiKey({ scopes: ['promotions:apply'] });
				const response = await testServer
					.publicApiAgentFor(member)
					.post(`/promotions/projects/proj1/${route}`)
					.send(selectionBody);
				expect(response.status).toBe(403);
			},
		);

		it.each(['apply', 'apply/continue'])(
			'%s requires a licensed and active module',
			async (route) => {
				const agent = testServer.publicApiAgentFor(owner);
				testServer.license.disable('feat:promotions');
				expect(
					(await agent.post(`/promotions/projects/proj1/${route}`).send(selectionBody)).status,
				).toBe(403);
				testServer.license.enable('feat:promotions');
				const active = vi.spyOn(Container.get(ModuleRegistry), 'isActive').mockReturnValue(false);
				try {
					expect(
						(await agent.post(`/promotions/projects/proj1/${route}`).send(selectionBody)).status,
					).toBe(503);
				} finally {
					active.mockRestore();
				}
			},
		);

		it('rejects an empty selection with 400 on both routes', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			expect(
				(await agent.post('/promotions/projects/proj1/apply').send({ workflowIds: [] })).status,
			).toBe(400);
			expect(
				(
					await agent
						.post('/promotions/projects/proj1/apply/continue')
						.send({ workflowIds: [], expectedSource: selectionBody.expectedSource })
				).status,
			).toBe(400);
		});

		it('requires workflowIds and a supported source on Continue', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			for (const body of [
				{ expectedSource: selectionBody.expectedSource }, // no workflowIds
				{ workflowIds: ['w1'] }, // no expectedSource
				{ ...selectionBody, force: true }, // unexpected field
				{
					workflowIds: ['w1'],
					expectedSource: { ...selectionBody.expectedSource, commitSha: 'HEAD' },
				},
			]) {
				const response = await agent.post('/promotions/projects/proj1/apply/continue').send(body);
				expect(response.status, JSON.stringify(response.body)).toBe(400);
			}
		});

		it.each(['blocked', 'applied', 'source-changed'] as const)(
			'returns the %s contract through both selective apply routes with only the apply scope',
			async (status) => {
				const consumers = [
					{
						project: { id: 'project1', name: 'Orders' },
						workflows: [{ id: 'w1', name: 'Process order' }],
					},
				];
				const warnings = [
					{
						kind: 'variable',
						code: 'variable-shadowed',
						name: 'API_URL',
						scope: { kind: 'global' },
						consumers,
					},
				];
				const result = ApplyPackageResultDto.parse({
					status,
					environmentId: selectionBody.expectedSource.environmentId,
					git: { branchName: 'main', commitSha: selectionBody.expectedSource.commitSha },
					check: {
						missingProjects: [],
						missingBindings: [
							{
								kind: 'variable',
								name: 'API_URL',
								variableType: 'string',
								scope: { kind: 'global' },
								sourceValue: '',
								consumers,
							},
						],
						accessRequirements: [],
						conflicts: [],
						warnings,
					},
					warnings,
					counts: {
						projects: { created: 0, updated: 0, skipped: 0, deleted: 0 },
						folders: { created: 0, updated: 0, skipped: 0, moved: 0, renamed: 0, removed: 0 },
						workflows: {
							created: 0,
							updated: 0,
							skipped: 0,
							moved: 0,
							archived: 0,
							deleted: 0,
							publishing: { published: 0, unpublished: 0, unchanged: 0, blocked: 0, failed: 0 },
						},
						credentials: { matched: 0, stubbed: 0, updated: 0 },
						dataTables: { matched: 0, created: 0, updated: 0 },
						variables: { matched: 0, created: 0, updated: 0, stubbed: 0, missing: 0 },
						tags: { matched: 0, created: 0, renamed: 0, reconciled: 0, skipped: 0 },
					},
				});
				const service = Container.get(PromotionsService);
				const initial = vi.spyOn(service, 'applyProjectSelection').mockResolvedValue(result);
				const continuation = vi
					.spyOn(service, 'continueApplyProjectSelection')
					.mockResolvedValue(result);
				try {
					const restrictedOwner = await createOwnerWithApiKey({ scopes: ['promotions:apply'] });
					const agent = testServer.publicApiAgentFor(restrictedOwner);
					for (const route of ['apply', 'apply/continue']) {
						const response = await agent
							.post(`/promotions/projects/proj1/${route}`)
							.send(selectionBody);
						expect(response.status, JSON.stringify(response.body)).toBe(200);
						expect(response.body).toEqual(result);
					}
					expect(initial).toHaveBeenCalledWith(
						'proj1',
						expect.objectContaining({ id: restrictedOwner.id }),
						selectionBody,
					);
					expect(continuation).toHaveBeenCalledWith(
						'proj1',
						expect.objectContaining({ id: restrictedOwner.id }),
						selectionBody,
					);
				} finally {
					initial.mockRestore();
					continuation.mockRestore();
				}
			},
		);
	});

	describe('package operations', () => {
		const continueBody: ContinueApplyPackageDto = {
			expectedSource: { environmentId: 'env1', branchName: 'main', commitSha: 'a'.repeat(40) },
		};
		const unknownId = randomUUID();

		it.each(['apply', 'apply/continue'])('%s requires the apply API-key scope', async (route) => {
			const restrictedOwner = await createOwnerWithApiKey({ scopes: ['variable:list'] });
			const response = await testServer
				.publicApiAgentFor(restrictedOwner)
				.post(`/promotions/environments/${unknownId}/${route}`)
				.send(continueBody);
			expect(response.status).toBe(403);
		});

		it.each(['apply', 'apply/continue'])(
			'%s requires a licensed and active module',
			async (route) => {
				const agent = testServer.publicApiAgentFor(owner);
				testServer.license.disable('feat:promotions');
				expect(
					(await agent.post(`/promotions/environments/${unknownId}/${route}`).send(continueBody))
						.status,
				).toBe(403);
				testServer.license.enable('feat:promotions');
				const active = vi.spyOn(Container.get(ModuleRegistry), 'isActive').mockReturnValue(false);
				try {
					expect(
						(await agent.post(`/promotions/environments/${unknownId}/${route}`).send(continueBody))
							.status,
					).toBe(503);
				} finally {
					active.mockRestore();
				}
			},
		);

		it.each(['apply', 'apply/continue'])(
			'%s rejects a user without the apply grant',
			async (route) => {
				await Container.get(UserRepository).update(owner.id, { role: GLOBAL_MEMBER_ROLE });
				const response = await testServer
					.publicApiAgentFor(owner)
					.post(`/promotions/environments/${unknownId}/${route}`)
					.send(continueBody);
				expect(response.status).toBe(403);
			},
		);

		it('rejects Continue requests with missing or unsupported source fields', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			for (const body of [
				{},
				{ ...continueBody, force: true },
				{ expectedSource: { ...continueBody.expectedSource, commitSha: 'HEAD' } },
				{ expectedSource: { ...continueBody.expectedSource, resolved: true } },
			]) {
				const response = await agent
					.post(`/promotions/environments/${unknownId}/apply/continue`)
					.send(body);
				expect(response.status).toBe(400);
			}
		});

		it('validates the optional Apply source like Continue and applies the tip without one', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			for (const body of [
				{ ...continueBody, force: true },
				{ expectedSource: { ...continueBody.expectedSource, commitSha: 'HEAD' } },
				{ expectedSource: { ...continueBody.expectedSource, resolved: true } },
			]) {
				const response = await agent.post(`/promotions/environments/${unknownId}/apply`).send(body);
				expect(response.status).toBe(400);
			}

			const id = await createEnvironment(agent);
			const initial = vi.spyOn(Container.get(PromotionsService), 'apply').mockResolvedValue({
				status: 'source-changed',
				environmentId: id,
				git: { branchName: 'main', commitSha: continueBody.expectedSource.commitSha },
			});
			try {
				const response = await agent.post(`/promotions/environments/${id}/apply`);
				expect(response.status, JSON.stringify(response.body)).toBe(200);
				expect(initial).toHaveBeenCalledWith(
					id,
					expect.objectContaining({ id: owner.id }),
					undefined,
				);
			} finally {
				initial.mockRestore();
			}
		});

		it.each(['blocked', 'applied', 'source-changed'] as const)(
			'returns the %s contract through both Apply routes with only the pull API-key scope',
			async (status) => {
				const id = await createEnvironment(testServer.publicApiAgentFor(owner));
				const restrictedOwner = await createOwnerWithApiKey({ scopes: ['promotions:apply'] });
				const agent = testServer.publicApiAgentFor(restrictedOwner);
				const consumers = [
					{
						project: { id: 'project1', name: 'Orders' },
						workflows: [{ id: 'workflow1', name: 'Process order' }],
					},
				];
				const warnings = [
					{
						kind: 'variable',
						code: 'variable-shadowed',
						name: 'API_URL',
						scope: { kind: 'global' },
						consumers,
					},
				];
				const result = ApplyPackageResultDto.parse({
					status,
					environmentId: id,
					git: { branchName: 'main', commitSha: continueBody.expectedSource.commitSha },
					check: {
						missingProjects: [],
						missingBindings: [
							{
								kind: 'variable',
								name: 'API_URL',
								variableType: 'string',
								scope: { kind: 'global' },
								sourceValue: '',
								consumers,
							},
						],
						accessRequirements: [],
						conflicts: [],
						warnings,
					},
					warnings,
					counts: {
						projects: { created: 0, updated: 0, skipped: 0, deleted: 0 },
						folders: { created: 0, updated: 0, skipped: 0, moved: 0, renamed: 0, removed: 0 },
						workflows: {
							created: 0,
							updated: 0,
							skipped: 0,
							moved: 0,
							archived: 0,
							deleted: 0,
							publishing: { published: 0, unpublished: 0, unchanged: 0, blocked: 0, failed: 0 },
						},
						credentials: { matched: 0, stubbed: 0, updated: 0 },
						dataTables: { matched: 0, created: 0, updated: 0 },
						variables: { matched: 0, created: 0, updated: 0, stubbed: 0, missing: 0 },
						tags: { matched: 0, created: 0, renamed: 0, reconciled: 0, skipped: 0 },
					},
				});
				const service = Container.get(PromotionsService);
				const initial = vi.spyOn(service, 'apply').mockResolvedValue(result);
				const continuation = vi.spyOn(service, 'continueApply').mockResolvedValue(result);
				try {
					for (const route of ['apply', 'apply/continue']) {
						const response = await agent
							.post(`/promotions/environments/${id}/${route}`)
							.send(continueBody);
						expect(response.status, JSON.stringify(response.body)).toBe(200);
						expect(response.body).toEqual(result);
					}
					expect(initial).toHaveBeenCalledWith(
						id,
						expect.objectContaining({ id: restrictedOwner.id }),
						continueBody.expectedSource,
					);
					expect(continuation).toHaveBeenCalledWith(
						id,
						expect.objectContaining({ id: restrictedOwner.id }),
						continueBody,
					);
				} finally {
					initial.mockRestore();
					continuation.mockRestore();
				}
			},
		);

		it('explains that Promote needs a clone first', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createEnvironment(agent, promoteEnvironment);

			const response = await agent
				.post(`/promotions/environments/${id}/promote`)
				.send({ commitMessage: 'sync projects' });
			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not connected');
		});

		it('explains that Apply needs a clone first', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const id = await createEnvironment(agent);

			const response = await agent.post(`/promotions/environments/${id}/apply`);
			const continued = await agent
				.post(`/promotions/environments/${id}/apply/continue`)
				.send(continueBody);
			expect(continued.status).toBe(400);
			expect(continued.body.message).toContain('not connected');
			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not connected');
		});

		it('rejects Promote on an apply environment and Apply on a promote environment', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const applyId = await createEnvironment(agent);
			const promoteId = await createEnvironment(agent, promoteEnvironment);

			const promote = await agent
				.post(`/promotions/environments/${applyId}/promote`)
				.send({ commitMessage: 'm' });
			const apply = await agent.post(`/promotions/environments/${promoteId}/apply`);
			const continued = await agent
				.post(`/promotions/environments/${promoteId}/apply/continue`)
				.send(continueBody);

			expect(promote.status).toBe(400);
			expect(promote.body.message).toBe('The promotion environment is for apply, not promote');
			expect(apply.status).toBe(400);
			expect(apply.body.message).toBe('The promotion environment is for promote, not apply');
			expect(continued.status).toBe(400);
			expect(continued.body.message).toBe('The promotion environment is for promote, not apply');
		});

		it('refuses Promote and Apply on a project environment', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const providerId = await createProvider(agent);
			const applyId = await createEnvironment(agent, { scope: 'projects', providerId });
			const promoteId = await createEnvironment(agent, {
				...promoteEnvironment,
				scope: 'projects',
				providerId,
			});

			const promote = await agent
				.post(`/promotions/environments/${promoteId}/promote`)
				.send({ commitMessage: 'm' });
			const apply = await agent.post(`/promotions/environments/${applyId}/apply`);

			expect(promote.status).toBe(400);
			expect(promote.body.message).toContain('instance environment');
			expect(apply.status).toBe(400);
			expect(apply.body.message).toContain('instance environment');
			const continued = await agent
				.post(`/promotions/environments/${applyId}/apply/continue`)
				.send(continueBody);
			expect(continued.status).toBe(400);
			expect(continued.body.message).toContain('instance environment');
		});
	});
});
