import type { WorkflowReviewWorkflowCauseActivityType } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
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

/** A request a cause-recording pass closed, with the actor to attribute the close telemetry to. */
type ClosedRequest = { requestId: string; actorKind: 'user' | 'system'; userId: string | null };

const CLOSE_TRIGGER_BY_ACTIVITY_TYPE = {
	'workflow.archived': 'workflow-archived',
	'workflow.moved': 'workflow-moved',
	'workflow.deleted': 'workflow-deleted',
} as const satisfies Record<
	WorkflowReviewWorkflowCauseActivityType,
	'workflow-archived' | 'workflow-moved' | 'workflow-deleted'
>;

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
			// No candidate ids: every open request is evaluated, not just those this mutation touched.
			const closedRequestIds = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				async (ctx) => await this.closeUnreviewable(ctx),
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
	 * cause entry per affected link, then close the requests the close policy leaves with
	 * nothing reviewable.
	 */
	private async recordCauseEventsAndApplyClosePolicy(
		workflowIds: string[],
		type: 'workflow.archived' | 'workflow.moved',
		userId: string | null,
	): Promise<void> {
		const actorKind = userId === null ? 'system' : 'user';

		await this.recordCauseEventsAndClose(type, workflowIds, async (ctx) => {
			// Under the lock, so the close can't race a concurrent decide/version sync.
			const openRequests = await this.workflowReviewRequestRepository.findOpenRequestsForWorkflows(
				workflowIds,
				ctx,
			);

			const affected = new Set<string>();
			const candidateRequestIds: string[] = [];
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
				candidateRequestIds.push(request.id);
			}

			const closedRequestIds = await this.closeUnreviewable(ctx, candidateRequestIds);

			return {
				affectedWorkflowIds: [...affected],
				closedRequests: closedRequestIds.map((requestId) => ({ requestId, actorKind, userId })),
			};
		});
	}

	/**
	 * Delete path: consumes what `beforeWorkflowDeleted` captured, now that the delete has
	 * committed and the truth can be written. Batch-correct by construction — every deleted
	 * workflow's rows are already gone, so the close policy cannot mistake a deleted batch-mate
	 * for a still-reviewable workflow.
	 */
	private async recordCapturedDeletions(
		capturesByRequestId: Map<string, { workflowIds: string[]; userId: string | null }>,
		batchWorkflowIds: string[],
	): Promise<void> {
		await this.recordCauseEventsAndClose('workflow.deleted', batchWorkflowIds, async (ctx) => {
			const affected = new Set<string>();
			const candidateRequestIds: string[] = [];
			const actorByRequestId = new Map<string, ClosedRequest>();
			for (const [requestId, capture] of capturesByRequestId) {
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

				candidateRequestIds.push(requestId);
				actorByRequestId.set(requestId, { requestId, actorKind, userId: capture.userId });
			}

			const closedRequestIds = await this.closeUnreviewable(ctx, candidateRequestIds);

			return {
				affectedWorkflowIds: [...affected],
				closedRequests: closedRequestIds.map((requestId) => actorByRequestId.get(requestId)!),
			};
		});
	}

	private async recordCauseEventsAndClose(
		type: WorkflowReviewWorkflowCauseActivityType,
		logWorkflowIds: string[],
		gather: (
			ctx: OperationContext,
		) => Promise<{ affectedWorkflowIds: string[]; closedRequests: ClosedRequest[] }>,
	): Promise<void> {
		try {
			const { affectedWorkflowIds, closedRequests } = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				gather,
			);

			const trigger = CLOSE_TRIGGER_BY_ACTIVITY_TYPE[type];
			// Ahead of the affected-ids guard below: the close is what is being reported.
			for (const { requestId, actorKind, userId } of closedRequests) {
				this.eventService.emit('workflow-review-closed', {
					workflowReviewRequestId: requestId,
					cause: { trigger, actorKind, userId },
				});
			}

			if (affectedWorkflowIds.length === 0) return;

			this.logger.info('Recorded workflow review cause event(s)', {
				type,
				workflowIds: affectedWorkflowIds,
			});

			this.broadcastReviewStateChanged(affectedWorkflowIds);
		} catch (error) {
			this.logger.error('Failed to record workflow review cause event(s)', {
				type,
				workflowIds: logWorkflowIds,
				error,
			});
		}
	}

	/**
	 * The one close transition, shared by the targeted paths and the reconciliation sweep: closes
	 * every candidate the close policy leaves with no reviewable workflow, appending a
	 * `review.closed` entry for each in the caller's transaction.
	 *
	 * Select-then-close-by-id runs under the caller's lock: a close that races a concurrent
	 * approval would otherwise both explain the same close and overwrite what the approval wrote.
	 * A `review.closed` write that fails rolls the whole close back, and the next sweep repairs it.
	 */
	private async closeUnreviewable(
		ctx: OperationContext,
		candidateRequestIds?: string[],
	): Promise<string[]> {
		const closableRequestIds =
			await this.workflowReviewRequestRepository.findUnreviewableOpenRequestIds(
				ctx,
				candidateRequestIds,
			);

		await this.workflowReviewRequestRepository.closeRequests(closableRequestIds, ctx);

		for (const requestId of closableRequestIds) {
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

		return closableRequestIds;
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
