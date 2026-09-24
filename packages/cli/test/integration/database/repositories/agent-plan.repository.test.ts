import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, InsertQueryBuilder } from '@n8n/typeorm';
import type { JsonObject } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentPlanHistory } from '@/modules/agents/entities/agent-plan-history.entity';
import { AgentPlan } from '@/modules/agents/entities/agent-plan.entity';
import { Agent } from '@/modules/agents/entities/agent.entity';
import {
	AgentPlanRepository,
	AgentPlanWriteConflictError,
} from '@/modules/agents/repositories/agent-plan.repository';

describe('AgentPlanRepository', () => {
	let dataSource: DataSource;
	let repository: AgentPlanRepository;
	let transactionRunner: TransactionRunner;
	let projectId: string;
	let agentId: string;
	let threadId: string;
	let otherThreadId: string;

	beforeAll(async () => {
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		dataSource = Container.get(DataSource);
		transactionRunner = Container.get(TransactionRunner);
		repository = Container.get(AgentPlanRepository);
		({ id: projectId } = await createTeamProject());
		agentId = randomUUID();
		await dataSource.getRepository(Agent).save({
			id: agentId,
			name: 'Plan storage agent',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		});
	});

	beforeEach(async () => {
		threadId = `test-${agentId}:${randomUUID()}`;
		otherThreadId = randomUUID();
		for (const id of [threadId, otherThreadId]) {
			await dataSource.getRepository(AgentExecutionThread).save({
				id,
				agentId,
				agentName: 'Plan storage agent',
				projectId,
				sessionNumber: 1,
			});
		}
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		await dataSource.getRepository(AgentExecutionThread).delete({ agentId });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const createPlan = async (data: JsonObject = {}) =>
		await repository.createActivePlan({ id: randomUUID(), threadId, formatVersion: 1, data }, {});

	it('stores an opaque document and reads it through a fresh repository', async () => {
		const data = {
			title: '研究 🔎',
			unknownField: { list: [null, true, 3, 'text', { nested: [] }] },
		};
		const plan = await createPlan(data);
		const freshRepository = new AgentPlanRepository(dataSource, transactionRunner);

		expect(await freshRepository.findActivePlan(threadId, {})).toEqual(plan);
		expect(await freshRepository.findPlan(threadId, plan.id, {})).toEqual(plan);
		expect(plan).toMatchObject({ threadId, revision: 1, formatVersion: 1, data, closedAt: null });
		expect(plan.createdAt).toEqual(plan.updatedAt);
		expect(await freshRepository.findRevision(threadId, plan.id, 1, {})).toMatchObject({
			planId: plan.id,
			revision: 1,
			formatVersion: 1,
			data,
			closedAt: null,
			createdAt: plan.updatedAt,
		});
	});

	it('replaces the document without changing earlier snapshots', async () => {
		const original = await createPlan({ before: true });
		const changed = await repository.replacePlan(
			{
				threadId,
				planId: original.id,
				expectedRevision: 1,
				formatVersion: 2,
				data: { after: true },
			},
			{},
		);

		expect(changed).toMatchObject({ revision: 2, formatVersion: 2, data: { after: true } });
		expect(changed.createdAt).toEqual(original.createdAt);
		expect(await repository.findRevision(threadId, original.id, 1, {})).toMatchObject({
			data: { before: true },
			formatVersion: 1,
		});
		expect(await repository.findRevision(threadId, original.id, 2, {})).toMatchObject({
			data: { after: true },
			formatVersion: 2,
			createdAt: changed.updatedAt,
		});
	});

	it('closes a plan and permits a later plan without changing the earlier one', async () => {
		const plan = await createPlan({ content: 'keep' });
		const closed = await repository.closePlan(
			{ threadId, planId: plan.id, expectedRevision: 1 },
			{},
		);

		expect(closed).toMatchObject({ revision: 2, data: plan.data, formatVersion: 1 });
		expect(closed.closedAt).toEqual(closed.updatedAt);
		expect(closed.closedAt).toBeInstanceOf(Date);
		expect(await repository.findActivePlan(threadId, {})).toBeNull();
		expect(await repository.findRevision(threadId, plan.id, 2, {})).toMatchObject({
			data: plan.data,
			closedAt: closed.closedAt,
			createdAt: closed.updatedAt,
		});
		const later = await createPlan({ content: 'new' });
		expect(await repository.findActivePlan(threadId, {})).toEqual(later);
		expect(await repository.findPlan(threadId, plan.id, {})).toEqual(closed);
		await expect(
			repository.replacePlan(
				{ threadId, planId: plan.id, expectedRevision: 2, formatVersion: 1, data: {} },
				{},
			),
		).rejects.toBeInstanceOf(AgentPlanWriteConflictError);
		await expect(
			repository.closePlan({ threadId, planId: plan.id, expectedRevision: 2 }, {}),
		).rejects.toBeInstanceOf(AgentPlanWriteConflictError);
	});

	it('rejects duplicate IDs and a second active plan without additional history', async () => {
		const plan = await createPlan();
		await expect(createPlan()).rejects.toBeInstanceOf(AgentPlanWriteConflictError);
		await expect(
			repository.createActivePlan(
				{ id: plan.id, threadId: otherThreadId, formatVersion: 1, data: {} },
				{},
			),
		).rejects.toBeInstanceOf(AgentPlanWriteConflictError);
		expect(await dataSource.getRepository(AgentPlanHistory).countBy({ planId: plan.id })).toBe(1);
		expect(await repository.findActivePlan(otherThreadId, {})).toBeNull();
	});

	it('permits only one concurrent active-plan creation', async () => {
		const results = await Promise.allSettled([
			createPlan({ writer: 1 }),
			createPlan({ writer: 2 }),
		]);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		for (const result of results) {
			if (result.status === 'rejected')
				expect(result.reason).toBeInstanceOf(AgentPlanWriteConflictError);
		}
		const plan = await repository.findActivePlan(threadId, {});
		if (!plan) throw new Error('Expected an active plan');
		expect(await dataSource.getRepository(AgentPlan).countBy({ threadId })).toBe(1);
		expect((await repository.listHistory(threadId, plan.id, {}, {})).items).toHaveLength(1);
	});

	it('permits only one concurrent update for the same revision', async () => {
		const plan = await createPlan();
		const input = { threadId, planId: plan.id, expectedRevision: 1, formatVersion: 1 };
		const results = await Promise.allSettled([
			repository.replacePlan({ ...input, data: { writer: 1 } }, {}),
			repository.replacePlan({ ...input, data: { writer: 2 } }, {}),
		]);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		for (const result of results) {
			if (result.status === 'rejected')
				expect(result.reason).toBeInstanceOf(AgentPlanWriteConflictError);
		}
		const current = await repository.findPlan(threadId, plan.id, {});
		expect(current?.revision).toBe(2);
		expect(await repository.findRevision(threadId, plan.id, 2, {})).toMatchObject({
			data: current?.data,
		});
		expect((await repository.listHistory(threadId, plan.id, {}, {})).items).toHaveLength(2);
		await expect(repository.replacePlan({ ...input, data: {} }, {})).rejects.toBeInstanceOf(
			AgentPlanWriteConflictError,
		);
		await expect(repository.closePlan(input, {})).rejects.toBeInstanceOf(
			AgentPlanWriteConflictError,
		);
		expect(await repository.findPlan(threadId, plan.id, {})).toEqual(current);
		expect((await repository.listHistory(threadId, plan.id, {}, {})).items).toHaveLength(2);
	});

	it('scopes current and historical access to the supplied thread', async () => {
		const plan = await createPlan();
		expect(await repository.findPlan(otherThreadId, plan.id, {})).toBeNull();
		expect(await repository.findRevision(otherThreadId, plan.id, 1, {})).toBeNull();
		expect(await repository.listHistory(otherThreadId, plan.id, {}, {})).toEqual({
			items: [],
			nextCursor: null,
		});
		await expect(
			repository.replacePlan(
				{
					threadId: otherThreadId,
					planId: plan.id,
					expectedRevision: 1,
					formatVersion: 1,
					data: {},
				},
				{},
			),
		).rejects.toBeInstanceOf(AgentPlanWriteConflictError);
		await expect(
			repository.closePlan({ threadId: otherThreadId, planId: plan.id, expectedRevision: 1 }, {}),
		).rejects.toBeInstanceOf(AgentPlanWriteConflictError);
		expect(await repository.findPlan(threadId, plan.id, {})).toEqual(plan);
	});

	it('returns null for missing records', async () => {
		const missingId = randomUUID();
		expect(await repository.findActivePlan(threadId, {})).toBeNull();
		expect(await repository.findPlan(threadId, missingId, {})).toBeNull();
		expect(await repository.findRevision(threadId, missingId, 1, {})).toBeNull();
		await expect(
			repository.closePlan({ threadId, planId: missingId, expectedRevision: 1 }, {}),
		).rejects.toBeInstanceOf(AgentPlanWriteConflictError);
	});

	it('orders history by revision with bounded metadata pages', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-09-24T12:00:00.000Z'));
		let plan = await createPlan();
		for (let revision = 1; revision < 103; revision++) {
			plan = await repository.replacePlan(
				{
					threadId,
					planId: plan.id,
					expectedRevision: revision,
					formatVersion: 1,
					data: { revision },
				},
				{},
			);
		}
		const first = await repository.listHistory(threadId, plan.id, {}, {});
		expect(first.items).toHaveLength(50);
		expect(first.nextCursor).toBe(50);
		expect(first.items.map((item) => item.revision)).toEqual(
			Array.from({ length: 50 }, (_, index) => index + 1),
		);
		expect(first.items[0]).not.toHaveProperty('data');
		expect(first.items[0].createdAt).toEqual(first.items[49].createdAt);
		const second = await repository.listHistory(threadId, plan.id, { afterRevision: 50 }, {});
		expect(second.items).toHaveLength(50);
		expect(second.items[0].revision).toBe(51);
		expect(second.nextCursor).toBe(100);
		const last = await repository.listHistory(threadId, plan.id, { afterRevision: 100 }, {});
		expect(last.items.map((item) => item.revision)).toEqual([101, 102, 103]);
		expect(last.nextCursor).toBeNull();
		expect(
			(await repository.listHistory(threadId, plan.id, { limit: 100 }, {})).items,
		).toHaveLength(100);
	});

	it.each([0, -1, 101, 1.5])('rejects an invalid history limit: %s', async (limit) => {
		await expect(repository.listHistory(threadId, randomUUID(), { limit }, {})).rejects.toThrow(
			'history limit',
		);
	});

	it.each([-1, 1.5])('rejects an invalid history cursor: %s', async (afterRevision) => {
		await expect(
			repository.listHistory(threadId, randomUUID(), { afterRevision }, {}),
		).rejects.toThrow('history cursor');
	});

	it.each([0, -1, 1.5, 2_147_483_648])('rejects invalid write versions: %s', async (version) => {
		await expect(
			repository.createActivePlan(
				{ id: randomUUID(), threadId, formatVersion: version, data: {} },
				{},
			),
		).rejects.toThrow('positive 32-bit integers');
		const plan = await createPlan();
		await expect(
			repository.replacePlan(
				{ threadId, planId: plan.id, expectedRevision: 1, formatVersion: version, data: {} },
				{},
			),
		).rejects.toThrow('positive 32-bit integers');
		await expect(
			repository.closePlan({ threadId, planId: plan.id, expectedRevision: version }, {}),
		).rejects.toThrow('positive 32-bit integers');
		expect(await repository.findPlan(threadId, plan.id, {})).toEqual(plan);
	});

	it('requires a caller-supplied UUID', async () => {
		await expect(
			repository.createActivePlan({ id: 'invalid-id', threadId, formatVersion: 1, data: {} }, {}),
		).rejects.toThrow('UUID');
	});

	it.each(['create', 'replace', 'close'])(
		'rolls back %s when the history insert fails',
		async (operation) => {
			const original = operation === 'create' ? null : await createPlan({ original: true });
			const id = original?.id ?? randomUUID();
			const execute = InsertQueryBuilder.prototype.execute;
			const insert = vi.spyOn(InsertQueryBuilder.prototype, 'execute');
			if (operation === 'create') insert.mockImplementationOnce(execute);
			insert.mockRejectedValueOnce(new Error('Snapshot insert failed'));
			const input = { threadId, planId: id, expectedRevision: 1, formatVersion: 1, data: {} };
			const write =
				operation === 'create'
					? repository.createActivePlan({ ...input, id }, {})
					: operation === 'replace'
						? repository.replacePlan(input, {})
						: repository.closePlan(input, {});

			await expect(write).rejects.toThrow('Snapshot insert failed');
			insert.mockRestore();
			expect(await repository.findPlan(threadId, id, {})).toEqual(original);
			expect((await repository.listHistory(threadId, id, {}, {})).items).toHaveLength(
				original ? 1 : 0,
			);
		},
	);

	it('joins an outer transaction and rolls back all plan changes together', async () => {
		const id = randomUUID();
		await expect(
			transactionRunner.run({}, async (ctx) => {
				await repository.createActivePlan({ id, threadId, formatVersion: 1, data: {} }, ctx);
				const changed = await repository.replacePlan(
					{ threadId, planId: id, expectedRevision: 1, formatVersion: 2, data: { changed: true } },
					ctx,
				);
				expect(await repository.findActivePlan(threadId, ctx)).toEqual(changed);
				expect(await repository.findPlan(threadId, id, ctx)).toEqual(changed);
				expect(await repository.findRevision(threadId, id, 2, ctx)).toMatchObject({
					data: changed.data,
				});
				await repository.closePlan({ threadId, planId: id, expectedRevision: 2 }, ctx);
				expect((await repository.listHistory(threadId, id, {}, ctx)).items).toHaveLength(3);
				throw new Error('Rollback outer transaction');
			}),
		).rejects.toThrow('Rollback outer transaction');
		expect(await repository.findPlan(threadId, id, {})).toBeNull();
		expect(await repository.listHistory(threadId, id, {}, {})).toEqual({
			items: [],
			nextCursor: null,
		});
	});

	it('requires an existing thread and removes all its plans and history on deletion', async () => {
		await expect(
			repository.createActivePlan(
				{
					id: randomUUID(),
					threadId: randomUUID(),
					formatVersion: 1,
					data: {},
				},
				{},
			),
		).rejects.toThrow();
		const first = await createPlan();
		await repository.closePlan({ threadId, planId: first.id, expectedRevision: 1 }, {});
		const second = await createPlan();
		const other = await repository.createActivePlan(
			{
				id: randomUUID(),
				threadId: otherThreadId,
				formatVersion: 1,
				data: {},
			},
			{},
		);
		await dataSource.getRepository(AgentExecutionThread).delete({ id: threadId });
		for (const id of [first.id, second.id]) {
			expect(await dataSource.getRepository(AgentPlan).countBy({ id })).toBe(0);
			expect(await dataSource.getRepository(AgentPlanHistory).countBy({ planId: id })).toBe(0);
		}
		expect(await repository.findActivePlan(otherThreadId, {})).toEqual(other);
	});
});
