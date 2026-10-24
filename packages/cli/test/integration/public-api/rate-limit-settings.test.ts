import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig, PublicApiRateLimitConfig } from '@n8n/config';
import { SettingsRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import {
	PUBLIC_API_RATE_LIMIT_SETTINGS_KEY,
	PublicApiRateLimitSettingsService,
} from '@/public-api/public-api-rate-limit-settings.service';
import {
	createAdminWithApiKey,
	createMemberWithApiKey,
	createOwnerWithApiKey,
} from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const initialSettings = {
	...new PublicApiRateLimitConfig(),
	enabled: true,
	globalReadLimit: 3,
	endpointReadLimit: 2,
	globalWriteLimit: 2,
	endpointWriteLimit: 1,
};
const updatedSettings = {
	...initialSettings,
	globalReadLimit: 100,
	globalReadWindowSeconds: 120,
	globalWriteLimit: 50,
	globalWriteWindowSeconds: 120,
	endpointReadLimit: 80,
	endpointReadWindowSeconds: 30,
	endpointWriteLimit: 40,
	endpointWriteWindowSeconds: 30,
};
const endpoint = '/settings/rate-limits';
const config = Container.get(GlobalConfig).publicApi.rateLimit;
Object.assign(config, initialSettings);

describe('Public API rate-limit settings', () => {
	const testServer = setupTestServer({
		endpointGroups: ['publicApi', 'public-api-rate-limit-settings'],
	});
	let owner: User;
	let settingsService: PublicApiRateLimitSettingsService;
	let settingsRepository: SettingsRepository;
	const readStoredSettings = async () =>
		await settingsRepository.findByKey(PUBLIC_API_RATE_LIMIT_SETTINGS_KEY);

	beforeAll(() => {
		settingsService = Container.get(PublicApiRateLimitSettingsService);
		settingsRepository = Container.get(SettingsRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'Settings']);
		await settingsService.load();
		owner = await createOwnerWithApiKey({ scopes: ['publicApiRateLimit:manage'] });
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
		Object.assign(config, initialSettings);
	});

	it('returns the configured settings and the locked fields', async () => {
		const response = await testServer.publicApiAgentFor(owner).get(endpoint).expect(200);

		expect(response.body).toEqual({ ...initialSettings, envManagedFields: [] });
	});

	it('stores every writable value and returns the saved settings on both API surfaces', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const response = await agent.put(endpoint).send(updatedSettings).expect(200);

		expect(response.body).toEqual({ ...updatedSettings, envManagedFields: [] });
		expect(JSON.parse((await readStoredSettings())!.value)).toEqual(updatedSettings);
		expect((await agent.get(endpoint).expect(200)).body).toEqual(response.body);
		const internal = await testServer
			.authAgentFor(owner)
			.get('/settings/policies/rate-limits')
			.expect(200);
		expect(internal.body.data).toMatchObject(updatedSettings);

		expect(settingsService.settings).toEqual(initialSettings);
		await settingsService.load();
		expect(settingsService.settings).toEqual(updatedSettings);
	});

	it('reads settings saved through the internal API', async () => {
		await testServer
			.authAgentFor(owner)
			.put('/settings/policies/rate-limits')
			.send(updatedSettings)
			.expect(200);

		const response = await testServer.publicApiAgentFor(owner).get(endpoint).expect(200);
		expect(response.body).toEqual({ ...updatedSettings, envManagedFields: [] });
	});

	it('accepts a GET response as a PUT body without storing the read-only fields', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const response = await agent.get(endpoint).expect(200);

		const updated = await agent.put(endpoint).send(response.body).expect(200);

		expect(updated.body).toEqual(response.body);
		expect(JSON.parse((await readStoredSettings())!.value)).toEqual(initialSettings);
	});

	it('can turn off rate limiting with all limits set to 0', async () => {
		const settings = {
			...updatedSettings,
			enabled: false,
			globalReadLimit: 0,
			globalWriteLimit: 0,
			endpointReadLimit: 0,
			endpointWriteLimit: 0,
		};

		const response = await testServer
			.publicApiAgentFor(owner)
			.put(endpoint)
			.send(settings)
			.expect(200);

		expect(response.body).toEqual({ ...settings, envManagedFields: [] });
	});

	it.each([
		['a partial object', { enabled: true }],
		['an unknown field', { ...updatedSettings, unexpected: true }],
		['a negative limit', { ...updatedSettings, globalReadLimit: -1 }],
		['a fractional limit', { ...updatedSettings, endpointWriteLimit: 1.5 }],
		['a zero window', { ...updatedSettings, globalWriteWindowSeconds: 0 }],
		['a negative window', { ...updatedSettings, endpointReadWindowSeconds: -1 }],
		['a fractional window', { ...updatedSettings, endpointWriteWindowSeconds: 1.5 }],
		[
			'no active limits while enabled',
			{
				...updatedSettings,
				globalReadLimit: 0,
				globalWriteLimit: 0,
				endpointReadLimit: 0,
				endpointWriteLimit: 0,
			},
		],
	])('rejects %s with 400 without saving', async (_description, body) => {
		await testServer.publicApiAgentFor(owner).put(endpoint).send(body).expect(400);

		expect(await readStoredSettings()).toBeNull();
	});

	it.each(['get', 'put'] as const)('rejects unknown query parameters on %s', async (method) => {
		await testServer
			.publicApiAgentFor(owner)
			[method](endpoint)
			.query({ unexpected: 'value' })
			.send(method === 'put' ? updatedSettings : undefined)
			.expect(400);

		expect(await readStoredSettings()).toBeNull();
	});

	it.each(['get', 'put'] as const)('requires an API key on %s', async (method) => {
		await testServer
			.publicApiAgentWithoutApiKey()
			[method](endpoint)
			.send(method === 'put' ? updatedSettings : undefined)
			.expect(401);
	});

	it.each(['get', 'put'] as const)('requires the API key scope on %s', async (method) => {
		const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

		await testServer
			.publicApiAgentFor(scopedOwner)
			[method](endpoint)
			.send(method === 'put' ? updatedSettings : undefined)
			.expect(403);

		expect(await readStoredSettings()).toBeNull();
	});

	it.each(['get', 'put'] as const)('denies members with a scoped key on %s', async (method) => {
		const member = await createMemberWithApiKey({ scopes: ['publicApiRateLimit:manage'] });

		await testServer
			.publicApiAgentFor(member)
			[method](endpoint)
			.send(method === 'put' ? updatedSettings : undefined)
			.expect(403);

		expect(await readStoredSettings()).toBeNull();
	});

	it('allows admins to read and update the settings', async () => {
		const admin = await createAdminWithApiKey();
		const agent = testServer.publicApiAgentFor(admin);

		await agent.get(endpoint).expect(200);
		await agent.put(endpoint).send(updatedSettings).expect(200);
	});

	describe('environment-controlled fields', () => {
		it.each([
			['enabled', 'ENABLED', false],
			['globalReadLimit', 'GLOBAL_READ_LIMIT', 10],
			['globalReadWindowSeconds', 'GLOBAL_READ_WINDOW_SECONDS', 10],
			['globalWriteLimit', 'GLOBAL_WRITE_LIMIT', 10],
			['globalWriteWindowSeconds', 'GLOBAL_WRITE_WINDOW_SECONDS', 10],
			['endpointReadLimit', 'ENDPOINT_READ_LIMIT', 10],
			['endpointReadWindowSeconds', 'ENDPOINT_READ_WINDOW_SECONDS', 10],
			['endpointWriteLimit', 'ENDPOINT_WRITE_LIMIT', 10],
			['endpointWriteWindowSeconds', 'ENDPOINT_WRITE_WINDOW_SECONDS', 10],
		] as const)(
			'returns 409 when %s changes and saves nothing',
			async (field, envSuffix, value) => {
				vi.stubEnv(`N8N_PUBLIC_API_RATE_LIMIT_${envSuffix}`, String(config[field]));
				const agent = testServer.publicApiAgentFor(owner);
				const current = await agent.get(endpoint).expect(200);
				expect(current.body.envManagedFields).toEqual([field]);

				const response = await agent
					.put(endpoint)
					.send({ ...updatedSettings, [field]: value })
					.expect(409);

				expect(response.body.message).toContain(field);
				expect(response.body.message).toContain('environment variables');
				expect(await readStoredSettings()).toBeNull();
			},
		);

		it('returns the effective environment value and accepts it unchanged on PUT', async () => {
			await settingsRepository.upsertByKey(
				PUBLIC_API_RATE_LIMIT_SETTINGS_KEY,
				JSON.stringify(updatedSettings),
				false,
				{},
			);
			vi.stubEnv('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT', '25');
			config.globalReadLimit = 25;
			const agent = testServer.publicApiAgentFor(owner);
			const current = await agent.get(endpoint).expect(200);
			expect(current.body.globalReadLimit).toBe(25);
			expect(current.body.envManagedFields).toEqual(['globalReadLimit']);

			const response = await agent.put(endpoint).send(current.body).expect(200);

			expect(response.body).toEqual(current.body);
			expect(JSON.parse((await readStoredSettings())!.value)).toEqual({
				...updatedSettings,
				globalReadLimit: 25,
			});
		});

		it('marks _FILE settings as locked and rejects changes', async () => {
			vi.stubEnv('N8N_PUBLIC_API_RATE_LIMIT_ENDPOINT_WRITE_LIMIT_FILE', '/run/secrets/write-limit');
			const agent = testServer.publicApiAgentFor(owner);
			const current = await agent.get(endpoint).expect(200);
			expect(current.body.envManagedFields).toEqual(['endpointWriteLimit']);

			await agent.put(endpoint).send(updatedSettings).expect(409);
			expect(await readStoredSettings()).toBeNull();
		});
	});

	describe('rate limits and recovery', () => {
		it('counts settings reads against the endpoint read limit', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			await agent.get(endpoint).expect(200);
			await agent.get(endpoint).expect(200);
			const response = await agent.get(endpoint).expect(429);

			expect(response.headers['x-ratelimit-limit']).toBe('2');
			expect(response.headers['retry-after']).toBeDefined();
		});

		it('counts settings reads against the global read limit', async () => {
			const fullScopeOwner = await createOwnerWithApiKey();
			const agent = testServer.publicApiAgentFor(fullScopeOwner);
			await agent.get('/tags').expect(200);
			await agent.get('/tags').expect(200);
			await agent.get(endpoint).expect(200);
			const response = await agent.get(endpoint).expect(429);

			expect(response.headers['x-ratelimit-limit']).toBe('3');
		});

		it('limits settings writes and allows session recovery', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			await agent.put(endpoint).send(updatedSettings).expect(200);
			const response = await agent
				.put(endpoint)
				.send({ ...updatedSettings, enabled: false })
				.expect(429);
			expect(response.headers['x-ratelimit-limit']).toBe('1');

			const sessionAgent = testServer.publicApiAgentWithCookie(owner);
			await sessionAgent.get(endpoint).expect(200);
			await sessionAgent
				.put(endpoint)
				.send({ ...updatedSettings, enabled: false })
				.expect(200);
			await sessionAgent.put(endpoint).send(updatedSettings).expect(200);
		});

		it('allows session reads after the API key read limit is reached', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			await agent.get(endpoint).expect(200);
			await agent.get(endpoint).expect(200);
			await agent.get(endpoint).expect(429);

			await testServer.publicApiAgentWithCookie(owner).get(endpoint).expect(200);
		});
	});
});
