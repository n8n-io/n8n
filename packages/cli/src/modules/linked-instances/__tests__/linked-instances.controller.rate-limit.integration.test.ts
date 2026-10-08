// The routes get their rate limiters only in production, so this file runs as production.
vi.mock('@n8n/backend-common', async () => {
	const actual = await vi.importActual<typeof import('@n8n/backend-common')>('@n8n/backend-common');
	return { ...actual, inProduction: true };
});

import { randomBytes } from 'node:crypto';

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

const LIMIT = 10;

const clientFactory = mockInstance(RemoteInstanceClientFactory);

const testServer = utils.setupTestServer({
	endpointGroups: ['linked-instances'],
	modules: ['linked-instances'],
});

const tokens: string[] = [];
const newToken = () => {
	const token = `n8n_test_${randomBytes(16).toString('hex')}`;
	tokens.push(token);
	return token;
};

let aliceAgent: SuperAgentTest;
let bobAgent: SuperAgentTest;
let carolAgent: SuperAgentTest;
let daveAgent: SuperAgentTest;

beforeAll(async () => {
	aliceAgent = testServer.authAgentFor(await createMember());
	bobAgent = testServer.authAgentFor(await createMember());
	carolAgent = testServer.authAgentFor(await createMember());
	daveAgent = testServer.authAgentFor(await createMember());
	await Container.get(LinkedInstanceRepository).delete({});
});

beforeEach(() => {
	const client = mock<RemoteInstanceClient>();
	// A failed probe still counts, so no request here stores a link.
	client.probe.mockResolvedValue({ ok: false, reason: 'unreachable' });
	clientFactory.create.mockReturnValue(client);
});

// An unknown id is a 404 after the limiter, so it uses up the budget without a link.
const UNKNOWN_LINK = '/linked-instances/00000000-0000-4000-8000-000000000000';

const linkRequest = (agent: SuperAgentTest) =>
	agent
		.post('/linked-instances')
		.send({ name: 'Cloud', url: 'https://acme.app.n8n.cloud', token: newToken() });

describe('LinkedInstancesController rate limits', () => {
	it('answers 429 to the 11th link request of a user within a minute, without a probe', async () => {
		for (let attempt = 1; attempt <= LIMIT; attempt++) {
			const response = await linkRequest(aliceAgent);
			expect(response.status).toBe(400);
			expect(response.body.message).toBe(PROBE_FAILURE_MESSAGES.unreachable);
		}
		clientFactory.create.mockClear();

		const limited = await linkRequest(aliceAgent);

		expect(limited.status).toBe(429);
		expect(clientFactory.create).not.toHaveBeenCalled();
		for (const token of tokens) expect(limited.text).not.toContain(token);
	});

	it('counts each user on their own', async () => {
		const response = await linkRequest(bobAgent);

		expect(response.status).toBe(400);
	});

	it('limits checks of a link in the same way', async () => {
		for (let attempt = 1; attempt <= LIMIT; attempt++) {
			expect((await carolAgent.post(`${UNKNOWN_LINK}/verify`)).status).toBe(404);
		}

		expect((await carolAgent.post(`${UNKNOWN_LINK}/verify`)).status).toBe(429);
		// The link route has its own budget.
		expect((await linkRequest(carolAgent)).status).toBe(400);
	});

	it('limits changes of a link, because a new token reaches the instance', async () => {
		const change = async () =>
			(await daveAgent.patch(UNKNOWN_LINK).send({ token: newToken() })).status;
		for (let attempt = 1; attempt <= LIMIT; attempt++) {
			expect(await change()).toBe(404);
		}

		expect(await change()).toBe(429);
		// The list route keeps its own budget.
		expect((await daveAgent.get('/linked-instances')).status).toBe(200);
	});
});
