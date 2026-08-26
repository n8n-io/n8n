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

import { EventService } from '@/events/event.service';
import type { WorkflowMutationHooks } from '@/workflows/workflow-mutation-hooks-proxy.service';

import { WorkflowReviewStateNotifier } from './workflow-review-state-notifier.service';

/** Review data captured before a workflow is deleted, keyed by workflow ID. */
type PendingDeleteCapture = {
	userId: string | null;
	/** Requests that were open when the workflow was captured. */
	requestIds: string[];
};

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
			const openRequests = await this.workflowReviewRequestRepository.findOpenRequestsForWorkflows(
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
			const closedRequestIds = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				async (ctx) => {
					const requestIds =
						await this.workflowReviewRequestRepository.closeUnreviewableOpenRequests(ctx);

					// Keep selection, activity, and closing under one lock. This prevents concurrent
					// sweeps or approvals from writing conflicting results.
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

		try {
			const { affectedWorkflowIds, closedRequestIds } = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				async (ctx) => {
					// Read under the lock to avoid racing a decision or version update.
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

			// Report closures even when no workflow activity was added.
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

			this.stateNotifier.notifyMany(affectedWorkflowIds);
		} catch (error) {
			// The workflow mutation has committed. Log failures and let reconciliation retry.
			this.logger.error('Failed to record workflow review cause event(s)', {
				type,
				workflowIds,
				error,
			});
		}
	}

	/** Records captured deletions and evaluates each request against the full deleted batch. */
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
						// Skip requests that closed after capture.
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

			// Report closures even when no workflow activity was added.
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

			this.stateNotifier.notifyMany(affectedWorkflowIds);
		} catch (error) {
			// Reconciliation closes anything missed after the delete committed.
			this.logger.error('Failed to record workflow review cause event(s)', {
				type: 'workflow.deleted',
				workflowIds: batchWorkflowIds,
				error,
			});
		}
	}

	/** Closes the request when no unaffected linked workflow remains reviewable. */
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
		// System closures have no user and preserve the current decision.
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
}
