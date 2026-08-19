import { testDb } from '@n8n/backend-test-utils';
import { SettingsRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { vi } from 'vitest';

import { OtelSettingsService, OTEL_SETTINGS_KEY } from '@/modules/otel/otel-settings.service';
import { OtelConfig } from '@/modules/otel/otel.config';
import { OTEL_ENV_VARS } from '@/modules/otel/otel.constants';
import { OtelService } from '@/modules/otel/otel.service';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const validSettings = {
	enabled: false,
	exporterEndpoint: 'http://collector.example.com:4318',
	exporterTracingPath: '/v1/traces',
	exporterServiceName: 'n8n-prod',
	exporterHeaders: 'authorization=Bearer my-token',
	tracesSampleRate: 0.5,
	startupConnectivityTimeoutMs: 3_000,
	includeNodeSpans: false,
	injectOutbound: false,
	productionExecutionsOnly: false,
};

const testConnection = {
	exporterEndpoint: 'http://collector.example.com:4318',
	exporterTracingPath: '/v1/traces',
	exporterServiceName: 'n8n-prod',
	exporterHeaders: 'authorization=Bearer my-token',
	startupConnectivityTimeoutMs: 3_000,
};

describe('OpenTelemetry settings in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({
		endpointGroups: ['publicApi', 'otel'],
	});

	// Reset both the persisted and in-memory OTel settings to defaults between tests.
	const resetOtelSettings = async () => {
		await Container.get(SettingsRepository).delete({ key: OTEL_SETTINGS_KEY });
		await Container.get(OtelSettingsService).loadSettings();
	};

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
		await resetOtelSettings();
		owner = await createOwnerWithApiKey();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /settings/otel', () => {
		it('returns the current OTel settings', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/otel');

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				enabled: false,
				exporterServiceName: 'n8n',
				exporterTracingPath: '/v1/traces',
			});
			expect(typeof response.body.exporterEndpoint).toBe('string');
		});

		it('exposes exactly the fields the UI configures, and nothing more', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/otel');

			expect(response.status).toBe(200);
			expect(Object.keys(response.body).sort()).toEqual(
				[
					'enabled',
					'exporterEndpoint',
					'exporterTracingPath',
					'exporterServiceName',
					'exporterHeaders',
					'tracesSampleRate',
					'startupConnectivityTimeoutMs',
					'includeNodeSpans',
					'injectOutbound',
					'productionExecutionsOnly',
				].sort(),
			);
			// Internal-only bookkeeping must never leak through the public API.
			expect(response.body).not.toHaveProperty('envManagedFields');
		});

		it('rejects with 401 without a valid API key', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().get('/settings/otel');

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the API key lacks the otel:manage scope', async () => {
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/settings/otel');

			expect(response.status).toBe(403);
		});
	});

	describe('PUT /settings/otel', () => {
		it('sets the configuration and returns the updated values', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send(validSettings);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject(validSettings);
		});

		it('takes effect the same way as the UI (write via public API, read via internal API)', async () => {
			await testServer.publicApiAgentFor(owner).put('/settings/otel').send(validSettings);

			// internal REST responses are wrapped in `{ data }`; the UI client unwraps it.
			const internal = await testServer.authAgentFor(owner).get('/otel/settings');

			expect(internal.status).toBe(200);
			expect(internal.body.data).toMatchObject(validSettings);
		});

		it('reads back a configuration written through the internal API (public API is a faithful stand-in)', async () => {
			await testServer.authAgentFor(owner).put('/otel/settings').send(validSettings);

			const publicRead = await testServer.publicApiAgentFor(owner).get('/settings/otel');

			expect(publicRead.status).toBe(200);
			expect(publicRead.body).toMatchObject(validSettings);
		});

		it('toggles enabled both ways', async () => {
			const enabled = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ ...validSettings, enabled: true });
			expect(enabled.status).toBe(200);
			expect(enabled.body.enabled).toBe(true);

			const disabled = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ ...validSettings, enabled: false });
			expect(disabled.status).toBe(200);
			expect(disabled.body.enabled).toBe(false);
		});

		it('accepts a GET response body as a PUT body (clean round-trip)', async () => {
			await testServer.publicApiAgentFor(owner).put('/settings/otel').send(validSettings);

			const getResponse = await testServer.publicApiAgentFor(owner).get('/settings/otel');
			expect(getResponse.status).toBe(200);

			const putResponse = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ ...getResponse.body, exporterServiceName: 'n8n-updated' });

			expect(putResponse.status).toBe(200);
			expect(putResponse.body.exporterServiceName).toBe('n8n-updated');
			expect(putResponse.body.exporterHeaders).toBe(validSettings.exporterHeaders);
		});

		it('rejects a partial body with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ enabled: true });

			expect(response.status).toBe(400);
		});

		it('rejects a body missing a single field with 400', async () => {
			const { exporterServiceName: _omitted, ...partial } = validSettings;

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send(partial);

			expect(response.status).toBe(400);
		});

		it('rejects a well-formed body with invalid values with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ ...validSettings, exporterEndpoint: 'not-a-url' });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message');
		});

		it('rejects with 401 without a valid API key', async () => {
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.put('/settings/otel')
				.send(validSettings);

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the API key lacks the otel:manage scope', async () => {
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.put('/settings/otel')
				.send(validSettings);

			expect(response.status).toBe(403);
		});
	});

	describe('PUT /settings/otel with an env-managed field', () => {
		const ENV_SERVICE_NAME = 'env-managed-service';
		let originalServiceName: string;

		beforeEach(async () => {
			// Simulate `N8N_OTEL_EXPORTER_SERVICE_NAME` being set: mark it env-managed and
			// pin its enforced value on the (singleton) config read at boot.
			process.env[OTEL_ENV_VARS.exporterServiceName] = ENV_SERVICE_NAME;
			originalServiceName = Container.get(OtelConfig).exporterServiceName;
			Container.get(OtelConfig).exporterServiceName = ENV_SERVICE_NAME;
			await Container.get(OtelSettingsService).loadSettings();
		});

		afterEach(async () => {
			delete process.env[OTEL_ENV_VARS.exporterServiceName];
			Container.get(OtelConfig).exporterServiceName = originalServiceName;
			await Container.get(OtelSettingsService).loadSettings();
		});

		it('rejects changing the env-managed field with 409 naming the field', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ ...validSettings, exporterServiceName: 'a-different-name' });

			expect(response.status).toBe(409);
			expect(response.body.message).toContain('exporterServiceName');
		});

		it('does not persist any change when the write is rejected with 409', async () => {
			await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ ...validSettings, exporterServiceName: 'a-different-name', tracesSampleRate: 0.1 });

			const read = await testServer.publicApiAgentFor(owner).get('/settings/otel');
			// The non-env field from the rejected body must not have leaked through.
			expect(read.body.tracesSampleRate).not.toBe(0.1);
		});

		it('accepts a write that re-submits the enforced value and changes a non-env field', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ ...validSettings, exporterServiceName: ENV_SERVICE_NAME, tracesSampleRate: 0.25 });

			expect(response.status).toBe(200);
			expect(response.body.tracesSampleRate).toBe(0.25);
			expect(response.body.exporterServiceName).toBe(ENV_SERVICE_NAME);
		});

		it('accepts a GET response body echoed straight back (clean round-trip)', async () => {
			const getResponse = await testServer.publicApiAgentFor(owner).get('/settings/otel');
			expect(getResponse.body.exporterServiceName).toBe(ENV_SERVICE_NAME);

			const putResponse = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send(getResponse.body);

			expect(putResponse.status).toBe(200);
		});
	});

	describe('POST /settings/otel/test-trace', () => {
		it('reports a successful connection', async () => {
			vi.spyOn(Container.get(OtelService), 'sendTestTrace').mockResolvedValue({ success: true });

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/otel/test-trace')
				.send(testConnection);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ success: true });
		});

		it('reports a failed connection with the collector error', async () => {
			vi.spyOn(Container.get(OtelService), 'sendTestTrace').mockResolvedValue({
				success: false,
				error: '401 Unauthorized',
			});

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/otel/test-trace')
				.send(testConnection);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ success: false, error: '401 Unauthorized' });
		});

		it('rejects a partial body with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/otel/test-trace')
				.send({ exporterEndpoint: 'http://collector.example.com:4318' });

			expect(response.status).toBe(400);
		});

		it('rejects with 401 without a valid API key', async () => {
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/settings/otel/test-trace')
				.send(testConnection);

			expect(response.status).toBe(401);
		});
	});
});
