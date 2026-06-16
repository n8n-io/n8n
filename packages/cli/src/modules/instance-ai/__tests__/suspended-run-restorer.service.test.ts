import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { SuspendedRunState } from '@n8n/instance-ai';
import { mock, type MockProxy } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import type { InstanceAiPendingConfirmation } from '../entities/instance-ai-pending-confirmation.entity';
import {
	SuspendedRunRestorer,
	type OrphanConfirmationStore,
	type RebuildSuspendedRunOutcome,
	type RunFinishEventPublisher,
	type RunSnapshotCanceller,
	type SuspendedRunRebuilder,
	type SuspendedRunStateRegistry,
} from '../suspended-run-restorer.service';

type Mocks = {
	logger: MockProxy<Logger>;
	pendingConfirmationRepo: MockProxy<OrphanConfirmationStore>;
	runState: MockProxy<SuspendedRunStateRegistry>;
	dbSnapshotStorage: MockProxy<RunSnapshotCanceller>;
	eventBus: MockProxy<RunFinishEventPublisher>;
	rebuilder: MockProxy<SuspendedRunRebuilder>;
};

function createRestorer(): { restorer: SuspendedRunRestorer; mocks: Mocks } {
	const mocks: Mocks = {
		logger: mock<Logger>(),
		pendingConfirmationRepo: mock<OrphanConfirmationStore>(),
		runState: mock<SuspendedRunStateRegistry>(),
		dbSnapshotStorage: mock<RunSnapshotCanceller>(),
		eventBus: mock<RunFinishEventPublisher>(),
		rebuilder: mock<SuspendedRunRebuilder>(),
	};
	mocks.dbSnapshotStorage.markRunCancelled.mockResolvedValue();
	mocks.rebuilder.resumeSuspendedRun.mockResolvedValue(false);

	const restorer = new SuspendedRunRestorer(mocks);
	return { restorer, mocks };
}

// Orphan rows + confirmation payloads are shaped freely in these tests; the
// restorer only reads the handful of fields exercised below.
const orphanRow = (
	overrides: Partial<InstanceAiPendingConfirmation>,
): InstanceAiPendingConfirmation => overrides as InstanceAiPendingConfirmation;
const approval = { approved: true };
const ready = {
	kind: 'ready',
	state: { threadId: 'thread-1', runId: 'run-1' } as unknown as SuspendedRunState<User>,
} satisfies RebuildSuspendedRunOutcome;

describe('SuspendedRunRestorer — orphan restoration', () => {
	it('returns false silently when no DB row is claimable', async () => {
		const { restorer, mocks } = createRestorer();
		mocks.pendingConfirmationRepo.claim.mockResolvedValue(undefined);

		const result = await restorer.resolveOrphanedConfirmation('user-1', 'req-missing', approval);

		expect(result).toBe(false);
		expect(mocks.rebuilder.rebuildSuspendedRun).not.toHaveBeenCalled();
		expect(mocks.eventBus.publish).not.toHaveBeenCalled();
	});

	it('returns false when the claim query itself fails', async () => {
		const { restorer, mocks } = createRestorer();
		mocks.pendingConfirmationRepo.claim.mockRejectedValue(new Error('db down'));

		const result = await restorer.resolveOrphanedConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(false);
	});

	it('throws a terminal UserError for an inline orphan (nothing to resume)', async () => {
		const { restorer, mocks } = createRestorer();
		mocks.pendingConfirmationRepo.claim.mockResolvedValue(
			orphanRow({
				requestId: 'req-1',
				threadId: 'thread-1',
				userId: 'user-1',
				kind: 'inline',
				runId: 'run-1',
			}),
		);

		await expect(restorer.resolveOrphanedConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			UserError,
		);
		expect(mocks.rebuilder.rebuildSuspendedRun).not.toHaveBeenCalled();
		expect(mocks.eventBus.publish).toHaveBeenCalledWith(
			'thread-1',
			expect.objectContaining({
				type: 'run-finish',
				runId: 'run-1',
				payload: expect.objectContaining({
					status: 'cancelled',
					reason: 'restart_lost_confirmation',
				}),
			}),
		);
		expect(mocks.dbSnapshotStorage.markRunCancelled).toHaveBeenCalledWith('thread-1', 'run-1');
	});

	it('throws when a suspended orphan lacks the pointers needed to resume', async () => {
		const { restorer, mocks } = createRestorer();
		mocks.pendingConfirmationRepo.claim.mockResolvedValue(
			orphanRow({
				requestId: 'req-1',
				threadId: 'thread-1',
				userId: 'user-1',
				kind: 'suspended',
				runId: 'run-1',
				// no toolCallId / checkpointKey -> can't resume
			}),
		);

		await expect(restorer.resolveOrphanedConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			UserError,
		);
		expect(mocks.rebuilder.rebuildSuspendedRun).not.toHaveBeenCalled();
	});

	it('rebuilds and resumes a suspended orphan when the checkpoint is loadable', async () => {
		const { restorer, mocks } = createRestorer();
		const orphan = orphanRow({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'suspended',
			runId: 'run-1',
			toolCallId: 'tool-1',
			checkpointKey: 'cp-1',
		});
		mocks.pendingConfirmationRepo.claim.mockResolvedValue(orphan);
		mocks.rebuilder.rebuildSuspendedRun.mockResolvedValue(ready);
		mocks.rebuilder.resumeSuspendedRun.mockResolvedValue(true);

		const result = await restorer.resolveOrphanedConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(true);
		expect(mocks.rebuilder.rebuildSuspendedRun).toHaveBeenCalledWith(orphan);
		expect(mocks.runState.suspendRun).toHaveBeenCalledWith('thread-1', ready.state);
		expect(mocks.rebuilder.resumeSuspendedRun).toHaveBeenCalledWith('user-1', 'req-1', approval);
		expect(mocks.eventBus.publish).not.toHaveBeenCalled();
	});

	it('falls back to the terminal UserError when the rebuild fails', async () => {
		const { restorer, mocks } = createRestorer();
		mocks.pendingConfirmationRepo.claim.mockResolvedValue(
			orphanRow({
				requestId: 'req-1',
				threadId: 'thread-1',
				userId: 'user-1',
				kind: 'suspended',
				runId: 'run-1',
				toolCallId: 'tool-1',
				checkpointKey: 'cp-1',
			}),
		);
		mocks.rebuilder.rebuildSuspendedRun.mockResolvedValue({ kind: 'no-checkpoint' });

		await expect(restorer.resolveOrphanedConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			UserError,
		);
		expect(mocks.rebuilder.resumeSuspendedRun).not.toHaveBeenCalled();
		expect(mocks.eventBus.publish).toHaveBeenCalled();
	});
});
