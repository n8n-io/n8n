import { Container } from 'typedi';
import config from '@/config';
import axios from 'axios';
import syslog from 'syslog-client';
import { v4 as uuid } from 'uuid';
import type {
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationWebhookOptions,
} from 'n8n-workflow';
import {
	defaultMessageEventBusDestinationSentryOptions,
	defaultMessageEventBusDestinationSyslogOptions,
	defaultMessageEventBusDestinationWebhookOptions,
} from 'n8n-workflow';

import type { User } from '@db/entities/User';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { EventMessageGeneric } from '@/eventbus/EventMessageClasses/EventMessageGeneric';
import type { MessageEventBusDestinationSyslog } from '@/eventbus/MessageEventBusDestination/MessageEventBusDestinationSyslog.ee';
import type { MessageEventBusDestinationWebhook } from '@/eventbus/MessageEventBusDestination/MessageEventBusDestinationWebhook.ee';
import type { MessageEventBusDestinationSentry } from '@/eventbus/MessageEventBusDestination/MessageEventBusDestinationSentry.ee';
import { EventMessageAudit } from '@/eventbus/EventMessageClasses/EventMessageAudit';
import type { EventNamesTypes } from '@/eventbus/EventMessageClasses';
import { ExecutionDataRecoveryService } from '@/eventbus/executionDataRecovery.service';

import * as utils from './shared/utils';
import { createUser } from './shared/db/users';
import { mockInstance } from '../shared/mocking';
import type { SuperAgentTest } from './shared/types';

jest.unmock('@/eventbus/MessageEventBus/MessageEventBus');
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
jest.mock('syslog-client');
const mockedSyslog = syslog as jest.Mocked<typeof syslog>;

let owner: User;
let authOwnerAgent: SuperAgentTest;

const testSyslogDestination: MessageEventBusDestinationSyslogOptions = {
	...defaultMessageEventBusDestinationSyslogOptions,
	id: 'b88038f4-0a89-4e94-89a9-658dfdb74539',
	protocol: 'udp',
	label: 'Test Syslog',
	enabled: false,
	subscribedEvents: ['n8n.test.message', 'n8n.audit.user.updated'],
};

const testWebhookDestination: MessageEventBusDestinationWebhookOptions = {
	...defaultMessageEventBusDestinationWebhookOptions,
	id: '88be6560-bfb4-455c-8aa1-06971e9e5522',
	url: 'http://localhost:3456',
	method: 'POST',
	label: 'Test Webhook',
	enabled: false,
	subscribedEvents: ['n8n.test.message', 'n8n.audit.user.updated'],
};

const testSentryDestination: MessageEventBusDestinationSentryOptions = {
	...defaultMessageEventBusDestinationSentryOptions,
	id: '450ca04b-87dd-4837-a052-ab3a347a00e9',
	dsn: 'http://localhost:3000',
	label: 'Test Sentry',
	enabled: false,
	subscribedEvents: ['n8n.test.message', 'n8n.audit.user.updated'],
};

let eventBus: MessageEventBus;

async function confirmIdInAll(id: string) {
	const sent = await eventBus.getEventsAll();
	expect(sent.length).toBeGreaterThan(0);
	expect(sent.find((msg) => msg.id === id)).toBeTruthy();
}

async function confirmIdSent(id: string) {
	const sent = await eventBus.getEventsSent();
	expect(sent.length).toBeGreaterThan(0);
	expect(sent.find((msg) => msg.id === id)).toBeTruthy();
}

mockInstance(ExecutionDataRecoveryService);
const testServer = utils.setupTestServer({
	endpointGroups: ['eventBus'],
	enabledFeatures: ['feat:logStreaming'],
});

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);

	mockedSyslog.createClient.mockImplementation(() => new syslog.Client());

	config.set('eventBus.logWriter.logBaseName', 'n8n-test-logwriter');
	config.set('eventBus.logWriter.keepLogCount', 1);

	eventBus = Container.get(MessageEventBus);
	await eventBus.initialize();
});

afterAll(async () => {
	jest.mock('@/eventbus/MessageEventBus/MessageEventBus');
	await eventBus?.close();
});

test('should have a running logwriter process', () => {
	const thread = eventBus.logWriter.worker;
	expect(thread).toBeDefined();
});

test('should have logwriter log messages', async () => {
	const testMessage = new EventMessageGeneric({
		eventName: 'n8n.test.message' as EventNamesTypes,
		id: uuid(),
	});
	await eventBus.send(testMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.once('message', async (msg: { command: string; data: any }) => {
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
	const testAuditMessage = new EventMessageAudit({
		eventName: 'n8n.audit.user.updated',
		payload: {
			_secret: 'secret',
			public: 'public',
		},
		id: uuid(),
	});

	const syslogDestination = eventBus.destinations[
		testSyslogDestination.id!
	] as MessageEventBusDestinationSyslog;

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
		eventBus.logWriter.worker?.on(
			'message',
			async function handler005(msg: { command: string; data: any }) {
				if (msg.command === 'appendMessageToLog') {
					const sent = await eventBus.getEventsAll();
					await confirmIdInAll(testAuditMessage.id);
					expect(mockedSyslogClientLog).toHaveBeenCalled();
					eventBus.logWriter.worker?.removeListener('message', handler005);
					resolve(true);
				}
			},
		);
	});

	syslogDestination.anonymizeAuditMessages = false;
	await eventBus.send(testAuditMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.on(
			'message',
			async function handler006(msg: { command: string; data: any }) {
				if (msg.command === 'appendMessageToLog') {
					const sent = await eventBus.getEventsAll();
					await confirmIdInAll(testAuditMessage.id);
					expect(mockedSyslogClientLog).toHaveBeenCalled();
					syslogDestination.disable();
					eventBus.logWriter.worker?.removeListener('message', handler006);
					resolve(true);
				}
			},
		);
	});
});

test('should send message to webhook ', async () => {
	const testMessage = new EventMessageGeneric({
		eventName: 'n8n.test.message' as EventNamesTypes,
		id: uuid(),
	});

	const webhookDestination = eventBus.destinations[
		testWebhookDestination.id!
	] as MessageEventBusDestinationWebhook;

	webhookDestination.enable();

	mockedAxios.post.mockResolvedValue({ status: 200, data: { msg: 'OK' } });
	mockedAxios.request.mockResolvedValue({ status: 200, data: { msg: 'OK' } });

	await eventBus.send(testMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.on(
			'message',
			async function handler003(msg: { command: string; data: any }) {
				if (msg.command === 'appendMessageToLog') {
					await confirmIdInAll(testMessage.id);
				} else if (msg.command === 'confirmMessageSent') {
					await confirmIdSent(testMessage.id);
					expect(mockedAxios.request).toHaveBeenCalled();
					webhookDestination.disable();
					eventBus.logWriter.worker?.removeListener('message', handler003);
					resolve(true);
				}
			},
		);
	});
});

test('should send message to sentry ', async () => {
	const testMessage = new EventMessageGeneric({
		eventName: 'n8n.test.message' as EventNamesTypes,
		id: uuid(),
	});

	const sentryDestination = eventBus.destinations[
		testSentryDestination.id!
	] as MessageEventBusDestinationSentry;

	sentryDestination.enable();

	const mockedSentryCaptureMessage = jest.spyOn(sentryDestination.sentryClient!, 'captureMessage');
	mockedSentryCaptureMessage.mockImplementation((_m, _level, _hint, _scope) => {
		eventBus.confirmSent(testMessage, {
			id: sentryDestination.id,
			name: sentryDestination.label,
		});
		return testMessage.id;
	});

	await eventBus.send(testMessage);
	await new Promise((resolve) => {
		eventBus.logWriter.worker?.on(
			'message',
			async function handler004(msg: { command: string; data: any }) {
				if (msg.command === 'appendMessageToLog') {
					await confirmIdInAll(testMessage.id);
				} else if (msg.command === 'confirmMessageSent') {
					await confirmIdSent(testMessage.id);
					expect(mockedSentryCaptureMessage).toHaveBeenCalled();
					sentryDestination.disable();
					eventBus.logWriter.worker?.removeListener('message', handler004);
					resolve(true);
				}
			},
		);
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
