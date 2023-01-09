import express from 'express';
import config from '@/config';
import axios from 'axios';
import syslog from 'syslog-client';
import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { Role } from '@db/entities/Role';
import { User } from '@db/entities/User';
import {
	defaultMessageEventBusDestinationSentryOptions,
	defaultMessageEventBusDestinationSyslogOptions,
	defaultMessageEventBusDestinationWebhookOptions,
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationWebhookOptions,
} from 'n8n-workflow';
import { eventBus } from '@/eventbus';
import { SuperAgentTest } from 'supertest';
import { EventMessageGeneric } from '../../src/eventbus/EventMessageClasses/EventMessageGeneric';
import { MessageEventBusDestinationSyslog } from '../../src/eventbus/MessageEventBusDestination/MessageEventBusDestinationSyslog.ee';
import { MessageEventBusDestinationWebhook } from '../../src/eventbus/MessageEventBusDestination/MessageEventBusDestinationWebhook.ee';
import { MessageEventBusDestinationSentry } from '../../src/eventbus/MessageEventBusDestination/MessageEventBusDestinationSentry.ee';
import { EventMessageAudit } from '../../src/eventbus/EventMessageClasses/EventMessageAudit';

jest.unmock('@/eventbus/MessageEventBus/MessageEventBus');
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
jest.mock('syslog-client');
const mockedSyslog = syslog as jest.Mocked<typeof syslog>;

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let owner: User;
let unAuthOwnerAgent: SuperAgentTest;
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
	method: `POST`,
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

async function cleanLogs() {
	await eventBus.logWriter.getThread()?.cleanLogs();
	const allMessages = await eventBus.getEvents('all');
	expect(allMessages.length).toBe(0);
}

async function confirmIdsSentUnsent() {
	const sent = await eventBus.getEvents('sent');
	const unsent = await eventBus.getEvents('unsent');
	expect(sent.length).toBe(1);
	expect(sent[0].id).toBe(testMessage.id);
	expect(unsent.length).toBe(1);
	expect(unsent[0].id).toBe(testMessageUnsubscribed.id);
}

const testMessage = new EventMessageGeneric({ eventName: 'n8n.test.message' });
const testMessageUnsubscribed = new EventMessageGeneric({ eventName: 'n8n.test.unsub' });
const testAuditMessage = new EventMessageAudit({
	eventName: 'n8n.audit.user.updated',
	payload: {
		_secret: 'secret',
		public: 'public',
	},
});

beforeAll(async () => {
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;
	globalOwnerRole = await testDb.getGlobalOwnerRole();
	owner = await testDb.createUser({ globalRole: globalOwnerRole });

	app = await utils.initTestServer({ endpointGroups: ['eventBus'], applyAuth: true });

	unAuthOwnerAgent = utils.createAgent(app, {
		apiPath: 'internal',
		auth: false,
		user: owner,
		version: 1,
	});

	authOwnerAgent = utils.createAgent(app, {
		apiPath: 'internal',
		auth: true,
		user: owner,
		version: 1,
	});

	mockedSyslog.createClient.mockImplementation(() => new syslog.Client());

	utils.initConfigFile();
	utils.initTestLogger();
	config.set('eventBus.logWriter.logBaseName', 'n8n-test-logwriter');
	config.set('eventBus.logWriter.keepLogCount', '1');
	config.set('enterprise.features.logStreaming', true);
	await eventBus.initialize();
});

beforeEach(async () => {
	// await testDb.truncate(['EventDestinations'], testDbName);

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('enterprise.features.logStreaming', false);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
	await eventBus.close();
});

test('should have a running logwriter process', async () => {
	const thread = eventBus.logWriter.getThread();
	expect(thread).toBeDefined();
});

test('should have a clean log', async () => {
	await eventBus.logWriter.getThread()?.cleanLogs();
	const allMessages = await eventBus.getEvents('all');
	expect(allMessages.length).toBe(0);
});

test('should have logwriter log messages', async () => {
	await eventBus.send(testMessage);
	const sent = await eventBus.getEvents('sent');
	const unsent = await eventBus.getEvents('unsent');
	expect(sent.length).toBeGreaterThan(0);
	expect(unsent.length).toBe(0);
	expect(sent.find((e) => e.id === testMessage.id)).toEqual(testMessage);
});

test('GET /eventbus/destination should fail due to missing authentication', async () => {
	const response = await unAuthOwnerAgent.get('/eventbus/destination');
	expect(response.statusCode).toBe(401);
});

test('POST /eventbus/destination create syslog destination', async () => {
	const response = await authOwnerAgent.post('/eventbus/destination').send(testSyslogDestination);
	expect(response.statusCode).toBe(200);
});

test('POST /eventbus/destination create sentry destination', async () => {
	const response = await authOwnerAgent.post('/eventbus/destination').send(testSentryDestination);
	expect(response.statusCode).toBe(200);
});

test('POST /eventbus/destination create webhook destination', async () => {
	const response = await authOwnerAgent.post('/eventbus/destination').send(testWebhookDestination);
	expect(response.statusCode).toBe(200);
});

test('GET /eventbus/destination all returned destinations should exist in eventbus', async () => {
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

test('should send message to syslog ', async () => {
	config.set('enterprise.features.logStreaming', true);
	await cleanLogs();

	const syslogDestination = eventBus.destinations[
		testSyslogDestination.id!
	] as MessageEventBusDestinationSyslog;

	syslogDestination.enable();

	const mockedSyslogClientLog = jest.spyOn(syslogDestination.client, 'log');
	mockedSyslogClientLog.mockImplementation((_m, _options, _cb) => {
		eventBus.confirmSent(testMessage, {
			id: syslogDestination.id,
			name: syslogDestination.label,
		});
		return syslogDestination.client;
	});

	await eventBus.send(testMessage);
	await eventBus.send(testMessageUnsubscribed);

	await new Promise((resolve) => setTimeout(resolve, 100));
	expect(mockedSyslogClientLog).toHaveBeenCalled();
	await confirmIdsSentUnsent();

	syslogDestination.disable();
});

test('should anonymize audit message to syslog ', async () => {
	config.set('enterprise.features.logStreaming', true);
	await cleanLogs();

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
	expect(mockedSyslogClientLog).toHaveBeenCalled();

	syslogDestination.anonymizeAuditMessages = false;
	await eventBus.send(testAuditMessage);
	expect(mockedSyslogClientLog).toHaveBeenCalled();

	syslogDestination.disable();
});

test('should send message to webhook ', async () => {
	config.set('enterprise.features.logStreaming', true);
	await cleanLogs();

	const webhookDestination = eventBus.destinations[
		testWebhookDestination.id!
	] as MessageEventBusDestinationWebhook;

	webhookDestination.enable();

	mockedAxios.post.mockResolvedValue({ status: 200, data: { msg: 'OK' } });
	mockedAxios.request.mockResolvedValue({ status: 200, data: { msg: 'OK' } });

	await eventBus.send(testMessage);
	await eventBus.send(testMessageUnsubscribed);
	// not elegant, but since communication happens through emitters, we'll wait for a bit
	await new Promise((resolve) => setTimeout(resolve, 100));
	await confirmIdsSentUnsent();

	webhookDestination.disable();
});

test('should send message to sentry ', async () => {
	config.set('enterprise.features.logStreaming', true);
	await cleanLogs();

	const sentryDestination = eventBus.destinations[
		testSentryDestination.id!
	] as MessageEventBusDestinationSentry;

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
	await eventBus.send(testMessageUnsubscribed);
	// not elegant, but since communication happens through emitters, we'll wait for a bit
	await new Promise((resolve) => setTimeout(resolve, 100));
	expect(mockedSentryCaptureMessage).toHaveBeenCalled();
	await confirmIdsSentUnsent();

	sentryDestination.disable();
});

test('DEL /eventbus/destination delete all destinations by id', async () => {
	const existingDestinationIds = [...Object.keys(eventBus.destinations)];

	await Promise.all(
		existingDestinationIds.map(async (id) => {
			const response = await authOwnerAgent.del('/eventbus/destination').query({ id });
			expect(response.statusCode).toBe(200);
		}),
	);

	expect(Object.keys(eventBus.destinations).length).toBe(0);
});
