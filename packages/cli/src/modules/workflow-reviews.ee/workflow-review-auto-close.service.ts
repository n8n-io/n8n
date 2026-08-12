import type { WorkflowReviewClosedReason } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { CollaborationService } from '@/collaboration/collaboration.service';
import type { WorkflowMutationHooks } from '@/workflows/workflow-mutation-hooks-proxy.service';

/**
 * Closes open review requests when their workflow stops being reviewable:
 * archived, moved to another project, or deleted.
 *
 * Deliberately not feature-gated beyond module load: the instance policy
 * toggle guards user actions, but a review left open while the policy is off
 * would still block publishing once the policy is re-enabled, so cleanup must
 * run regardless.
 */
@Service()
export class WorkflowReviewAutoCloseService implements WorkflowMutationHooks {
	constructor(
		private readonly logger: Logger,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly dbLockService: DbLockService,
		private readonly collaborationService: CollaborationService,
	) {}

	async afterWorkflowArchived(workflowId: string): Promise<void> {
		await this.closeOpenRequestsForWorkflows([workflowId], 'workflow-archived');
	}

	async afterWorkflowsTransferred(workflowIds: string[]): Promise<void> {
		await this.closeOpenRequestsForWorkflows(workflowIds, 'workflow-moved');
	}

	async beforeWorkflowDeleted(workflowId: string): Promise<void> {
		// The delete hasn't happened yet, so aborting is recoverable — whereas swallowing
		// here would let the link rows cascade away and strand an open request.
		await this.closeOpenRequestsForWorkflows([workflowId], 'workflow-deleted', {
			rethrow: true,
		});
	}

	/**
	 * Closes reviews whose workflow is gone: the cascade took their link rows, so they
	 * can only be found by "open with nothing linked", not by workflow id — the sweep is
	 * global and one call covers the whole batch. Catches reviews opened after the
	 * pre-delete hooks ran, and any left by a delete that skips the hooks.
	 */
	async afterWorkflowsDeleted(workflowIds: string[]): Promise<void> {
		try {
			const closedRequestIds = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
				async (ctx) => {
					const requestIds =
						await this.workflowReviewRequestRepository.closeOrphanedOpenRequests(ctx);

					// Under the same lock and in the same transaction as every other close path: the
					// sweep selects orphans and then updates them by id, so two sweeps racing across
					// that gap would both explain the same close and both overwrite whatever a
					// concurrent approval wrote. A failed entry rolls the close back and the next
					// sweep closes it again, which is what the sweep is for.
					for (const workflowReviewRequestId of requestIds) {
						await this.activityRepository.createActivity(
							{
								workflowReviewRequestId,
								type: 'review.closed',
								data: { reason: 'workflow-deleted' },
								createdById: null,
							},
							ctx,
						);
					}

					return requestIds;
				},
			);

			if (closedRequestIds.length === 0) return;

			this.logger.info('Closed workflow review request(s) left without a workflow', {
				reason: 'workflow-deleted',
				workflowIds,
				workflowReviewRequestIds: closedRequestIds,
			});
		} catch (error) {
			// The delete has already committed; failing it now would be worse than a
			// request that stays open until the next sweep closes it.
			this.logger.error('Failed to close workflow review request(s) left without a workflow', {
				workflowIds,
				error,
			});
		}
	}

	private async closeOpenRequestsForWorkflows(
		workflowIds: string[],
		reason: WorkflowReviewClosedReason,
		options: { rethrow?: boolean } = {},
	): Promise<void> {
		try {
			const affectedWorkflowIds = await this.dbLockService.withLockContext(
				DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
				async (ctx) => {
					// Fetched under the lock so the close can't race a concurrent
					// decide/version sync on the same request.
					const openRequests =
						await this.workflowReviewRequestRepository.findOpenRequestsForWorkflows(
							workflowIds,
							ctx,
						);

					const affected = new Set<string>();
					for (const { request, workflowIds: linkedWorkflowIds } of openRequests) {
						request.state = 'closed';
						// A system close has no closing user; the decision stays as-is.
						request.closedById = null;
						await this.workflowReviewRequestRepository.saveRequest(request, ctx);

						// In the transaction on purpose: a review closed without an explanation is
						// worse than a close that rolls back. Archive and move have no recovery path
						// for that rollback — unlike a delete, which the sweep picks up — so the
						// review stays open and its workflow publish-blocked until someone steps in.
						await this.activityRepository.createActivity(
							{
								workflowReviewRequestId: request.id,
								type: 'review.closed',
								data: { reason },
								createdById: null,
							},
							ctx,
						);

						for (const linkedWorkflowId of linkedWorkflowIds) affected.add(linkedWorkflowId);
					}

					return [...affected];
				},
			);

			if (affectedWorkflowIds.length === 0) return;

			this.logger.info('Closed open workflow review request(s)', {
				reason,
				workflowIds: affectedWorkflowIds,
			});

			for (const workflowId of affectedWorkflowIds) {
				// Fire-and-forget: viewers heal via focus/reconnect refetch.
				this.collaborationService
					.broadcastWorkflowReviewStateChanged(workflowId)
					.catch((error) =>
						this.logger.warn('Failed to broadcast review state change', { workflowId, error }),
					);
			}
		} catch (error) {
			this.logger.error('Failed to close open workflow review request(s)', {
				reason,
				workflowIds,
				error,
			});
			// Cleanup does not fail a mutation that already committed — archive and move end
			// here, having rolled the close back. Only the pre-delete hook is still in a
			// position to call its mutation off.
			if (options.rethrow) throw error;
		}
	}
}
