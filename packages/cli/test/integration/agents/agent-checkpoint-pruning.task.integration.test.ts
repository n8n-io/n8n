import type { SerializableAgentState } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { TransactionRunner, DbConnectionOptions } from '@n8n/db';
import { Container } from '@n8n/di';
import type { QueryRunner } from '@n8n/typeorm';
import { DataSource, IsNull, Not } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { AgentCheckpointPruningTask } from '@/modules/agents/agent-checkpoint-pruning.task';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';

const suspendedState: SerializableAgentState = {
	status: 'suspended',
	persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
	messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
	pendingToolCalls: {},
};
const suspendedJson = JSON.stringify(suspendedState);

const PRUNED = { expired: true, state: null };

const isPostgres = process.env.DB_TYPE === 'postgresdb';

describe('AgentCheckpointPruningTask', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	let agentRepository: AgentRepository;
	let checkpointRepository: AgentCheckpointRepository;
	let config: AgentsConfig;
	let storage: N8NCheckpointStorage;
	let task: AgentCheckpointPruningTask;
	let agentId: string;
	let stale: Date;

	function makeStorage(repository: AgentCheckpointRepository) {
		return new N8NCheckpointStorage(
			repository,
			logger,
			config,
			Container.get(TransactionRunner),
			Container.get(AgentExecutionRepository),
			Container.get(AgentExecutionThreadRepository),
			Container.get(AgentMessageQueueRepository),
		);
	}

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepository = Container.get(AgentRepository);
		checkpointRepository = Container.get(AgentCheckpointRepository);
		config = Container.get(AgentsConfig);
		storage = makeStorage(checkpointRepository);
		task = new AgentCheckpointPruningTask(storage);
		stale = new Date(Date.now() - (config.checkpointTtlSeconds + Time.hours.toSeconds) * 1000);
	});

	beforeEach(async () => {
		logger.info.mockClear();
		const project = await createTeamProject();
		const agent = agentRepository.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			schema: { name: 'Test Agent', model: 'm', instructions: 'i' },
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'version-1',
			activeVersionId: null,
		} as Partial<Agent>);
		agentId = (await agentRepository.save(agent)).id;
	});

	afterEach(async () => {
		await checkpointRepository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertCheckpoints(
		prefix: string,
		count: number,
		updatedAt: Date,
	): Promise<string[]> {
		const runIds = Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
		for (let start = 0; start < runIds.length; start += 500) {
			await checkpointRepository.insert(
				runIds.slice(start, start + 500).map((runId) => ({
					runId,
					agentId,
					state: suspendedJson,
					expired: false,
					createdAt: updatedAt,
					updatedAt,
				})),
			);
		}
		return runIds;
	}

	async function counts(): Promise<{ expired: number; open: number }> {
		return {
			expired: await checkpointRepository.count({ where: { expired: true, state: IsNull() } }),
			open: await checkpointRepository.count({ where: { expired: false, state: Not(IsNull()) } }),
		};
	}

	function expiredTotal(): number {
		return logger.info.mock.calls
			.filter(([message]) => message === 'Marked stale agent checkpoints as expired')
			.reduce((sum, [, meta]) => sum + (meta as { count: number }).count, 0);
	}

	it('should expire each stale checkpoint once across repeated runs', async () => {
		// Arrange: 3000 checkpoints past the TTL and 200 inside it.
		await insertCheckpoints('stale', 3000, stale);
		await insertCheckpoints('fresh', 200, new Date());

		// Act: four prune runs at once. The pool may serialize them, so this is
		// the idempotency check; the two-connection tests below cover the race.
		await Promise.all(Array.from({ length: 4 }, async () => await task.run()));

		// Assert: the stale rows are expired, the fresh rows are untouched, and the
		// logged counts sum to the stale rows, so no run expired a row twice.
		expect(await counts()).toEqual({ expired: 3000, open: 200 });
		expect(expiredTotal()).toBe(3000);
	});

	// A second connection holds one side of the race open in a transaction, so the
	// other side has to wait on the row lock like it would across two mains.
	describe.skipIf(!isPostgres)('across two connections', () => {
		let otherConnection: DataSource;
		let otherRunner: QueryRunner;
		let otherStorage: N8NCheckpointStorage;

		beforeAll(async () => {
			otherConnection = new DataSource(Container.get(DbConnectionOptions).getOptions());
			await otherConnection.initialize();
		});

		beforeEach(async () => {
			otherRunner = otherConnection.createQueryRunner();
			await otherRunner.startTransaction();
			const repository = new AgentCheckpointRepository(
				{
					manager: otherRunner.manager,
				} as DataSource,
				Container.get(TransactionRunner),
			);
			otherStorage = makeStorage(repository);
		});

		afterEach(async () => {
			if (otherRunner.isTransactionActive) await otherRunner.rollbackTransaction();
			await otherRunner.release();
		});

		afterAll(async () => {
			await otherConnection.destroy();
		});

		it('rejects expired approval while pruning is uncommitted', async () => {
			// Arrange: the other connection prunes the row but does not commit.
			const [runId] = await insertCheckpoints('stale', 1, stale);
			await new AgentCheckpointPruningTask(otherStorage).run();

			// Expiry rejects the claim before it needs the pruning lock.
			const claim = storage.claimForResume(runId, suspendedState, agentId);
			expect(await claim).toBe(false);
			await otherRunner.commitTransaction();

			// Assert: the resume sees the expired row and loses.
			expect(await claim).toBe(false);
			expect(await checkpointRepository.findByRunId(runId)).toMatchObject(PRUNED);
		});

		it('rejects expired approval before the pruning pass', async () => {
			const [runId] = await insertCheckpoints('stale', 1, stale);
			expect(await otherStorage.claimForResume(runId, suspendedState, agentId)).toBe(false);
			await otherRunner.commitTransaction();
			expect(await checkpointRepository.findByRunId(runId)).toMatchObject({
				expired: false,
				state: suspendedJson,
			});
			await expect(storage.load(runId, agentId)).rejects.toThrow('expired');
		});
	});
});
