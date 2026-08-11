import {
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
	type User,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestWorkflowDetailRow,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

export interface ReadableWorkflowReviewRequest {
	request: WorkflowReviewRequest;
	readableWorkflowRows: WorkflowReviewRequestWorkflowDetailRow[];
	pinnedWorkflowId: string | null;
	canReadPinnedWorkflow: boolean;
}

/**
 * The read gate for a single review: whether the caller may see it at all, and which of its
 * covered workflows they may currently read. Every feature hanging off a review passes
 * through here before doing anything else.
 */
@Service()
export class WorkflowReviewAccessService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly projectService: ProjectService,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
	) {}

	/**
	 * Project IDs for inbox queries. `null` means "all projects, unfiltered" —
	 * correct for users with `workflow:publish` scoped globally. Requesters always
	 * see their own reviews regardless (repository OR-matches `requesterId`), so no
	 * personal-project fallback is needed.
	 */
	async resolveAccessibleProjectIds(user: User): Promise<string[] | null> {
		if (hasGlobalScope(user, 'workflow:publish')) {
			return null;
		}

		return await this.projectService.getProjectIdsWithScope(user, ['workflow:publish']);
	}

	/**
	 * Visibility starts from the inbox rule (requester OR `workflow:publish` in the
	 * review's project OR globally), then narrows per workflow to what the caller can
	 * currently read — see {@link filterReadableWorkflowRows}. Throws `NotFoundError`
	 * rather than a 403 so a review's existence never leaks.
	 */
	async findReadableRequestOrFail(
		user: User,
		workflowReviewRequestId: string,
	): Promise<ReadableWorkflowReviewRequest> {
		const request = await this.workflowReviewRequestRepository.findById(
			workflowReviewRequestId,
			{},
		);
		if (!request || !(await this.canAccessRequest(user, request))) {
			throw new NotFoundError('Could not find review request');
		}

		const workflowRows =
			await this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowDetailsByRequestId(
				request.id,
			);
		const readableWorkflowRows = await this.filterReadableWorkflowRows(user, workflowRows);
		// Someone who reached this review through its project has nothing to see once they can
		// read none of the workflows it covers. The requester is exempt: they created it and
		// their inbox lists it, so keeping the record leaks nothing.
		if (
			request.createdById !== user.id &&
			workflowRows.length > 0 &&
			readableWorkflowRows.length === 0
		) {
			throw new NotFoundError('Could not find review request');
		}

		// Rows come back id ASC, so the first is the pinned one.
		const pinnedWorkflowId = workflowRows.at(0)?.workflowId ?? null;
		return {
			request,
			readableWorkflowRows,
			pinnedWorkflowId,
			canReadPinnedWorkflow: readableWorkflowRows.some(
				(row) => row.workflowId === pinnedWorkflowId,
			),
		};
	}

	private async canAccessRequest(user: User, request: WorkflowReviewRequest): Promise<boolean> {
		if (request.createdById === user.id) {
			return true;
		}

		const projectIds = await this.resolveAccessibleProjectIds(user);
		return projectIds === null || projectIds.includes(request.projectId);
	}

	/**
	 * A review's `projectId` is fixed at creation and nothing closes open reviews when a
	 * workflow is transferred, so the stored project does not prove the caller may still
	 * read a covered workflow. Re-check every row against the workflow's *current* owner
	 * before returning its content.
	 *
	 * This applies to the requester too. They held publish rights when they opened the
	 * review, but may have lost them since — and because the baseline is resolved at read
	 * time, an exemption would leave them reading versions published after they lost
	 * access.
	 */
	private async filterReadableWorkflowRows(
		user: User,
		rows: WorkflowReviewRequestWorkflowDetailRow[],
	): Promise<WorkflowReviewRequestWorkflowDetailRow[]> {
		const readable = await Promise.all(
			rows.map(async (row) =>
				(await this.workflowFinderService.findWorkflowForUser(row.workflowId, user, [
					'workflow:read',
				]))
					? row
					: null,
			),
		);

		return readable.filter((row): row is WorkflowReviewRequestWorkflowDetailRow => row !== null);
	}
}
