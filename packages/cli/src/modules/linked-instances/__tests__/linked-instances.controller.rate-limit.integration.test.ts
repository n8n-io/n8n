// The routes get their rate limiters only in production, so this file runs as production.
vi.mock('@n8n/backend-common', async () => {
	const actual = await vi.importActual<typeof import('@n8n/backend-common')>('@n8n/backend-common');
	return { ...actual, inProduction: true };
});

import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { createMember } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';
import { mock } from 'vitest-mock-extended';

import { LinkedInstanceRepository } from '../database/repositories/linked-instance.repository';
import { PROBE_FAILURE_MESSAGES } from '../linked-instances.service';
import {
	RemoteInstanceClientFactory,
	type RemoteInstanceClient,
} from '../remote/remote-instance.client';
import { CLOUD, fakeToken } from './linked-instances.test-helpers';

const LIMIT = 10;

const clientFactory = mockInstance(RemoteInstanceClientFactory);

const testServer = utils.setupTestServer({
	endpointGroups: ['linked-instances'],
	modules: ['linked-instances'],
});

const tokens: string[] = [];
const responses: string[] = [];

const newToken = () => {
	const token = fakeToken();
	tokens.push(token);
	return token;
};

type SentResponse = { status: number; text: string; body: { message?: string } };

/** Sends the request and keeps the response, so that `afterAll` can check it for tokens. */
async function recorded(request: PromiseLike<SentResponse>): Promise<SentResponse> {
	const response = await request;
	responses.push(response.text);
	return response;
}

const newAgent = async () => testServer.authAgentFor(await createMember());

const linkRequest = async (agent: SuperAgentTest) =>
	await recorded(
		agent.post('/linked-instances').send({ name: 'Cloud', url: CLOUD, token: newToken() }),
	);

// An unknown id is a 404 after the limiter, so it uses up the budget without a link.
const UNKNOWN_LINK = '/linked-instances/00000000-0000-4000-8000-000000000000';

beforeAll(async () => {
	await Container.get(LinkedInstanceRepository).delete({});
});

beforeEach(() => {
	const client = mock<RemoteInstanceClient>();
	// A failed probe still counts, so no request here stores a link.
	client.probe.mockResolvedValue({ ok: false, reason: 'unreachable' });
	clientFactory.create.mockReset();
	clientFactory.create.mockReturnValue(client);
});

afterAll(() => {
	expect(responses.length).toBeGreaterThan(3 * LIMIT);
	const leaks = responses.filter((text) => tokens.some((token) => text.includes(token)));
	expect(leaks).toEqual([]);
});

describe('LinkedInstancesController rate limits', () => {
	it('answers 429 to the 11th link request of a user within a minute, without a probe', async () => {
		const agent = await newAgent();
		for (let attempt = 1; attempt <= LIMIT; attempt++) {
			const response = await linkRequest(agent);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(PROBE_FAILURE_MESSAGES.unreachable);
		}
		expect(clientFactory.create).toHaveBeenCalledTimes(LIMIT);
		clientFactory.create.mockClear();

		const limited = await linkRequest(agent);

		expect(limited.status).toBe(429);
		expect(clientFactory.create).not.toHaveBeenCalled();
	});

	it('counts the requests of each user on their own', async () => {
		const limitedAgent = await newAgent();
		const otherAgent = await newAgent();
		for (let attempt = 1; attempt <= LIMIT; attempt++) await linkRequest(limitedAgent);
		expect((await linkRequest(limitedAgent)).status).toBe(429);

		const response = await linkRequest(otherAgent);

		expect(response.status).toBe(400);
		expect(response.body.message).toBe(PROBE_FAILURE_MESSAGES.unreachable);
	});

	it('limits checks of a link in the same way, with a budget of their own', async () => {
		const agent = await newAgent();
		for (let attempt = 1; attempt <= LIMIT; attempt++) {
			expect((await recorded(agent.post(`${UNKNOWN_LINK}/verify`))).status).toBe(404);
		}

		expect((await recorded(agent.post(`${UNKNOWN_LINK}/verify`))).status).toBe(429);
		expect((await linkRequest(agent)).status).toBe(400);
	});

	// A new token reaches the instance, so a change uses the same kind of budget.
	it('limits changes of a link in the same way, and leaves the list without a limit', async () => {
		const agent = await newAgent();
		const change = async () =>
			(await recorded(agent.patch(UNKNOWN_LINK).send({ token: newToken() }))).status;
		for (let attempt = 1; attempt <= LIMIT; attempt++) {
			expect(await change()).toBe(404);
		}

		expect(await change()).toBe(429);
		for (let attempt = 0; attempt <= LIMIT; attempt++) {
			expect((await recorded(agent.get('/linked-instances'))).status).toBe(200);
		}
	});
});
