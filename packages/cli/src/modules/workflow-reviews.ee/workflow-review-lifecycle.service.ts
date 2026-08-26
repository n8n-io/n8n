import type { OperationContext, WorkflowReviewRequest } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { EventService } from '@/events/event.service';
import type { WorkflowMutationHooks } from '@/workflows/workflow-mutation-hooks-proxy.service';

/** What `beforeWorkflowDeleted` captured, keyed by the workflow about to be deleted. */
type PendingDeleteCapture = {
	userId: string | null;
	/** Open requests linked to the workflow at capture time. */
	requestIds: string[];
};

/**
 * A delete that never completes leaves its capture behind; the map is bounded so those
 * leftovers cannot accumulate forever. Far above any real burst of parallel deletes.
 */
const MAX_PENDING_DELETE_CAPTURES = 1000;

/**
 * Records workflow lifecycle events into the review activity feed and closes open review
 * requests once nothing reviewable remains: per-workflow cause entries (`workflow.archived`,
 * `workflow.deleted`, `workflow.moved`, `workflow.published`), plus a `review.closed` entry
 * whenever the close policy fires.
 *
 * The close policy, general from day one: when cause events are recorded for a request with
 * affected workflow set S, the request closes iff no linked workflow outside S is reviewable
 * (exists, not archived, still in the request's project). Today every request has one
 * workflow, so the policy always closes — but multi-workflow inherits a working policy.
 *
 * Deliberately not feature-gated beyond module load: the instance policy
 * toggle guards user actions, but a review left open while the policy is off
 * would still block publishing once the policy is re-enabled, so cleanup must
 * run regardless.
 */
@Service()
export class WorkflowReviewLifecycleService implements WorkflowMutationHooks {
	private readonly pendingDeleteCaptures = new Map<string, PendingDeleteCapture>();

	constructor(
		private readonly logger: Logger,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly dbLockService: DbLockService,
		private readonly collaborationService: CollaborationService,
		private readonly eventService: EventService,
	) {}

	async afterWorkflowArchived(workflowId: string, userId: string | null): Promise<void> {
		await this.recordCauseEventsAndApplyClosePolicy([workflowId], 'workflow.archived', userId);
		await this.reconcileUnreviewableOpenRequests([workflowId]);
	}

	async afterWorkflowsTransferred(workflowIds: string[], userId: string | null): Promise<void> {
		await this.recordCauseEventsAndApplyClosePolicy(workflowIds, 'workflow.moved', userId);
		await this.reconcileUnreviewableOpenRequests(workflowIds);
	}

	/**
	 * Capture-only, and never throws: the delete may still fail after this, so writing
	 * `workflow.deleted` (past tense, durable) here would fabricate history. A failed
	 * capture degrades to the sweep, which closes without a cause entry.
	 */
	async beforeWorkflowDeleted(workflowId: string, userId: string | null): Promise<void> {
		try {
			const openRequests = await this.workflowReviewRequestRepository.findOpenRequestsForWorkflows(
				[workflowId],
				{},
			);

			// Overwrite on re-capture: only the state right before the delete counts.
			this.pendingDeleteCaptures.delete(workflowId);
			if (this.pendingDeleteCaptures.size >= MAX_PENDING_DELETE_CAPTURES) {
				const oldest = this.pendingDeleteCaptures.keys().next().value;
				if (oldest !== undefined) this.pendingDeleteCaptures.delete(oldest);
			}
			this.pendingDeleteCaptures.set(workflowId, {
				userId,
				requestIds: openRequests.map(({ request }) => request.id),
			});
		} catch (error) {
			this.logger.warn('Failed to capture open workflow review request(s) before deletion', {
				workflowId,
				error,
			});
		}
	}

	async afterWorkflowsDeleted(workflowIds: string[]): Promise<void> {
		// One request can lose several workflows of the same batch; group so its close
		// policy is evaluated once, against the whole batch.
		const capturesByRequestId = new Map<string, { workflowIds: string[]; userId: string | null }>();
		for (const workflowId of workflowIds) {
			const capture = this.pendingDeleteCaptures.get(workflowId);
			this.pendingDeleteCaptures.delete(workflowId);
			if (!capture) continue;

			for (const requestId of capture.requestIds) {
				const grouped = capturesByRequestId.get(requestId) ?? {
					workflowIds: [],
					userId: capture.userId,
				};
				grouped.workflowIds.push(workflowId);
				capturesByRequestId.set(requestId, grouped);
			}
		}

		if (capturesByRequestId.size > 0) {
			await this.recordCapturedDeletions(capturesByRequestId, workflowIds);
		}

		// Backstop for whatever the capture path missed (capture failure, a crash between
		// delete and this hook on an earlier delete): closes with `review.closed` only —
		// the cause is unrecoverable after the cascade.
		await this.reconcileUnreviewableOpenRequests(workflowIds);
	}

	/**
	 * Records `workflow.published` into every request — open or closed — whose pin matches the
	 * published version exactly. Closed requests on purpose: the happy path is approval (which
	 * closes) followed by auto-publish, and the timeline must complete. Post-commit and
	 * log-only: a feed write must never fail the publish.
	 */
	async afterWorkflowPublished(event: {
		workflowId: string;
		versionId: string;
		userId: string;
	}): Promise<void> {
		try {
			const requestIds =
				await this.workflowReviewRequestWorkflowRepository.findRequestIdsPinnedToVersion(
					{ workflowId: event.workflowId, workflowVersionId: event.versionId },
					{},
				);

			for (const requestId of requestIds) {
				await this.activityRepository.createActivity(
					{
						workflowReviewRequestId: requestId,
						type: 'workflow.published',
						data: { workflowId: event.workflowId, workflowVersionId: event.versionId },
						createdById: event.userId,
					},
					{},
				);
			}

			// A publish changes review-derived state (e.g. it clears the approved-but-
			// unpublished banner), so canvas viewers get the same invalidation the other
			// lifecycle paths send. Fire-and-forget, like the entries above: best-effort.
			this.broadcastReviewStateChanged([event.workflowId]);
		} catch (error) {
			this.logger.warn('Failed to record workflow publication in review activity', {
				workflowId: event.workflowId,
				versionId: event.versionId,
				error,
			});
		}
	}

	/**
	 * Closes every open review with no reviewable workflow left, whatever left it that way.
	 * The sweep is global — one call covers the whole batch, and the ids are log context only.
	 *
	 * The per-mutation paths above cannot cover two cases. A delete whose capture was lost
	 * strands reviews findable only as "open with nothing reviewable", never by workflow id.
	 * And an archive or a move whose close rolled back stays committed, leaving a review its
	 * own hook has already finished with — so the sweep runs after those hooks too, in its own
	 * transaction, and repairs the strand on that mutation or on the next one.
	 *
	 * No broadcast: the reviews it closes are a rare inconsistency rather than a live edit, and
	 * viewers heal on the next focus/reconnect refetch.
	 */
	private async reconcileUnreviewableOpenRequests(workflowIds: string[]): Promise<void> {
		try {
			const closedRequestIds = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				async (ctx) => {
					const requestIds =
						await this.workflowReviewRequestRepository.closeUnreviewableOpenRequests(ctx);

					// Under the same lock and in the same transaction as every other close path: the
					// sweep selects the requests and then updates them by id, so two sweeps racing
					// across that gap would both explain the same close and both overwrite whatever a
					// concurrent approval wrote. A failed entry rolls the close back and the next
					// sweep closes it again, which is what the sweep is for.
					for (const requestId of requestIds) {
						await this.activityRepository.createActivity(
							{
								workflowReviewRequestId: requestId,
								type: 'review.closed',
								data: { reason: 'no-reviewable-workflows' },
								createdById: null,
							},
							ctx,
						);
					}

					return requestIds;
				},
			);

			if (closedRequestIds.length === 0) return;

			for (const requestId of closedRequestIds) {
				// The sweep is the backstop, so it can recover neither the trigger nor an actor.
				this.eventService.emit('workflow-review-closed', {
					workflowReviewRequestId: requestId,
					cause: { trigger: 'unknown', actorKind: 'system', userId: null },
				});
			}

			this.logger.info('Closed open workflow review request(s) left on unreviewable workflows', {
				workflowIds,
				closedRequestIds,
			});
		} catch (error) {
			// The mutation has already committed; failing it now would be worse than a
			// request that stays open until the next sweep closes it.
			this.logger.error(
				'Failed to close open workflow review request(s) left on unreviewable workflows',
				{ workflowIds, error },
			);
		}
	}

	/**
	 * Archive/move path: for every open request linked to an affected workflow, write one
	 * cause entry per affected link, then close the request iff the close policy fires.
	 */
	private async recordCauseEventsAndApplyClosePolicy(
		workflowIds: string[],
		type: 'workflow.archived' | 'workflow.moved',
		userId: string | null,
	): Promise<void> {
		const actorKind = userId === null ? 'system' : 'user';

		try {
			const { affectedWorkflowIds, closedRequestIds } = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				async (ctx) => {
					// Fetched under the lock so the close can't race a concurrent
					// decide/version sync on the same request.
					const openRequests =
						await this.workflowReviewRequestRepository.findOpenRequestsForWorkflows(
							workflowIds,
							ctx,
						);

					const affected = new Set<string>();
					const closedRequestIds: string[] = [];
					for (const { request, links } of openRequests) {
						for (const { workflowId: linkedWorkflowId } of links) {
							await this.activityRepository.createActivity(
								{
									workflowReviewRequestId: request.id,
									type,
									data: { workflowId: linkedWorkflowId, actorKind },
									createdById: userId,
								},
								ctx,
							);
							affected.add(linkedWorkflowId);
						}

						if (await this.applyClosePolicy(request, workflowIds, ctx)) {
							closedRequestIds.push(request.id);
						}
					}

					return { affectedWorkflowIds: [...affected], closedRequestIds };
				},
			);

			// Ahead of the affected-ids guard below: the close is what is being reported.
			for (const requestId of closedRequestIds) {
				this.eventService.emit('workflow-review-closed', {
					workflowReviewRequestId: requestId,
					cause: {
						trigger: type === 'workflow.archived' ? 'workflow-archived' : 'workflow-moved',
						actorKind,
						userId,
					},
				});
			}

			if (affectedWorkflowIds.length === 0) return;

			this.logger.info('Recorded workflow review cause event(s)', {
				type,
				workflowIds: affectedWorkflowIds,
			});

			this.broadcastReviewStateChanged(affectedWorkflowIds);
		} catch (error) {
			// The mutation has already committed — this hook observes it, so it never
			// rethrows. A rolled-back close leaves the review open until the
			// reconciliation sweep closes it again.
			this.logger.error('Failed to record workflow review cause event(s)', {
				type,
				workflowIds,
				error,
			});
		}
	}

	/**
	 * Delete path: consumes what `beforeWorkflowDeleted` captured, now that the delete has
	 * committed and the truth can be written. Batch-correct by construction: the whole batch
	 * arrives in one call, so the close policy never mistakes a deleted batch-mate for a
	 * still-reviewable workflow.
	 */
	private async recordCapturedDeletions(
		capturesByRequestId: Map<string, { workflowIds: string[]; userId: string | null }>,
		batchWorkflowIds: string[],
	): Promise<void> {
		try {
			const { affectedWorkflowIds, closedRequests } = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				async (ctx) => {
					const affected = new Set<string>();
					const closed: Array<{
						requestId: string;
						actorKind: 'user' | 'system';
						userId: string | null;
					}> = [];
					for (const [requestId, capture] of capturesByRequestId) {
						// Cause events record into open reviews; one that closed since the
						// capture (e.g. approved meanwhile) gets nothing.
						const request = await this.workflowReviewRequestRepository.findById(requestId, ctx);
						if (!request || request.state !== 'open') continue;

						const actorKind = capture.userId === null ? 'system' : 'user';

						for (const workflowId of capture.workflowIds) {
							await this.activityRepository.createActivity(
								{
									workflowReviewRequestId: requestId,
									type: 'workflow.deleted',
									data: { workflowId, actorKind },
									createdById: capture.userId,
								},
								ctx,
							);
							affected.add(workflowId);
						}

						if (await this.applyClosePolicy(request, batchWorkflowIds, ctx)) {
							closed.push({ requestId, actorKind, userId: capture.userId });
						}
					}

					return { affectedWorkflowIds: [...affected], closedRequests: closed };
				},
			);

			// Ahead of the affected-ids guard below: the close is what is being reported.
			for (const { requestId, actorKind, userId } of closedRequests) {
				this.eventService.emit('workflow-review-closed', {
					workflowReviewRequestId: requestId,
					cause: { trigger: 'workflow-deleted', actorKind, userId },
				});
			}

			if (affectedWorkflowIds.length === 0) return;

			this.logger.info('Recorded workflow review cause event(s)', {
				type: 'workflow.deleted',
				workflowIds: affectedWorkflowIds,
			});

			this.broadcastReviewStateChanged(affectedWorkflowIds);
		} catch (error) {
			// The delete has committed; the sweep that follows closes what this pass
			// missed, with `review.closed` alone.
			this.logger.error('Failed to record workflow review cause event(s)', {
				type: 'workflow.deleted',
				workflowIds: batchWorkflowIds,
				error,
			});
		}
	}

	/**
	 * Closes the request iff no linked workflow outside the affected set is reviewable, and
	 * reports whether it did. In the cause entries' transaction on purpose: a review closed
	 * without an explanation is worse than a close that rolls back and waits for the sweep.
	 */
	private async applyClosePolicy(
		request: WorkflowReviewRequest,
		affectedWorkflowIds: string[],
		ctx: OperationContext,
	): Promise<boolean> {
		const staysOpen = await this.workflowReviewRequestRepository.hasReviewableWorkflowOutside(
			request.id,
			affectedWorkflowIds,
			ctx,
		);
		if (staysOpen) return false;

		request.state = 'closed';
		// A system close has no closing user; the decision stays as-is.
		request.closedById = null;
		await this.workflowReviewRequestRepository.saveRequest(request, ctx);

		await this.activityRepository.createActivity(
			{
				workflowReviewRequestId: request.id,
				type: 'review.closed',
				data: { reason: 'no-reviewable-workflows' },
				createdById: null,
			},
			ctx,
		);

		return true;
	}

	private broadcastReviewStateChanged(workflowIds: string[]): void {
		for (const workflowId of workflowIds) {
			// Fire-and-forget: viewers heal via focus/reconnect refetch.
			this.collaborationService
				.broadcastWorkflowReviewStateChanged(workflowId)
				.catch((error) =>
					this.logger.warn('Failed to broadcast review state change', { workflowId, error }),
				);
		}
	}
}
