import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
} from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings, SpanStatus, Tracing } from 'n8n-core';

import { EventService } from '@/events/event.service';
import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';

import { WorkflowPublicationOutboxConsumer } from './workflow-publication-outbox-consumer';

/**
 * Periodically checks, on the leader, that every trigger which should be active
 * in memory really is, and re-publishes any workflow whose triggers went
 * missing. This recovers from the leader-transition edge case where a demoted
 * instance consumed a workflow's outbox record (marking it completed) and then
 * tore its triggers down, so the new leader never (re)activated them and no
 * pending record remains to reprocess.
 *
 * Detection is scoped to non-webhook (poll/trigger) nodes, since those are the
 * ones held in the in-memory registry; webhook triggers live in the
 * `webhook_entity` table and are reconciled by the applier when a workflow is
 * re-published. Recovery only enqueues through the outbox and wakes the consumer;
 * the applier does the actual re-registration, so this adds no activation logic.
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
	) {
		this.logger = logger.scoped('workflow-publication');
	}

	init() {
		if (!this.instanceSettings.isLeader) return;

		this.startReconciler();

		// Run an initial pass at startup rather than waiting a full interval, so a
		// trigger missed during the last leader transition recovers promptly.
		if (this.reconcileInterval) void this.reconcile();
	}

	/**
	 * Deliberately no immediate pass on takeover: `PublishedWorkflowEnqueuer`
	 * already re-enqueues every active workflow at that moment, and the
	 * consumed-record race this loop recovers can only materialize after that
	 * enqueue — the first interval pass catches it.
	 */
	@OnLeaderTakeover()
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

	@OnLeaderStepdown()
	stopReconciler() {
		clearInterval(this.reconcileInterval);
		this.reconcileInterval = undefined;
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopReconciler();
	}

	/**
	 * One reconciliation pass: diff the triggers that should be active in memory
	 * against what is registered, and re-publish any workflow with a missing
	 * trigger. Errors are caught and reported so a transient failure never escapes
	 * the interval; the next pass retries. Runs only on the leader.
	 */
	async reconcile(): Promise<void> {
		if (!this.instanceSettings.isLeader || this.isShuttingDown) return;

		await this.tracing.startSpan(
			{ name: 'Publication trigger reconciliation', op: 'publication.reconcile' },
			async (span) => {
				const startedAt = Date.now();
				try {
					const missing = await this.findMissingActiveWorkflows();

					span.setAttribute('n8n.publication.deficient_workflows', missing.length);

					if (missing.length > 0) {
						this.logger.debug('Re-publishing workflows with missing in-memory triggers', {
							workflowIds: missing,
						});
						await this.outboxRepository.enqueueByWorkflowIds(missing);
						this.outboxConsumer.startPolling();
						await this.outboxConsumer.drainPending();
					}

					span.setStatus({ code: SpanStatus.ok });
					this.eventService.emit('workflow-publication-reconciliation', {
						result: 'success',
						deficientCount: missing.length,
						durationMs: Date.now() - startedAt,
					});
				} catch (error) {
					span.setStatus({ code: SpanStatus.error });
					this.errorReporter.error(error, { shouldBeLogged: true });
					this.eventService.emit('workflow-publication-reconciliation', {
						result: 'failure',
						deficientCount: 0,
						durationMs: Date.now() - startedAt,
					});
				}
			},
		);
	}

	/**
	 * Workflows that have an activated in-memory trigger which is not currently
	 * registered, excluding any already covered by an in-flight publication (so
	 * the reconciler never competes with a publication that is about to fix it).
	 */
	private async findMissingActiveWorkflows(): Promise<string[]> {
		const desiredByWorkflow = this.groupByWorkflow(
			await this.triggerStatusRepository.findActivatedInMemoryTriggers(),
		);

		const missing: string[] = [];
		for (const [workflowId, desiredNodeIds] of desiredByWorkflow) {
			const registered = this.nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds(workflowId);
			const hasMissing = [...desiredNodeIds].some((nodeId) => !registered.has(nodeId));
			if (!hasMissing) continue;

			// An in-flight record is already about to reconcile this workflow, so
			// re-enqueuing would only churn. The enqueue is idempotent regardless.
			if (await this.outboxRepository.findInFlightByWorkflowId(workflowId)) continue;

			missing.push(workflowId);
		}

		return missing;
	}

	private groupByWorkflow(rows: Array<{ workflowId: string; nodeId: string }>) {
		const byWorkflow = new Map<string, Set<string>>();
		for (const { workflowId, nodeId } of rows) {
			const nodeIds = byWorkflow.get(workflowId) ?? new Set<string>();
			nodeIds.add(nodeId);
			byWorkflow.set(workflowId, nodeIds);
		}
		return byWorkflow;
	}
}
