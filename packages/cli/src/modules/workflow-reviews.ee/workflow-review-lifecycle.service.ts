import type { WorkflowReviewWorkflowCauseActivityType } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	WorkflowReviewActivityRepository,
	WorkflowReviewLifecycleRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';
import type { WorkflowMutationHooks } from '@/workflows/workflow-mutation-hooks-proxy.service';

import { WorkflowReviewStateNotifier } from './workflow-review-state-notifier.service';

/** Review data captured before a workflow is deleted, keyed by workflow ID. */
type PendingDeleteCapture = {
	userId: string | null;
	/** Requests that were open when the workflow was captured. */
	requestIds: string[];
};

/** A closed request and the actor used for telemetry. */
type ClosedRequest = { requestId: string; actorKind: 'user' | 'system'; userId: string | null };

const CLOSE_TRIGGER_BY_ACTIVITY_TYPE = {
	'workflow.archived': 'workflow-archived',
	'workflow.moved': 'workflow-moved',
	'workflow.deleted': 'workflow-deleted',
} as const satisfies Record<
	WorkflowReviewWorkflowCauseActivityType,
	'workflow-archived' | 'workflow-moved' | 'workflow-deleted'
>;

/** Prevent failed deletes from leaving captures in memory indefinitely. */
const MAX_PENDING_DELETE_CAPTURES = 1000;

/**
 * Records workflow lifecycle events and closes requests that have no reviewable workflows.
 * A workflow remains reviewable while it exists, is not archived, and stays in the request's
 * project. Cleanup still runs when user actions are disabled so stale requests cannot later
 * block publishing.
 */
@Service()
export class WorkflowReviewLifecycleService implements WorkflowMutationHooks {
	private readonly pendingDeleteCaptures = new Map<string, PendingDeleteCapture>();

	constructor(
		private readonly logger: Logger,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewLifecycleRepository: WorkflowReviewLifecycleRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly dbLockService: DbLockService,
		private readonly stateNotifier: WorkflowReviewStateNotifier,
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

	/** Capture request data before deletion without writing activity or blocking the delete. */
	async beforeWorkflowDeleted(workflowId: string, userId: string | null): Promise<void> {
		try {
			const openRequests =
				await this.workflowReviewLifecycleRepository.findOpenRequestsAffectedByWorkflows(
					[workflowId],
					{},
				);

			// Keep only the latest state captured before deletion.
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
		// Evaluate each request once when a batch deletes several linked workflows.
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

		// Close requests missed by capture. Their deletion cause is no longer available.
		await this.reconcileUnreviewableOpenRequests(workflowIds);
	}

	/**
	 * Records a publish when its version matches the request's pinned version. Closed requests
	 * are included because approval closes the request before auto-publish. Activity failures
	 * are logged without failing the completed publish.
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

			// Publishing can change review status shown in open editors.
			this.stateNotifier.notify(event.workflowId);
		} catch (error) {
			this.logger.warn('Failed to record workflow publication in review activity', {
				workflowId: event.workflowId,
				versionId: event.versionId,
				error,
			});
		}
	}

	/**
	 * Closes any open request with no reviewable workflow left. This catches failed captures
	 * and close operations that rolled back after the workflow mutation committed. It runs in
	 * its own transaction and does not broadcast; viewers refetch on focus or reconnect.
	 */
	private async reconcileUnreviewableOpenRequests(workflowIds: string[]): Promise<void> {
		try {
			// Without candidate IDs, evaluate every open request.
			const closedRequestIds = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				async (ctx) => await this.closeUnreviewable(ctx),
			);

			if (closedRequestIds.length === 0) return;

			for (const requestId of closedRequestIds) {
				// The original cause and actor are unavailable at this point.
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
			// The workflow mutation has committed, so only log cleanup failures.
			this.logger.error(
				'Failed to close open workflow review request(s) left on unreviewable workflows',
				{ workflowIds, error },
			);
		}
	}

	/** Records archive or move activity, then closes requests with nothing reviewable left. */
	private async recordCauseEventsAndApplyClosePolicy(
		workflowIds: string[],
		type: 'workflow.archived' | 'workflow.moved',
		userId: string | null,
	): Promise<void> {
		const actorKind = userId === null ? 'system' : 'user';

		await this.recordCauseEventsAndClose(type, workflowIds, async (ctx) => {
			// Read under the lock to avoid racing a decision or version update.
			const openRequests =
				await this.workflowReviewLifecycleRepository.findOpenRequestsAffectedByWorkflows(
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

	/** Records captured deletions and evaluates each request after the full batch is deleted. */
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
			// Report closures even when no workflow activity was added.
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

			this.stateNotifier.notifyMany(affectedWorkflowIds);
		} catch (error) {
			this.logger.error('Failed to record workflow review cause event(s)', {
				type,
				workflowIds: logWorkflowIds,
				error,
			});
		}
	}

	/**
	 * Closes candidates with no reviewable workflow and records each close in the same
	 * transaction. The caller holds the lock to prevent conflicting closes or approvals.
	 */
	private async closeUnreviewable(
		ctx: OperationContext,
		candidateRequestIds?: string[],
	): Promise<string[]> {
		const closableRequestIds =
			await this.workflowReviewLifecycleRepository.findUnreviewableOpenRequestIds(
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
}
