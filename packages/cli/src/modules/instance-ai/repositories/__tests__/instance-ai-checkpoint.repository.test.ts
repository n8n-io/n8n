import type { SerializableAgentState } from '@n8n/agents';
import type { TransactionRunner } from '@n8n/db';
import type {
	DataSource,
	DeleteResult,
	EntityManager,
	SelectQueryBuilder,
	UpdateQueryBuilder,
	UpdateResult,
} from '@n8n/typeorm';
import { LessThan } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { InstanceAiCheckpoint } from '../../entities/instance-ai-checkpoint.entity';
import { InstanceAiCheckpointRepository } from '../instance-ai-checkpoint.repository';

function makeState(): SerializableAgentState {
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
	};
}

function makeCheckpoint(overrides: Partial<InstanceAiCheckpoint> = {}): InstanceAiCheckpoint {
	return Object.assign(new InstanceAiCheckpoint(), {
		key: 'checkpoint:run-1',
		runId: 'run-1',
		hostRunId: 'host-run-1',
		threadId: 'thread-1',
		resourceId: 'user-1',
		state: makeState(),
		expiredAt: null,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		...overrides,
	});
}

describe('InstanceAiCheckpointRepository', () => {
	let manager: ReturnType<typeof mock<EntityManager>>;
	let repository: InstanceAiCheckpointRepository;

	beforeEach(() => {
		manager = mock<EntityManager>();
		const dataSource = mock<DataSource>({ manager });
		repository = new InstanceAiCheckpointRepository(dataSource, mock<TransactionRunner>());
	});

	it('loads a checkpoint filtered by key', async () => {
		const checkpoint = makeCheckpoint();
		manager.findOne.mockResolvedValueOnce(checkpoint);

		await expect(repository.findByKey('checkpoint:run-1', {})).resolves.toBe(checkpoint);
		expect(manager.findOne).toHaveBeenCalledWith(InstanceAiCheckpoint, {
			where: { key: 'checkpoint:run-1' },
		});
	});

	it('creates and persists a new checkpoint', async () => {
		const values = {
			key: 'checkpoint:run-1',
			runId: 'run-1',
			hostRunId: 'host-run-1',
			threadId: 'thread-1',
			resourceId: 'user-1',
			state: makeState(),
			expiredAt: null,
		};
		const created = makeCheckpoint(values);
		manager.create.mockReturnValueOnce(created);

		await repository.createCheckpoint(values, {});

		expect(manager.create).toHaveBeenCalledWith(InstanceAiCheckpoint, values);
		expect(manager.save).toHaveBeenCalledWith(InstanceAiCheckpoint, created);
	});

	it('saves changes to an existing checkpoint', async () => {
		const checkpoint = makeCheckpoint({ hostRunId: 'host-run-2' });

		await repository.saveCheckpointChanges(checkpoint, {});

		expect(manager.save).toHaveBeenCalledWith(InstanceAiCheckpoint, checkpoint);
	});

	it('soft-expires a single checkpoint by key and clears its state blob', async () => {
		const expiredAt = new Date('2026-05-01T00:00:00.000Z');

		await repository.markExpiredByKey('checkpoint:run-1', expiredAt, {});

		expect(manager.update).toHaveBeenCalledWith(
			InstanceAiCheckpoint,
			{ key: 'checkpoint:run-1' },
			{ expiredAt, state: null },
		);
	});

	it('marks stale non-expired checkpoints older than the cutoff and defaults missing affected count to 0', async () => {
		const olderThan = new Date('2026-05-01T00:00:00.000Z');
		const updateQueryBuilder = mock<UpdateQueryBuilder<InstanceAiCheckpoint>>();
		updateQueryBuilder.set.mockReturnThis();
		updateQueryBuilder.where.mockReturnThis();
		updateQueryBuilder.andWhere.mockReturnThis();
		updateQueryBuilder.execute
			.mockResolvedValueOnce(mock<UpdateResult>({ affected: 4 }))
			.mockResolvedValueOnce(mock<UpdateResult>({ affected: undefined }));

		const queryBuilder = mock<SelectQueryBuilder<InstanceAiCheckpoint>>();
		queryBuilder.update.mockReturnValue(updateQueryBuilder);
		manager.createQueryBuilder.mockReturnValue(queryBuilder);

		await expect(repository.markExpiredOlderThan(olderThan, {})).resolves.toBe(4);
		expect(queryBuilder.update).toHaveBeenCalledWith(InstanceAiCheckpoint);
		expect(updateQueryBuilder.set).toHaveBeenCalledWith({
			expiredAt: expect.any(Date),
			state: null,
		});
		expect(updateQueryBuilder.where).toHaveBeenCalledWith('updatedAt < :olderThan', { olderThan });
		expect(updateQueryBuilder.andWhere).toHaveBeenCalledWith('expiredAt IS NULL');

		await expect(repository.markExpiredOlderThan(olderThan, {})).resolves.toBe(0);
	});

	it('hard-deletes tombstones expired before the cutoff and defaults missing affected count to 0', async () => {
		const olderThan = new Date('2026-05-01T00:00:00.000Z');
		manager.delete
			.mockResolvedValueOnce(mock<DeleteResult>({ affected: 3 }))
			.mockResolvedValueOnce(mock<DeleteResult>({ affected: undefined }));

		await expect(repository.deleteExpiredOlderThan(olderThan, {})).resolves.toBe(3);
		expect(manager.delete).toHaveBeenCalledWith(InstanceAiCheckpoint, {
			expiredAt: LessThan(olderThan),
		});

		await expect(repository.deleteExpiredOlderThan(olderThan, {})).resolves.toBe(0);
	});
});
