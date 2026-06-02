import { UserError } from 'n8n-workflow';

import {
	SuspendedThreadPersistenceService,
	type SuspendedRunRestorationHost,
	type RebuildSuspendedRunOutcome,
} from '../suspended-thread-persistence.service';

type Mocks = {
	logger: { debug: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock };
	pendingConfirmationRepo: {
		deleteExpired: jest.Mock;
		save: jest.Mock;
		create: jest.Mock;
		deleteByRequestId: jest.Mock;
		deleteByThreadId: jest.Mock;
		claim: jest.Mock;
	};
	agentMemory: { saveMessages: jest.Mock };
	dbSnapshotStorage: { markRunCancelled: jest.Mock };
	runState: { suspendRun: jest.Mock };
	host: {
		rebuildSuspendedRun: jest.Mock;
		resumeSuspendedRun: jest.Mock;
		publishRunFinish: jest.Mock;
	};
};

function createService(confirmationTimeout = 60_000): {
	service: SuspendedThreadPersistenceService;
	mocks: Mocks;
} {
	const mocks: Mocks = {
		logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
		pendingConfirmationRepo: {
			deleteExpired: jest.fn(async () => 0),
			save: jest.fn(async () => {}),
			create: jest.fn((entity: unknown) => entity),
			deleteByRequestId: jest.fn(async () => {}),
			deleteByThreadId: jest.fn(async () => {}),
			claim: jest.fn(async () => undefined),
		},
		agentMemory: { saveMessages: jest.fn(async () => {}) },
		dbSnapshotStorage: { markRunCancelled: jest.fn(async () => {}) },
		runState: { suspendRun: jest.fn() },
		host: {
			rebuildSuspendedRun: jest.fn(),
			resumeSuspendedRun: jest.fn(async () => false),
			publishRunFinish: jest.fn(),
		},
	};

	const service = new SuspendedThreadPersistenceService({
		logger: mocks.logger as unknown as SuspendedThreadPersistenceService['logger'],
		config: { confirmationTimeout } as never,
		pendingConfirmationRepo: mocks.pendingConfirmationRepo as never,
		agentMemory: mocks.agentMemory as never,
		dbSnapshotStorage: mocks.dbSnapshotStorage as never,
		runState: mocks.runState as never,
		host: mocks.host as unknown as SuspendedRunRestorationHost,
	});

	return { service, mocks };
}

const approval = { approved: true } as never;

describe('SuspendedThreadPersistenceService — pending confirmation persistence', () => {
	it('persists a pending confirmation with a computed expiry when a timeout is configured', async () => {
		const { service, mocks } = createService(60_000);

		await service.persistPendingConfirmation({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			runId: 'run-1',
			kind: 'suspended',
			toolCallId: 'tool-1',
			checkpointKey: 'cp-1',
		});

		expect(mocks.pendingConfirmationRepo.save).toHaveBeenCalledTimes(1);
		const saved = mocks.pendingConfirmationRepo.save.mock.calls[0][0];
		expect(saved).toMatchObject({
			requestId: 'req-1',
			threadId: 'thread-1',
			kind: 'suspended',
			toolCallId: 'tool-1',
			checkpointKey: 'cp-1',
			messageGroupId: null,
		});
		expect(saved.expiresAt).toBeInstanceOf(Date);
	});

	it('persists a null expiry when the timeout is disabled', async () => {
		const { service, mocks } = createService(0);

		await service.persistPendingConfirmation({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			runId: 'run-1',
			kind: 'inline',
		});

		expect(mocks.pendingConfirmationRepo.save.mock.calls[0][0].expiresAt).toBeNull();
	});

	it('swallows persistence errors so the agent flow is never blocked', async () => {
		const { service, mocks } = createService();
		mocks.pendingConfirmationRepo.save.mockRejectedValue(new Error('db down'));

		await expect(
			service.persistPendingConfirmation({
				requestId: 'req-1',
				threadId: 'thread-1',
				userId: 'user-1',
				runId: 'run-1',
				kind: 'suspended',
			}),
		).resolves.toBeUndefined();
		expect(mocks.logger.warn).toHaveBeenCalledWith(
			'Failed to persist pending confirmation',
			expect.objectContaining({ requestId: 'req-1' }),
		);
	});

	it('drops a pending confirmation by request id', async () => {
		const { service, mocks } = createService();
		await service.dropPendingConfirmation('req-1');
		expect(mocks.pendingConfirmationRepo.deleteByRequestId).toHaveBeenCalledWith('req-1');
	});

	it('drops all pending confirmations for a thread', async () => {
		const { service, mocks } = createService();
		await service.dropPendingConfirmationsForThread('thread-1');
		expect(mocks.pendingConfirmationRepo.deleteByThreadId).toHaveBeenCalledWith('thread-1');
	});

	it('prunes stale pending confirmations and logs the count', async () => {
		const { service, mocks } = createService();
		mocks.pendingConfirmationRepo.deleteExpired.mockResolvedValue(3);
		const now = new Date('2026-05-13T12:00:00.000Z').getTime();

		await service.pruneStalePendingConfirmations(now);

		expect(mocks.pendingConfirmationRepo.deleteExpired).toHaveBeenCalledWith(new Date(now));
		expect(mocks.logger.info).toHaveBeenCalledWith(
			'Dropped stale Instance AI pending confirmations',
			{ count: 3 },
		);
	});
});

describe('SuspendedThreadPersistenceService — user message persistence', () => {
	it('persists the user message to thread memory and reports success', async () => {
		const { service, mocks } = createService();

		const ok = await service.persistUserMessageOnSuspend('thread-1', 'user-1', {
			id: 'msg-1',
			text: 'hello',
		});

		expect(ok).toBe(true);
		expect(mocks.agentMemory.saveMessages).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				resourceId: 'user-1',
				messages: [expect.objectContaining({ id: 'msg-1', role: 'user' })],
			}),
		);
	});

	it('reports failure (so the caller retries) when the memory write throws', async () => {
		const { service, mocks } = createService();
		mocks.agentMemory.saveMessages.mockRejectedValue(new Error('db down'));

		const ok = await service.persistUserMessageOnSuspend('thread-1', 'user-1', {
			id: 'msg-1',
			text: 'hello',
		});

		expect(ok).toBe(false);
	});
});

describe('SuspendedThreadPersistenceService — orphan restoration', () => {
	const ready = {
		kind: 'ready',
		state: { threadId: 'thread-1', runId: 'run-1' },
	} as unknown as RebuildSuspendedRunOutcome & { kind: 'ready' };

	it('returns false silently when no DB row is claimable', async () => {
		const { service, mocks } = createService();
		mocks.pendingConfirmationRepo.claim.mockResolvedValue(undefined);

		const result = await service.resolveOrphanedConfirmation('user-1', 'req-missing', approval);

		expect(result).toBe(false);
		expect(mocks.host.rebuildSuspendedRun).not.toHaveBeenCalled();
		expect(mocks.host.publishRunFinish).not.toHaveBeenCalled();
	});

	it('returns false when the claim query itself fails', async () => {
		const { service, mocks } = createService();
		mocks.pendingConfirmationRepo.claim.mockRejectedValue(new Error('db down'));

		const result = await service.resolveOrphanedConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(false);
	});

	it('throws a terminal UserError for an inline orphan (nothing to resume)', async () => {
		const { service, mocks } = createService();
		mocks.pendingConfirmationRepo.claim.mockResolvedValue({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'inline',
			runId: 'run-1',
		});

		await expect(service.resolveOrphanedConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			UserError,
		);
		expect(mocks.host.rebuildSuspendedRun).not.toHaveBeenCalled();
		expect(mocks.host.publishRunFinish).toHaveBeenCalledWith(
			'thread-1',
			'run-1',
			'cancelled',
			'restart_lost_confirmation',
		);
		expect(mocks.dbSnapshotStorage.markRunCancelled).toHaveBeenCalledWith('thread-1', 'run-1');
	});

	it('throws when a suspended orphan lacks the pointers needed to resume', async () => {
		const { service, mocks } = createService();
		mocks.pendingConfirmationRepo.claim.mockResolvedValue({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'suspended',
			runId: 'run-1',
			// no toolCallId / checkpointKey -> can't resume
		});

		await expect(service.resolveOrphanedConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			UserError,
		);
		expect(mocks.host.rebuildSuspendedRun).not.toHaveBeenCalled();
	});

	it('rebuilds and resumes a suspended orphan when the checkpoint is loadable', async () => {
		const { service, mocks } = createService();
		const orphan = {
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'suspended',
			runId: 'run-1',
			toolCallId: 'tool-1',
			checkpointKey: 'cp-1',
		};
		mocks.pendingConfirmationRepo.claim.mockResolvedValue(orphan);
		mocks.host.rebuildSuspendedRun.mockResolvedValue(ready);
		mocks.host.resumeSuspendedRun.mockResolvedValue(true);

		const result = await service.resolveOrphanedConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(true);
		expect(mocks.host.rebuildSuspendedRun).toHaveBeenCalledWith(orphan);
		expect(mocks.runState.suspendRun).toHaveBeenCalledWith('thread-1', ready.state);
		expect(mocks.host.resumeSuspendedRun).toHaveBeenCalledWith('user-1', 'req-1', approval);
		expect(mocks.host.publishRunFinish).not.toHaveBeenCalled();
	});

	it('falls back to the terminal UserError when the rebuild fails', async () => {
		const { service, mocks } = createService();
		mocks.pendingConfirmationRepo.claim.mockResolvedValue({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'suspended',
			runId: 'run-1',
			toolCallId: 'tool-1',
			checkpointKey: 'cp-1',
		});
		mocks.host.rebuildSuspendedRun.mockResolvedValue({ kind: 'no-checkpoint' });

		await expect(service.resolveOrphanedConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			UserError,
		);
		expect(mocks.host.resumeSuspendedRun).not.toHaveBeenCalled();
		expect(mocks.host.publishRunFinish).toHaveBeenCalled();
	});
});
