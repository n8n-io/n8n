import { randomUUID } from 'node:crypto';

import { LINKED_INSTANCE_INPUT_MESSAGES } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createChatUser, createMember } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { LinkedInstanceRepository } from '../database/repositories/linked-instance.repository';
import { ADDRESS_ERROR_MESSAGES, LINK_INPUT_MESSAGES } from '../link-input';
import {
	DUPLICATE_LINK_MESSAGE,
	LINK_NOT_FOUND_MESSAGE,
	LinkedInstancesService,
	PROBE_FAILURE_MESSAGES,
	REMOTE_PROJECTS_MESSAGES,
} from '../linked-instances.service';
import {
	RemoteInstanceClientFactory,
	type RemoteInstanceClient,
} from '../remote/remote-instance.client';
import {
	CLOUD,
	fakeToken,
	OPS,
	PERSONAL,
	SALES,
	searchProjectsOutput,
} from './linked-instances.test-helpers';

const clientFactory = mockInstance(RemoteInstanceClientFactory);

const testServer = utils.setupTestServer({
	endpointGroups: ['linked-instances'],
	modules: ['linked-instances'],
});

const FAILURES = ['unreachable', 'mcp-disabled', 'unauthorised'] as const;

/** Every token and every ciphertext that this file made. No response may hold one. */
const secrets = new Set<string>();
const responses: string[] = [];

const newToken = () => {
	const token = fakeToken();
	secrets.add(token);
	return token;
};

const containsSecret = (text: string) => [...secrets].some((secret) => text.includes(secret));

type RecordedResponse = { status: number; text: string; headers: Record<string, unknown> };

/** Sends the request and checks that the response holds no token known so far. */
async function recorded<T extends RecordedResponse>(request: PromiseLike<T>): Promise<T> {
	const response = await request;
	const text = JSON.stringify({ headers: response.headers, text: response.text });
	responses.push(text);
	expect(containsSecret(text)).toBe(false);
	return response;
}

let alice: User;
let bob: User;
let aliceAgent: SuperAgentTest;
let bobAgent: SuperAgentTest;
let chatAgent: SuperAgentTest;
let client: MockProxy<RemoteInstanceClient>;
let repository: LinkedInstanceRepository;

const link = async (agent = aliceAgent, body: Record<string, unknown> = {}) =>
	await recorded(
		agent.post('/linked-instances').send({ name: 'Cloud', url: CLOUD, token: newToken(), ...body }),
	);

/** Links an instance for Alice and returns its id. */
async function linkedId(): Promise<string> {
	const response = await link();
	expect(response.status).toBe(201);
	return response.body.data.id;
}

const storedToken = async (owner: User, id: string) =>
	(await Container.get(LinkedInstancesService).getTokenForUse(owner, id)).token;

beforeAll(async () => {
	repository = Container.get(LinkedInstanceRepository);
	alice = await createMember();
	bob = await createMember();
	aliceAgent = testServer.authAgentFor(alice);
	bobAgent = testServer.authAgentFor(bob);
	chatAgent = testServer.authAgentFor(await createChatUser());
});

beforeEach(async () => {
	await repository.delete({});
	client = mock<RemoteInstanceClient>();
	client.probe.mockResolvedValue({ ok: true, toolNames: ['search_workflows', 'search_projects'] });
	client.callTool.mockResolvedValue(searchProjectsOutput([OPS, SALES, PERSONAL]));
	clientFactory.create.mockReset();
	clientFactory.create.mockReturnValue(client);
});

afterEach(async () => {
	for (const row of await repository.find()) secrets.add(row.tokenEncrypted);
});

afterAll(() => {
	expect(responses.length).toBeGreaterThan(40);
	expect(responses.filter(containsSecret)).toEqual([]);
});

describe('LinkedInstancesController', () => {
	describe('POST /linked-instances', () => {
		it('links the instance, picks the default project and answers 201 without the token', async () => {
			const token = newToken();

			const response = await link(aliceAgent, { url: 'Acme.app.n8n.cloud/home', token });

			expect(response.status).toBe(201);
			expect(response.body.data).toEqual({
				id: expect.any(String),
				name: 'Cloud',
				baseUrl: CLOUD,
				status: 'online',
				lastVerifiedAt: expect.any(String),
				createdAt: expect.any(String),
				defaultRemoteProject: { id: OPS.id, name: OPS.name },
			});
			expect(clientFactory.create).toHaveBeenCalledWith({ origin: CLOUD, token });
			expect(client.callTool).toHaveBeenCalledWith(
				'search_projects',
				{ limit: 100 },
				expect.anything(),
			);
			const row = await repository.findForUser(alice.id, response.body.data.id);
			expect(row?.tokenEncrypted).not.toContain(token);
			await expect(storedToken(alice, response.body.data.id)).resolves.toBe(token);
		});

		it('links without a default project when the instance cannot list projects', async () => {
			client.probe.mockResolvedValue({ ok: true, toolNames: ['search_workflows'] });

			const response = await link();

			expect(response.status).toBe(201);
			expect(response.body.data.defaultRemoteProject).toBeNull();
		});

		it.each(FAILURES)(
			'answers 400 with the en-GB message when the probe finds %s',
			async (reason) => {
				client.probe.mockResolvedValue({ ok: false, reason });

				const response = await link();

				expect(response.status).toBe(400);
				expect(response.body.message).toBe(PROBE_FAILURE_MESSAGES[reason]);
				await expect(repository.count()).resolves.toBe(0);
			},
		);

		it.each([
			['an empty address', '', ADDRESS_ERROR_MESSAGES.empty],
			['an FTP address', 'ftp://files.example.com', ADDRESS_ERROR_MESSAGES['unsupported-protocol']],
			['a remote HTTP address', 'http://example.com', ADDRESS_ERROR_MESSAGES['insecure-http']],
			[
				'an address with a password',
				'https://user:pw@example.com',
				ADDRESS_ERROR_MESSAGES['has-credentials'],
			],
			[
				'an address over 2048 characters',
				`https://example.com/${'a'.repeat(2048)}`,
				LINKED_INSTANCE_INPUT_MESSAGES.url,
			],
		])('answers 400 for %s without a probe', async (_, url, message) => {
			const response = await link(aliceAgent, { url });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(message);
			expect(clientFactory.create).not.toHaveBeenCalled();
		});

		it.each([
			['name', { name: '<b>Cloud</b>' }, LINK_INPUT_MESSAGES.name],
			['name', { name: 'a'.repeat(65) }, LINK_INPUT_MESSAGES.name],
			['token', { token: 'two words' }, LINK_INPUT_MESSAGES.token],
			['token', { token: '' }, LINK_INPUT_MESSAGES.token],
		])('answers 400 for a %s that is not valid', async (_, body, message) => {
			const response = await link(aliceAgent, body);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(message);
			expect(clientFactory.create).not.toHaveBeenCalled();
		});

		// `recorded` fails the test when the response repeats either token.
		it('answers 400 to a token that is not valid without repeating the token', async () => {
			const response = await link(aliceAgent, { token: `${newToken()} ${newToken()}` });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(LINK_INPUT_MESSAGES.token);
			await expect(repository.count()).resolves.toBe(0);
		});

		it('answers 409 when the user already linked the address, and lets another user link it', async () => {
			await linkedId();

			const again = await link(aliceAgent, { name: 'Again', url: 'https://ACME.app.n8n.cloud/' });
			const bobs = await link(bobAgent);

			expect(again.status).toBe(409);
			expect(again.body.message).toBe(DUPLICATE_LINK_MESSAGE);
			expect(bobs.status).toBe(201);
		});
	});

	describe('GET /linked-instances', () => {
		it("lists only the user's own links", async () => {
			const id = await linkedId();
			await link(bobAgent, { name: 'Bob cloud' });

			const response = await recorded(aliceAgent.get('/linked-instances'));

			expect(response.status).toBe(200);
			expect(response.body.data).toEqual([
				expect.objectContaining({
					id,
					name: 'Cloud',
					defaultRemoteProject: { id: OPS.id, name: 'Ops' },
				}),
			]);
		});

		it('lists nothing for a user without links', async () => {
			const response = await recorded(bobAgent.get('/linked-instances'));

			expect(response.status).toBe(200);
			expect(response.body.data).toEqual([]);
		});
	});

	describe('POST /linked-instances/:id/verify', () => {
		it('checks the instance again with the stored token', async () => {
			const id = await linkedId();
			const token = await storedToken(alice, id);
			clientFactory.create.mockClear();

			const response = await recorded(aliceAgent.post(`/linked-instances/${id}/verify`));

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({ id, status: 'online' });
			expect(clientFactory.create).toHaveBeenCalledWith({ origin: CLOUD, token });
		});

		it.each([
			['unreachable', 'offline'],
			['mcp-disabled', 'mcp-disabled'],
			['unauthorised', 'unauthorised'],
		] as const)('records a %s instance as %s', async (reason, status) => {
			const id = await linkedId();
			client.probe.mockResolvedValue({ ok: false, reason });

			const response = await recorded(aliceAgent.post(`/linked-instances/${id}/verify`));

			expect(response.status).toBe(200);
			expect(response.body.data.status).toBe(status);
			await expect(repository.findForUser(alice.id, id)).resolves.toMatchObject({ status });
		});

		it.each([
			['another user', () => bobAgent],
			['the owner, for an unknown id', () => aliceAgent],
		])('answers 404 to %s', async (who, agentFor) => {
			const id = who === 'another user' ? await linkedId() : randomUUID();
			clientFactory.create.mockClear();

			const response = await recorded(agentFor().post(`/linked-instances/${id}/verify`));

			expect(response.status).toBe(404);
			expect(response.body.message).toBe(LINK_NOT_FOUND_MESSAGE);
			expect(clientFactory.create).not.toHaveBeenCalled();
		});
	});

	describe('PATCH /linked-instances/:id', () => {
		it('renames the link', async () => {
			const id = await linkedId();

			const response = await recorded(
				aliceAgent.patch(`/linked-instances/${id}`).send({ name: 'Cloud (EU)' }),
			);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({ id, name: 'Cloud (EU)' });
		});

		it('replaces the token after the new token passes the probe', async () => {
			const id = await linkedId();
			const token = newToken();

			const response = await recorded(aliceAgent.patch(`/linked-instances/${id}`).send({ token }));

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({ id, status: 'online' });
			await expect(storedToken(alice, id)).resolves.toBe(token);
		});

		it.each(FAILURES)('keeps the old token when the new token gets %s', async (reason) => {
			const id = await linkedId();
			const oldToken = await storedToken(alice, id);
			client.probe.mockResolvedValue({ ok: false, reason });

			const response = await recorded(
				aliceAgent.patch(`/linked-instances/${id}`).send({ token: newToken() }),
			);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(PROBE_FAILURE_MESSAGES[reason]);
			await expect(storedToken(alice, id)).resolves.toBe(oldToken);
		});

		it('keeps the old token when the new token is not valid, without a probe', async () => {
			const id = await linkedId();
			const oldToken = await storedToken(alice, id);
			clientFactory.create.mockClear();

			const response = await recorded(
				aliceAgent.patch(`/linked-instances/${id}`).send({ token: `${newToken()} ${newToken()}` }),
			);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(LINK_INPUT_MESSAGES.token);
			expect(clientFactory.create).not.toHaveBeenCalled();
			await expect(storedToken(alice, id)).resolves.toBe(oldToken);
		});

		it('sets a default project that the instance lists, and records it as online', async () => {
			const id = await linkedId();
			await repository.updateForUser(alice.id, id, { status: 'offline' });

			const response = await recorded(
				aliceAgent.patch(`/linked-instances/${id}`).send({ defaultRemoteProjectId: SALES.id }),
			);

			expect(response.status).toBe(200);
			expect(response.body.data).toMatchObject({
				status: 'online',
				defaultRemoteProject: { id: SALES.id, name: 'Sales' },
			});
		});

		it.each([
			[
				'a project that the instance does not list',
				{ defaultRemoteProjectId: 'Unknown0123' },
				LINK_INPUT_MESSAGES.defaultRemoteProjectId,
			],
			[
				'a project id that is not valid',
				{ defaultRemoteProjectId: '../x' },
				LINK_INPUT_MESSAGES.defaultRemoteProjectId,
			],
			['a request that changes nothing', {}, LINK_INPUT_MESSAGES.noChange],
			['a name that is not valid', { name: 'Cloud\nprod' }, LINK_INPUT_MESSAGES.name],
		])('answers 400 for %s', async (_, body, message) => {
			const id = await linkedId();

			const response = await recorded(aliceAgent.patch(`/linked-instances/${id}`).send(body));

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(message);
			await expect(repository.findForUser(alice.id, id)).resolves.toMatchObject({
				name: 'Cloud',
				defaultRemoteProjectId: OPS.id,
			});
		});

		it('answers 400 when the token cannot list projects', async () => {
			const id = await linkedId();
			client.probe.mockResolvedValue({ ok: true, toolNames: ['search_workflows'] });

			const response = await recorded(
				aliceAgent.patch(`/linked-instances/${id}`).send({ defaultRemoteProjectId: SALES.id }),
			);

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(REMOTE_PROJECTS_MESSAGES.unavailable);
		});

		it('answers 404 to another user and keeps the link', async () => {
			const id = await linkedId();

			const response = await recorded(
				bobAgent.patch(`/linked-instances/${id}`).send({ name: 'Mine now', token: newToken() }),
			);

			expect(response.status).toBe(404);
			expect(response.body.message).toBe(LINK_NOT_FOUND_MESSAGE);
			await expect(repository.findForUser(alice.id, id)).resolves.toMatchObject({ name: 'Cloud' });
		});
	});

	describe('DELETE /linked-instances/:id', () => {
		it('unlinks the instance and answers 204 without a body', async () => {
			const id = await linkedId();

			const response = await recorded(aliceAgent.delete(`/linked-instances/${id}`));

			expect(response.status).toBe(204);
			expect(response.text).toBe('');
			await expect(repository.count()).resolves.toBe(0);
		});

		it.each([
			['another user', () => bobAgent, true],
			['the owner, for a malformed id', () => aliceAgent, false],
		])('answers 404 to %s and keeps the link', async (_, agentFor, useRealId) => {
			const id = await linkedId();

			const response = await recorded(
				agentFor().delete(`/linked-instances/${useRealId ? id : 'not-a-uuid'}`),
			);

			expect(response.status).toBe(404);
			expect(response.body.message).toBe(LINK_NOT_FOUND_MESSAGE);
			await expect(repository.count()).resolves.toBe(1);
		});
	});

	describe('scope', () => {
		it('answers 403 on every route to a user without the Assistant scope', async () => {
			const id = await linkedId();
			clientFactory.create.mockClear();

			const statuses = [
				(await recorded(chatAgent.get('/linked-instances'))).status,
				(
					await recorded(
						chatAgent.post('/linked-instances').send({ name: 'C', url: CLOUD, token: newToken() }),
					)
				).status,
				(await recorded(chatAgent.post(`/linked-instances/${id}/verify`))).status,
				(await recorded(chatAgent.patch(`/linked-instances/${id}`).send({ name: 'Taken' }))).status,
				(await recorded(chatAgent.delete(`/linked-instances/${id}`))).status,
			];

			expect(statuses).toEqual([403, 403, 403, 403, 403]);
			expect(clientFactory.create).not.toHaveBeenCalled();
			await expect(repository.findForUser(alice.id, id)).resolves.toMatchObject({ name: 'Cloud' });
		});

		it('answers 401 without a session', async () => {
			const response = await recorded(testServer.authlessAgent.get('/linked-instances'));

			expect(response.status).toBe(401);
		});
	});
});
