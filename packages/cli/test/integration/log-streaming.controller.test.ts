import { mockInstance } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils';

jest.unmock('@/eventbus/message-event-bus/message-event-bus');

mockInstance(Publisher);
mockInstance(ExecutionRecoveryService);

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
