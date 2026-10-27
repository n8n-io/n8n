import { checkLlmCall } from '@n8n/ai-utilities/llm-usage';
import { createLlmUsageCalls, deleteLlmUsageCalls } from '@n8n/backend-module-llm-usage/testing';
import { testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { User } from '@n8n/db';

import { PolicyViolationError } from '@/policy/policy-violation.error';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['llm-usage', 'policy-infrastructure'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

let owner: User;
let unscopedOwner: User;
let member: User;

const budget = {
	name: 'Daily per user',
	target: { user: { match: 'all' } },
	window: { kind: 'rolling', unit: 'day' },
	limit: 1,
};

beforeAll(async () => {
	owner = await createOwnerWithApiKey({ scopes: ['llmBudget:read', 'llmBudget:manage'] });
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
	member = await createMemberWithApiKey({ scopes: ['llmBudget:read'] });
});

beforeEach(() => testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES));

afterEach(async () => {
	await testDb.truncate(['LlmBudget']);
	await deleteLlmUsageCalls();
});

describe('LLM budgets public API', () => {
	const agent = () => testServer.publicApiAgentFor(owner);

	it('creates, reads, replaces and deletes a budget, with a version for concurrent writes', async () => {
		const created = await agent().post('/llm-budgets').send(budget).expect(201);
		expect(created.body).toMatchObject({
			...budget,
			enabled: true,
			action: 'block',
			warnAtPercent: [80],
			version: 1,
		});
		const id: string = created.body.id;

		const { body: read } = await agent().get(`/llm-budgets/${id}`).expect(200);
		const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...writable } = read;
		const replaced = await agent()
			.put(`/llm-budgets/${id}`)
			.send({ ...writable, limit: 2 })
			.expect(200);
		expect(replaced.body).toMatchObject({ limit: 2, version: 2 });

		await agent()
			.put(`/llm-budgets/${id}`)
			.send({ ...writable, limit: 3 })
			.expect(409);
		await agent().delete(`/llm-budgets/${id}`).expect(204);
		await agent().get(`/llm-budgets/${id}`).expect(404);
	});

	it('pages the list with a cursor and refuses an invalid cursor', async () => {
		await agent().post('/llm-budgets').send(budget).expect(201);
		await agent()
			.post('/llm-budgets')
			.send({ ...budget, name: 'Second' })
			.expect(201);

		const first = await agent().get('/llm-budgets').query({ limit: 1 }).expect(200);
		const second = await agent()
			.get('/llm-budgets')
			.query({ limit: 1, cursor: first.body.nextCursor })
			.expect(200);

		expect([first.body.data[0].name, second.body.data[0].name]).toEqual([
			'Daily per user',
			'Second',
		]);
		expect(second.body.nextCursor).toBeNull();
		await agent().get('/llm-budgets').query({ cursor: 'not-a-cursor' }).expect(400);
	});

	it.each([
		['a target without a dimension', { ...budget, target: {} }],
		['a budget that only an agent may own', { ...budget, managedBy: 'agent' }],
	])('refuses %s', async (_name, body) => {
		await agent().post('/llm-budgets').send(body).expect(400);
	});

	it.each([
		['an API key without the scope', () => testServer.publicApiAgentFor(unscopedOwner)],
		['a member', () => testServer.publicApiAgentFor(member)],
		[
			'an unlicensed instance',
			() => {
				testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
				return agent();
			},
		],
	])('forbids %s', async (_name, requester) => {
		await requester().post('/llm-budgets').send(budget).expect(403);
	});

	it('blocks the next LLM call of a user who spent the budget, and reports the spend', async () => {
		await createLlmUsageCalls([
			{
				callId: 'call-1',
				finishedAt: new Date(),
				callerType: 'node',
				workflowId: 'wf-1',
				accountableUserId: owner.id,
				provider: 'openai',
				model: 'gpt-x',
				estimatedCostUsd: 1.5,
				priced: true,
			},
		]);
		const { body } = await agent().post('/llm-budgets').send(budget).expect(201);

		const status = await agent().get(`/llm-budgets/${body.id}/status`).expect(200);
		expect(status.body.data).toEqual([
			{ key: `user=${owner.id}`, spent: 1.5, percent: 150, unpricedCalls: 0 },
		]);

		const blocked = checkLlmCall({
			context: { callerType: 'node', workflowId: 'wf-1', userId: owner.id },
		});
		await expect(blocked).rejects.toBeInstanceOf(PolicyViolationError);
		await expect(blocked).rejects.toMatchObject({
			meta: { violations: [expect.objectContaining({ kind: 'llm-budget-exceeded' })] },
		});
		await expect(
			checkLlmCall({ context: { callerType: 'node', workflowId: 'wf-1', userId: member.id } }),
		).resolves.toBeUndefined();
	});
});
