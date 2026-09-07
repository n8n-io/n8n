import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings, SpanStatus, Tracing } from 'n8n-core';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type {
	PublicationOutcomeReason,
	PublicationOutcomeResult,
} from '@/events/maps/workflow-publication-metrics.event-map';
import type { PublicationResult } from '@/workflows/publication/publication-result';
import { PublicationStatusReporter } from '@/workflows/publication/publication-status-reporter';
import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';
import { WorkflowPublicationApplier } from '@/workflows/publication/workflow-publication-applier';
import { WorkflowPublicationOutboxWorkerPool } from '@/workflows/publication/workflow-publication-outbox-worker-pool';
import type { TriggerOperationAbort } from '@/workflows/triggers/workflow-trigger-activator';

/**
 * Resolved by {@link WorkflowPublicationOutboxConsumer.raceTimeout} when the
 * timeout elapses before the raced promise settles.
 */
const TIMED_OUT = Symbol('timed-out');

/**
 * Fraction of the outbox lease after which a record's processing is aborted.
 * Below 1 so that an abandoned record is not reclaimable the moment its worker
 * moves on — the same drain could otherwise claim it straight back.
 */
const ABORT_AFTER_LEASE_FRACTION = 0.7;

/**
 * How long an aborted record may take to unwind before it is abandoned, capped
 * at a quarter of the lease: deadline plus grace must stay within the lease so
 * a record is never still being waited on after it became reclaimable.
 */
const ABANDON_GRACE_MS = 10 * Time.seconds.toMilliseconds;
const ABANDON_GRACE_LEASE_FRACTION = 0.25;

/**
 * Consumes the workflow publication outbox on the leader instance. It owns the
 * queue mechanics only: the poll loop and a pool of up to
 * `workflowPublicationConcurrency` independent workers, each claiming pending
 * records until none remain. For each claimed record a worker delegates to the
 * applier (which reconciles triggers and returns a result) and then to the
 * reporter (which writes the terminal status and side effects). Any unexpected
 * error from the applier is turned into a failed result so the reporter
 * remains the single writer of terminal outbox statuses.
 *
 * Coordination lives in the database, not in this class: claiming is atomic
 * and per-workflow serialized, so workers (even across passes) never
 * double-process a record. A worker stuck on one record therefore only
 * occupies its own pool slot — the remaining slots keep serving new records.
 */
@Service()
export class WorkflowPublicationOutboxConsumer {
	private pollTimeout: NodeJS.Timeout | undefined;

	private isPolling = false;

	private isShuttingDown = false;

	private readonly pool: WorkflowPublicationOutboxWorkerPool;

	constructor(
		private readonly logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly applier: WorkflowPublicationApplier,
		private readonly reporter: PublicationStatusReporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly lifecycleLock: WorkflowPublicationLifecycleLock,
		private readonly tracing: Tracing,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('workflow-publication');
		this.pool = new WorkflowPublicationOutboxWorkerPool({
			runPass: async () => await this.runWorkerPass(),
			shouldRun: () => this.shouldKeepPolling(),
			concurrency: this.workflowsConfig.workflowPublicationConcurrency,
			onWorkerError: (error) => this.errorReporter.error(error, { shouldBeLogged: true }),
		});
	}

	async init() {
		if (!this.instanceSettings.isLeader) return;

		this.startPolling();
		// Drain immediately so triggers get activated ASAP
		await this.drainPending();
	}

	startPolling() {
		if (!this.workflowsConfig.useWorkflowPublicationService || this.isShuttingDown) return;
		if (this.isPolling) return;

		this.isPolling = true;
		this.schedulePollCycle();
		this.logger.debug('Started outbox polling');
	}

	stopPolling() {
		this.isPolling = false;

		if (this.pollTimeout) {
			clearTimeout(this.pollTimeout);
			this.pollTimeout = undefined;
			this.logger.debug('Stopped outbox polling');
		}
	}

	@OnShutdown()
	async shutdown() {
		this.isShuttingDown = true;
		this.stopPolling();
		// Wait for in-flight workers to finish their current record so triggers
		// aren't left half-activated.
		await this.pool.awaitIdle();
	}

	/**
	 * Wake the consumer in response to a `workflow-publish-wake-up` pubsub event so
	 * it drains the outbox immediately instead of waiting for the next poll cycle.
	 *
	 * Also start polling - this is idempotent, so harmless if we're already polling.
	 */
	@OnPubSubEvent('workflow-publish-wake-up', { instanceType: 'main', instanceRole: 'leader' })
	@OnLeaderTakeover()
	async wakeUp(): Promise<void> {
		if (!this.workflowsConfig.useWorkflowPublicationService) return;
		// Direct callers (e.g. a short-lived CLI process waking its own local consumer)
		// bypass the pubsub role filter, and a non-leader claiming a record it can never
		// apply would strand it `in_progress` until its lease expires.
		if (!this.instanceSettings.isLeader) return;

		this.startPolling();
		try {
			await this.drainPending();
		} catch (error) {
			// The pool already reported the underlying failure, and pubsub dispatch
			// drops handler rejections (they would surface as unhandled promise
			// rejections) — so neither rethrow nor re-report, just trace.
			this.logger.debug('Publication outbox drain triggered by a wake-up failed', {
				error: ensureError(error).message,
			});
		}
	}

	// The `workflow-publish-wake-up` event drains the outbox promptly (see
	// `wakeUp`); the poller is kept as a fallback since pubsub delivery is not
	// ensured. Topping up the pool is synchronous, so the next cycle is armed
	// immediately — a worker stuck on a record never wedges the poll loop.
	private schedulePollCycle() {
		clearTimeout(this.pollTimeout);
		if (!this.shouldKeepPolling()) return;

		this.pollTimeout = setTimeout(() => {
			this.pool.topUp();
			if (this.shouldKeepPolling()) this.schedulePollCycle();
		}, this.workflowsConfig.publicationOutboxPollIntervalMs);
	}

	/**
	 * Top the worker pool up to the configured concurrency and resolve once the
	 * pool goes idle. Used by the pubsub wake-up, by leader startup for an
	 * immediate drain, and by the reconciler after enqueueing records. Workers
	 * stop claiming if the instance steps down or shuts down mid-pass.
	 *
	 * Resolution waits for every active worker, so a worker stuck on a hung
	 * record delays it (bounded by the abort/abandon deadline) — but not the
	 * processing of other records, which the remaining slots keep serving.
	 * Rejects once the pool idles if a worker pass failed, with an error
	 * wrapping one of the failures. The pool has already reported the underlying
	 * error (exactly once, at the source); the rejection exists so awaiting
	 * callers can fail their own operation (e.g. the reconciler's failure
	 * telemetry) — they report their layer's outcome, never the pool's error.
	 */
	async drainPending(): Promise<void> {
		this.pool.topUp();
		const error = await this.pool.awaitIdle();
		if (error) {
			// `level: 'warning'` makes the wrapper non-reportable (`shouldReport`
			// false), so an awaiting caller's generic catch passing it to the
			// ErrorReporter creates no second Sentry event — the pool's source
			// report of the cause stays the single report of the failure.
			throw new OperationalError('Workflow publication outbox drain failed', {
				cause: error,
				level: 'warning',
			});
		}
	}

	/**
	 * Claim and process pending records until none remain. An idle pass — the
	 * first claim finds nothing — starts no tracing span, so an idle leader
	 * doesn't emit one empty span per worker per poll tick.
	 */
	private async runWorkerPass(): Promise<void> {
		if (!this.shouldKeepPolling()) return;

		const first = await this.outboxRepository.claimNextPendingRecord();
		if (!first) return;

		await this.tracing.startSpan(
			{
				name: 'Publication outbox drain',
				op: 'publication.outbox.drain',
				attributes: {
					'n8n.publication.consumer_concurrency':
						this.workflowsConfig.workflowPublicationConcurrency,
				},
			},
			async (span) => {
				let processed = 0;
				let record: WorkflowPublicationOutbox | null = first;
				while (record) {
					if (await this.processRecordWithAbort(record)) processed++;

					record = this.shouldKeepPolling()
						? await this.outboxRepository.claimNextPendingRecord()
						: null;
				}

				// Only log if we processed more than 1 since we log each individual record
				if (processed > 1) {
					this.logger.debug(
						`Processed ${processed} workflow publication outbox records in this pass`,
					);
				}

				span.setAttribute('n8n.publication.records_processed', processed);
				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}

	private shouldKeepPolling() {
		return this.isPolling && !this.isShuttingDown;
	}

	/**
	 * Processes a record under a deadline: on expiry the record's abort signal
	 * fires, and after a further grace period the record is abandoned (left
	 * `in_progress` for lease reclaim) so a hung record never wedges the drain.
	 * Returns whether the record settled in time.
	 */
	private async processRecordWithAbort(record: WorkflowPublicationOutbox): Promise<boolean> {
		const leaseMs =
			this.workflowsConfig.publicationOutboxLeaseSeconds * Time.seconds.toMilliseconds;
		const abortAfterMs = leaseMs * ABORT_AFTER_LEASE_FRACTION;
		const abandonGraceMs = Math.min(ABANDON_GRACE_MS, leaseMs * ABANDON_GRACE_LEASE_FRACTION);

		const controller = new AbortController();
		const work = this.processRecord(record, controller.signal);

		if ((await this.raceTimeout(work, abortAfterMs)) !== TIMED_OUT) return true;

		controller.abort(new OperationalError('Workflow publication processing exceeded its deadline'));

		if ((await this.raceTimeout(work, abandonGraceMs)) !== TIMED_OUT) return true;

		// A late rejection of the abandoned work must not become an unhandled rejection.
		void work.catch((error) =>
			this.errorReporter.error(ensureError(error), { shouldBeLogged: true }),
		);
		this.errorReporter.error(
			new OperationalError(
				'Abandoned workflow publication outbox record: processing did not stop after abort',
				{ extra: { outboxId: record.id, workflowId: record.workflowId } },
			),
			{ shouldBeLogged: true },
		);
		return false;
	}

	/** Resolves with the raced promise, or with {@link TIMED_OUT} after `timeoutMs`. */
	private async raceTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number,
	): Promise<T | typeof TIMED_OUT> {
		let timer: NodeJS.Timeout | undefined;
		try {
			return await Promise.race([
				promise,
				new Promise<typeof TIMED_OUT>((resolve) => {
					timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
				}),
			]);
		} finally {
			clearTimeout(timer);
		}
	}

	/**
	 * Applies a single claimed record and reports the outcome. The applier returns
	 * a `failed` result for expected failures; an unexpected throw is wrapped into
	 * a `failed` result so the reporter still writes a terminal status. A failure
	 * in the reporter itself can only be logged: the record is left in progress
	 * for a later poll cycle to retry.
	 *
	 * Both the apply and the report run under the workflow's {@link WorkflowPublicationLifecycleLock}
	 * so leader stepdown cannot tear this workflow's triggers down mid-record, and the
	 * terminal-status write always lands before teardown proceeds. If leadership was lost
	 * between claiming the record and entering the critical section, the record is returned
	 * to the queue (so the new leader reprocesses it) and nothing is applied here.
	 */
	async processRecord(record: WorkflowPublicationOutbox, signal: AbortSignal): Promise<void> {
		await this.tracing.startSpan(
			{
				name: 'Publication outbox record',
				op: 'publication.outbox.process_record',
				attributes: {
					...this.tracing.pickWorkflowAttributes({ id: record.workflowId }),
					'n8n.publication.outbox_id': record.id,
					'n8n.publication.published_version_id': record.publishedVersionId,
				},
			},
			async (span) => {
				await this.lifecycleLock.runExclusive(record.workflowId, async () => {
					// A record claimed while leader can reach here after stepdown (e.g. while
					// waiting on the lock during teardown). Activating triggers now would leave
					// them running on a demoted instance, so hand the record back to the queue.
					if (!this.instanceSettings.isLeader) {
						await this.outboxRepository.returnToPending(record.id);
						this.logger.debug('Returned publication outbox record to queue: no longer leader', {
							outboxId: record.id,
							workflowId: record.workflowId,
						});
						return;
					}

					// The worker may have aborted this record while it queued on the lock;
					// starting now would apply work long after it was abandoned. The row is
					// left `in_progress` for lease reclaim rather than returned to pending:
					// the wait may have outlived the lease, and flipping the row here would
					// release the claim of whichever worker has since reclaimed it.
					if (signal.aborted) {
						this.logger.debug('Skipped applying publication outbox record: aborted', {
							outboxId: record.id,
							workflowId: record.workflowId,
						});
						return;
					}

					this.logger.debug('Started processing workflow publication outbox record', {
						outboxId: record.id,
						workflowId: record.workflowId,
						publishedVersionId: record.publishedVersionId,
					});

					const startedAt = Date.now();
					let result: PublicationResult;

					// An aborted per-node operation is abandoned, not cancelled; collect
					// every orphan so the lock outlives whatever may still mutate this
					// workflow's registrations.
					const detachedWork: Array<Promise<unknown>> = [];
					const abort: TriggerOperationAbort = {
						signal,
						onDetached: (work) => detachedWork.push(work),
					};

					try {
						result = await this.applier.apply(record, abort);
					} catch (error) {
						const cause = ensureError(error);
						result = {
							type: 'failed',
							// An abort is our own doing and a UserError is a known cause (e.g.
							// a missing credential), not an unexpected applier failure.
							error:
								signal.aborted || cause instanceof UserError
									? cause
									: new UnexpectedError(`Unexpected: ${cause.message}`, { cause }),
						};
					}

					let reporterFailed = false;
					try {
						await this.reporter.report(record, result);
					} catch (reportError) {
						reporterFailed = true;
						this.errorReporter.error(reportError, { shouldBeLogged: true });
					}

					this.eventService.emit('workflow-publication-outbox-record-processed', {
						...this.toOutcomeLabels(result, reporterFailed),
						durationMs: Date.now() - startedAt,
					});

					this.logger.debug('Finished processing workflow publication outbox record', {
						outboxId: record.id,
						workflowId: record.workflowId,
						result: result.type,
					});

					span.setAttribute('n8n.publication.result', result.type);

					// The terminal status is already written; keep the lock until the
					// abandoned operations settle so the next record for this workflow
					// can never run concurrently with them.
					if (detachedWork.length > 0) {
						this.logger.warn(
							'Keeping workflow publication lock held until abandoned trigger operations settle',
							{ outboxId: record.id, workflowId: record.workflowId },
						);
						await Promise.allSettled(detachedWork);
					}
				});

				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}

	/**
	 * Maps a publication result to its metric labels. A reporter failure overrides
	 * the result to `failed` (the terminal status write never landed), and
	 * `version-missing` maps to `failed`/`version_missing` to match the terminal
	 * `failed` status the outbox record is given (and thus the records gauge).
	 */
	private toOutcomeLabels(
		result: PublicationResult,
		reporterFailed: boolean,
	): { result: PublicationOutcomeResult; reason: PublicationOutcomeReason } {
		if (reporterFailed) return { result: 'failed', reason: 'none' };

		switch (result.type) {
			case 'completed':
				return { result: 'published', reason: 'none' };
			case 'unpublished':
				return { result: 'unpublished', reason: 'none' };
			case 'skipped':
				return {
					result: 'skipped',
					reason: 'workflow_not_found',
				};
			case 'version-missing':
				return { result: 'failed', reason: 'version_missing' };
			case 'partial':
				return { result: 'partial_success', reason: 'none' };
			case 'failed':
				return { result: 'failed', reason: 'none' };
		}
	}
}
