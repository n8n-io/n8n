import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import type { ActiveWorkflowTriggers, ErrorReporter, InstanceSettings } from 'n8n-core';

import { PublishedWorkflowTriggerDeactivator } from '@/workflows/publication/published-workflow-trigger-deactivator';
import type { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';
import type { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

const RECONCILE_INTERVAL_SECONDS = 10;

describe('PublishedWorkflowTriggerDeactivator', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const lifecycleLock = mock<WorkflowPublicationLifecycleLock>();
	const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
	const outboxConsumer = mock<WorkflowPublicationOutboxConsumer>();

	// A follower by default; tests flip `isLeader` to simulate (mid-sweep) promotion.
	let instanceSettings: InstanceSettings;

	function createDeactivator(useWorkflowPublicationService = true) {
		const workflowsConfig = mock<WorkflowsConfig>({
			useWorkflowPublicationService,
			publicationReconcileIntervalSeconds: RECONCILE_INTERVAL_SECONDS,
		});
		return new PublishedWorkflowTriggerDeactivator(
			logger,
			workflowsConfig,
			errorReporter,
			lifecycleLock,
			activeWorkflowTriggers,
			outboxConsumer,
			instanceSettings,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		instanceSettings = { isLeader: false } as InstanceSettings;
		lifecycleLock.isLocked.mockReturnValue(false);
		lifecycleLock.getLockedWorkflowIds.mockReturnValue([]);
		// By default the lock runs the teardown immediately without timing out.
		lifecycleLock.runExclusiveOrTimeout.mockImplementation(async (_workflowId, fn) => {
			await fn();
			return { timedOut: false };
		});
		lifecycleLock.runExclusive.mockImplementation(
			async (_workflowId, fn) => await (fn as () => Promise<unknown>)(),
		);
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([]);
		activeWorkflowTriggers.remove.mockResolvedValue(true);
	});

	test('does nothing when the publication service is disabled', async () => {
		await createDeactivator(false).deactivateAllNonWebhookTriggers();

		expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).not.toHaveBeenCalled();
		expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
		expect(lifecycleLock.runExclusiveOrTimeout).not.toHaveBeenCalled();
		expect(outboxConsumer.stopPolling).not.toHaveBeenCalled();
	});

	test('deactivates each workflow under its lock', async () => {
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1', 'wf-2']);

		await createDeactivator(true).deactivateAllNonWebhookTriggers();

		expect(outboxConsumer.stopPolling).toHaveBeenCalledTimes(1);
		expect(lifecycleLock.runExclusiveOrTimeout).toHaveBeenCalledWith(
			'wf-1',
			expect.any(Function),
			30_000,
		);
		expect(lifecycleLock.runExclusiveOrTimeout).toHaveBeenCalledWith(
			'wf-2',
			expect.any(Function),
			30_000,
		);
		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-1');
		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-2');
		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	test('deactivates a workflow that only exists in the lifecycle lock', async () => {
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([]);
		lifecycleLock.getLockedWorkflowIds.mockReturnValue(['wf-in-flight']);
		lifecycleLock.isLocked.mockImplementation((workflowId) => workflowId === 'wf-in-flight');

		await createDeactivator(true).deactivateAllNonWebhookTriggers();

		expect(lifecycleLock.runExclusiveOrTimeout).toHaveBeenCalledWith(
			'wf-in-flight',
			expect.any(Function),
			30_000,
		);
		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-in-flight');
	});

	test('defers a locked workflow and deactivates it last', async () => {
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([
			'wf-free',
			'wf-locked',
		]);
		lifecycleLock.isLocked.mockImplementation((workflowId) => workflowId === 'wf-locked');

		const removed: string[] = [];
		activeWorkflowTriggers.remove.mockImplementation(async (workflowId) => {
			removed.push(workflowId);
			return true;
		});

		await createDeactivator(true).deactivateAllNonWebhookTriggers();

		// Both go through the lock, but the locked workflow is handled last.
		expect(removed).toEqual(['wf-free', 'wf-locked']);
		expect(lifecycleLock.runExclusiveOrTimeout).toHaveBeenCalledTimes(2);
	});

	test('reports when a locked workflow times out but still tears it down', async () => {
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-stuck']);
		lifecycleLock.isLocked.mockReturnValue(true);
		lifecycleLock.runExclusiveOrTimeout.mockImplementation(async (_workflowId, fn) => {
			await fn();
			return { timedOut: true };
		});

		await createDeactivator(true).deactivateAllNonWebhookTriggers();

		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-stuck');
		expect(errorReporter.error).toHaveBeenCalledWith(expect.any(Error), { shouldBeLogged: true });
	});

	describe('ghost-trigger janitor (follower)', () => {
		describe('sweepGhostTriggers', () => {
			test('removes registered workflows under their lock and returns the count', async () => {
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1', 'wf-2']);

				const removed = await createDeactivator().sweepGhostTriggers();

				expect(removed).toBe(2);
				expect(lifecycleLock.runExclusive).toHaveBeenCalledWith('wf-1', expect.any(Function));
				expect(lifecycleLock.runExclusive).toHaveBeenCalledWith('wf-2', expect.any(Function));
				expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-1');
				expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-2');
				// A ghost on a follower is evidence of a zombie writer — loud, not debug.
				expect(logger.warn).toHaveBeenCalled();
			});

			test('does nothing on the leader', async () => {
				instanceSettings = { isLeader: true } as InstanceSettings;
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1']);

				const removed = await createDeactivator().sweepGhostTriggers();

				expect(removed).toBe(0);
				expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
			});

			test('skips a workflow whose lifecycle lock is held and sweeps the rest', async () => {
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([
					'wf-busy',
					'wf-free',
				]);
				lifecycleLock.isLocked.mockImplementation((workflowId) => workflowId === 'wf-busy');

				const removed = await createDeactivator().sweepGhostTriggers();

				expect(removed).toBe(1);
				expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-free');
				expect(activeWorkflowTriggers.remove).not.toHaveBeenCalledWith('wf-busy');
				expect(lifecycleLock.runExclusive).not.toHaveBeenCalledWith(
					'wf-busy',
					expect.any(Function),
				);
			});

			test('aborts inside the lock when promoted to leader mid-sweep', async () => {
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1']);
				lifecycleLock.runExclusive.mockImplementation(async (_workflowId, fn) => {
					// Promotion lands while this sweep is waiting on the lock.
					instanceSettings = Object.assign(instanceSettings, { isLeader: true });
					return await (fn as () => Promise<unknown>)();
				});

				const removed = await createDeactivator().sweepGhostTriggers();

				expect(removed).toBe(0);
				expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
			});

			test('reports a failing teardown and keeps sweeping the remaining workflows', async () => {
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([
					'wf-stuck',
					'wf-fine',
				]);
				activeWorkflowTriggers.remove.mockImplementation(async (workflowId) => {
					if (workflowId === 'wf-stuck') throw new Error('closeFunction failed');
					return true;
				});

				// Must resolve, not reject: the interval callback has nobody awaiting it,
				// so a rejection here would crash the process.
				const removed = await createDeactivator().sweepGhostTriggers();

				expect(removed).toBe(1);
				expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-fine');
				expect(errorReporter.error).toHaveBeenCalledWith(expect.any(Error), {
					shouldBeLogged: true,
				});
			});

			test('does not count workflows that were no longer active and stays quiet when nothing was removed', async () => {
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-gone']);
				activeWorkflowTriggers.remove.mockResolvedValue(false);

				const removed = await createDeactivator().sweepGhostTriggers();

				expect(removed).toBe(0);
				expect(logger.warn).not.toHaveBeenCalled();
			});
		});

		describe('interval lifecycle', () => {
			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const advanceOneInterval = async () =>
				await vi.advanceTimersByTimeAsync(RECONCILE_INTERVAL_SECONDS * 1000);

			test('sweeps every reconcile interval once started', async () => {
				const deactivator = createDeactivator();
				deactivator.startGhostTriggerJanitor();

				await advanceOneInterval();
				await advanceOneInterval();

				expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).toHaveBeenCalledTimes(2);

				deactivator.stopGhostTriggerJanitor();
			});

			test('does not start when the publication service is disabled', async () => {
				createDeactivator(false).startGhostTriggerJanitor();

				await advanceOneInterval();

				expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).not.toHaveBeenCalled();
			});

			test('starting twice schedules only one interval', async () => {
				const deactivator = createDeactivator();
				deactivator.startGhostTriggerJanitor();
				deactivator.startGhostTriggerJanitor();

				await advanceOneInterval();

				expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).toHaveBeenCalledTimes(1);

				deactivator.stopGhostTriggerJanitor();
			});

			test('stops sweeping once stopped', async () => {
				const deactivator = createDeactivator();
				deactivator.startGhostTriggerJanitor();
				deactivator.stopGhostTriggerJanitor();

				await advanceOneInterval();

				expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).not.toHaveBeenCalled();
			});

			test('does not restart after shutdown', async () => {
				const deactivator = createDeactivator();
				deactivator.shutdown();
				deactivator.startGhostTriggerJanitor();

				await advanceOneInterval();

				expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).not.toHaveBeenCalled();
			});
		});
	});
});
