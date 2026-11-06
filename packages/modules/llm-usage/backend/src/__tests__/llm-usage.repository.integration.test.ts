import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { CredentialsRepository, GLOBAL_MEMBER_ROLE, UserRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import type { LlmUsage } from '../llm-usage.entity';
import { LlmUsageRepository } from '../llm-usage.repository';

let repository: LlmUsageRepository;
let user: User;

const day = (offset: number) => new Date(Date.UTC(2026, 9, 10 + offset, 12));
const range = { from: day(-1), to: day(5) };

/** A table of another module, with the test prefix and schema. */
const moduleTable = (name: string) => {
	const { driver, options } = repository.manager.connection;
	return driver.buildTableName(`${options.entityPrefix ?? ''}${name}`, driver.schema);
};

let sequence = 0;
const row = (overrides: Partial<LlmUsage> = {}): Partial<LlmUsage> => ({
	callId: `call-${++sequence}`,
	finishedAt: day(0),
	callerType: 'node',
	provider: 'openai',
	model: 'gpt-4o-mini',
	inputTokens: 10,
	outputTokens: 5,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	estimatedCostUsd: 0.5,
	priced: true,
	...overrides,
});

beforeAll(async () => {
	await testModules.loadModules(['llm-usage'], {
		'llm-usage': async () => await import('../llm-usage.module.js'),
	});
	await testDb.init();
	repository = Container.get(LlmUsageRepository);
	const users = Container.get(UserRepository);
	({ user } = await users.createUserWithProject(
		users.create({ email: 'ada@example.com', role: GLOBAL_MEMBER_ROLE }),
	));
});

beforeEach(async () => {
	await repository.delete({});
});

afterAll(async () => {
	await testDb.terminate();
});

describe('LlmUsageRepository', () => {
	it('sums budget spend per user and credential, with Gateway credits as one credential', async () => {
		const otherUserId = randomUUID();
		await repository.insertIgnoringDuplicates([
			row({ accountableUserId: user.id, credentialId: 'cred-1' }),
			row({ accountableUserId: user.id, managedBy: 'aiGateway' }),
			row({
				accountableUserId: otherUserId,
				credentialId: 'cred-1',
				estimatedCostUsd: null,
				priced: false,
			}),
			// Not counted: no user, or a caller that budgets skip.
			row({ credentialId: 'cred-1' }),
			row({ accountableUserId: user.id, credentialId: 'cred-1', callerType: 'instance-ai' }),
		]);

		const spend = await repository.spendByKey({
			from: day(-1),
			dimensions: { user: 'all', credential: 'all' },
			callerTypes: ['node', 'agent'],
		});

		expect(spend).toEqual(
			expect.arrayContaining([
				{ values: { user: user.id, credential: 'cred-1' }, costUsd: 0.5, unpriced: 0 },
				{ values: { user: user.id, credential: 'managed:aiGateway' }, costUsd: 0.5, unpriced: 0 },
				{ values: { user: otherUserId, credential: 'cred-1' }, costUsd: 0, unpriced: 1 },
			]),
		);
		expect(spend).toHaveLength(3);
	});

	it('sums budget spend only for the listed IDs and since the window start', async () => {
		await repository.insertIgnoringDuplicates([
			row({ workflowId: 'wf-1' }),
			row({ workflowId: 'wf-1', finishedAt: day(-2) }),
			row({ workflowId: 'wf-2' }),
		]);

		const spend = await repository.spendByKey({
			from: day(-1),
			dimensions: { workflow: ['wf-1'] },
			callerTypes: ['node', 'agent'],
		});

		expect(spend).toEqual([{ values: { workflow: 'wf-1' }, costUsd: 0.5, unpriced: 0 }]);
	});

	it('stores a call once when the same call ID is inserted twice', async () => {
		const call = row({ callId: 'same-call' });

		await repository.insertIgnoringDuplicates([call]);
		await repository.insertIgnoringDuplicates([call, row()]);

		expect(await repository.count()).toBe(2);
	});

	it('summarizes by workflow, caller, model, project, user and mode, with names', async () => {
		const project = await createTeamProject('Marketing');
		const workflow = await createWorkflow({ name: 'Lead scoring' }, project);
		await repository.insertIgnoringDuplicates([
			row({
				workflowId: workflow.id,
				projectId: project.id,
				userId: user.id,
				executionMode: 'manual',
				estimatedCostUsd: 2,
			}),
			row({
				workflowId: workflow.id,
				projectId: project.id,
				executionMode: 'trigger',
				provider: 'anthropic',
				model: 'claude-x',
				estimatedCostUsd: null,
				priced: false,
			}),
			row({ callerType: 'agent', estimatedCostUsd: 3 }),
		]);

		const byWorkflow = await repository.totalsByGroup({ ...range, groupBy: 'workflow' });
		// A call outside a workflow is left out.
		expect(byWorkflow).toEqual([
			expect.objectContaining({
				key: workflow.id,
				label: 'Lead scoring',
				calls: 2,
				unpricedCalls: 1,
				inputTokens: 20,
				outputTokens: 10,
				costUsd: 2,
			}),
		]);

		const byCaller = await repository.totalsByGroup({ ...range, groupBy: 'caller' });
		expect(byCaller.map((g) => [g.key, g.calls])).toEqual([
			['agent', 1],
			['node', 2],
		]);

		const byModel = await repository.totalsByGroup({ ...range, groupBy: 'model' });
		expect(byModel.map((g) => [g.key, g.calls])).toEqual([
			['openai/gpt-4o-mini', 2],
			['anthropic/claude-x', 1],
		]);

		const byProject = await repository.totalsByGroup({ ...range, groupBy: 'project' });
		expect(byProject).toContainEqual(
			expect.objectContaining({ key: project.id, label: 'Marketing', calls: 2 }),
		);

		const byUser = await repository.totalsByGroup({ ...range, groupBy: 'user' });
		expect(byUser).toContainEqual(
			expect.objectContaining({ key: user.id, label: 'ada@example.com', calls: 1 }),
		);

		const byMode = await repository.totalsByGroup({ ...range, groupBy: 'mode' });
		expect(byMode.map((g) => g.key).sort()).toEqual(['', 'manual', 'trigger']);
	});

	it('limits totals and recent calls to the time range, newest first', async () => {
		const project = await createTeamProject('Sales');
		await repository.insertIgnoringDuplicates([
			row({ callId: 'old', finishedAt: day(-3) }),
			row({ callId: 'first', finishedAt: day(1), projectId: project.id, userId: user.id }),
			row({ callId: 'second', finishedAt: day(2), priced: false, estimatedCostUsd: null }),
		]);

		expect(await repository.dailyTotals(range)).toEqual([
			{
				date: '2026-10-11',
				calls: 1,
				unpricedCalls: 0,
				inputTokens: 10,
				outputTokens: 5,
				cacheReadTokens: 0,
				costUsd: 0.5,
			},
			expect.objectContaining({ date: '2026-10-12', calls: 1, unpricedCalls: 1, costUsd: 0 }),
		]);

		const recent = await repository.listCalls({
			...range,
			skip: 0,
			take: 10,
			sortBy: 'finishedAt',
			sortOrder: 'desc',
		});
		expect(recent.count).toBe(2);
		expect(recent.items.map((call) => call.callId)).toEqual(['second', 'first']);
		expect(recent.items[1]).toMatchObject({ projectName: 'Sales', userEmail: 'ada@example.com' });
	});

	it('names the credential of a call, and who manages a credential that has no ID', async () => {
		const credentials = Container.get(CredentialsRepository);
		const credential = await credentials.save(
			credentials.create({ name: 'Team OpenAI', type: 'openAiApi', data: '' }),
		);
		await repository.insertIgnoringDuplicates([
			row({ callId: 'own', credentialId: credential.id }),
			row({ callId: 'deleted', credentialId: 'deleted-credential' }),
			row({ callId: 'gateway', managedBy: 'aiGateway' }),
		]);

		const { items } = await repository.listCalls({
			...range,
			skip: 0,
			take: 10,
			sortBy: 'finishedAt',
			sortOrder: 'desc',
		});
		const byId = new Map(items.map((call) => [call.callId, call]));
		expect(byId.get('own')).toMatchObject({ credentialName: 'Team OpenAI', managedBy: null });
		expect(byId.get('deleted')).toMatchObject({ credentialName: null, managedBy: null });
		expect(byId.get('gateway')).toMatchObject({ credentialName: null, managedBy: 'aiGateway' });
	});

	it('pages and sorts calls', async () => {
		await repository.insertIgnoringDuplicates([
			row({ callId: 'cheap', estimatedCostUsd: 0.1, finishedAt: day(1), model: 'model-c' }),
			row({ callId: 'mid', estimatedCostUsd: 0.5, finishedAt: day(2), model: 'model-a' }),
			row({ callId: 'dear', estimatedCostUsd: 2, finishedAt: day(3), model: 'model-b' }),
		]);
		const page = async (skip: number, sortOrder: 'asc' | 'desc') =>
			await repository.listCalls({
				...range,
				skip,
				take: 2,
				sortBy: 'estimatedCostUsd',
				sortOrder,
			});

		const first = await page(0, 'desc');
		expect(first.count).toBe(3);
		expect(first.items.map((call) => call.callId)).toEqual(['dear', 'mid']);
		expect((await page(2, 'desc')).items.map((call) => call.callId)).toEqual(['cheap']);
		expect((await page(0, 'asc')).items.map((call) => call.callId)).toEqual(['cheap', 'mid']);

		const byModel = await repository.listCalls({
			...range,
			skip: 0,
			take: 10,
			sortBy: 'model',
			sortOrder: 'asc',
		});
		expect(byModel.items.map((call) => call.model)).toEqual(['model-a', 'model-b', 'model-c']);
	});

	it('names the agent and the n8n Assistant session of a call, and groups by agent', async () => {
		const project = await createTeamProject('Support');
		const workflow = await createWorkflow({ name: 'Billing' }, project);
		const threadId = '0b6c5f1e-8d1a-4c39-9a51-3d3f0f6b2a10';
		// Other modules own these tables, so the rows go in by table name.
		await repository.manager
			.createQueryBuilder()
			.insert()
			.into(moduleTable('agents'), ['id', 'name', 'projectId'])
			.values({ id: 'agent-1', name: 'Triage agent', projectId: project.id })
			.execute();
		await repository.manager
			.createQueryBuilder()
			.insert()
			.into(moduleTable('instance_ai_threads'), ['id', 'resourceId', 'projectId', 'title'])
			.values({ id: threadId, resourceId: user.id, projectId: project.id, title: 'Fix invoices' })
			.execute();
		await repository.manager
			.createQueryBuilder()
			.insert()
			.into(moduleTable('agent_execution_threads'), [
				'id',
				'agentId',
				'agentName',
				'projectId',
				'title',
			])
			.values({
				id: 'session-1',
				agentId: 'agent-1',
				agentName: 'Triage agent',
				projectId: project.id,
				title: 'Refund question',
			})
			.execute();
		await repository.insertIgnoringDuplicates([
			row({
				callId: 'agent',
				callerType: 'agent',
				agentId: 'agent-1',
				threadId: 'session-1',
				estimatedCostUsd: 3,
			}),
			row({ callId: 'assistant', callerType: 'instance-ai', threadId }),
			row({ callId: 'billing', workflowId: workflow.id }),
		]);

		const sorted = await repository.listCalls({
			...range,
			skip: 0,
			take: 10,
			sortBy: 'name',
			sortOrder: 'asc',
		});
		expect(
			sorted.items.map((call) => [
				call.callId,
				call.agentName,
				call.threadTitle,
				call.workflowName,
			]),
		).toEqual([
			['billing', null, null, 'Billing'],
			['assistant', null, 'Fix invoices', null],
			['agent', 'Triage agent', 'Refund question', null],
		]);

		const byAgent = await repository.totalsByGroup({ ...range, groupBy: 'agent' });
		expect(byAgent).toEqual([
			expect.objectContaining({ key: 'agent-1', label: 'Triage agent', calls: 1, costUsd: 3 }),
		]);
	});

	it('sums each day and limits the groups', async () => {
		await repository.insertIgnoringDuplicates([
			row({ finishedAt: day(1), estimatedCostUsd: 1, model: 'a' }),
			row({ finishedAt: new Date(day(1).getTime() + 3_600_000), estimatedCostUsd: 2, model: 'b' }),
			row({ finishedAt: day(2), estimatedCostUsd: 4, model: 'c' }),
		]);

		expect(await repository.dailyTotals(range)).toEqual([
			expect.objectContaining({ date: '2026-10-11', calls: 2, costUsd: 3 }),
			expect.objectContaining({ date: '2026-10-12', calls: 1, costUsd: 4 }),
		]);
		const top = await repository.totalsByGroup({ ...range, groupBy: 'model', limit: 2 });
		expect(top.map((group) => group.key)).toEqual(['openai/c', 'openai/b']);
	});

	it('finds unpriced calls since a date and stores their prices', async () => {
		const unpriced = { estimatedCostUsd: null, priced: false };
		await repository.insertIgnoringDuplicates([
			row({ callId: 'old', finishedAt: day(-3), ...unpriced }),
			row({ callId: 'new', ...unpriced }),
			row({ callId: 'priced' }),
		]);

		const calls = await repository.findUnpriced(day(-1), 10);
		expect(calls).toEqual([
			expect.objectContaining({ provider: 'openai', model: 'gpt-4o-mini', inputTokens: 10 }),
		]);

		await repository.setPrices([{ callId: calls[0].callId, estimatedCostUsd: 0.25 }]);

		expect(await repository.findUnpriced(day(-1), 10)).toEqual([]);
		expect(await repository.findOneByOrFail({ callId: 'new' })).toMatchObject({
			estimatedCostUsd: 0.25,
			priced: true,
		});
	});

	it('reads unpriced calls page by page and never changes a priced call', async () => {
		const unpriced = { estimatedCostUsd: null, priced: false };
		await repository.insertIgnoringDuplicates([
			row({ callId: 'a', ...unpriced }),
			row({ callId: 'b', ...unpriced }),
			row({ callId: 'c', estimatedCostUsd: 1 }),
		]);

		const first = await repository.findUnpriced(day(-1), 1);
		const second = await repository.findUnpriced(day(-1), 1, first[0].callId);
		expect([...first, ...second].map((call) => call.callId)).toEqual(['a', 'b']);

		await repository.setPrices([{ callId: 'c', estimatedCostUsd: 9 }]);
		expect(await repository.findOneByOrFail({ callId: 'c' })).toMatchObject({
			estimatedCostUsd: 1,
		});
	});

	it('cuts a value longer than its column instead of failing the batch', async () => {
		await repository.insertIgnoringDuplicates([
			row({ callId: 'long', threadId: 't'.repeat(200) }),
			row({ callId: 'short' }),
		]);

		expect(await repository.count()).toBe(2);
		const long = await repository.findOneByOrFail({ callId: 'long' });
		expect(long.threadId).toHaveLength(128);
	});

	it('stores many prices at once, in chunks', async () => {
		const callIds = Array.from({ length: 250 }, (_, index) => `call-${index}`);
		await repository.insertIgnoringDuplicates(
			callIds.map((callId) => row({ callId, estimatedCostUsd: null, priced: false })),
		);

		await repository.setPrices(callIds.map((callId) => ({ callId, estimatedCostUsd: 0.5 })));

		expect(await repository.findUnpriced(day(-1), 10)).toEqual([]);
		expect(await repository.findOneByOrFail({ callId: 'call-249' })).toMatchObject({
			estimatedCostUsd: 0.5,
			priced: true,
		});
	});
});
