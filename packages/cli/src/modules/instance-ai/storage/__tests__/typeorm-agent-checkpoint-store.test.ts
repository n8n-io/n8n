import type { SerializableAgentState } from '@n8n/instance-ai';
import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

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

function makeCheckpoint(overrides: Partial<InstanceAiCheckpoint> = {}): InstanceAiCheckpoint {
	return {
		key: 'checkpoint:run-1',
		runId: 'run-1',
		threadId: 'thread-1',
		resourceId: 'user-1',
		state: makeState(),
		expiredAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as InstanceAiCheckpoint;
}

describe('TypeORMAgentCheckpointStore', () => {
	const checkpointRepo = mock<InstanceAiCheckpointRepository>();
	let store: TypeORMAgentCheckpointStore;

	beforeEach(() => {
		jest.clearAllMocks();
		store = new TypeORMAgentCheckpointStore(checkpointRepo);
	});

	it('requires native checkpoints to be owned by a thread', async () => {
		await expect(
			store.save('checkpoint:run-1', makeState({ persistence: undefined })),
		).rejects.toThrow('missing a thread id');

		expect(checkpointRepo.save).not.toHaveBeenCalled();
	});

	it('stores checkpoint state as structured JSON for a fresh key', async () => {
		const state = makeState();
		const checkpoint = makeCheckpoint({ state });
		checkpointRepo.findOne.mockResolvedValueOnce(null);
		checkpointRepo.create.mockReturnValueOnce(checkpoint);

		await store.save('checkpoint:run-1', state);

		expect(checkpointRepo.create).toHaveBeenCalledWith({
			key: 'checkpoint:run-1',
			runId: 'run-1',
			threadId: 'thread-1',
			resourceId: 'user-1',
			state,
			expiredAt: null,
		});
		expect(checkpointRepo.save).toHaveBeenCalledWith(checkpoint);
	});

	it('clears the expired tombstone flag when re-saving the same key', async () => {
		const existing = makeCheckpoint({ expiredAt: new Date(), state: null });
		checkpointRepo.findOne.mockResolvedValueOnce(existing);

		const newState = makeState();
		await store.save('checkpoint:run-1', newState);

		expect(checkpointRepo.save).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'checkpoint:run-1',
				expiredAt: null,
				state: newState,
			}),
		);
	});

	it('returns the stored state on load and leaves the row intact', async () => {
		const checkpoint = makeCheckpoint();
		checkpointRepo.findOne.mockResolvedValueOnce(checkpoint);

		const loaded = await store.load('checkpoint:run-1');

		expect(loaded).toBe(checkpoint.state);
		expect(checkpointRepo.delete).not.toHaveBeenCalled();
		expect(checkpointRepo.update).not.toHaveBeenCalled();
	});

	it('returns undefined when no checkpoint exists for the key', async () => {
		checkpointRepo.findOne.mockResolvedValueOnce(null);

		const loaded = await store.load('checkpoint:run-1');

		expect(loaded).toBeUndefined();
	});

	it('throws a UserError when loading an expired tombstone', async () => {
		checkpointRepo.findOne.mockResolvedValueOnce(
			makeCheckpoint({ expiredAt: new Date(), state: null }),
		);

		await expect(store.load('checkpoint:run-1')).rejects.toBeInstanceOf(UserError);
	});

	it('soft-deletes by stamping expiredAt and clearing the state blob', async () => {
		await store.delete('checkpoint:run-1');

		expect(checkpointRepo.update).toHaveBeenCalledWith(
			{ key: 'checkpoint:run-1' },
			expect.objectContaining({ state: null, expiredAt: expect.any(Date) }),
		);
		expect(checkpointRepo.delete).not.toHaveBeenCalled();
	});

	it('marks stale checkpoints expired via the query builder', async () => {
		const builder = {
			update: jest.fn(),
			set: jest.fn(),
			where: jest.fn(),
			andWhere: jest.fn(),
			execute: jest.fn(),
		};
		builder.update.mockReturnValue(builder);
		builder.set.mockReturnValue(builder);
		builder.where.mockReturnValue(builder);
		builder.andWhere.mockReturnValue(builder);
		builder.execute.mockResolvedValueOnce({ affected: 4, raw: {}, generatedMaps: [] });

		(checkpointRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValueOnce(builder);

		const olderThan = new Date('2026-05-01T00:00:00.000Z');
		await expect(store.markExpiredOlderThan(olderThan)).resolves.toBe(4);

		expect(builder.set).toHaveBeenCalledWith(
			expect.objectContaining({ state: null, expiredAt: expect.any(Date) }),
		);
		expect(builder.where).toHaveBeenCalledWith('updatedAt < :olderThan', { olderThan });
		expect(builder.andWhere).toHaveBeenCalledWith('expiredAt IS NULL');
	});

	it('keeps the deleteOlderThan shim delegating to markExpiredOlderThan', async () => {
		const spy = jest.spyOn(store, 'markExpiredOlderThan').mockResolvedValueOnce(7);

		await expect(store.deleteOlderThan(new Date(0))).resolves.toBe(7);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	describe('findSuspendedSubAgentResumeInfo', () => {
		it('picks the suspended tool call when parallel non-suspended ones are present', async () => {
			const state = makeState({
				pendingToolCalls: {
					'tc-finished': {
						toolCallId: 'tc-finished',
						toolName: 'list-tools',
						input: {},
						suspended: false,
					},
					'tc-suspended': {
						toolCallId: 'tc-suspended',
						toolName: 'ask-user',
						input: {},
						suspended: true,
						suspendPayload: {},
						resumeSchema: {},
						runId: 'inner-run',
					},
				},
			});
			checkpointRepo.findActiveByResourceId.mockResolvedValueOnce(
				makeCheckpoint({ key: 'run_outer', state }),
			);

			const info = await store.findSuspendedSubAgentResumeInfo('resource-x');

			expect(info).toEqual({
				runId: 'run_outer',
				toolCallId: 'tc-suspended',
				persistence: { threadId: 'thread-1', resourceId: 'user-1' },
			});
		});

		it('returns undefined when no entry in pendingToolCalls is suspended', async () => {
			const state = makeState({
				pendingToolCalls: {
					'tc-1': {
						toolCallId: 'tc-1',
						toolName: 'list-tools',
						input: {},
						suspended: false,
					},
				},
			});
			checkpointRepo.findActiveByResourceId.mockResolvedValueOnce(makeCheckpoint({ state }));

			await expect(store.findSuspendedSubAgentResumeInfo('resource-x')).resolves.toBeUndefined();
		});
	});
});
