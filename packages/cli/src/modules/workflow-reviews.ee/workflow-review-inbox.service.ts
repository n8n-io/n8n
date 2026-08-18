import type {
	GetWorkflowReviewInboxSummaryResponse,
	GetWorkflowReviewStatusesDto,
	ListWorkflowReviewInboxQueryDto,
	ListWorkflowReviewInboxResponse,
	WorkflowReviewStatus,
	WorkflowReviewEligibleReviewer,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestWorkflowDetail,
	WorkflowReviewStatusesResponse,
	WorkflowReviewVersionSnapshot,
} from '@n8n/api-types';
import {
	UserRepository,
	WorkflowPublishedVersionRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type InboxCursor,
	type User,
	type WorkflowHistory,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestAuthor,
	type WorkflowReviewRequestLinkedWorkflow,
	type WorkflowReviewRequestReviewer,
	type WorkflowReviewRequestWorkflowDetailRow,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewAccessService } from './workflow-review-access.service';
import { WorkflowReviewEligibilityService } from './workflow-review-eligibility.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toEligibleReviewer, toRequestSummary } from './workflow-review.mapper';

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
		private readonly accessService: WorkflowReviewAccessService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly userRepository: UserRepository,
		private readonly eligibilityService: WorkflowReviewEligibilityService,
	) {}

	async listForInbox(
		user: User,
		query: ListWorkflowReviewInboxQueryDto,
	): Promise<ListWorkflowReviewInboxResponse> {
		await this.featureGate.assertAvailable();

		const visibility = await this.accessService.resolveInboxVisibility(user);
		const { limit } = query;
		const rows = await this.workflowReviewRequestRepository.findManyForInbox({
			visibility,
			state: query.state ?? 'open',
			category:
				query.category === undefined ? undefined : { userId: user.id, category: query.category },
			limit: limit + 1,
			cursor: query.cursor ? this.decodeInboxCursor(query.cursor) : undefined,
		});

		const hasMore = rows.length > limit;
		const data = rows.slice(0, limit);
		const lastRow = data.at(-1);
		const nextCursor = hasMore && lastRow ? this.encodeInboxCursor(lastRow) : null;
		const requestIds = data.map((row) => row.id);
		const [linkedWorkflowByRequestId, reviewerRows, authorRows] = await Promise.all([
			this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds(requestIds),
			this.workflowReviewRequestReviewerRepository.findByRequestIds(requestIds),
			this.workflowReviewRequestAuthorRepository.findByRequestIds(requestIds),
		]);

		const participantsByRequestId = await this.hydrateParticipants(data, reviewerRows, authorRows);

		return {
			data: data.map((row) => {
				const { requester, authors, reviewers } = participantsByRequestId.get(row.id) ?? {
					requester: null,
					authors: [],
					reviewers: [],
				};
				return this.toInboxItem(
					row,
					linkedWorkflowByRequestId.get(row.id) ?? null,
					requester,
					authors,
					reviewers,
				);
			}),
			nextCursor,
			hasMore,
		};
	}

	async getInboxSummaryForUser(user: User): Promise<GetWorkflowReviewInboxSummaryResponse> {
		await this.featureGate.assertAvailable();

		const visibility = await this.accessService.resolveInboxVisibility(user);
		return await this.workflowReviewRequestRepository.countByStateForInbox({ visibility });
	}

	/**
	 * Open-review statuses for a page of workflows. Every reader of a
	 * workflow gets its open review's summary; `viewerCanOpen` carries the detail
	 * access rule so the client links only where opening cannot 404. `null` uniformly
	 * covers no open review, a pruned pin, and workflows the caller cannot read (or
	 * that do not exist), so the response never confirms a workflow's existence.
	 */
	async getStatusesForWorkflows(
		user: User,
		dto: GetWorkflowReviewStatusesDto,
	): Promise<WorkflowReviewStatusesResponse> {
		await this.featureGate.assertAvailable();

		const data: Record<string, WorkflowReviewStatus | null> = {};
		for (const workflowId of dto.workflowIds) {
			data[workflowId] = null;
		}

		const requestedIds = [...new Set(dto.workflowIds)];
		const readableIds = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			requestedIds,
			user,
			['workflow:read'],
		);

		const openRequests = await this.workflowReviewRequestRepository.findOpenRequestsForWorkflows(
			[...readableIds],
			{},
		);

		const rows: Array<{
			workflowId: string;
			request: (typeof openRequests)[number]['request'];
			workflowVersionId: string;
		}> = [];
		for (const { request, links } of openRequests) {
			for (const link of links) {
				// A pruned pin renders nowhere else either (banner and detail hide it).
				if (!readableIds.has(link.workflowId) || link.workflowVersionId === null) continue;
				rows.push({
					workflowId: link.workflowId,
					request,
					workflowVersionId: link.workflowVersionId,
				});
			}
		}

		const openableIds = await this.accessService.resolveOpenableRequestIds(
			user,
			rows.map((row) => ({ id: row.request.id, projectId: row.request.projectId })),
		);

		for (const row of rows) {
			data[row.workflowId] = {
				summary: toRequestSummary(row.request, row.workflowVersionId),
				viewerCanOpen: openableIds.has(row.request.id),
			};
		}

		return { data };
	}

	async getDetail(
		user: User,
		workflowReviewRequestId: string,
	): Promise<WorkflowReviewRequestDetail> {
		await this.featureGate.assertAvailable();

		const access = await this.accessService.findReadableRequestOrFail(
			user,
			workflowReviewRequestId,
		);
		const { request, readableWorkflowRows } = access;

		const [workflows, participantsByRequestId, eligibility] = await Promise.all([
			Promise.all(readableWorkflowRows.map(async (row) => await this.toWorkflowDetail(row))),
			this.resolveParticipants(request),
			// Resolved against the pinned (pre-read-filter) row, matching the row
			// decide() authorizes against — not against what the caller can read.
			this.eligibilityService.resolveViewerEligibility(user, access),
		]);

		const { requester, authors, reviewers } = participantsByRequestId.get(request.id) ?? {
			requester: null,
			authors: [],
			reviewers: [],
		};
		return {
			// One workflow per review for now, so the summary fields mirror the first row
			...this.toInboxItem(request, workflows.at(0) ?? null, requester, authors, reviewers),
			description: request.description,
			workflows,
			viewerCanDecide: eligibility.canDecide,
			viewerDecisionIneligibilityReason: eligibility.decisionIneligibilityReason,
			viewerCanComment: eligibility.canComment,
		};
	}

	private async resolveParticipants(request: WorkflowReviewRequest) {
		const [reviewerRows, authorRows] = await Promise.all([
			this.workflowReviewRequestReviewerRepository.findByRequestIds([request.id]),
			this.workflowReviewRequestAuthorRepository.findByRequestIds([request.id]),
		]);
		return await this.hydrateParticipants([request], reviewerRows, authorRows);
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
			name: version.name,
			nodes: version.nodes,
			connections: version.connections,
			nodeGroups: version.nodeGroups,
			createdAt: version.createdAt.toISOString(),
		};
	}

	/**
	 * Batch-resolve the requester, authors, and requested reviewers for each request
	 * row, keyed by request id. Deleted users simply drop out of the result. The
	 * requester stays in `authors` too — deduplication is the caller's presentation
	 * concern, and the canonical requester is returned separately.
	 */
	private async hydrateParticipants(
		rows: WorkflowReviewRequest[],
		reviewerRows: WorkflowReviewRequestReviewer[],
		authorRows: WorkflowReviewRequestAuthor[],
	): Promise<
		Map<
			string,
			{
				requester: WorkflowReviewEligibleReviewer | null;
				authors: WorkflowReviewEligibleReviewer[];
				reviewers: WorkflowReviewEligibleReviewer[];
			}
		>
	> {
		const reviewerIdsByRequestId = groupUserIdsByRequestId(reviewerRows);
		const authorIdsByRequestId = groupUserIdsByRequestId(authorRows);

		const userIds = new Set([
			...rows.map((row) => row.createdById).filter((id) => id !== null),
			...reviewerRows.map((row) => row.userId),
			...authorRows.map((row) => row.userId),
		]);

		const usersById = new Map<string, WorkflowReviewEligibleReviewer>();
		if (userIds.size > 0) {
			for (const user of await this.userRepository.findManyByIds([...userIds])) {
				usersById.set(user.id, toEligibleReviewer(user));
			}
		}

		const resolve = (userIdsForRequest: string[]) =>
			userIdsForRequest.map((userId) => usersById.get(userId)).filter((user) => user !== undefined);

		return new Map(
			rows.map((row) => [
				row.id,
				{
					requester: row.createdById ? (usersById.get(row.createdById) ?? null) : null,
					authors: resolve(authorIdsByRequestId.get(row.id) ?? []),
					reviewers: resolve(reviewerIdsByRequestId.get(row.id) ?? []),
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
		authors: WorkflowReviewEligibleReviewer[],
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
			authors,
			reviewers,
		};
	}
}

/** Junction rows (reviewers, authors) collapsed into user ids per request. */
function groupUserIdsByRequestId(
	rows: Array<{ workflowReviewRequestId: string; userId: string }>,
): Map<string, string[]> {
	const idsByRequestId = new Map<string, string[]>();
	for (const { workflowReviewRequestId, userId } of rows) {
		const ids = idsByRequestId.get(workflowReviewRequestId) ?? [];
		ids.push(userId);
		idsByRequestId.set(workflowReviewRequestId, ids);
	}

	return idsByRequestId;
}
