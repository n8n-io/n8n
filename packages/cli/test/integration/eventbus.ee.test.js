'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const axios_1 = __importDefault(require('axios'));
const n8n_workflow_1 = require('n8n-workflow');
const syslog_client_1 = __importDefault(require('syslog-client'));
const uuid_1 = require('uuid');
const event_message_audit_1 = require('@/eventbus/event-message-classes/event-message-audit');
const event_message_generic_1 = require('@/eventbus/event-message-classes/event-message-generic');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const execution_recovery_service_1 = require('@/executions/execution-recovery.service');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils'));
jest.unmock('@/eventbus/message-event-bus/message-event-bus');
jest.mock('axios');
const mockedAxios = axios_1.default;
jest.mock('syslog-client');
const mockedSyslog = syslog_client_1.default;
(0, backend_test_utils_1.mockInstance)(publisher_service_1.Publisher);
let owner;
let authOwnerAgent;
const testSyslogDestination = {
	...n8n_workflow_1.defaultMessageEventBusDestinationSyslogOptions,
	id: 'b88038f4-0a89-4e94-89a9-658dfdb74539',
	protocol: 'udp',
	label: 'Test Syslog',
	enabled: false,
	subscribedEvents: ['n8n.test.message', 'n8n.audit.user.updated'],
};
const testWebhookDestination = {
	...n8n_workflow_1.defaultMessageEventBusDestinationWebhookOptions,
	id: '88be6560-bfb4-455c-8aa1-06971e9e5522',
	url: 'http://localhost:3456',
	method: 'POST',
	label: 'Test Webhook',
	enabled: false,
	subscribedEvents: ['n8n.test.message', 'n8n.audit.user.updated'],
};
const testSentryDestination = {
	...n8n_workflow_1.defaultMessageEventBusDestinationSentryOptions,
	id: '450ca04b-87dd-4837-a052-ab3a347a00e9',
	dsn: 'http://localhost:3000',
	label: 'Test Sentry',
	enabled: false,
	subscribedEvents: ['n8n.test.message', 'n8n.audit.user.updated'],
};
let eventBus;
async function confirmIdInAll(id) {
	const sent = await eventBus.getEventsAll();
	expect(sent.length).toBeGreaterThan(0);
	expect(sent.find((msg) => msg.id === id)).toBeTruthy();
}
async function confirmIdSent(id) {
	const sent = await eventBus.getEventsSent();
	expect(sent.length).toBeGreaterThan(0);
	expect(sent.find((msg) => msg.id === id)).toBeTruthy();
}
(0, backend_test_utils_1.mockInstance)(execution_recovery_service_1.ExecutionRecoveryService);
const testServer = utils.setupTestServer({
	endpointGroups: ['eventBus'],
	enabledFeatures: ['feat:logStreaming'],
});
beforeAll(async () => {
	owner = await (0, users_1.createUser)({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);
	mockedSyslog.createClient.mockImplementation(() => new syslog_client_1.default.Client());
	eventBus = di_1.Container.get(message_event_bus_1.MessageEventBus);
	await eventBus.initialize();
});
afterAll(async () => {
	jest.mock('@/eventbus/message-event-bus/message-event-bus');
	await eventBus?.close();
});
test('should have a running logwriter process', () => {
	const thread = eventBus.logWriter.worker;
	expect(thread).toBeDefined();
});
test('should have logwriter log messages', async () => {
	const testMessage = new event_message_generic_1.EventMessageGeneric({
		eventName: 'n8n.test.message',
		id: (0, uuid_1.v4)(),
	});
	await eventBus.send(testMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.once('message', async (msg) => {
			expect(msg.command).toBe('appendMessageToLog');
			expect(msg.data).toBe(true);
			await confirmIdInAll(testMessage.id);
			resolve(true);
		});
	});
});
describe('GET /eventbus/destination', () => {
	test('should fail due to missing authentication', async () => {
		const response = await testServer.authlessAgent.get('/eventbus/destination');
		expect(response.statusCode).toBe(401);
	});
	test('all returned destinations should exist in eventbus', async () => {
		const response = await authOwnerAgent.get('/eventbus/destination');
		expect(response.statusCode).toBe(200);
		const data = response.body.data;
		expect(data).toBeTruthy();
		expect(Array.isArray(data)).toBeTruthy();
		for (let index = 0; index < data.length; index++) {
			const destination = data[index];
			const foundDestinations = await eventBus.findDestination(destination.id);
			expect(Array.isArray(foundDestinations)).toBeTruthy();
			expect(foundDestinations.length).toBe(1);
			expect(foundDestinations[0].label).toBe(destination.label);
		}
	});
});
describe('POST /eventbus/destination', () => {
	test('create syslog destination', async () => {
		const response = await authOwnerAgent.post('/eventbus/destination').send(testSyslogDestination);
		expect(response.statusCode).toBe(200);
	});
	test('create sentry destination', async () => {
		const response = await authOwnerAgent.post('/eventbus/destination').send(testSentryDestination);
		expect(response.statusCode).toBe(200);
	});
	test('create webhook destination', async () => {
		const response = await authOwnerAgent
			.post('/eventbus/destination')
			.send(testWebhookDestination);
		expect(response.statusCode).toBe(200);
	});
});
test('should anonymize audit message to syslog ', async () => {
	const testAuditMessage = new event_message_audit_1.EventMessageAudit({
		eventName: 'n8n.audit.user.updated',
		payload: {
			_secret: 'secret',
			public: 'public',
		},
		id: (0, uuid_1.v4)(),
	});
	const syslogDestination = eventBus.destinations[testSyslogDestination.id];
	syslogDestination.enable();
	const mockedSyslogClientLog = jest.spyOn(syslogDestination.client, 'log');
	mockedSyslogClientLog.mockImplementation((m, _options, _cb) => {
		const o = JSON.parse(m);
		expect(o).toHaveProperty('payload');
		expect(o.payload).toHaveProperty('_secret');
		syslogDestination.anonymizeAuditMessages
			? expect(o.payload._secret).toBe('*')
			: expect(o.payload._secret).toBe('secret');
		expect(o.payload).toHaveProperty('public');
		expect(o.payload.public).toBe('public');
		return syslogDestination.client;
	});
	syslogDestination.anonymizeAuditMessages = true;
	await eventBus.send(testAuditMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.on('message', async function handler005(msg) {
			if (msg.command === 'appendMessageToLog') {
				await eventBus.getEventsAll();
				await confirmIdInAll(testAuditMessage.id);
				expect(mockedSyslogClientLog).toHaveBeenCalled();
				eventBus.logWriter.worker?.removeListener('message', handler005);
				resolve(true);
			}
		});
	});
	syslogDestination.anonymizeAuditMessages = false;
	await eventBus.send(testAuditMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.on('message', async function handler006(msg) {
			if (msg.command === 'appendMessageToLog') {
				await eventBus.getEventsAll();
				await confirmIdInAll(testAuditMessage.id);
				expect(mockedSyslogClientLog).toHaveBeenCalled();
				syslogDestination.disable();
				eventBus.logWriter.worker?.removeListener('message', handler006);
				resolve(true);
			}
		});
	});
});
test('should send message to webhook ', async () => {
	const testMessage = new event_message_generic_1.EventMessageGeneric({
		eventName: 'n8n.test.message',
		id: (0, uuid_1.v4)(),
	});
	const webhookDestination = eventBus.destinations[testWebhookDestination.id];
	webhookDestination.enable();
	mockedAxios.post.mockResolvedValue({ status: 200, data: { msg: 'OK' } });
	mockedAxios.request.mockResolvedValue({ status: 200, data: { msg: 'OK' } });
	await eventBus.send(testMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.on('message', async function handler003(msg) {
			if (msg.command === 'appendMessageToLog') {
				await confirmIdInAll(testMessage.id);
			} else if (msg.command === 'confirmMessageSent') {
				await confirmIdSent(testMessage.id);
				expect(mockedAxios.request).toHaveBeenCalled();
				webhookDestination.disable();
				eventBus.logWriter.worker?.removeListener('message', handler003);
				resolve(true);
			}
		});
	});
});
test('should send message to sentry ', async () => {
	const testMessage = new event_message_generic_1.EventMessageGeneric({
		eventName: 'n8n.test.message',
		id: (0, uuid_1.v4)(),
	});
	const sentryDestination = eventBus.destinations[testSentryDestination.id];
	sentryDestination.enable();
	const mockedSentryCaptureMessage = jest.spyOn(sentryDestination.sentryClient, 'captureMessage');
	mockedSentryCaptureMessage.mockImplementation((_m, _level, _hint, _scope) => {
		eventBus.confirmSent(testMessage, {
			id: sentryDestination.id,
			name: sentryDestination.label,
		});
		return testMessage.id;
	});
	await eventBus.send(testMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.on('message', async function handler004(msg) {
			if (msg.command === 'appendMessageToLog') {
				await confirmIdInAll(testMessage.id);
			} else if (msg.command === 'confirmMessageSent') {
				await confirmIdSent(testMessage.id);
				expect(mockedSentryCaptureMessage).toHaveBeenCalled();
				sentryDestination.disable();
				eventBus.logWriter.worker?.removeListener('message', handler004);
				resolve(true);
			}
		});
	});
});
test('DELETE /eventbus/destination delete all destinations by id', async () => {
	const existingDestinationIds = [...Object.keys(eventBus.destinations)];
	await Promise.all(
		existingDestinationIds.map(async (id) => {
			const response = await authOwnerAgent.del('/eventbus/destination').query({ id });
			expect(response.statusCode).toBe(200);
		}),
	);
	expect(Object.keys(eventBus.destinations).length).toBe(0);
});
//# sourceMappingURL=eventbus.ee.test.js.map
