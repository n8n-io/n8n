import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import type { ActiveWorkflowTriggers, ErrorReporter, InstanceSettings } from 'n8n-core';

import type { EventService } from '@/events/event.service';
import { PublishedWorkflowTriggerDeactivator } from '@/workflows/publication/published-workflow-trigger-deactivator';
import type { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';
import type { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

const RECONCILE_INTERVAL_SECONDS = 10;

/** Consecutive skipped sweeps after which a held lock is reported as stuck. */
const STUCK_LOCK_WARN_AFTER_SWEEPS = 3;

describe('PublishedWorkflowTriggerDeactivator', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const lifecycleLock = mock<WorkflowPublicationLifecycleLock>();
	const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
	const outboxConsumer = mock<WorkflowPublicationOutboxConsumer>();
	const eventService = mock<EventService>();

	// A follower by default; tests flip `isLeader` to simulate (mid-run) promotion.
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
			eventService,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		instanceSettings = { isLeader: false } as InstanceSettings;
		lifecycleLock.isLocked.mockReturnValue(false);
		lifecycleLock.runExclusive.mockImplementation(
			async (_workflowId, fn) => await (fn as () => Promise<unknown>)(),
		);
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([]);
		activeWorkflowTriggers.remove.mockResolvedValue(true);
	});

	describe('stepdown/shutdown teardown', () => {
		test('does nothing when the publication service is disabled', async () => {
			await createDeactivator(false).deactivateAllNonWebhookTriggers();

			expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).not.toHaveBeenCalled();
			expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
			expect(outboxConsumer.stopPolling).not.toHaveBeenCalled();
		});

		test('deactivates each workflow under its lock, silently', async () => {
			activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1', 'wf-2']);

			await createDeactivator().deactivateAllNonWebhookTriggers();

			expect(outboxConsumer.stopPolling).toHaveBeenCalledTimes(1);
			expect(lifecycleLock.runExclusive).toHaveBeenCalledWith('wf-1', expect.any(Function));
			expect(lifecycleLock.runExclusive).toHaveBeenCalledWith('wf-2', expect.any(Function));
			expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-1');
			expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-2');
			expect(errorReporter.error).not.toHaveBeenCalled();
			// Stepdown removals are routine lifecycle, not incidents.
			expect(logger.warn).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		test('skips a locked workflow instead of waiting or forcing', async () => {
			// No wait, no lockless teardown: the follower sweep retries it every
			// interval once the lock is released.
			activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([
				'wf-free',
				'wf-locked',
			]);
			lifecycleLock.isLocked.mockImplementation((workflowId) => workflowId === 'wf-locked');

			await createDeactivator().deactivateAllNonWebhookTriggers();

			expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-free');
			expect(activeWorkflowTriggers.remove).not.toHaveBeenCalledWith('wf-locked');
			expect(lifecycleLock.runExclusive).not.toHaveBeenCalledWith(
				'wf-locked',
				expect.any(Function),
			);
		});

		test('keeps deactivating the remaining workflows when one teardown throws', async () => {
			activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-bad', 'wf-good']);
			activeWorkflowTriggers.remove.mockImplementation(async (workflowId) => {
				if (workflowId === 'wf-bad') throw new Error('closeFunction failed');
				return true;
			});

			// A single workflow's teardown failure must not abort demotion cleanup
			// for every workflow after it.
			await createDeactivator().deactivateAllNonWebhookTriggers();

			expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-good');
			expect(errorReporter.error).toHaveBeenCalledWith(expect.any(Error), {
				shouldBeLogged: true,
			});
		});

		test('tears down at shutdown even while still leader', async () => {
			// A leader shutting down gracefully never loses leadership first —
			// the leader guard must not disable the shutdown teardown.
			instanceSettings = { isLeader: true } as InstanceSettings;
			activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1']);

			const deactivator = createDeactivator();
			deactivator.shutdown();
			await deactivator.deactivateAllNonWebhookTriggers();

			expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-1');
		});

		test('aborts the remaining teardown when promoted back to leader mid-stepdown', async () => {
			activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1', 'wf-2']);
			lifecycleLock.runExclusive.mockImplementation(async (_workflowId, fn) => {
				// Promotion lands while the teardown is waiting on the first lock —
				// deactivating now would race the takeover's own re-activation.
				instanceSettings = Object.assign(instanceSettings, { isLeader: true });
				return await (fn as () => Promise<unknown>)();
			});

			await createDeactivator().deactivateAllNonWebhookTriggers();

			expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
		});
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
				expect(eventService.emit).toHaveBeenCalledWith('workflow-publication-ghost-trigger-sweep', {
					removedCount: 2,
				});
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

			test('resolves and reports when a sweep listener throws', async () => {
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1', 'wf-2']);
				eventService.emit.mockImplementation(() => {
					throw new Error('listener blew up');
				});

				// Must resolve, not reject: the interval callback has nobody awaiting it.
				const removed = await createDeactivator().sweepGhostTriggers();

				expect(removed).toBe(2);
				expect(errorReporter.error).toHaveBeenCalledWith(expect.any(Error), {
					shouldBeLogged: true,
				});
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
				expect(eventService.emit).not.toHaveBeenCalled();
			});
		});

		describe('stuck-lock reporting', () => {
			test('stays quiet about a briefly held lock', async () => {
				// A lock held for one pass is normal (an apply in flight) — not an incident.
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-busy']);
				lifecycleLock.isLocked.mockReturnValue(true);

				await createDeactivator().sweepGhostTriggers();

				expect(logger.warn).not.toHaveBeenCalled();
			});

			test('warns about a workflow whose lock stays held across consecutive sweeps', async () => {
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-wedged']);
				lifecycleLock.isLocked.mockReturnValue(true);
				const deactivator = createDeactivator();

				for (let pass = 0; pass < STUCK_LOCK_WARN_AFTER_SWEEPS; pass++) {
					await deactivator.sweepGhostTriggers();
				}

				// Nothing was removed (always skipped), so the only warn is the stuck lock.
				expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
				expect(logger.warn).toHaveBeenCalled();
			});

			test('an unlocked pass resets the streak even when the teardown itself fails', async () => {
				// The warn claims the LOCK was held for N consecutive passes — a pass
				// that found the lock free must break the streak, whatever remove() did.
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1']);
				const deactivator = createDeactivator();

				lifecycleLock.isLocked.mockReturnValue(true);
				await deactivator.sweepGhostTriggers();
				await deactivator.sweepGhostTriggers();

				// Lock free, but the close itself fails.
				lifecycleLock.isLocked.mockReturnValue(false);
				activeWorkflowTriggers.remove.mockRejectedValueOnce(new Error('closeFunction failed'));
				await deactivator.sweepGhostTriggers();

				lifecycleLock.isLocked.mockReturnValue(true);
				await deactivator.sweepGhostTriggers();

				expect(logger.warn).not.toHaveBeenCalled();
			});

			test('resets the stuck-lock tracking once the workflow is swept', async () => {
				activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-flaky']);
				const deactivator = createDeactivator();

				// Two skipped passes, then the lock releases and the sweep handles it.
				lifecycleLock.isLocked.mockReturnValue(true);
				await deactivator.sweepGhostTriggers();
				await deactivator.sweepGhostTriggers();
				lifecycleLock.isLocked.mockReturnValue(false);
				await deactivator.sweepGhostTriggers();

				// Locked again: the previous skip streak must not carry over.
				logger.warn.mockClear();
				lifecycleLock.isLocked.mockReturnValue(true);
				await deactivator.sweepGhostTriggers();
				await deactivator.sweepGhostTriggers();

				expect(logger.warn).not.toHaveBeenCalled();
			});
		});
	});
});
