import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { AgentPlanService } from '@/modules/agents/agent-plan.service';
import { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { createAgentPlanTools } from '@/modules/agents/plans/agent-plan-tools';
import {
	type AgentPlanDocument,
	type AgentPlanTask,
} from '@/modules/agents/plans/agent-plan.schema';
import {
	AgentPlanRepository,
	AgentPlanWriteConflictError,
} from '@/modules/agents/repositories/agent-plan.repository';

const task = (overrides: Partial<AgentPlanTask> = {}): AgentPlanTask => ({
	id: randomUUID(),
	kind: 'task',
	title: 'Task',
	description: 'Work',
	status: 'pending',
	dependsOn: [],
	startedAt: null,
	endedAt: null,
	...overrides,
});
const document = (...items: AgentPlanTask[]): AgentPlanDocument => ({
	title: 'Plan',
	description: 'Goal',
	items,
});

describe('AgentPlanService', () => {
	let service: AgentPlanService;
	let repository: AgentPlanRepository;
	let transactionRunner: TransactionRunner;
	let dataSource: DataSource;
	let agentId: string;
	let projectId: string;
	let threadId: string;

	beforeAll(async () => {
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		dataSource = Container.get(DataSource);
		repository = Container.get(AgentPlanRepository);
		transactionRunner = Container.get(TransactionRunner);
		service = Container.get(AgentPlanService);
		({ id: projectId } = await createTeamProject());
		agentId = randomUUID();
		await dataSource.getRepository(Agent).save({
			id: agentId,
			name: 'Plan model agent',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		});
	});

	beforeEach(async () => {
		threadId = `test-${agentId}:${randomUUID()}`;
		await dataSource.getRepository(AgentExecutionThread).save({
			id: threadId,
			agentId,
			agentName: 'Plan model agent',
			projectId,
			sessionNumber: 1,
		});
	});

	afterEach(async () => {
		await dataSource.getRepository(AgentExecutionThread).delete({ agentId });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const create = async (data = document(task())) =>
		await service.createActivePlan(
			{
				id: randomUUID(),
				threadId,
				formatVersion: 1,
				data,
			},
			{},
		);

	it('restores typed plans and immutable revisions through a fresh service', async () => {
		const first = task({ title: '研究 🔎' });
		const second = task({ dependsOn: [first.id] });
		const initial = await create(document(first, second));
		const updated = await service.replacePlan(
			{
				threadId,
				planId: initial.id,
				expectedRevision: 1,
				formatVersion: 1,
				data: document({ ...first, status: 'done', resultSummary: 'Ready' }, second),
			},
			{},
		);
		const fresh = new AgentPlanService(new AgentPlanRepository(dataSource, transactionRunner));
		expect(await fresh.findActivePlan(threadId, {})).toEqual(updated);
		expect(updated.readiness.ready).toEqual([second.id]);
		expect(updated.data.items[0].startedAt).toEqual(updated.data.items[0].endedAt);
		expect(await fresh.findRevision(threadId, initial.id, 1, {})).toMatchObject({
			data: initial.data,
		});
		expect(await fresh.findRevision(threadId, initial.id, 2, {})).toMatchObject({
			data: updated.data,
		});
		expect((await fresh.listHistory(threadId, initial.id, { limit: 1 }, {})).nextCursor).toBe(1);
		expect(
			(await fresh.listHistory(threadId, initial.id, { afterRevision: 1 }, {})).items.map(
				(item) => item.revision,
			),
		).toEqual([2]);
		expect(await fresh.findPlan('other-thread', initial.id, {})).toBeNull();
		expect(await fresh.findRevision('other-thread', initial.id, 1, {})).toBeNull();
		await expect(
			fresh.replacePlan(
				{
					threadId: 'other-thread',
					planId: initial.id,
					expectedRevision: 2,
					formatVersion: 1,
					data: updated.data,
				},
				{},
			),
		).rejects.toThrow(AgentPlanWriteConflictError);
	});

	it('stores fallback redirection in one revision and leaves no history after an invalid update', async () => {
		const original = task();
		const dependent = task({ dependsOn: [original.id] });
		const initial = await create(document(original, dependent));
		const failed = await service.replacePlan(
			{
				threadId,
				planId: initial.id,
				expectedRevision: 1,
				formatVersion: 1,
				data: document({ ...original, status: 'failed' }, dependent),
			},
			{},
		);
		const replacement = task({ fallbackFor: original.id });
		const next = await service.replacePlan(
			{
				threadId,
				planId: initial.id,
				expectedRevision: 2,
				formatVersion: 1,
				data: { ...failed.data, items: [...failed.data.items, replacement] },
			},
			{},
		);
		expect(next.revision).toBe(3);
		expect(next.data.items[0]).toEqual(failed.data.items[0]);
		expect(next.data.items[1].dependsOn).toEqual([replacement.id]);
		expect(
			(await service.findRevision(threadId, initial.id, 2, {}))?.data.items[1].dependsOn,
		).toEqual([original.id]);
		await expect(
			service.replacePlan(
				{
					threadId,
					planId: initial.id,
					expectedRevision: 3,
					formatVersion: 1,
					data: {
						...next.data,
						items: [next.data.items[0], { ...next.data.items[1], status: 'done' }, replacement],
					},
				},
				{},
			),
		).rejects.toThrow('Prerequisites');
		expect(await service.findPlan(threadId, initial.id, {})).toEqual(next);
		expect((await service.listHistory(threadId, initial.id, {}, {})).items).toHaveLength(3);
	});

	it('accepts only one concurrent update for a revision', async () => {
		const initial = await create();
		const input = {
			threadId,
			planId: initial.id,
			expectedRevision: 1,
			formatVersion: 1,
			data: initial.data,
		};
		const outcomes = await Promise.allSettled([
			service.replacePlan(input, {}),
			service.replacePlan(input, {}),
		]);
		expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
		const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
		expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(
			AgentPlanWriteConflictError,
		);
		expect((await service.listHistory(threadId, initial.id, {}, {})).items).toHaveLength(2);
	});

	it('joins an outer transaction and rolls back the document and history', async () => {
		const initial = await create();
		await expect(
			transactionRunner.run({}, async (ctx) => {
				const changed = await service.replacePlan(
					{
						threadId,
						planId: initial.id,
						expectedRevision: 1,
						formatVersion: 1,
						data: { ...initial.data, title: 'Changed' },
					},
					ctx,
				);
				expect(await service.findPlan(threadId, initial.id, ctx)).toEqual(changed);
				expect(await service.findRevision(threadId, initial.id, 2, ctx)).not.toBeNull();
				throw new Error('Rollback');
			}),
		).rejects.toThrow('Rollback');
		expect(await service.findPlan(threadId, initial.id, {})).toEqual(initial);
		expect(await service.findRevision(threadId, initial.id, 2, {})).toBeNull();
	});

	it('preserves closure behavior and permits a later active plan', async () => {
		const initial = await create();
		const closed = await service.closePlan(
			{ threadId, planId: initial.id, expectedRevision: 1 },
			{},
		);
		expect(closed.data).toEqual(initial.data);
		expect(closed.readiness).toEqual({ ready: [], blocked: [] });
		expect(await service.findActivePlan(threadId, {})).toBeNull();
		expect(await service.findRevision(threadId, initial.id, 2, {})).toMatchObject({
			data: initial.data,
			closedAt: closed.closedAt,
		});
		const next = await create();
		expect(next.id).not.toBe(initial.id);
		expect(await service.findActivePlan(threadId, {})).toEqual(next);
	});

	it('supports plan tools across turns and reconstructed tool instances', async () => {
		const call = async (name: string, input: unknown) => {
			const tool = createAgentPlanTools(new AgentPlanService(repository)).find(
				(entry) => entry.name === name,
			);
			if (!tool?.handler) throw new Error(`Missing tool: ${name}`);
			return await tool.handler(input, { persistence: { threadId, resourceId: agentId } });
		};
		const proposed = {
			title: 'Plan',
			description: 'Goal',
			items: [
				{
					id: 'new:research',
					kind: 'task',
					title: 'Research',
					description: 'Find facts',
					status: 'pending',
					dependsOn: [],
				},
			],
		};
		expect(await call('read_plan', {})).toBeNull();
		const created = await call('create_plan', { document: proposed });
		const current = await service.findActivePlan(threadId, {});
		if (!current) throw new Error('Expected active plan');
		expect(await call('read_plan', {})).toEqual(created);
		expect(await call('create_plan', { document: proposed })).toMatchObject({ error: 'conflict' });
		const write = { planId: current.id, expectedRevision: 1 };
		const running = {
			...proposed,
			items: [{ ...proposed.items[0], id: current.data.items[0].id, status: 'in_progress' }],
		};
		expect(await call('update_plan', { ...write, document: running })).toMatchObject({
			revision: 2,
		});
		const started = await service.findActivePlan(threadId, {});
		expect(started?.data.items[0].startedAt).not.toBeNull();
		expect(await call('update_plan', { ...write, document: running })).toMatchObject({
			error: 'conflict',
		});
		expect(
			await call('update_plan', {
				...write,
				expectedRevision: 2,
				document: { ...running, items: [{ ...running.items[0], description: 'Different work' }] },
			}),
		).toMatchObject({ error: 'invalid_plan' });
		expect((await service.listHistory(threadId, current.id, {}, {})).items).toHaveLength(2);
		const finished = { ...running, items: [{ ...running.items[0], status: 'done' }] };
		expect(
			await call('update_plan', { ...write, expectedRevision: 2, document: finished }),
		).toMatchObject({ revision: 3 });
		const done = await service.findActivePlan(threadId, {});
		expect(done?.data.items[0].startedAt).toEqual(started?.data.items[0].startedAt);
		expect(done?.data.items[0].endedAt).not.toBeNull();
		expect(await call('close_plan', { ...write, expectedRevision: 3 })).toMatchObject({
			revision: 4,
			closed: true,
			document: finished,
		});
		expect(await call('close_plan', { ...write, expectedRevision: 3 })).toMatchObject({
			error: 'conflict',
		});
		expect(await call('read_plan', {})).toBeNull();
		expect(await call('create_plan', { document: proposed })).toMatchObject({
			revision: 1,
			closed: false,
		});
		expect((await service.findActivePlan(threadId, {}))?.id).not.toBe(current.id);
		expect((await service.listHistory(threadId, current.id, {}, {})).items).toHaveLength(4);
	});

	it('scopes shared plan tools to each thread on every call', async () => {
		const current = await create();
		const otherThreadId = `test-${agentId}:${randomUUID()}`;
		await dataSource.getRepository(AgentExecutionThread).save({
			id: otherThreadId,
			agentId,
			agentName: 'Plan model agent',
			projectId,
			sessionNumber: 2,
		});
		const tools = createAgentPlanTools(service);
		const call = async (name: string, input: unknown, scope: string) => {
			const tool = tools.find((entry) => entry.name === name);
			if (!tool?.handler) throw new Error(`Missing tool: ${name}`);
			return await tool.handler(input, { persistence: { threadId: scope, resourceId: agentId } });
		};
		const write = { planId: current.id, expectedRevision: 1 };
		expect(await call('read_plan', {}, threadId)).toMatchObject({ planId: current.id });
		expect(await call('read_plan', {}, otherThreadId)).toBeNull();
		expect(await call('close_plan', write, otherThreadId)).toMatchObject({ error: 'conflict' });
		expect(
			await call(
				'update_plan',
				{ ...write, document: { title: 'Other', description: '', items: [] } },
				otherThreadId,
			),
		).toMatchObject({ error: 'conflict' });
		expect(
			await call(
				'create_plan',
				{ document: { title: 'Other', description: '', items: [] } },
				otherThreadId,
			),
		).toMatchObject({ revision: 1 });
		expect(await service.findActivePlan(threadId, {})).toEqual(current);
		expect((await service.listHistory(threadId, current.id, {}, {})).items).toHaveLength(1);
	});

	it('rejects unsupported stored formats without changing the storage contract', async () => {
		const unsupported = await repository.createActivePlan(
			{
				id: randomUUID(),
				threadId,
				formatVersion: 2,
				data: { future: true },
			},
			{},
		);
		await expect(service.findPlan(threadId, unsupported.id, {})).rejects.toThrow(
			'Unsupported plan format',
		);
		await expect(
			service.closePlan({ threadId, planId: unsupported.id, expectedRevision: 1 }, {}),
		).rejects.toThrow('Unsupported plan format');
		expect(await repository.findPlan(threadId, unsupported.id, {})).toEqual(unsupported);
	});
});
