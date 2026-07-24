import { mockInstance, testDb } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

vi.unmock('@/eventbus/message-event-bus/message-event-bus');

mockInstance(Publisher);

const webhookPayload = {
	type: 'webhook',
	url: 'http://localhost:3456',
	method: 'POST',
	label: 'Test Webhook',
	enabled: false,
	subscribedEvents: ['n8n.test.message'],
	options: {},
};

describe('Log streaming in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:logStreaming'],
		modules: ['log-streaming'],
	});
	const licenseErrorMessage = new FeatureNotLicensedError('feat:logStreaming').message;

	const setManagedByEnv = (value: boolean) => {
		Container.get(InstanceSettingsLoaderConfig).logStreamingManagedByEnv = value;
	};

	const service = () => Container.get(LogStreamingDestinationService);

	const clearDestinations = async () => {
		const destinations = await service().findDestination();
		for (const destination of destinations) {
			if (destination.id) await service().removeDestination(destination.id, false);
		}
	};

	const createDestination = async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/settings/log-streaming/destinations')
			.send(webhookPayload);
		expect(response.status).toBe(200);
		return response.body as { id: string; type: string; label: string };
	};

	beforeAll(async () => {
		await testDb.init();
		await Container.get(MessageEventBus).initialize();
		await service().initialize();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
		await clearDestinations();
		setManagedByEnv(false);
		owner = await createOwnerWithApiKey();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		setManagedByEnv(false);
	});

	// Every endpoint is gated the same way (valid key → licensed → required scope), so the
	// 401 / 403-unlicensed / 403-missing-scope checks are asserted uniformly across all routes.
	describe('authorization', () => {
		const dummyId = '11111111-1111-4111-8111-111111111111';
		// POST/PUT carry a valid body so the request passes body validation and reaches the
		// license/scope middleware (otherwise a bodyless request short-circuits with 415).
		const endpoints: Array<{
			name: string;
			method: 'get' | 'post' | 'put' | 'delete';
			path: string;
			body?: Record<string, unknown>;
		}> = [
			{ name: 'GET event-types', method: 'get', path: '/settings/log-streaming/event-types' },
			{ name: 'GET destinations', method: 'get', path: '/settings/log-streaming/destinations' },
			{
				name: 'GET destination',
				method: 'get',
				path: `/settings/log-streaming/destinations/${dummyId}`,
			},
			{
				name: 'POST destination',
				method: 'post',
				path: '/settings/log-streaming/destinations',
				body: webhookPayload,
			},
			{
				name: 'PUT destination',
				method: 'put',
				path: `/settings/log-streaming/destinations/${dummyId}`,
				body: webhookPayload,
			},
			{
				name: 'POST test',
				method: 'post',
				path: `/settings/log-streaming/destinations/${dummyId}/test`,
			},
			{
				name: 'DELETE destination',
				method: 'delete',
				path: `/settings/log-streaming/destinations/${dummyId}`,
			},
		];

		it.each(endpoints)('$name returns 401 without an API key', async ({ method, path, body }) => {
			const request = testServer.publicApiAgentWithoutApiKey()[method](path);
			const response = await (body ? request.send(body) : request);
			expect(response.status).toBe(401);
		});

		it.each(endpoints)(
			'$name returns 403 without a log streaming scope',
			async ({ method, path, body }) => {
				const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });
				const request = testServer.publicApiAgentFor(scopedOwner)[method](path);
				const response = await (body ? request.send(body) : request);
				expect(response.status).toBe(403);
			},
		);

		it.each(endpoints)('$name returns 403 when unlicensed', async ({ method, path, body }) => {
			testServer.license.disable('feat:logStreaming');
			const request = testServer.publicApiAgentFor(owner)[method](path);
			const response = await (body ? request.send(body) : request);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});
	});

	describe('GET /settings/log-streaming/event-types', () => {
		it('returns the streamable event types', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/log-streaming/event-types');

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBeGreaterThan(0);
		});
	});

	describe('GET /settings/log-streaming/destinations', () => {
		it('returns the configured destinations', async () => {
			const created = await createDestination();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/log-streaming/destinations');

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].id).toBe(created.id);
			expect(response.body.data[0].type).toBe('webhook');
		});
	});

	describe('GET /settings/log-streaming/destinations/{id}', () => {
		it('returns a single destination by id', async () => {
			const created = await createDestination();

			const response = await testServer
				.publicApiAgentFor(owner)
				.get(`/settings/log-streaming/destinations/${created.id}`);

			expect(response.status).toBe(200);
			expect(response.body.id).toBe(created.id);
			expect(response.body.type).toBe('webhook');
		});

		it('returns 404 for an unknown destination id', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/log-streaming/destinations/11111111-1111-4111-8111-111111111111');

			expect(response.status).toBe(404);
		});
	});

	describe('POST /settings/log-streaming/destinations', () => {
		it('creates a destination that takes effect', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations')
				.send(webhookPayload);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('id');
			expect(response.body.type).toBe('webhook');
			expect(response.body).not.toHaveProperty('__type');
			expect(response.body.label).toBe('Test Webhook');

			// the destination is persisted through the service, readable on the next request
			const listResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/log-streaming/destinations');
			expect(listResponse.body.data).toHaveLength(1);
			expect(listResponse.body.data[0].id).toBe(response.body.id);
		});

		it('does not accept a client-supplied id (id is server-generated)', async () => {
			const clientId = '99999999-9999-4999-8999-999999999999';
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations')
				.send({ ...webhookPayload, id: clientId });

			// id is readOnly: eov rejects it in the request body
			expect(response.status).toBe(400);
		});

		it('creates a fully-populated webhook destination', async () => {
			const payload = {
				type: 'webhook',
				label: 'Full webhook',
				enabled: false,
				subscribedEvents: ['n8n.workflow', 'n8n.audit'],
				anonymizeAuditMessages: true,
				circuitBreaker: { maxFailures: 5, failureWindow: 60000 },
				url: 'http://localhost:3456/hook',
				method: 'POST',
				sendHeaders: true,
				specifyHeaders: 'keypair',
				headerParameters: { parameters: [{ name: 'X-Test', value: 'v' }] },
				sendQuery: true,
				specifyQuery: 'keypair',
				queryParameters: { parameters: [{ name: 'q', value: '1' }] },
				options: { timeout: 5000, allowUnauthorizedCerts: false, queryParameterArrays: 'brackets' },
			};

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations')
				.send(payload);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('id');
			expect(response.body).toMatchObject(payload);
			// fields the UI does not expose are dropped from the public surface
			expect(response.body).not.toHaveProperty('responseCodeMustMatch');
			expect(response.body).not.toHaveProperty('sendPayload');
			expect(response.body).not.toHaveProperty('authentication');
			expect(response.body).not.toHaveProperty('credentials');
		});

		it('creates a fully-populated syslog destination', async () => {
			const payload = {
				type: 'syslog',
				label: 'Full syslog',
				enabled: false,
				subscribedEvents: ['n8n.workflow'],
				anonymizeAuditMessages: false,
				circuitBreaker: { maxFailures: 3 },
				host: 'localhost',
				port: 514,
				protocol: 'udp',
				facility: 16,
				app_name: 'n8n',
			};

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations')
				.send(payload);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('id');
			expect(response.body).toMatchObject(payload);
		});

		it('creates a fully-populated sentry destination', async () => {
			const payload = {
				type: 'sentry',
				label: 'Full sentry',
				enabled: false,
				subscribedEvents: ['n8n.workflow.failed'],
				anonymizeAuditMessages: false,
				circuitBreaker: { maxFailures: 3 },
				dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
			};

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations')
				.send(payload);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('id');
			expect(response.body).toMatchObject(payload);
		});

		it('rejects a malformed body with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations')
				.send({ label: 'no discriminator' });

			expect(response.status).toBe(400);
		});

		it('rejects a well-formed body with invalid values with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations')
				.send({ ...webhookPayload, url: 'not-a-valid-url' });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message');
		});
	});

	describe('PUT /settings/log-streaming/destinations/{id}', () => {
		it('updates an existing destination', async () => {
			const created = await createDestination();

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/settings/log-streaming/destinations/${created.id}`)
				.send({ ...webhookPayload, label: 'Renamed webhook', url: 'http://localhost:9999' });

			expect(response.status).toBe(200);
			expect(response.body.id).toBe(created.id);
			expect(response.body.label).toBe('Renamed webhook');
			expect(response.body.url).toBe('http://localhost:9999');

			// the change is persisted (no extra destination created)
			const listResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/log-streaming/destinations');
			expect(listResponse.body.data).toHaveLength(1);
			expect(listResponse.body.data[0].label).toBe('Renamed webhook');
		});

		it('returns 404 for an unknown destination id', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/log-streaming/destinations/11111111-1111-4111-8111-111111111111')
				.send(webhookPayload);

			expect(response.status).toBe(404);
		});

		it('rejects an invalid body with 400', async () => {
			const created = await createDestination();

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/settings/log-streaming/destinations/${created.id}`)
				.send({ ...webhookPayload, url: 'not-a-url' });

			expect(response.status).toBe(400);
		});
	});

	describe('POST /settings/log-streaming/destinations/{id}/test', () => {
		it('sends a test message to a destination', async () => {
			const created = await createDestination();
			const testSpy = vi.spyOn(service(), 'testDestination').mockResolvedValue(true);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post(`/settings/log-streaming/destinations/${created.id}/test`);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ success: true });
			expect(testSpy).toHaveBeenCalledWith(created.id);
		});

		it('returns 200 with success false when delivery fails', async () => {
			const created = await createDestination();
			vi.spyOn(service(), 'testDestination').mockRejectedValue(new Error('ECONNREFUSED'));

			const response = await testServer
				.publicApiAgentFor(owner)
				.post(`/settings/log-streaming/destinations/${created.id}/test`);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ success: false });
		});

		it('returns 404 for an unknown destination id', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations/11111111-1111-4111-8111-111111111111/test');

			expect(response.status).toBe(404);
		});
	});

	describe('DELETE /settings/log-streaming/destinations/{id}', () => {
		it('removes the destination', async () => {
			const created = await createDestination();

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/settings/log-streaming/destinations/${created.id}`);

			expect(response.status).toBe(200);
			expect(response.body.id).toBe(created.id);

			const listResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/log-streaming/destinations');
			expect(listResponse.body.data).toHaveLength(0);
		});

		it('returns 404 for an unknown destination id', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.delete('/settings/log-streaming/destinations/11111111-1111-4111-8111-111111111111');

			expect(response.status).toBe(404);
		});
	});

	describe('when destinations are managed via environment variables', () => {
		it('rejects a create with 409 and creates nothing', async () => {
			setManagedByEnv(true);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/log-streaming/destinations')
				.send(webhookPayload);

			expect(response.status).toBe(409);

			setManagedByEnv(false);
			const listResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/log-streaming/destinations');
			expect(listResponse.body.data).toHaveLength(0);
		});

		it('rejects a delete with 409', async () => {
			const created = await createDestination();
			setManagedByEnv(true);

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/settings/log-streaming/destinations/${created.id}`);

			expect(response.status).toBe(409);
		});

		it('rejects an update with 409', async () => {
			const created = await createDestination();
			setManagedByEnv(true);

			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/settings/log-streaming/destinations/${created.id}`)
				.send({ ...webhookPayload, label: 'nope' });

			expect(response.status).toBe(409);
		});

		it('still allows reads', async () => {
			await createDestination();
			setManagedByEnv(true);

			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/log-streaming/destinations');

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
		});
	});
});
