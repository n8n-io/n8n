import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { GLOBAL_OWNER_ROLE, type CredentialsEntity, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsFinderService } from '@n8n/backend-services';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { EventDestinationsRepository } from '@/modules/log-streaming.ee/database/repositories/event-destination.repository';
import { MessageEventBusDestinationWebhook } from '@/modules/log-streaming.ee/destinations/message-event-bus-destination-webhook.ee';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { createCustomRoleWithScopeSlugs } from './shared/db/roles';
import { createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils';

vi.unmock('@/eventbus/message-event-bus/message-event-bus');

mockInstance(Publisher);
mockInstance(ExecutionRecoveryService);
const credentialsFinderService = mockInstance(CredentialsFinderService);

const testServer = utils.setupTestServer({
	endpointGroups: ['eventBus'],
	enabledFeatures: ['feat:logStreaming'],
	modules: ['log-streaming'],
});

let owner: User;
let authOwnerAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	authOwnerAgent = testServer.authAgentFor(owner);

	const eventBus = Container.get(MessageEventBus);
	await eventBus.initialize();

	const destinationService = Container.get(LogStreamingDestinationService);
	await destinationService.initialize();
});

describe('POST /eventbus/destination', () => {
	describe('destination save permissions', () => {
		const payload = {
			__type: MessageEventBusDestinationTypeNames.webhook,
			url: 'https://example.com/original',
			label: 'Original destination',
			enabled: true,
			subscribedEvents: ['n8n.audit', 'n8n.workflow'],
			options: {},
		};
		let createOnlyAgent: SuperAgentTest;
		let createAndUpdateAgent: SuperAgentTest;
		const destinationIds = new Set<string>();

		beforeAll(async () => {
			const createOnlyRole = await createCustomRoleWithScopeSlugs(['eventBusDestination:create'], {
				roleType: 'global',
			});
			const createAndUpdateRole = await createCustomRoleWithScopeSlugs(
				['eventBusDestination:create', 'eventBusDestination:update'],
				{ roleType: 'global' },
			);
			createOnlyAgent = testServer.authAgentFor(await createUser({ role: createOnlyRole }));
			createAndUpdateAgent = testServer.authAgentFor(
				await createUser({ role: createAndUpdateRole }),
			);
		});

		afterEach(async () => {
			vi.restoreAllMocks();
			for (const id of destinationIds) {
				await Container.get(LogStreamingDestinationService).removeDestination(id, false);
			}
			destinationIds.clear();
		});

		test.each([false, true])(
			'creates a destination with create scope when a client id is supplied: %s',
			async (supplyId) => {
				const id = supplyId ? uuid() : undefined;
				const response = await createOnlyAgent
					.post('/eventbus/destination')
					.send({ ...payload, id });
				expect(response.statusCode).toBe(200);
				destinationIds.add(response.body.data.id);
				expect(response.body.data.id).toEqual(id ?? expect.any(String));
				const stored = await Container.get(EventDestinationsRepository).findOneByOrFail({
					id: response.body.data.id,
				});
				expect(stored.destination).toMatchObject(payload);
			},
		);

		test.each([true, false])(
			'keeps the stored and active destination without update scope when enabled is %s',
			async (enabled) => {
				const id = uuid();
				destinationIds.add(id);
				await authOwnerAgent
					.post('/eventbus/destination')
					.send({ ...payload, id })
					.expect(200);
				const repository = Container.get(EventDestinationsRepository);
				const service = Container.get(LogStreamingDestinationService);
				const stored = await repository.findOneByOrFail({ id });
				const active = await service.findDestination(id);
				const close = vi.spyOn(MessageEventBusDestinationWebhook.prototype, 'close');
				const publisher = Container.get(Publisher);
				vi.mocked(publisher.publishCommand).mockClear();

				await createOnlyAgent
					.post('/eventbus/destination')
					.send({
						...payload,
						id,
						url: 'https://example.com/changed',
						label: 'Changed destination',
						enabled,
						subscribedEvents: ['n8n.audit'],
					})
					.expect(403);

				expect(await repository.findOneByOrFail({ id })).toEqual(stored);
				expect(await service.findDestination(id)).toEqual(active);
				expect(close.mock.contexts).toEqual([
					expect.objectContaining({ label: 'Changed destination' }),
				]);
				expect(publisher.publishCommand).not.toHaveBeenCalled();
			},
		);

		test('replaces a destination with create and update scopes', async () => {
			const id = uuid();
			destinationIds.add(id);
			await authOwnerAgent
				.post('/eventbus/destination')
				.send({ ...payload, id })
				.expect(200);
			const replacement = { ...payload, id, label: 'Updated destination', enabled: false };

			const response = await createAndUpdateAgent
				.post('/eventbus/destination')
				.send(replacement)
				.expect(200);

			expect(response.body.data).toMatchObject(replacement);
			const stored = await Container.get(EventDestinationsRepository).findOneByOrFail({ id });
			expect(stored.destination).toMatchObject(replacement);
			expect(await Container.get(LogStreamingDestinationService).findDestination(id)).toEqual([
				stored.destination,
			]);
		});

		test('requires update scope for a stored destination that is not loaded locally', async () => {
			const id = uuid();
			destinationIds.add(id);
			await authOwnerAgent
				.post('/eventbus/destination')
				.send({ ...payload, id })
				.expect(200);
			const repository = Container.get(EventDestinationsRepository);
			const stored = await repository.findOneByOrFail({ id });
			const service = Container.get(LogStreamingDestinationService);
			await service.close();

			try {
				await createOnlyAgent
					.post('/eventbus/destination')
					.send({ ...payload, id, enabled: false })
					.expect(403);
				expect(await repository.findOneByOrFail({ id })).toEqual(stored);
				expect(await service.findDestination(id)).toEqual([]);
			} finally {
				await service.loadDestinationsFromDb();
				await service.initialize();
			}
		});

		test('creates only one destination when two create-only saves use the same id', async () => {
			const id = uuid();
			destinationIds.add(id);
			const responses = await Promise.all(
				['First destination', 'Second destination'].map(
					async (label) =>
						await createOnlyAgent.post('/eventbus/destination').send({ ...payload, id, label }),
				),
			);

			expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 403]);
			const created = responses.find((response) => response.statusCode === 200);
			const stored = await Container.get(EventDestinationsRepository).findOneByOrFail({ id });
			expect(stored.destination).toEqual(created?.body.data);
			expect(await Container.get(LogStreamingDestinationService).findDestination(id)).toEqual([
				stored.destination,
			]);
		});
	});

	describe('Valid destination creation', () => {
		test('should create a webhook destination', async () => {
			const webhookPayload = {
				__type: '$$MessageEventBusDestinationWebhook',
				url: 'http://localhost:3456',
				method: 'POST',
				label: 'Test Webhook',
				enabled: false,
				subscribedEvents: ['n8n.test.message'],
				options: {},
			};

			const response = await authOwnerAgent.post('/eventbus/destination').send(webhookPayload);

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data.__type).toBe('$$MessageEventBusDestinationWebhook');
			expect(response.body.data.label).toBe('Test Webhook');
		});

		test('should create a sentry destination', async () => {
			const sentryPayload = {
				__type: '$$MessageEventBusDestinationSentry',
				dsn: 'http://localhost:3000',
				label: 'Test Sentry',
				enabled: false,
				subscribedEvents: ['n8n.test.message'],
			};

			const response = await authOwnerAgent.post('/eventbus/destination').send(sentryPayload);

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data.__type).toBe('$$MessageEventBusDestinationSentry');
			expect(response.body.data.label).toBe('Test Sentry');
		});

		test('should create a syslog destination', async () => {
			const syslogPayload = {
				__type: '$$MessageEventBusDestinationSyslog',
				protocol: 'udp',
				host: 'localhost',
				port: 514,
				label: 'Test Syslog',
				enabled: false,
				subscribedEvents: ['n8n.test.message'],
			};

			const response = await authOwnerAgent.post('/eventbus/destination').send(syslogPayload);

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data.__type).toBe('$$MessageEventBusDestinationSyslog');
			expect(response.body.data.label).toBe('Test Syslog');
		});
	});

	describe('Invalid payloads', () => {
		test('should return 400 for missing __type', async () => {
			const invalidPayload = {
				label: 'Test',
			};

			const response = await authOwnerAgent.post('/eventbus/destination').send(invalidPayload);

			expect(response.statusCode).toBe(400);
		});

		test('should return 400 for invalid __type', async () => {
			const invalidPayload = {
				__type: 'InvalidType',
				label: 'Test',
			};

			const response = await authOwnerAgent.post('/eventbus/destination').send(invalidPayload);

			expect(response.statusCode).toBe(400);
		});

		test('should return 400 for webhook with missing url', async () => {
			const invalidPayload = {
				__type: '$$MessageEventBusDestinationWebhook',
				url: '',
				label: 'Test Webhook',
				options: {},
			};

			const response = await authOwnerAgent.post('/eventbus/destination').send(invalidPayload);

			expect(response.statusCode).toBe(400);
		});

		test('should return 400 for sentry with missing dsn', async () => {
			const invalidPayload = {
				__type: '$$MessageEventBusDestinationSentry',
				dsn: '',
				label: 'Test Sentry',
			};

			const response = await authOwnerAgent.post('/eventbus/destination').send(invalidPayload);

			expect(response.statusCode).toBe(400);
		});

		test('should return 400 for syslog with invalid protocol', async () => {
			const invalidPayload = {
				__type: '$$MessageEventBusDestinationSyslog',
				protocol: 'invalid-protocol',
				host: 'localhost',
				label: 'Test Syslog',
			};

			const response = await authOwnerAgent.post('/eventbus/destination').send(invalidPayload);

			expect(response.statusCode).toBe(400);
		});
	});
});

describe('credential access enforcement', () => {
	const payloadWithCredential = (credentialId: string) => ({
		__type: '$$MessageEventBusDestinationWebhook',
		url: 'http://localhost:3456',
		method: 'POST',
		label: 'With credentials',
		enabled: false,
		subscribedEvents: ['n8n.test.message'],
		authentication: 'genericCredentialType',
		genericAuthType: 'httpHeaderAuth',
		credentials: { httpHeaderAuth: { id: credentialId, name: 'Some cred' } },
		options: {},
	});

	afterEach(() => {
		credentialsFinderService.findCredentialForUser.mockReset();
	});

	test('rejects with 403 when the user cannot access the referenced credential', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

		const response = await authOwnerAgent
			.post('/eventbus/destination')
			.send(payloadWithCredential('some-credential-id'));

		expect(response.statusCode).toBe(403);
		expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
			'some-credential-id',
			expect.objectContaining({ id: owner.id }),
			['credential:read'],
		);
	});

	test('allows creation when the user can access the referenced credential', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'some-credential-id',
		} as CredentialsEntity);

		const response = await authOwnerAgent
			.post('/eventbus/destination')
			.send(payloadWithCredential('some-credential-id'));

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveProperty('id');
	});

	test('rejects testing a destination whose credentials the user cannot access with 403', async () => {
		// create it while access is granted, so a destination with credentials is persisted
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'some-credential-id',
		} as CredentialsEntity);
		const created = await authOwnerAgent
			.post('/eventbus/destination')
			.send(payloadWithCredential('some-credential-id'));
		expect(created.statusCode).toBe(200);
		const { id } = created.body.data;

		// access revoked → testing must be rejected before the credential is decrypted/sent
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);
		const response = await authOwnerAgent.get('/eventbus/testmessage').query({ id });

		expect(response.statusCode).toBe(403);
	});
});

describe('when log streaming is managed by env', () => {
	beforeAll(() => {
		Container.get(InstanceSettingsLoaderConfig).logStreamingManagedByEnv = true;
	});

	afterAll(() => {
		Container.get(InstanceSettingsLoaderConfig).logStreamingManagedByEnv = false;
	});

	test('POST /eventbus/destination is rejected with 403', async () => {
		const webhookPayload = {
			__type: '$$MessageEventBusDestinationWebhook',
			url: 'http://localhost:3456',
			method: 'POST',
			label: 'Should not be created',
			enabled: false,
			subscribedEvents: ['n8n.test.message'],
			options: {},
		};

		const response = await authOwnerAgent.post('/eventbus/destination').send(webhookPayload);

		expect(response.statusCode).toBe(403);
	});

	test('DELETE /eventbus/destination is rejected with 403', async () => {
		const response = await authOwnerAgent
			.delete('/eventbus/destination')
			.query({ id: '11111111-1111-4111-8111-111111111111' });

		expect(response.statusCode).toBe(403);
	});

	test('GET /eventbus/destination still succeeds', async () => {
		const response = await authOwnerAgent.get('/eventbus/destination');

		expect(response.statusCode).toBe(200);
	});

	test('GET /eventbus/testmessage still succeeds', async () => {
		const response = await authOwnerAgent
			.get('/eventbus/testmessage')
			.query({ id: '11111111-1111-4111-8111-111111111111' });

		expect(response.statusCode).toBe(200);
	});
});
