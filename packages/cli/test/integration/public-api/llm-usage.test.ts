import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { createLlmUsageCalls, deleteLlmUsageCalls } from '@n8n/backend-module-llm-usage/testing';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['llm-usage'],
});

let owner: User;
let unscopedOwner: User;
let member: User;

const daysAgo = (days: number) => new Date(Date.now() - days * Time.days.toMilliseconds);

type LlmUsageRow = Parameters<typeof createLlmUsageCalls>[0][number];

const call = (callId: string, finishedAt: Date, overrides: LlmUsageRow = {}): LlmUsageRow => ({
	callId,
	finishedAt,
	callerType: 'node',
	workflowId: 'wf-1',
	provider: 'openai',
	model: 'gpt-x',
	inputTokens: 10,
	outputTokens: 5,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	estimatedCostUsd: 0.5,
	priced: true,
	...overrides,
});

beforeAll(async () => {
	owner = await createOwnerWithApiKey({ scopes: ['llmUsage:read'] });
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:list'] });
	member = await createMemberWithApiKey({ scopes: ['llmUsage:read'] });
});

beforeEach(async () => {
	await deleteLlmUsageCalls();
});

describe('GET /llm-usage/calls', () => {
	test('returns the calls of the range oldest first, with the credential, in cursor pages', async () => {
		await createLlmUsageCalls([
			call('outside', daysAgo(40)),
			call('second', daysAgo(2), { credentialId: 'cred-1' }),
			call('first', daysAgo(3), { managedBy: 'aiGateway' }),
			call('third', daysAgo(1)),
		]);
		const agent = testServer.publicApiAgentFor(owner);

		const firstPage = await agent.get('/llm-usage/calls').query({ limit: 2 }).expect(200);

		expect(firstPage.body.data.map((item: { callId: string }) => item.callId)).toEqual([
			'first',
			'second',
		]);
		expect(firstPage.body.data[0]).toMatchObject({ credentialId: null, managedBy: 'aiGateway' });
		expect(firstPage.body.data[1]).toMatchObject({
			credentialId: 'cred-1',
			managedBy: null,
			workflowId: 'wf-1',
			estimatedCostUsd: 0.5,
		});
		expect(firstPage.body.data[1]).not.toHaveProperty('priced');

		const secondPage = await agent
			.get('/llm-usage/calls')
			.query({ cursor: firstPage.body.nextCursor })
			.expect(200);

		expect(secondPage.body.data.map((item: { callId: string }) => item.callId)).toEqual(['third']);
		expect(secondPage.body.nextCursor).toBeNull();
	});

	test('returns the calls of the given range', async () => {
		await createLlmUsageCalls([call('old', daysAgo(40)), call('recent', daysAgo(1))]);

		const response = await testServer
			.publicApiAgentFor(owner)
			.get('/llm-usage/calls')
			.query({ startDate: daysAgo(45).toISOString(), endDate: daysAgo(35).toISOString() })
			.expect(200);

		expect(response.body.data.map((item: { callId: string }) => item.callId)).toEqual(['old']);
	});

	test('returns 400 when endDate is not after startDate', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.get('/llm-usage/calls')
			.query({ startDate: daysAgo(1).toISOString(), endDate: daysAgo(2).toISOString() })
			.expect(400);

		expect(response.body).toEqual({ message: 'endDate must be after startDate' });
	});

	test('returns 400 for a range longer than 90 days', async () => {
		await testServer
			.publicApiAgentFor(owner)
			.get('/llm-usage/calls')
			.query({ startDate: daysAgo(91).toISOString() })
			.expect(400);
	});

	test('returns 400 for an unknown query parameter', async () => {
		await testServer
			.publicApiAgentFor(owner)
			.get('/llm-usage/calls')
			.query({ sortBy: 'model' })
			.expect(400);
	});

	test('returns 403 without the llmUsage:read scope', async () => {
		await testServer.publicApiAgentFor(unscopedOwner).get('/llm-usage/calls').expect(403);
	});

	test('returns 403 for a member', async () => {
		await testServer.publicApiAgentFor(member).get('/llm-usage/calls').expect(403);
	});
});
