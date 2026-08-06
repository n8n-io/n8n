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

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewAccessService } from './workflow-review-access.service';
import { WorkflowReviewEligibilityService } from './workflow-review-eligibility.service';
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
		private readonly accessService: WorkflowReviewAccessService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly userRepository: UserRepository,
		private readonly eligibilityService: WorkflowReviewEligibilityService,
	) {}

	async listForInbox(
		user: User,
		query: ListWorkflowReviewInboxQueryDto,
	): Promise<ListWorkflowReviewInboxResponse> {
		await this.featureGate.assertAvailable();

		const projectIds = await this.accessService.resolveAccessibleProjectIds(user);
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

		const projectIds = await this.accessService.resolveAccessibleProjectIds(user);
		return await this.workflowReviewRequestRepository.countByStateForInbox({
			projectIds,
			requesterId: user.id,
		});
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
			this.eligibilityService.resolveViewerEligibility(user, request, access.pinnedWorkflowId),
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
			viewerCanDecide: eligibility.canDecide,
			viewerDecisionIneligibilityReason: eligibility.decisionIneligibilityReason,
		};
	}

	private async resolveParticipants(request: WorkflowReviewRequest) {
		const reviewerRows = await this.workflowReviewRequestReviewerRepository.findByRequestIds([
			request.id,
		]);
		return await this.hydrateParticipants([request], reviewerRows);
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
