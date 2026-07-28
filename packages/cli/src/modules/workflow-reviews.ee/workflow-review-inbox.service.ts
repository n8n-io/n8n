import type {
	GetWorkflowReviewInboxSummaryResponse,
	ListWorkflowReviewInboxQueryDto,
	ListWorkflowReviewInboxResponse,
	WorkflowReviewEligibleReviewer,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestWorkflowDetail,
	WorkflowReviewVersionSnapshot,
} from '@n8n/api-types';
import {
	UserRepository,
	WorkflowPublishedVersionRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type InboxCursor,
	type User,
	type WorkflowHistory,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestLinkedWorkflow,
	type WorkflowReviewRequestReviewer,
	type WorkflowReviewRequestWorkflowDetailRow,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toEligibleReviewer } from './workflow-review.mapper';

/**
 * The reviewer-facing read side of workflow reviews: the cross-project inbox, its
 * counts, and the detail view a reviewer opens from it. Unlike the workflow-scoped
 * lifecycle service, visibility here starts from the user's projects rather than
 * from a known workflow.
 */
@Service()
export class WorkflowReviewInboxService {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly userRepository: UserRepository,
		private readonly projectService: ProjectService,
	) {}

	async listForInbox(
		user: User,
		query: ListWorkflowReviewInboxQueryDto,
	): Promise<ListWorkflowReviewInboxResponse> {
		await this.featureGate.assertAvailable();

		const projectIds = await this.resolveAccessibleProjectIds(user);
		const { limit } = query;
		const rows = await this.workflowReviewRequestRepository.findManyForInbox({
			projectIds,
			requesterId: user.id,
			state: query.state ?? 'open',
			limit: limit + 1,
			cursor: query.cursor ? this.decodeInboxCursor(query.cursor) : undefined,
		});

		const hasMore = rows.length > limit;
		const data = rows.slice(0, limit);
		const lastRow = data.at(-1);
		const nextCursor = hasMore && lastRow ? this.encodeInboxCursor(lastRow) : null;
		const requestIds = data.map((row) => row.id);
		const [linkedWorkflowByRequestId, reviewerRows] = await Promise.all([
			this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds(requestIds),
			this.workflowReviewRequestReviewerRepository.findByRequestIds(requestIds),
		]);

		const participantsByRequestId = await this.hydrateParticipants(data, reviewerRows);

		return {
			data: data.map((row) => {
				const { requester, reviewers } = participantsByRequestId.get(row.id) ?? {
					requester: null,
					reviewers: [],
				};
				return this.toInboxItem(
					row,
					linkedWorkflowByRequestId.get(row.id) ?? null,
					requester,
					reviewers,
				);
			}),
			nextCursor,
			hasMore,
		};
	}

	async getInboxSummaryForUser(user: User): Promise<GetWorkflowReviewInboxSummaryResponse> {
		await this.featureGate.assertAvailable();

		const projectIds = await this.resolveAccessibleProjectIds(user);
		return await this.workflowReviewRequestRepository.countByStateForInbox({
			projectIds,
			requesterId: user.id,
		});
	}

	/**
	 * Visibility starts from the inbox rule (requester OR `workflow:publish` in the
	 * review's project OR globally), then narrows per workflow to what the caller can
	 * currently read — see {@link filterReadableWorkflowRows}.
	 */
	async getDetail(
		user: User,
		workflowReviewRequestId: string,
	): Promise<WorkflowReviewRequestDetail> {
		await this.featureGate.assertAvailable();

		const request = await this.workflowReviewRequestRepository.findById(workflowReviewRequestId);
		if (!request || !(await this.canAccessRequest(user, request))) {
			throw new NotFoundError('Could not find review request');
		}

		const [workflowRows, reviewerRows] = await Promise.all([
			this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowDetailsByRequestId(request.id),
			this.workflowReviewRequestReviewerRepository.findByRequestIds([request.id]),
		]);

		const readableRows = await this.filterReadableWorkflowRows(user, workflowRows);
		// Someone who reaches this review through its project has no reason to learn it
		// exists once they can read none of the workflows it covers. The requester already
		// knows, and their inbox still lists it, so they keep the record — narrowed to the
		// workflows they can currently read.
		if (request.createdById !== user.id && workflowRows.length > 0 && readableRows.length === 0) {
			throw new NotFoundError('Could not find review request');
		}

		const [workflows, participantsByRequestId] = await Promise.all([
			Promise.all(readableRows.map(async (row) => await this.toWorkflowDetail(row))),
			this.hydrateParticipants([request], reviewerRows),
		]);

		const { requester, reviewers } = participantsByRequestId.get(request.id) ?? {
			requester: null,
			reviewers: [],
		};
		return {
			// One workflow per review for now, so the summary fields mirror the first row
			...this.toInboxItem(request, workflows.at(0) ?? null, requester, reviewers),
			description: request.description,
			workflows,
		};
	}

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

	/** Inbox visibility rule: requester, or `workflow:publish` in the review's project. */
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

	/**
	 * Both diff sides for one child row. The baseline is resolved at read time, so
	 * a publish during an open review moves what reviewers are diffing against.
	 */
	private async toWorkflowDetail(
		row: WorkflowReviewRequestWorkflowDetailRow,
	): Promise<WorkflowReviewRequestWorkflowDetail> {
		const publishedVersionId = await this.workflowPublishedVersionRepository.getPublishedVersionId(
			row.workflowId,
		);

		const [pinnedVersion, baselineVersion] = await Promise.all([
			this.findVersionSnapshot(row.workflowId, row.workflowVersionId),
			this.findVersionSnapshot(row.workflowId, publishedVersionId),
		]);

		return {
			workflowId: row.workflowId,
			workflowName: row.workflowName,
			workflowVersionId: row.workflowVersionId,
			pinnedVersion,
			baselineVersion,
		};
	}

	/** `null` version id, or a version whose history row was pruned, both mean "no content". */
	private async findVersionSnapshot(
		workflowId: string,
		versionId: string | null,
	): Promise<WorkflowReviewVersionSnapshot | null> {
		if (!versionId) {
			return null;
		}

		const version = await this.workflowHistoryService.findVersion(workflowId, versionId);
		return version ? this.toVersionSnapshot(version) : null;
	}

	private toVersionSnapshot(version: WorkflowHistory): WorkflowReviewVersionSnapshot {
		return {
			versionId: version.versionId,
			nodes: version.nodes,
			connections: version.connections,
			nodeGroups: version.nodeGroups,
			createdAt: version.createdAt.toISOString(),
		};
	}

	/**
	 * Batch-resolve the requester and requested reviewers for each request row,
	 * keyed by request id. Deleted users simply drop out of the result.
	 */
	private async hydrateParticipants(
		rows: WorkflowReviewRequest[],
		reviewerRows: WorkflowReviewRequestReviewer[],
	): Promise<
		Map<
			string,
			{
				requester: WorkflowReviewEligibleReviewer | null;
				reviewers: WorkflowReviewEligibleReviewer[];
			}
		>
	> {
		const reviewerIdsByRequestId = new Map<string, string[]>();
		for (const { workflowReviewRequestId, userId } of reviewerRows) {
			const ids = reviewerIdsByRequestId.get(workflowReviewRequestId) ?? [];
			ids.push(userId);
			reviewerIdsByRequestId.set(workflowReviewRequestId, ids);
		}

		const userIds = new Set([
			...rows.map((row) => row.createdById).filter((id) => id !== null),
			...reviewerRows.map((row) => row.userId),
		]);

		const usersById = new Map<string, WorkflowReviewEligibleReviewer>();
		if (userIds.size > 0) {
			for (const user of await this.userRepository.findManyByIds([...userIds])) {
				usersById.set(user.id, toEligibleReviewer(user));
			}
		}

		return new Map(
			rows.map((row) => [
				row.id,
				{
					requester: row.createdById ? (usersById.get(row.createdById) ?? null) : null,
					reviewers: (reviewerIdsByRequestId.get(row.id) ?? [])
						.map((userId) => usersById.get(userId))
						.filter((reviewer) => reviewer !== undefined),
				},
			]),
		);
	}

	/**
	 * Encode the keyset boundary (createdAt + id) into an opaque cursor so the
	 * next page is resolved without re-reading the anchor row — a review deleted
	 * between requests no longer truncates the rest of the inbox.
	 */
	private encodeInboxCursor(row: WorkflowReviewRequest): string {
		return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, 'utf8').toString('base64url');
	}

	private decodeInboxCursor(cursor: string): InboxCursor {
		const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
		const separatorIndex = decoded.indexOf('|');
		if (separatorIndex === -1) {
			throw new BadRequestError('Invalid pagination cursor');
		}

		const createdAt = new Date(decoded.slice(0, separatorIndex));
		const id = decoded.slice(separatorIndex + 1);
		if (id.length === 0 || Number.isNaN(createdAt.getTime())) {
			throw new BadRequestError('Invalid pagination cursor');
		}

		return { createdAt, id };
	}

	private toInboxItem(
		entity: WorkflowReviewRequest,
		linkedWorkflow: WorkflowReviewRequestLinkedWorkflow | null,
		requester: WorkflowReviewEligibleReviewer | null,
		reviewers: WorkflowReviewEligibleReviewer[],
	): WorkflowReviewInboxItem {
		return {
			id: entity.id,
			projectId: entity.projectId,
			title: entity.title,
			workflowName: linkedWorkflow?.workflowName ?? null,
			workflowVersionId: linkedWorkflow?.workflowVersionId ?? null,
			decision: entity.decision,
			state: entity.state,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString(),
			requester,
			reviewers,
		};
	}
}
