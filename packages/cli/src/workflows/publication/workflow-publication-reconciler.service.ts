import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
} from '@n8n/db';
import { OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import {
	ActiveWorkflowTriggers,
	ErrorReporter,
	InstanceSettings,
	SpanStatus,
	Tracing,
} from 'n8n-core';
import type { WorkflowId } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';

import { PublishedWorkflowTriggerDeactivator } from './published-workflow-trigger-deactivator';
import { WorkflowPublicationLifecycleLock } from './workflow-publication-lifecycle-lock';
import { WorkflowPublicationOutboxConsumer } from './workflow-publication-outbox-consumer';

/**
 * The one reconciliation loop of the workflow publication service. It ticks on
 * every main instance for the whole process lifetime; what a tick does is
 * decided by the instance's role at that moment, so leadership transitions
 * never start or stop anything — only shutdown stops the loop.
 *
 * Leader ticks verify that the running state matches the published state —
 * every trigger that should be active in memory really is, and the publication
 * tables agree with each other — and heal whatever diverged. Causes are
 * deliberately not enumerated here: a known cause is a bug to fix at its
 * source; this loop exists to detect and repair what an unknown one leaves
 * behind. Non-leader ticks instead sweep the registry for ghost registrations
 * (see {@link PublishedWorkflowTriggerDeactivator}).
 *
 * Detection is scoped to non-webhook (poll/trigger) nodes, since those are the
 * ones held in the in-memory registry; webhook triggers live in the
 * `webhook_entity` table and are reconciled by the applier when a workflow is
 * re-published. Recovery only enqueues through the outbox and wakes the consumer;
 * the applier does the actual re-registration, so this adds no activation logic.
 *
 * The registry checks compare the trigger-status rows against what is
 * registered in memory — and both were written by the last publication that
 * was applied. They can tell when memory drifted from what was applied, but
 * not whether what was applied is what the workflow's `activeVersionId` says
 * it should be. Three database-only detections close that gap: a
 * `workflow_published_version` mapping that disagrees with `activeVersionId`,
 * trigger-status rows recorded for a version other than the active one, and
 * published workflows with no trigger-status rows at all (also the expected
 * state for anything published before the service was enabled). All heal
 * through the same enqueue path.
 */
@Service()
export class WorkflowPublicationReconciler {
	private reconcileInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly triggerStatusRepository: WorkflowPublicationTriggerStatusRepository,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly nonWebhookTriggerRegistrar: NonWebhookTriggerRegistrar,
		private readonly outboxConsumer: WorkflowPublicationOutboxConsumer,
		private readonly instanceSettings: InstanceSettings,
		private readonly errorReporter: ErrorReporter,
		private readonly tracing: Tracing,
		private readonly eventService: EventService,
		private readonly lifecycleLock: WorkflowPublicationLifecycleLock,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activeWorkflowTriggers: ActiveWorkflowTriggers,
		private readonly publishedWorkflowTriggerDeactivator: PublishedWorkflowTriggerDeactivator,
	) {
		this.logger = logger.scoped('workflow-publication');
	}

	init() {
		this.startReconciler();

		// Run an initial pass at startup rather than waiting a full interval, so a
		// trigger missed during the last leader transition recovers promptly.
		if (this.reconcileInterval) void this.reconcile();
	}

	/**
	 * Starts the process-lifetime tick interval, on any role. Takeover never
	 * starts or stops anything here — the loop is already ticking — but it does
	 * kick an immediate pass (see {@link reconcileOnLeaderTakeover}).
	 */
	startReconciler() {
		if (!this.workflowsConfig.useWorkflowPublicationService) return;
		if (this.isShuttingDown || this.reconcileInterval) return;

		const intervalSeconds = this.workflowsConfig.publicationReconcileIntervalSeconds;
		this.reconcileInterval = setInterval(
			async () => await this.reconcile(),
			intervalSeconds * Time.seconds.toMilliseconds,
		);

		this.logger.debug(`Trigger reconciliation scheduled every ${intervalSeconds}s`);
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		clearInterval(this.reconcileInterval);
		this.reconcileInterval = undefined;
	}

	/**
	 * One tick of the loop, gated by the instance's role at this moment. On the
	 * leader: diff the triggers that should be active in memory against what is
	 * registered, and re-publish any workflow with a missing trigger. On any
	 * other role: sweep ghost registrations instead. Errors are caught and
	 * reported so a transient failure never escapes the interval; the next pass
	 * retries.
	 */
	async reconcile(): Promise<void> {
		if (this.isShuttingDown) return;

		if (!this.instanceSettings.isLeader) {
			await this.publishedWorkflowTriggerDeactivator.sweepGhostTriggers();
			return;
		}

		await this.tracing.startSpan(
			{ name: 'Publication trigger reconciliation', op: 'publication.reconcile' },
			async (span) => {
				const startedAt = Date.now();
				try {
					const surplus = await this.removeGhostTriggers(await this.findSurplusWorkflowIds());
					const missing = await this.republishWorkflows(
						await this.findMissingActiveWorkflows(),
						'Re-publishing workflows with missing in-memory triggers',
					);
					// After the missing-trigger drain, so workflows that pass already
					// converged are not re-detected (and double-counted) as skewed.
					const versionSkew = await this.republishWorkflows(
						await this.outboxRepository.findVersionSkewedWorkflowIds(),
						'Re-enqueuing workflows whose published version diverged from the active version',
					);
					// Also after the earlier drains, for the same reason: rows those
					// passes already converged must not be re-detected here.
					const statusDrift = await this.republishWorkflows(
						await this.outboxRepository.findTriggerStatusDriftedWorkflowIds(),
						'Re-enqueuing workflows whose trigger-status rows lag the active version',
					);
					const unreported = await this.republishWorkflows(
						await this.outboxRepository.findUnreportedPublishedWorkflowIds(),
						'Re-enqueuing published workflows that no publication reported trigger statuses for',
					);

					span.setAttribute('n8n.publication.deficient_workflows', missing);
					span.setAttribute('n8n.publication.surplus_workflows', surplus);
					span.setAttribute('n8n.publication.version_skewed_workflows', versionSkew);
					span.setAttribute('n8n.publication.status_drifted_workflows', statusDrift);
					span.setAttribute('n8n.publication.unreported_workflows', unreported);

					span.setStatus({ code: SpanStatus.ok });
					this.eventService.emit('workflow-publication-reconciliation', {
						result: 'success',
						deficientCount: missing,
						surplusCount: surplus,
						versionSkewCount: versionSkew,
						statusDriftCount: statusDrift,
						unreportedCount: unreported,
						durationMs: Date.now() - startedAt,
					});
				} catch (error) {
					span.setStatus({ code: SpanStatus.error });
					this.errorReporter.error(error, { shouldBeLogged: true });
					this.eventService.emit('workflow-publication-reconciliation', {
						result: 'failure',
						deficientCount: 0,
						surplusCount: 0,
						versionSkewCount: 0,
						statusDriftCount: 0,
						unreportedCount: 0,
						durationMs: Date.now() - startedAt,
					});
				}
			},
		);
	}

	/**
	 * A fresh leader must converge now, not an interval later: with an empty
	 * registry, this pass re-detects every workflow that needs its triggers
	 * back. Pending records left by the previous leader are excluded from the
	 * detections and drained by the consumer's own takeover hook instead. Gated
	 * on the loop running, so a disabled service or shutdown keeps takeover
	 * inert.
	 */
	@OnLeaderTakeover()
	async reconcileOnLeaderTakeover(): Promise<void> {
		if (!this.reconcileInterval) return;

		await this.reconcile();
	}

	private async findSurplusWorkflowIds(): Promise<WorkflowId[]> {
		const registered = this.activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds();
		if (registered.length === 0) return [];

		const desired = new Set(await this.workflowRepository.getActiveIds());

		const candidates = registered.filter((workflowId) => !desired.has(workflowId));

		return candidates;
	}

	private async removeGhostTriggers(workflowIds: WorkflowId[]): Promise<number> {
		let surplusRepairs = 0;
		for (const workflowId of workflowIds) {
			try {
				await this.lifecycleLock.runExclusive(workflowId, async () => {
					const workflow = await this.workflowRepository.findOneBy({ id: workflowId });

					if (workflow?.activeVersionId) return;
					if (await this.outboxRepository.findInFlightByWorkflowId(workflowId)) return;

					await this.activeWorkflowTriggers.remove(workflowId);
					surplusRepairs++;
				});
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}

		return surplusRepairs;
	}

	/**
	 * Workflows that have an activated in-memory trigger which is not currently
	 * registered. Workflows with an in-flight publication are already excluded by
	 * the query (that publication is about to fix them), and the enqueue is
	 * idempotent regardless.
	 */
	private async findMissingActiveWorkflows(): Promise<WorkflowId[]> {
		const desiredByWorkflow = this.groupByWorkflow(
			await this.triggerStatusRepository.findActivatedInMemoryTriggers(),
		);

		const missing: WorkflowId[] = [];
		for (const [workflowId, desiredNodeIds] of desiredByWorkflow) {
			const registered = this.nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds(workflowId);
			const hasMissing = [...desiredNodeIds].some((nodeId) => !registered.has(nodeId));
			if (hasMissing) missing.push(workflowId);
		}

		return missing;
	}

	private async republishWorkflows(workflowIds: WorkflowId[], logMessage: string): Promise<number> {
		if (workflowIds.length > 0) {
			this.logger.debug(logMessage, { workflowIds });
			await this.outboxRepository.enqueueByWorkflowIds(workflowIds);
			// Drain directly rather than waiting for the next poll cycle. These are
			// safe to call here, to recover more quickly.
			this.outboxConsumer.startPolling();
			await this.outboxConsumer.drainPending();
		}

		return workflowIds.length;
	}

	private groupByWorkflow(rows: Array<{ workflowId: WorkflowId; nodeId: string }>) {
		const byWorkflow = new Map<WorkflowId, Set<string>>();
		for (const { workflowId, nodeId } of rows) {
			const nodeIds = byWorkflow.get(workflowId) ?? new Set<string>();
			nodeIds.add(nodeId);
			byWorkflow.set(workflowId, nodeIds);
		}
		return byWorkflow;
	}
}
