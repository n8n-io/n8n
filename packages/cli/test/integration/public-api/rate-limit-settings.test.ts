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

describe('Public API rate-limit settings', () => {
	const testServer = setupTestServer({
		endpointGroups: ['publicApi', 'public-api-rate-limit-settings'],
	});
	let owner: User;
	let config: GlobalConfig['publicApi']['rateLimit'];
	let settingsService: PublicApiRateLimitSettingsService;
	let settingsRepository: SettingsRepository;

	const readStoredSettings = async () => {
		const row = await settingsRepository.findByKey(PUBLIC_API_RATE_LIMIT_SETTINGS_KEY);
		return row ? JSON.parse(row.value) : null;
	};

	beforeAll(() => {
		config = Container.get(GlobalConfig).publicApi.rateLimit;
		Object.assign(config, initialSettings);
		settingsService = Container.get(PublicApiRateLimitSettingsService);
		settingsRepository = Container.get(SettingsRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'Settings']);
		await settingsService.load();
		owner = await createOwnerWithApiKey({ scopes: ['securitySettings:manage'] });
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
		Object.assign(config, initialSettings);
	});

	describe('authorization', () => {
		const endpoints: Array<{
			name: string;
			method: 'get' | 'put';
			body?: Record<string, unknown>;
		}> = [
			{ name: 'GET', method: 'get' },
			{ name: 'PUT', method: 'put', body: updatedSettings },
		];

		it.each(endpoints)('$name returns 401 without an API key', async ({ method, body }) => {
			await testServer.publicApiAgentWithoutApiKey()[method](endpoint).send(body).expect(401);
		});

		it.each(endpoints)(
			'$name returns 403 without the securitySettings:manage scope',
			async ({ method, body }) => {
				const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

				await testServer.publicApiAgentFor(scopedOwner)[method](endpoint).send(body).expect(403);

				expect(await readStoredSettings()).toBeNull();
			},
		);

		it.each(endpoints)('$name returns 403 for a member', async ({ method, body }) => {
			const member = await createMemberWithApiKey({ scopes: ['securitySettings:manage'] });

			await testServer.publicApiAgentFor(member)[method](endpoint).send(body).expect(403);

			expect(await readStoredSettings()).toBeNull();
		});

		it.each(endpoints)('$name allows an admin', async ({ method, body }) => {
			const admin = await createAdminWithApiKey();

			await testServer.publicApiAgentFor(admin)[method](endpoint).send(body).expect(200);
		});

		it.each(endpoints)(
			'$name returns 400 for an unknown query parameter',
			async ({ method, body }) => {
				await testServer
					.publicApiAgentFor(owner)
					[method](endpoint)
					.query({ unexpected: 'value' })
					.send(body)
					.expect(400);

				expect(await readStoredSettings()).toBeNull();
			},
		);
	});

	describe('GET /settings/rate-limits', () => {
		it('returns the configured settings and the locked fields', async () => {
			const response = await testServer.publicApiAgentFor(owner).get(endpoint).expect(200);

			expect(response.body).toEqual({ ...initialSettings, envManagedFields: [] });
		});

		it('returns the effective environment value', async () => {
			vi.stubEnv('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT', '25');
			config.globalReadLimit = 25;

			const response = await testServer.publicApiAgentFor(owner).get(endpoint).expect(200);

			expect(response.body.globalReadLimit).toBe(25);
			expect(response.body.envManagedFields).toEqual(['globalReadLimit']);
		});
	});

	describe('PUT /settings/rate-limits', () => {
		it('stores every writable value and returns the saved settings', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const response = await agent.put(endpoint).send(updatedSettings).expect(200);

			expect(response.body).toEqual({ ...updatedSettings, envManagedFields: [] });
			expect(await readStoredSettings()).toEqual(updatedSettings);
			expect((await agent.get(endpoint).expect(200)).body).toEqual(response.body);
		});

		it('accepts a GET response as a PUT body without storing the read-only fields', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const response = await agent.get(endpoint).expect(200);

			const updated = await agent.put(endpoint).send(response.body).expect(200);

			expect(updated.body).toEqual(response.body);
			expect(await readStoredSettings()).toEqual(initialSettings);
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

		it('rejects enabled rate limiting with all limits set to 0', async () => {
			await testServer
				.publicApiAgentFor(owner)
				.put(endpoint)
				.send({
					...updatedSettings,
					globalReadLimit: 0,
					globalWriteLimit: 0,
					endpointReadLimit: 0,
					endpointWriteLimit: 0,
				})
				.expect(400);

			expect(await readStoredSettings()).toBeNull();
		});

		it.each([
			['a partial object', { enabled: true }],
			['an unknown field', { ...updatedSettings, unexpected: true }],
		])('rejects %s with 400 without saving', async (_description, body) => {
			await testServer.publicApiAgentFor(owner).put(endpoint).send(body).expect(400);

			expect(await readStoredSettings()).toBeNull();
		});

		it.each([
			['enabled', 'ENABLED', false],
			['globalReadLimit', 'GLOBAL_READ_LIMIT', 10],
		] as const)(
			'returns 409 when the env-managed %s changes and saves nothing',
			async (field, envSuffix, value) => {
				vi.stubEnv(`N8N_PUBLIC_API_RATE_LIMIT_${envSuffix}`, String(config[field]));

				const response = await testServer
					.publicApiAgentFor(owner)
					.put(endpoint)
					.send({ ...updatedSettings, [field]: value })
					.expect(409);

				expect(response.body.message).toContain(field);
				expect(response.body.message).toContain('environment variables');
				expect(await readStoredSettings()).toBeNull();
			},
		);

		it('accepts an env-managed field sent with its current value', async () => {
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

			const response = await agent.put(endpoint).send(current.body).expect(200);

			expect(response.body).toEqual(current.body);
			expect(await readStoredSettings()).toEqual({ ...updatedSettings, globalReadLimit: 25 });
		});
	});
});
