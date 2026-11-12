import { createTeamProject, linkUserToProject, mockInstance } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { GLOBAL_OWNER_ROLE, type CredentialsEntity, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import nock from 'nock';
import { v4 as uuid } from 'uuid';
import type { MockInstance } from 'vitest';

import { CredentialsFinderService, Publisher } from '@n8n/backend-services';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { EventDestinationsRepository } from '@/modules/log-streaming.ee/database/repositories/event-destination.repository';
import { MessageEventBusDestinationWebhook } from '@/modules/log-streaming.ee/destinations/message-event-bus-destination-webhook.ee';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';

import { saveCredential } from './shared/db/credentials';
import { createCustomRoleWithScopeSlugs } from './shared/db/roles';
import { addApiKey, createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils';

vi.unmock('@/eventbus/message-event-bus/message-event-bus');

mockInstance(Publisher);
mockInstance(ExecutionRecoveryService);

const testServer = utils.setupTestServer({
	endpointGroups: ['eventBus', 'publicApi'],
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
	let findCredentialForUser: MockInstance<CredentialsFinderService['findCredentialForUser']>;

	beforeEach(() => {
		findCredentialForUser = vi.spyOn(
			Container.get(CredentialsFinderService),
			'findCredentialForUser',
		);
	});

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
		findCredentialForUser.mockRestore();
	});

	test('rejects with 403 when the user cannot access the referenced credential', async () => {
		findCredentialForUser.mockResolvedValue(null);

		const response = await authOwnerAgent
			.post('/eventbus/destination')
			.send(payloadWithCredential('some-credential-id'));

		expect(response.statusCode).toBe(403);
		expect(findCredentialForUser).toHaveBeenCalledWith(
			'some-credential-id',
			expect.objectContaining({ id: owner.id }),
			['credential:read'],
			{ excludeSeeOnlyRoles: true },
		);
	});

	test('allows creation when the user can access the referenced credential', async () => {
		findCredentialForUser.mockResolvedValue({
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
		findCredentialForUser.mockResolvedValue({
			id: 'some-credential-id',
		} as CredentialsEntity);
		const created = await authOwnerAgent
			.post('/eventbus/destination')
			.send(payloadWithCredential('some-credential-id'));
		expect(created.statusCode).toBe(200);
		const { id } = created.body.data;

		// access revoked → testing must be rejected before the credential is decrypted/sent
		findCredentialForUser.mockResolvedValue(null);
		const response = await authOwnerAgent.get('/eventbus/testmessage').query({ id });

		expect(response.statusCode).toBe(403);
	});
});

/*
 * Regression test — destination credentials follow project role permissions.
 * Ref: GOV-348
 * 2026-11-12
 */
describe('destination credential project roles', () => {
	const headerValue = 'Bearer test-destination-value';
	const roles = [
		{ role: 'project:viewer', statusCode: 403 },
		{ role: 'project:editor', statusCode: 200 },
		{ role: 'global:owner', statusCode: 200 },
	] as const;
	let agents: Record<(typeof roles)[number]['role'], SuperAgentTest>;
	let publicAgents: Record<(typeof roles)[number]['role'], SuperAgentTest>;
	let credential: CredentialsEntity;
	let destinationId: string;

	const destinationPayload = () => ({
		id: destinationId,
		__type: MessageEventBusDestinationTypeNames.webhook,
		url: 'https://example.com/events',
		method: 'POST',
		label: 'Project destination',
		enabled: true,
		subscribedEvents: ['n8n.test.message'],
		authentication: 'genericCredentialType',
		genericAuthType: 'httpHeaderAuth',
		credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
		options: {},
	});

	beforeAll(async () => {
		await utils.initCredentialsTypes();
		const role = await createCustomRoleWithScopeSlugs(
			['eventBusDestination:create', 'eventBusDestination:list', 'eventBusDestination:test'],
			{ roleType: 'global' },
		);
		const viewer = await createUser({ role });
		const editor = await createUser({ role });
		const project = await createTeamProject('Destination project', owner);
		await linkUserToProject(viewer, project, 'project:viewer');
		await linkUserToProject(editor, project, 'project:editor');
		agents = {
			'project:viewer': testServer.authAgentFor(viewer),
			'project:editor': testServer.authAgentFor(editor),
			'global:owner': authOwnerAgent,
		};
		publicAgents = {
			'project:viewer': testServer.publicApiAgentWithApiKey((await addApiKey(viewer)).apiKey),
			'project:editor': testServer.publicApiAgentWithApiKey((await addApiKey(editor)).apiKey),
			'global:owner': testServer.publicApiAgentWithApiKey((await addApiKey(owner)).apiKey),
		};
		credential = await saveCredential(
			{
				name: 'Destination Header Auth',
				type: 'httpHeaderAuth',
				data: { name: 'Authorization', value: headerValue },
			},
			{ project, role: 'credential:owner' },
		);
	});

	beforeEach(() => {
		destinationId = uuid();
	});

	afterEach(async () => {
		await Container.get(LogStreamingDestinationService).removeDestination(destinationId, false);
		nock.cleanAll();
	});

	test.each(roles)(
		'POST /eventbus/destination returns $statusCode for $role with a project credential',
		async ({ role, statusCode }) => {
			const response = await agents[role].post('/eventbus/destination').send(destinationPayload());

			expect(response.statusCode).toBe(statusCode);
			const stored = await Container.get(EventDestinationsRepository).findOneBy({
				id: destinationId,
			});
			if (statusCode === 403) {
				expect(stored).toBeNull();
				expect(
					await Container.get(LogStreamingDestinationService).findDestination(destinationId),
				).toEqual([]);
			} else {
				expect(stored?.destination).toMatchObject(destinationPayload());
			}
		},
	);

	test.each(roles)(
		'GET /eventbus/testmessage returns $statusCode for $role with a project credential',
		async ({ role, statusCode }) => {
			await agents['project:editor']
				.post('/eventbus/destination')
				.send(destinationPayload())
				.expect(200);
			const receiver = nock('https://example.com')
				.post('/events')
				.matchHeader('Authorization', headerValue)
				.reply(200, {});

			const response = await agents[role].get('/eventbus/testmessage').query({ id: destinationId });

			expect.soft(response.statusCode).toBe(statusCode);
			expect(receiver.isDone()).toBe(statusCode === 200);
			if (statusCode === 200) expect(response.body.data).toBe(true);
		},
	);

	test.each(roles)(
		'POST /settings/log-streaming/destinations/:id/test returns $statusCode for $role with a project credential',
		async ({ role, statusCode }) => {
			await agents['project:editor']
				.post('/eventbus/destination')
				.send(destinationPayload())
				.expect(200);
			const receiver = nock('https://example.com')
				.post('/events')
				.matchHeader('Authorization', headerValue)
				.reply(200, {});

			const response = await publicAgents[role].post(
				`/settings/log-streaming/destinations/${destinationId}/test`,
			);

			expect.soft(response.statusCode).toBe(statusCode);
			expect(receiver.isDone()).toBe(statusCode === 200);
			if (statusCode === 200) expect(response.body).toEqual({ success: true });
		},
	);
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
