import express from 'express';
import config from '@/config';
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
import axios from 'axios';

jest.mock('@/telemetry');
// mocking Sentry to prevent destination constructor from throwing an errorn due to missing DSN
jest.mock('@sentry/node');
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let owner: User;
let unAuthOwnerAgent: SuperAgentTest;
let authOwnerAgent: SuperAgentTest;

const testSyslogDestination: MessageEventBusDestinationSyslogOptions = {
	...defaultMessageEventBusDestinationSyslogOptions,
	protocol: 'udp',
	label: 'Test Syslog',
	enabled: false,
	subscribedEvents: ['n8n.test.message'],
};

const testWebhookDestination: MessageEventBusDestinationWebhookOptions = {
	...defaultMessageEventBusDestinationWebhookOptions,
	id: '88be6560-bfb4-455c-8aa1-06971e9e5522',
	url: 'http://localhost:3456',
	method: `POST`,
	label: 'Test Webhook',
	enabled: true,
	subscribedEvents: ['n8n.test.message'],
};
const testSentryDestination: MessageEventBusDestinationSentryOptions = {
	...defaultMessageEventBusDestinationSentryOptions,
	dsn: 'http://localhost:3000',
	label: 'Test Sentry',
	enabled: false,
	subscribedEvents: ['n8n.test.message'],
};

const testMessage = new EventMessageGeneric({ eventName: 'n8n.test.message' });

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

	utils.initConfigFile();
	utils.initTestLogger();
	config.set('eventBus.enabled', true);
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

test('should send message to webhook ', async () => {
	config.set('enterprise.features.logStreaming', true);
	await eventBus.logWriter.getThread()?.cleanLogs();
	const allMessages = await eventBus.getEvents('all');
	expect(allMessages.length).toBe(0);
	mockedAxios.post.mockResolvedValue({ status: 200, data: { msg: 'OK' } });
	mockedAxios.request.mockResolvedValue({ status: 200, data: { msg: 'OK' } });
	await eventBus.send(testMessage);
	// not elegant, but since communication happens through emitters, we'll wait for a bit
	await new Promise((resolve) => setTimeout(resolve, 300));
	const sent = await eventBus.getEvents('sent');
	const unsent = await eventBus.getEvents('unsent');
	expect(sent.length).toBe(1);
	expect(unsent.length).toBe(0);
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
