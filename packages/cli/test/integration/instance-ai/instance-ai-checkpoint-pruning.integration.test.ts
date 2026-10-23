import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { DbConnectionOptions, type Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type { SerializableAgentState } from '@n8n/agents';
import type { QueryRunner } from '@n8n/typeorm';
import { DataSource, IsNull, Not } from '@n8n/typeorm';
import { sleep } from '@n8n/utils/sleep';
import { randomUUID } from 'node:crypto';

import { InstanceAiCheckpointRepository } from '@/modules/instance-ai/repositories/instance-ai-checkpoint.repository';
import { InstanceAiThreadRepository } from '@/modules/instance-ai/repositories/instance-ai-thread.repository';
import { TypeORMAgentCheckpointStore } from '@/modules/instance-ai/storage/typeorm-agent-checkpoint-store';

const HOUR = 60 * 60 * 1000;
const isPostgres = process.env.DB_TYPE === 'postgresdb';

const EXPIRED = { expiredAt: expect.any(Date), state: null };
const RESUMED = { expiredAt: null, state: expect.objectContaining({ status: 'running' }) };

describe('Instance AI checkpoint pruning', () => {
	let checkpointRepository: InstanceAiCheckpointRepository;
	let threadRepository: InstanceAiThreadRepository;
	let store: TypeORMAgentCheckpointStore;
	let project: Project;
	let threadId: string;
	let suspendedState: SerializableAgentState;
	let olderThan: Date;
	let stale: Date;

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		checkpointRepository = Container.get(InstanceAiCheckpointRepository);
		threadRepository = Container.get(InstanceAiThreadRepository);
		store = Container.get(TypeORMAgentCheckpointStore);
		project = await createTeamProject();
	});

	beforeEach(async () => {
		threadId = randomUUID();
		await threadRepository.save(
			threadRepository.create({
				id: threadId,
				resourceId: 'user-1',
				projectId: project.id,
				title: '',
				metadata: null,
			}),
		);
		suspendedState = {
			status: 'suspended',
			persistence: { threadId, resourceId: 'user-1' },
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
		};
		olderThan = new Date(Date.now() - HOUR);
		stale = new Date(Date.now() - 2 * HOUR);
	});

	afterEach(async () => {
		await checkpointRepository.delete({});
		await threadRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertCheckpoints(
		prefix: string,
		count: number,
		row: { updatedAt: Date; expiredAt: Date | null },
	): Promise<string[]> {
		const keys = Array.from({ length: count }, (_, i) => `${prefix}:${i}`);
		for (let start = 0; start < keys.length; start += 500) {
			await checkpointRepository.save(
				checkpointRepository.create(
					keys.slice(start, start + 500).map((key) => ({
						key,
						runId: key,
						hostRunId: null,
						threadId,
						resourceId: 'user-1',
						state: row.expiredAt === null ? suspendedState : null,
						expiredAt: row.expiredAt,
						createdAt: row.updatedAt,
						updatedAt: row.updatedAt,
					})),
				),
			);
		}
		return keys;
	}

	async function counts(): Promise<{ expired: number; open: number }> {
		return {
			expired: await checkpointRepository.count({ where: { expiredAt: Not(IsNull()) } }),
			open: await checkpointRepository.count({ where: { expiredAt: IsNull() } }),
		};
	}

	function sum(values: number[]): number {
		return values.reduce((total, value) => total + value, 0);
	}

	it('should expire each stale checkpoint once across concurrent prune runs', async () => {
		await insertCheckpoints('stale', 3000, { updatedAt: stale, expiredAt: null });
		await insertCheckpoints('fresh', 200, { updatedAt: new Date(), expiredAt: null });

		const expired = await Promise.all(
			Array.from({ length: 4 }, async () => await store.markExpiredOlderThan(olderThan)),
		);

		expect(await counts()).toEqual({ expired: 3000, open: 200 });
		expect(sum(expired)).toBe(3000);
	});

	it('should hard-delete each expired tombstone once across concurrent prune runs', async () => {
		await insertCheckpoints('old', 3000, { updatedAt: stale, expiredAt: stale });
		await insertCheckpoints('recent', 200, { updatedAt: stale, expiredAt: new Date() });

		const deleted = await Promise.all(
			Array.from({ length: 4 }, async () => await store.hardDeleteExpiredOlderThan(olderThan)),
		);

		expect(await counts()).toEqual({ expired: 200, open: 0 });
		expect(sum(deleted)).toBe(3000);
	});

	it('should not expire a checkpoint that a resume claimed', async () => {
		const [key] = await insertCheckpoints('stale', 1, { updatedAt: stale, expiredAt: null });

		expect(await store.claimForResume(key, suspendedState)).toBe(true);
		const expired = await store.markExpiredOlderThan(olderThan);

		expect(expired).toBe(0);
		expect(await checkpointRepository.findOneByOrFail({ key })).toMatchObject(RESUMED);
	});

	// A second connection holds one side of the race open in a transaction, so the
	// other side has to wait on the row lock like it would across two mains.
	describe.skipIf(!isPostgres)('across two connections', () => {
		let otherConnection: DataSource;
		let otherRunner: QueryRunner;
		let otherStore: TypeORMAgentCheckpointStore;

		beforeAll(async () => {
			otherConnection = new DataSource(Container.get(DbConnectionOptions).getOptions());
			await otherConnection.initialize();
		});

		beforeEach(async () => {
			otherRunner = otherConnection.createQueryRunner();
			await otherRunner.startTransaction();
			otherStore = new TypeORMAgentCheckpointStore(
				new InstanceAiCheckpointRepository({ manager: otherRunner.manager } as DataSource),
			);
		});

		afterEach(async () => {
			if (otherRunner.isTransactionActive) await otherRunner.rollbackTransaction();
			await otherRunner.release();
		});

		afterAll(async () => {
			await otherConnection.destroy();
		});

		async function isPending(promise: Promise<unknown>): Promise<boolean> {
			return await Promise.race([promise.then(() => false), sleep(250).then(() => true)]);
		}

		it('should block a resume behind an uncommitted prune and then reject it', async () => {
			const [key] = await insertCheckpoints('stale', 1, { updatedAt: stale, expiredAt: null });
			await otherStore.markExpiredOlderThan(olderThan);

			const claim = store.claimForResume(key, suspendedState);
			expect(await isPending(claim)).toBe(true);
			await otherRunner.commitTransaction();

			expect(await claim).toBe(false);
			expect(await checkpointRepository.findOneByOrFail({ key })).toMatchObject(EXPIRED);
		});

		it('should block a prune behind an uncommitted resume and then skip the resumed row', async () => {
			const [resumed, untouched] = await insertCheckpoints('stale', 2, {
				updatedAt: stale,
				expiredAt: null,
			});
			expect(await otherStore.claimForResume(resumed, suspendedState)).toBe(true);

			const prune = store.markExpiredOlderThan(olderThan);
			expect(await isPending(prune)).toBe(true);
			await otherRunner.commitTransaction();

			expect(await prune).toBe(1);
			expect(await checkpointRepository.findOneByOrFail({ key: resumed })).toMatchObject(RESUMED);
			expect(await checkpointRepository.findOneByOrFail({ key: untouched })).toMatchObject(EXPIRED);
		});
	});
});
