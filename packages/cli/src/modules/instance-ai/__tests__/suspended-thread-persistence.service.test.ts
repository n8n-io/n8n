import type { Logger } from '@n8n/backend-common';
import { mock, type MockProxy } from 'jest-mock-extended';

import type { InstanceAiPendingConfirmation } from '../entities/instance-ai-pending-confirmation.entity';
import {
	SuspendedThreadPersistenceService,
	type PendingConfirmationStore,
} from '../suspended-thread-persistence.service';

type Mocks = {
	logger: MockProxy<Logger>;
	pendingConfirmationRepo: MockProxy<PendingConfirmationStore>;
};

function createService(confirmationTimeout = 60_000): {
	service: SuspendedThreadPersistenceService;
	mocks: Mocks;
} {
	const mocks: Mocks = {
		logger: mock<Logger>(),
		pendingConfirmationRepo: mock<PendingConfirmationStore>(),
	};
	// `create` is a pure builder — pass the entity through so assertions can
	// inspect what `save` was handed.
	mocks.pendingConfirmationRepo.create.mockImplementation(
		(entity) => entity as InstanceAiPendingConfirmation,
	);
	mocks.pendingConfirmationRepo.deleteExpired.mockResolvedValue(0);

	const service = new SuspendedThreadPersistenceService({
		logger: mocks.logger,
		config: { confirmationTimeout },
		pendingConfirmationRepo: mocks.pendingConfirmationRepo,
	});

	return { service, mocks };
}

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
