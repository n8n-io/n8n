import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
} from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
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

import { WorkflowPublicationLifecycleLock } from './workflow-publication-lifecycle-lock';
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
 *
 * A third detection compares versions rather than trigger node ids: a
 * `workflow_published_version` mapping that disagrees with the workflow's
 * `activeVersionId` (a rolled-back or lost publication, or a missed unpublish)
 * is invisible to the node-id diffs when the trigger set is unchanged, so it is
 * detected in the database directly and healed through the same enqueue path.
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

					span.setAttribute('n8n.publication.deficient_workflows', missing);
					span.setAttribute('n8n.publication.surplus_workflows', surplus);
					span.setAttribute('n8n.publication.version_skewed_workflows', versionSkew);

					span.setStatus({ code: SpanStatus.ok });
					this.eventService.emit('workflow-publication-reconciliation', {
						result: 'success',
						deficientCount: missing,
						surplusCount: surplus,
						versionSkewCount: versionSkew,
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
						durationMs: Date.now() - startedAt,
					});
				}
			},
		);
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
			await this.lifecycleLock.runExclusive(workflowId, async () => {
				const workflow = await this.workflowRepository.findOneBy({ id: workflowId });

				if (workflow?.activeVersionId) return;
				if (await this.outboxRepository.findInFlightByWorkflowId(workflowId)) return;

				await this.activeWorkflowTriggers.remove(workflowId);
				surplusRepairs++;
			});
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
