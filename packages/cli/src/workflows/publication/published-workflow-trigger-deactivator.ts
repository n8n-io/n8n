import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { OnLeaderStepdown, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ActiveWorkflowTriggers, ErrorReporter, InstanceSettings } from 'n8n-core';

import { EventService } from '@/events/event.service';
import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

/**
 * How many consecutive teardown passes may find a workflow's lifecycle lock
 * held before the held lock itself is reported. One or two locked passes are
 * normal (an apply in flight); a longer streak means the holder is stuck and
 * the workflow can be neither swept nor torn down until it releases.
 */
const STUCK_LOCK_WARN_AFTER_PASSES = 3;

/**
 * Tears down in-memory triggers on leader stepdown and shutdown, and — as a
 * safeguard — sweeps the registry while not leader (driven by the
 * reconciler's loop, which ticks the sweep on non-leader instances): a trigger
 * registration on a non-leader should never exist, so anything found is torn
 * down and reported.
 *
 * All teardown shares one semantic: skip a workflow whose lifecycle lock is
 * held and let the periodic sweep retry it after the lock is released —
 * nothing ever waits on or bypasses a held lock. Convergence is guaranteed by
 * the reconciliation loop, not by any single pass.
 *
 * The one exception is shutdown: no sweep runs afterwards, so a workflow whose
 * lock is held at that instant keeps its triggers until the process exits.
 * Acceptable — exit reclaims all in-memory registrations, and broker-side
 * trigger state self-heals through its own session timeouts.
 */
@Service()
export class PublishedWorkflowTriggerDeactivator {
	private isShuttingDown = false;
	private consecutiveLockSkipsByWorkflowId: Map<string, number> = new Map();

	constructor(
		private readonly logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly lifecycleLock: WorkflowPublicationLifecycleLock,
		private readonly activeWorkflowTriggers: ActiveWorkflowTriggers,
		private readonly outboxConsumer: WorkflowPublicationOutboxConsumer,
		private readonly instanceSettings: InstanceSettings,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Deactivates all non-webhook triggers with a workflow specific lock
	 */
	@OnLeaderStepdown()
	@OnShutdown()
	async deactivateAllNonWebhookTriggers(): Promise<void> {
		if (!this.workflowsConfig.useWorkflowPublicationService) return;

		this.outboxConsumer.stopPolling();

		const workflowIds = this.activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds();

		await this.deactivateWorkflows(workflowIds);
	}

	async sweepGhostTriggers(): Promise<number> {
		if (this.instanceSettings.isLeader) return 0;

		const ghosts: string[] = [];

		// Nothing may escape this method: the loop tick driving it runs with
		// nobody awaiting it, so an escaped rejection would crash the process.
		try {
			const workflowIds = this.activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds();

			ghosts.push(...(await this.deactivateWorkflows(workflowIds)));

			if (ghosts.length > 0) {
				this.logger.warn(`Found ${ghosts.length} ghost workflows. Removed them.`, {
					workflowIds: ghosts,
				});
				this.eventService.emit('workflow-publication-ghost-trigger-sweep', {
					removedCount: ghosts.length,
				});
			}
		} catch (error) {
			this.errorReporter.error(error, { shouldBeLogged: true });
		}

		return ghosts.length;
	}

	/** Records a locked-skip and reports the lock as stuck once the streak hits the threshold. */
	private trackSkippedWhileLocked(workflowId: string) {
		const skips = (this.consecutiveLockSkipsByWorkflowId.get(workflowId) ?? 0) + 1;

		if (skips === STUCK_LOCK_WARN_AFTER_PASSES) {
			this.logger.warn(
				`Lifecycle lock for workflow "${workflowId}" still held after ${skips} teardown passes; its triggers cannot be torn down until the holder releases the lock`,
				{ workflowId, passes: skips },
			);
		}

		this.consecutiveLockSkipsByWorkflowId.set(workflowId, skips);
	}

	private async deactivateWorkflows(workflowIds: string[]) {
		const deactivatedWorkflows: string[] = [];

		for (const workflowId of workflowIds) {
			try {
				if (this.lifecycleLock.isLocked(workflowId)) {
					this.trackSkippedWhileLocked(workflowId);
					continue;
				}
				this.consecutiveLockSkipsByWorkflowId.delete(workflowId);
				const result = await this.lifecycleLock.runExclusive(workflowId, async () => {
					if (this.instanceSettings.isLeader && !this.isShuttingDown) return false;
					return await this.activeWorkflowTriggers.remove(workflowId);
				});
				if (result) {
					deactivatedWorkflows.push(workflowId);
				}
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}
		return deactivatedWorkflows;
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
	}
}
