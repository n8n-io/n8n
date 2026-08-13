import { Logger } from '@n8n/backend-common';
import { DbLock, DbLockService, WorkflowReviewRequestRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CollaborationService } from '@/collaboration/collaboration.service';
import type { WorkflowMutationHooks } from '@/workflows/workflow-mutation-hooks-proxy.service';

type AutoCloseReason = 'workflow-archived' | 'workflow-moved' | 'workflow-deleted';

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
			const closedRequestIds = await this.workflowReviewRequestRepository.closeOrphanedOpenRequests(
				{},
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
		reason: AutoCloseReason,
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
			// Cleanup must never fail a mutation that already committed; only the
			// pre-delete hook is still in a position to call its mutation off.
			if (options.rethrow) throw error;
		}
	}
}
