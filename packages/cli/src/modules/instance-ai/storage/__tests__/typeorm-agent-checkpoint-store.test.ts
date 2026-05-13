import type { SerializableAgentState } from '@n8n/instance-ai';
import type { DeleteResult, EntityManager, Repository } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { InstanceAiCheckpoint } from '../../entities/instance-ai-checkpoint.entity';
import type { InstanceAiCheckpointRepository } from '../../repositories/instance-ai-checkpoint.repository';
import { TypeORMAgentCheckpointStore } from '../typeorm-agent-checkpoint-store';

function makeState(overrides: Partial<SerializableAgentState> = {}): SerializableAgentState {
	return {
		status: 'suspended',
		messageList: {
			messages: [],
			historyIds: [],
			inputIds: [],
			responseIds: [],
		},
		pendingToolCalls: {},
		persistence: {
			threadId: 'thread-1',
			resourceId: 'user-1',
		},
		...overrides,
	};
}

function makeCheckpoint(state = makeState()): InstanceAiCheckpoint {
	return {
		key: 'checkpoint:run-1',
		runId: 'run-1',
		threadId: 'thread-1',
		resourceId: 'user-1',
		state: JSON.stringify(state),
		createdAt: new Date(),
		updatedAt: new Date(),
	} as InstanceAiCheckpoint;
}

describe('TypeORMAgentCheckpointStore', () => {
	const checkpointRepo = mock<InstanceAiCheckpointRepository>();
	let store: TypeORMAgentCheckpointStore;

	function setTransactionManager(txManager: EntityManager): void {
		const repoManager = checkpointRepo.manager as unknown as { transaction: jest.Mock };
		repoManager.transaction.mockImplementation(
			async <T>(callback: (manager: EntityManager) => Promise<T>) => await callback(txManager),
		);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		Object.defineProperty(checkpointRepo, 'manager', {
			value: mock<EntityManager>(),
			configurable: true,
		});
		store = new TypeORMAgentCheckpointStore(checkpointRepo);
	});

	it('requires native checkpoints to be owned by a thread', async () => {
		await expect(
			store.save('checkpoint:run-1', makeState({ persistence: undefined })),
		).rejects.toThrow('missing a thread id');

		expect(checkpointRepo.save).not.toHaveBeenCalled();
	});

	it('serializes concurrent loads so only one caller consumes a checkpoint per process', async () => {
		let checkpoint: InstanceAiCheckpoint | undefined = makeCheckpoint();
		const txRepo = mock<Repository<InstanceAiCheckpoint>>();
		txRepo.findOne.mockImplementation(async () => {
			const captured = checkpoint;
			await Promise.resolve();
			return captured ?? null;
		});
		txRepo.delete.mockImplementation(async (): Promise<DeleteResult> => {
			const affected = checkpoint ? 1 : 0;
			checkpoint = undefined;
			return { affected, raw: {} };
		});

		const txManager = {
			connection: { options: { type: 'sqlite' } },
			getRepository: () => txRepo,
		} as unknown as EntityManager;
		setTransactionManager(txManager);

		const [first, second] = await Promise.all([
			store.load('checkpoint:run-1'),
			store.load('checkpoint:run-1'),
		]);

		expect([first, second].filter(Boolean)).toHaveLength(1);
		expect(txRepo.delete).toHaveBeenCalledTimes(1);
	});

	it('uses a pessimistic lock when the database supports it', async () => {
		const txRepo = mock<Repository<InstanceAiCheckpoint>>();
		txRepo.findOne.mockResolvedValueOnce(makeCheckpoint());
		txRepo.delete.mockResolvedValueOnce({ affected: 1, raw: {} });
		const txManager = {
			connection: { options: { type: 'postgres' } },
			getRepository: () => txRepo,
		} as unknown as EntityManager;
		setTransactionManager(txManager);

		await store.load('checkpoint:run-1');

		const findOptions = txRepo.findOne.mock.calls[0][0];
		expect(findOptions.lock).toEqual({ mode: 'pessimistic_write' });
	});

	it('deletes stale checkpoints by update time', async () => {
		checkpointRepo.delete.mockResolvedValueOnce({ affected: 3, raw: {} });
		const olderThan = new Date('2026-05-01T00:00:00.000Z');

		await expect(store.deleteOlderThan(olderThan)).resolves.toBe(3);

		expect(checkpointRepo.delete).toHaveBeenCalledWith({
			updatedAt: expect.any(Object),
		});
	});
});
