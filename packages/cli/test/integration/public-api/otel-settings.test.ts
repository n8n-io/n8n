import { testDb } from '@n8n/backend-test-utils';
import { SettingsRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';
import { vi } from 'vitest';

import { OtelSettingsService, OTEL_SETTINGS_KEY } from '@/modules/otel/otel-settings.service';
import { OtelConfig } from '@/modules/otel/otel.config';
import { OTEL_ENV_VARS } from '@/modules/otel/otel.constants';
import { OtelService } from '@/modules/otel/otel.service';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const validSettings = {
	enabled: false,
	exporterProtocol: 'http/protobuf',
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
	exporterProtocol: 'http/protobuf',
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
				exporterProtocol: 'http/protobuf',
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
					'exporterProtocol',
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
			expect(response.body).toMatchObject({
				...validSettings,
				exporterHeaders: `authorization=${CREDENTIAL_BLANKING_VALUE}`,
			});
		});

		it('takes effect the same way as the UI (write via public API, read via internal API)', async () => {
			await testServer.publicApiAgentFor(owner).put('/settings/otel').send(validSettings);

			// internal REST responses are wrapped in `{ data }`; the UI client unwraps it.
			const internal = await testServer.authAgentFor(owner).get('/otel/settings');

			expect(internal.status).toBe(200);
			expect(internal.body.data).toMatchObject({
				...validSettings,
				exporterHeaders: `authorization=${CREDENTIAL_BLANKING_VALUE}`,
			});
		});

		it('reads back a configuration written through the internal API (public API is a faithful stand-in)', async () => {
			await testServer.authAgentFor(owner).put('/otel/settings').send(validSettings);

			const publicRead = await testServer.publicApiAgentFor(owner).get('/settings/otel');

			expect(publicRead.status).toBe(200);
			expect(publicRead.body).toMatchObject({
				...validSettings,
				exporterHeaders: `authorization=${CREDENTIAL_BLANKING_VALUE}`,
			});
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
			expect(putResponse.body.exporterHeaders).toBe(`authorization=${CREDENTIAL_BLANKING_VALUE}`);
		});

		it('switches the exporter protocol to gRPC and back', async () => {
			const grpc = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({
					...validSettings,
					exporterProtocol: 'grpc',
					exporterEndpoint: 'http://collector.example.com:4317',
				});
			expect(grpc.status).toBe(200);
			expect(grpc.body.exporterProtocol).toBe('grpc');
			expect(grpc.body.exporterTracingPath).toBe(validSettings.exporterTracingPath);

			const http = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send(validSettings);
			expect(http.status).toBe(200);
			expect(http.body.exporterProtocol).toBe('http/protobuf');
		});

		it('resets an omitted exporterProtocol to the default (PUT is a full replacement)', async () => {
			const grpc = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({
					...validSettings,
					exporterProtocol: 'grpc',
					exporterEndpoint: 'http://collector.example.com:4317',
				});
			expect(grpc.body.exporterProtocol).toBe('grpc');

			const { exporterProtocol: _omitted, ...bodyWithoutProtocol } = validSettings;
			const replaced = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send(bodyWithoutProtocol);

			expect(replaced.status).toBe(200);
			expect(replaced.body.exporterProtocol).toBe('http/protobuf');
		});

		it('rejects an unsupported exporter protocol with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send({ ...validSettings, exporterProtocol: 'http/json' });

			expect(response.status).toBe(400);
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

	describe('GET with env-managed exporterHeaders', () => {
		const ENV_HEADERS = 'authorization=Bearer env-managed-token';
		let originalHeaders: string;

		beforeEach(async () => {
			process.env[OTEL_ENV_VARS.exporterHeaders] = ENV_HEADERS;
			originalHeaders = Container.get(OtelConfig).exporterHeaders;
			Container.get(OtelConfig).exporterHeaders = ENV_HEADERS;
			await Container.get(OtelSettingsService).loadSettings();
		});

		afterEach(async () => {
			delete process.env[OTEL_ENV_VARS.exporterHeaders];
			Container.get(OtelConfig).exporterHeaders = originalHeaders;
			await Container.get(OtelSettingsService).loadSettings();
		});

		it('internal API returns the blanking placeholder for exporterHeaders', async () => {
			const response = await testServer.authAgentFor(owner).get('/otel/settings');

			expect(response.status).toBe(200);
			expect(response.body.data.exporterHeaders).toBe(`authorization=${CREDENTIAL_BLANKING_VALUE}`);
			expect(response.body.data.envManagedFields).toContain('exporterHeaders');
		});

		it('public API returns the blanking placeholder for exporterHeaders', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/otel');

			expect(response.status).toBe(200);
			expect(response.body.exporterHeaders).toBe(`authorization=${CREDENTIAL_BLANKING_VALUE}`);
		});

		it('accepts a GET response body echoed straight back (clean round-trip)', async () => {
			const getResponse = await testServer.publicApiAgentFor(owner).get('/settings/otel');
			expect(getResponse.status).toBe(200);

			const putResponse = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send(getResponse.body);

			expect(putResponse.status).toBe(200);
			expect(putResponse.body.exporterHeaders).toBe(`authorization=${CREDENTIAL_BLANKING_VALUE}`);
		});
	});

	describe('GET with headers supplied via the _FILE env variant', () => {
		let originalHeaders: string;

		beforeEach(async () => {
			// Simulate `N8N_OTEL_EXPORTER_OTLP_HEADERS_FILE` being set: mark it
			// env-managed and pin the file-supplied value on the (singleton) config.
			process.env[`${OTEL_ENV_VARS.exporterHeaders}_FILE`] = '/run/secrets/otel-headers';
			originalHeaders = Container.get(OtelConfig).exporterHeaders;
			Container.get(OtelConfig).exporterHeaders = 'authorization=Bearer file-managed-token';
			await Container.get(OtelSettingsService).loadSettings();
		});

		afterEach(async () => {
			delete process.env[`${OTEL_ENV_VARS.exporterHeaders}_FILE`];
			Container.get(OtelConfig).exporterHeaders = originalHeaders;
			await Container.get(OtelSettingsService).loadSettings();
		});

		it('internal API returns the blanking placeholder for exporterHeaders', async () => {
			const response = await testServer.authAgentFor(owner).get('/otel/settings');

			expect(response.status).toBe(200);
			expect(response.body.data.exporterHeaders).toBe(`authorization=${CREDENTIAL_BLANKING_VALUE}`);
			expect(response.body.data.envManagedFields).toContain('exporterHeaders');
		});
	});

	describe('PUT /settings/otel with an env-managed exporter protocol', () => {
		let originalProtocol: OtelConfig['exporterProtocol'];

		beforeEach(async () => {
			process.env[OTEL_ENV_VARS.exporterProtocol] = 'grpc';
			originalProtocol = Container.get(OtelConfig).exporterProtocol;
			Container.get(OtelConfig).exporterProtocol = 'grpc';
			await Container.get(OtelSettingsService).loadSettings();
		});

		afterEach(async () => {
			delete process.env[OTEL_ENV_VARS.exporterProtocol];
			Container.get(OtelConfig).exporterProtocol = originalProtocol;
			await Container.get(OtelSettingsService).loadSettings();
		});

		it('rejects a body that omits the env-managed protocol with 409', async () => {
			const { exporterProtocol: _omitted, ...bodyWithoutProtocol } = validSettings;

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/otel')
				.send(bodyWithoutProtocol);

			expect(response.status).toBe(409);
			expect(response.body.message).toContain('exporterProtocol');
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

		it('accepts a connection body written before exporterProtocol existed', async () => {
			const sendTestTrace = vi
				.spyOn(Container.get(OtelService), 'sendTestTrace')
				.mockResolvedValue({ success: true });
			const { exporterProtocol: _omitted, ...connectionWithoutProtocol } = testConnection;

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/otel/test-trace')
				.send(connectionWithoutProtocol);

			expect(response.status).toBe(200);
			expect(sendTestTrace).toHaveBeenCalledWith(
				expect.objectContaining({ exporterProtocol: 'http/protobuf' }),
			);
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
