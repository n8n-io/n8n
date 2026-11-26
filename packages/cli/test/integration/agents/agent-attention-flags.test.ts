import { AgentCheckpoint } from '@/modules/agents/entities/agent-checkpoint.entity';
import { AgentCheckpointPruningTask } from '@/modules/agents/agent-checkpoint-pruning.task';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, wrapMigration, sqliteMigrations, postgresMigrations } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { sleep } from '@n8n/utils/sleep';

import { AgentAttentionFlagEntity } from '@/modules/agents/entities/agent-attention-flag.entity';
import { AgentAttentionFlagRepository } from '@/modules/agents/repositories/agent-attention-flag.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createAgent } from '../shared/db/agents';
import { createMember } from '../shared/db/users';

describe('Agent attention flags', () => {
	let flags: AgentAttentionFlagRepository;
	let threads: AgentExecutionThreadRepository;
	let agents: AgentRepository;
	let executions: AgentExecutionRepository;
	let tx: TransactionRunner;
	let projectId: string;
	let agentId: string;
	let otherAgentId: string;
	let userId: string;
	let otherUserId: string;
	const scope = () => ({ projectId, agentId, userId });

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		flags = Container.get(AgentAttentionFlagRepository);
		threads = Container.get(AgentExecutionThreadRepository);
		agents = Container.get(AgentRepository);
		executions = Container.get(AgentExecutionRepository);
		tx = Container.get(TransactionRunner);
		userId = (await createMember()).id;
		otherUserId = (await createMember()).id;
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
		agentId = (await createAgent({ name: 'Agent', projectId })).id;
		otherAgentId = (await createAgent({ name: 'Other', projectId })).id;
	});

	afterEach(async () => {
		await executions.delete({});
		await threads.delete({});
		await agents.delete({});
	});
	afterAll(async () => await testDb.terminate());

	async function session(overrides = {}) {
		return await threads.save(
			threads.create({
				id: uuid(),
				agentId,
				agentName: 'Agent',
				projectId,
				accessScope: 'project',
				ownerId: null,
				...overrides,
			}),
		);
	}

	it('reverts and reapplies the attention flag schema', async () => {
		const dataSource = Container.get(DataSource);
		const migration = [...sqliteMigrations, ...postgresMigrations].find(
			(candidate) => candidate.name === 'CreateAgentAttentionFlags1795546358454',
		);
		if (!migration) throw new Error('Attention flag migration not found');
		// Template databases skip startup migration wrapping in this worker.
		wrapMigration(migration);
		// Runs this migration directly, so a newer migration does not change what the test reverts.
		const applied = dataSource.migrations.find(
			(candidate) => candidate.constructor.name === migration.name,
		);
		if (!applied?.down) throw new Error('Attention flag migration is not registered');
		const tablePath = dataSource.getMetadata(AgentAttentionFlagEntity).tablePath;
		const runner = dataSource.createQueryRunner();
		try {
			await applied.down(runner);
			const tableExists = await runner.hasTable(tablePath);
			if (!tableExists) await applied.up(runner);
			expect(tableExists).toBe(false);
		} finally {
			await runner.release();
		}
		expect(await dataSource.getRepository(AgentAttentionFlagEntity).count()).toBe(0);
	});

	it('deduplicates active flags and preserves new flags during shared dismissal', async () => {
		const first = await session();
		await flags.flagSession(first.id, 'session-error', {});
		await flags.flagSession(first.id, 'session-error', {});
		const viewed = await flags.list(scope());
		expect(viewed).toHaveLength(1);
		expect(await flags.list(scope(), 'session-error')).toEqual(viewed);
		const second = await session();
		await flags.flagSession(second.id, 'session-error', {});
		await flags.dismiss(
			scope(),
			'session-error',
			viewed.map(({ id }) => id),
		);
		expect(
			(await flags.list({ ...scope(), userId: otherUserId })).map(({ sessionId }) => sessionId),
		).toEqual([second.id]);
		await flags.flagSession(first.id, 'session-error', {});
		await flags.dismiss(
			scope(),
			'session-error',
			viewed.map(({ id }) => id),
		);
		expect(await flags.list(scope())).toHaveLength(2);
	});

	it('preserves a new error on a session that was already flagged', async () => {
		const thread = await session();
		await flags.flagSession(thread.id, 'session-error', {});
		const viewed = await flags.list(scope());
		await flags.flagSession(thread.id, 'session-error', {});
		await flags.dismiss(
			scope(),
			'session-error',
			viewed.map(({ id }) => id),
		);
		const current = await flags.list(scope());
		expect(current).toHaveLength(1);
		expect(current[0].id).not.toBe(viewed[0].id);
	});

	it.skipIf(process.env.DB_TYPE !== 'postgresdb')(
		'preserves refreshed flags across concurrent dismissal in either lock order',
		async () => {
			const thread = await session();
			await flags.flagSession(thread.id, 'session-error', {});
			const viewed = await flags.list(scope());
			const refreshed = createDeferredPromise();
			const release = createDeferredPromise();
			const refresh = tx.run({}, async (ctx) => {
				await flags.flagSession(thread.id, 'session-error', ctx);
				refreshed.resolve();
				await release.promise;
			});
			await Promise.race([refreshed.promise, refresh]);
			const dismissal = flags.dismiss(
				scope(),
				'session-error',
				viewed.map(({ id }) => id),
			);
			try {
				expect(await Promise.race([dismissal.then(() => false), sleep(100).then(() => true)])).toBe(
					true,
				);
			} finally {
				release.resolve();
				await Promise.all([refresh, dismissal]);
			}
			const current = await flags.list(scope());
			expect(current).toHaveLength(1);
			expect(current[0].id).not.toBe(viewed[0].id);

			const runner = Container.get(DataSource).createQueryRunner();
			await runner.startTransaction();
			let nextError: Promise<void> | undefined;
			try {
				await runner.manager.delete(AgentAttentionFlagEntity, { id: current[0].id });
				nextError = flags.flagSession(thread.id, 'session-error', {});
				expect(await Promise.race([nextError.then(() => false), sleep(100).then(() => true)])).toBe(
					true,
				);
				await runner.commitTransaction();
			} finally {
				if (runner.isTransactionActive) await runner.rollbackTransaction();
				await runner.release();
				await nextError;
			}
			expect(await flags.list(scope())).toHaveLength(1);
		},
	);

	it('retries the whole checkpoint expiry when flag persistence fails', async () => {
		const thread = await session();
		const execution = await executions.save(
			executions.create({
				threadId: thread.id,
				status: 'awaiting',
				startedAt: new Date(),
				storedAt: 'db',
			}),
		);
		const checkpoints = Container.get(DataSource).getRepository(AgentCheckpoint);
		await checkpoints.insert({
			runId: uuid(),
			agentId,
			threadId: thread.id,
			state: '{}',
			expired: false,
			updatedAt: new Date('2020-01-01T00:00:00Z'),
		});
		const fail = vi
			.spyOn(flags, 'flagSession')
			.mockRejectedValueOnce(new Error('Database unavailable'));
		const task = Container.get(AgentCheckpointPruningTask);
		await expect(task.run(new AbortController().signal)).rejects.toThrow('Database unavailable');
		expect(await checkpoints.findOneByOrFail({ threadId: thread.id })).toMatchObject({
			state: '{}',
			expired: false,
		});
		expect(await executions.findOneByOrFail({ id: execution.id })).toMatchObject({
			status: 'awaiting',
		});
		fail.mockRestore();
		await task.run(new AbortController().signal);
		expect(await checkpoints.findOneByOrFail({ threadId: thread.id })).toMatchObject({
			state: null,
			expired: true,
		});
		expect(await flags.list(scope())).toHaveLength(1);
	});

	it('keeps flags within the agent, project and private-session scope', async () => {
		const visible = await session();
		const privateSession = await session({ accessScope: 'user', ownerId: otherUserId });
		const otherAgentSession = await session({ agentId: otherAgentId });
		const otherProject = await session({ projectId: (await createTeamProject()).id });
		for (const thread of [visible, privateSession, otherAgentSession, otherProject]) {
			await flags.flagSession(thread.id, 'session-error', {});
		}
		expect((await flags.list(scope())).map(({ sessionId }) => sessionId)).toEqual([visible.id]);
		const all = await Container.get(DataSource).getRepository(AgentAttentionFlagEntity).find();
		await flags.dismiss(
			scope(),
			'session-error',
			all.map(({ id }) => id),
		);
		expect(await Container.get(DataSource).getRepository(AgentAttentionFlagEntity).count()).toBe(3);
	});

	it('cascades session deletion and rolls back flag creation with its transaction', async () => {
		const thread = await session();
		await expect(
			tx.run({}, async (ctx) => {
				await flags.flagSession(thread.id, 'session-error', ctx);
				throw new Error('Rollback');
			}),
		).rejects.toThrow('Rollback');
		expect(await flags.list(scope())).toEqual([]);
		await flags.flagSession(thread.id, 'session-error', {});
		await threads.delete({ id: thread.id });
		expect(await flags.list(scope())).toEqual([]);
	});

	it('flags approvals only when they transition from awaiting to error', async () => {
		const thread = await session();
		const execution = await executions.save(
			executions.create({
				threadId: thread.id,
				status: 'awaiting',
				startedAt: new Date(),
				storedAt: 'db',
			}),
		);
		await executions.failExpiredWaitingApprovals([thread.id]);
		expect(await executions.findOneByOrFail({ id: execution.id })).toMatchObject({
			status: 'error',
		});
		const viewed = await flags.list(scope());
		expect(viewed).toHaveLength(1);
		await flags.dismiss(
			scope(),
			'session-error',
			viewed.map(({ id }) => id),
		);
		await executions.failExpiredWaitingApprovals([thread.id]);
		expect(await flags.list(scope())).toEqual([]);
	});

	it('keeps joined recent-chat pagination compatible with SQLite', async () => {
		const thread = await session({ accessScope: 'user', ownerId: userId });
		await executions.save(
			executions.create({
				threadId: thread.id,
				status: 'success',
				source: 'n8n_chat_production',
				startedAt: new Date(),
				storedAt: 'db',
			}),
		);
		const page = await threads.findN8nChatThreadsForOwner(userId, [agentId], { limit: 10 });
		expect(page.threads.map(({ id }) => id)).toEqual([thread.id]);
	});

	it('pages through equal timestamps without a session ID filter', async () => {
		const updatedAt = new Date('2026-01-01T00:00:00.000Z');
		const lower = await session({ id: 'a|lower', updatedAt });
		const higher = await session({ id: 'a|suffix', updatedAt });

		const first = await threads.findByProjectIdPaginated(projectId, agentId, userId, 1);
		expect(first.threads.map(({ id }) => id)).toEqual([higher.id]);
		expect(first.nextCursor).not.toBeNull();

		const second = await threads.findByProjectIdPaginated(
			projectId,
			agentId,
			userId,
			1,
			first.nextCursor ?? undefined,
		);
		expect(second.threads.map(({ id }) => id)).toEqual([lower.id]);
		expect(second.nextCursor).toBeNull();
	});

	it('filters hundreds of session IDs across pages with equal timestamps', async () => {
		const included = [];
		for (let i = 0; i < 205; i++) included.push(await session());
		const excluded = await session();
		const hidden = await session({ accessScope: 'user', ownerId: otherUserId });
		await threads
			.createQueryBuilder()
			.update()
			.set({ updatedAt: new Date('2026-01-01T00:00:00.000Z') })
			.execute();
		const sessionIds = [...included.map(({ id }) => id), hidden.id, uuid()];
		const found: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await threads.findByProjectIdPaginated(projectId, agentId, userId, 50, cursor, {
				sessionIds,
			});
			found.push(...page.threads.map(({ id }) => id));
			cursor = page.nextCursor ?? undefined;
		} while (cursor && found.length < 250);
		expect(found).toHaveLength(205);
		expect(new Set(found)).toEqual(new Set(included.map(({ id }) => id)));
		expect(found).not.toContain(excluded.id);
		expect(
			(
				await threads.findByProjectIdPaginated(projectId, agentId, userId, 50, undefined, {
					sessionIds: [],
				})
			).threads,
		).toEqual([]);
	});
});
