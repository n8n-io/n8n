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
import { v4 as uuid } from 'uuid';

jest.mock('@/telemetry');

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
};

const testWebhookDestination: MessageEventBusDestinationWebhookOptions = {
	...defaultMessageEventBusDestinationWebhookOptions,
	url: 'http://localhost:3000',
	label: 'Test Webhook',
	enabled: false,
};
const testSentryDestination: MessageEventBusDestinationSentryOptions = {
	...defaultMessageEventBusDestinationSentryOptions,
	dsn: 'http://localhost:3000',
	label: 'Test Sentry',
	enabled: false,
};

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
});

beforeEach(async () => {
	// await testDb.truncate(['EventDestinations'], testDbName);

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
	config.set('enterprise.features.logStreaming', false);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
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
