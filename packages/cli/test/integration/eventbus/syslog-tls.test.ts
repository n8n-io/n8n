import { Logger } from '@n8n/backend-common';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import * as fs from 'fs';
import * as path from 'path';
import type TestAgent from 'supertest/lib/agent';

import { EventMessageGeneric } from '@/eventbus/event-message-classes/event-message-generic';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';

import { TlsSyslogServer } from './tls-server';
import { createUser } from '../shared/db/users';
import * as utils from '../shared/utils';

jest.unmock('@/eventbus/message-event-bus/message-event-bus');

const tlsServer = new TlsSyslogServer();
let serverPort: number;
let eventBus: MessageEventBus;
let destinationService: LogStreamingDestinationService;
let authOwnerAgent: TestAgent;
let logger: Logger;

const testServer = utils.setupTestServer({
	endpointGroups: ['eventBus'],
	enabledFeatures: ['feat:logStreaming'],
	modules: ['log-streaming'],
});

afterAll(async () => {
	await eventBus?.close();
	// Undo the "unmock" from above
	jest.mock('@/eventbus/message-event-bus/message-event-bus');
	await tlsServer.stop();
});

beforeAll(async () => {
	serverPort = await tlsServer.start();

	const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	authOwnerAgent = testServer.authAgentFor(owner);

	eventBus = Container.get(MessageEventBus);
	logger = Container.get(Logger);
	await eventBus.initialize();

	destinationService = Container.get(LogStreamingDestinationService);
	await destinationService.initialize();
});

describe('TLS Syslog E2E', () => {
	const destinationId = 'e2e-tls-test';
	const subscribedEvent = 'n8n.workflow.failed';

	beforeEach(() => {
		tlsServer.clearMessages();
	});

	afterEach(async () => {
		const destinations = await destinationService.findDestination();
		for (const destination of destinations) {
			if (destination.id) {
				await destinationService.removeDestination(destination.id, false);
			}
		}
	});

	test('should send message over real TLS connection', async () => {
		const certificate = fs.readFileSync(path.join(__dirname, 'support', 'certificate.pem'), 'utf8');

		await authOwnerAgent.post('/eventbus/destination').send({
			__type: '$$MessageEventBusDestinationSyslog',
			id: destinationId,
			protocol: 'tls',
			host: 'localhost',
			port: serverPort,
			label: 'E2E TLS Syslog',
			enabled: true,
			subscribedEvents: [subscribedEvent],
			tlsCa: certificate,
		});

		const testMessage = new EventMessageGeneric({
			eventName: subscribedEvent,
			id: 'test-message-1',
		});

		await eventBus.send(testMessage);

		// Wait for message to arrive at real server
		const receivedMessage = await tlsServer.waitForMessage(5000);

		expect(receivedMessage).toBeTruthy();
		expect(receivedMessage).toContain('n8n.workflow.failed');
		expect(receivedMessage).toContain('test-message-1');
	});

	test('should log an error when the certificate is invalid - but not break the application', async () => {
		const loggerErrorSpy = jest.spyOn(logger, 'error');

		const incorrectCertificate = fs.readFileSync(
			path.join(__dirname, 'support', 'incorrect-certificate.pem'),
			'utf8',
		);

		const authOwnerAgent = testServer.authAgentFor(await createUser({ role: GLOBAL_OWNER_ROLE }));

		await authOwnerAgent.post('/eventbus/destination').send({
			__type: '$$MessageEventBusDestinationSyslog',
			id: destinationId,
			protocol: 'tls',
			host: 'localhost',
			port: serverPort,
			label: 'Invalid TLS',
			enabled: true,
			subscribedEvents: [subscribedEvent],
			tlsCa: incorrectCertificate,
		});

		const testMessage = new EventMessageGeneric({
			eventName: subscribedEvent,
			id: 'test-invalid',
		});

		await eventBus.send(testMessage);

		// Should NOT receive message (cert validation failed)
		await expect(tlsServer.waitForMessage(2000)).rejects.toThrow('Timeout');

		//	Should output an error log message.
		expect(loggerErrorSpy).toHaveBeenCalledWith('Transport error');

		loggerErrorSpy.mockRestore();
	});
});
