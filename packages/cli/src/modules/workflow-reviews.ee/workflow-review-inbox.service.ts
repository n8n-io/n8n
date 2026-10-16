import type {
	InboxCounts,
	InboxWorkflowReviewItem,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestWorkflowDetail,
	WorkflowReviewVersionSnapshot,
} from '@n8n/api-types';
import {
	WorkflowReviewInboxRepository,
	WorkflowReviewRequestWorkflowRepository,
	type User,
	type WorkflowHistory,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestLinkedWorkflow,
	type WorkflowReviewRequestWorkflowDetailRow,
} from '@n8n/db';
import { Service } from '@n8n/di';

import type { InboxSourceQuery } from '../inbox/inbox-source.registry';

import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewAuthorizationService } from './workflow-review-authorization.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import {
	WorkflowReviewParticipantResolver,
	type WorkflowReviewParticipants,
} from './workflow-review-participant.resolver';

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
		private readonly authorizationService: WorkflowReviewAuthorizationService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowReviewInboxRepository: WorkflowReviewInboxRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly participantResolver: WorkflowReviewParticipantResolver,
	) {}

	async isInboxAvailable() {
		return await this.featureGate.isAvailable();
	}

	async listForInbox(user: User, query: InboxSourceQuery): Promise<InboxWorkflowReviewItem[]> {
		await this.featureGate.assertAvailable();
		const visibility = await this.authorizationService.resolveInboxVisibility(user);
		const rows = await this.workflowReviewInboxRepository.findRequests({
			visibility,
			state: query.state,
			category:
				query.category === undefined ? undefined : { userId: user.id, category: query.category },
			limit: query.limit,
			boundary: query.boundary,
		});
		const [linkedWorkflowByRequestId, participants] = await Promise.all([
			this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds(
				rows.map((row) => row.id),
			),
			this.participantResolver.resolve(rows),
		]);

		return rows.map((row) => ({
			type: 'workflow_review',
			...this.toInboxItem(
				row,
				linkedWorkflowByRequestId.get(row.id) ?? null,
				participants.for(row.id),
			),
		}));
	}

	async getInboxSummaryForUser(user: User): Promise<InboxCounts> {
		await this.featureGate.assertAvailable();
		const visibility = await this.authorizationService.resolveInboxVisibility(user);
		return await this.workflowReviewInboxRepository.countRequestsByState(visibility);
	}

	async getDetail(
		user: User,
		workflowReviewRequestId: string,
	): Promise<WorkflowReviewRequestDetail> {
		await this.featureGate.assertAvailable();

		const access = await this.authorizationService.findReadableRequestOrFail(
			user,
			workflowReviewRequestId,
		);
		const { request, readableWorkflowRows } = access;

		const [workflows, participants, eligibility] = await Promise.all([
			Promise.all(readableWorkflowRows.map(async (row) => await this.toWorkflowDetail(row))),
			this.participantResolver.resolve([request]),
			// Reuses the snapshot above: capabilities are resolved against every covered
			// row, matching what decide() authorizes against.
			this.authorizationService.resolveViewerEligibility(user, access),
		]);

		return {
			...this.toReviewSummary(request, participants.for(request.id)),
			description: request.description,
			workflows,
			viewerCanDecide: eligibility.canDecide,
			viewerDecisionIneligibilityReason: eligibility.decisionIneligibilityReason,
			viewerCanComment: eligibility.canComment,
		};
	}

	/**
	 * Both sides of the diff for one child row: the version under review, and the
	 * baseline to compare it against.
	 *
	 * While a review is open the baseline is the live published version, so a publish
	 * during the review moves what reviewers see. Approval freezes it onto the row, and
	 * a closed review reads only that frozen value.
	 *
	 * A closed review without one returns null, meaning "nothing to compare against".
	 * It never falls back to the live version, which would show a diff nobody approved.
	 */
	private async toWorkflowDetail(
		row: WorkflowReviewRequestWorkflowDetailRow,
	): Promise<WorkflowReviewRequestWorkflowDetail> {
		// State and baseline come from the same row, so they cannot disagree. That
		// matters here: approving a never-published workflow freezes a null baseline,
		// which looks exactly like "nothing frozen yet", and only the state tells the
		// two apart.
		//
		// A frozen baseline always wins, whatever state sits next to it, because only
		// approval writes one. Null on a closed review can mean never published,
		// approved while unpublished, or closed without an approval — callers tell those
		// apart via `state` + `decision`.
		//
		// The live baseline comes from the workflow row: both publication paths maintain
		// `activeVersionId`, while the publication-service table exists only on the
		// outbox path — reading it there left the baseline empty on the default path.
		const baselineVersionId =
			row.baselineVersionId ?? (row.requestState === 'closed' ? null : row.activeVersionId);

		const [pinnedVersion, baselineVersion] = await Promise.all([
			this.findVersionSnapshot(row.workflowId, row.workflowVersionId),
			this.findVersionSnapshot(row.workflowId, baselineVersionId),
		]);

		return {
			workflowId: row.workflowId,
			workflowName: row.workflowName,
			workflowVersionId: row.workflowVersionId,
			pinnedVersion,
			publishedVersionId: row.activeVersionId,
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

	/** The review fields shared by the inbox card and the detail response. */
	private toReviewSummary(
		entity: WorkflowReviewRequest,
		{ requester, authors, reviewers }: WorkflowReviewParticipants,
	): Omit<WorkflowReviewInboxItem, 'workflowName' | 'workflowVersionId'> {
		return {
			id: entity.id,
			projectId: entity.projectId,
			title: entity.title,
			decision: entity.decision,
			state: entity.state,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString(),
			requester,
			authors,
			reviewers,
		};
	}

	private toInboxItem(
		entity: WorkflowReviewRequest,
		linkedWorkflow: WorkflowReviewRequestLinkedWorkflow | null,
		participants: WorkflowReviewParticipants,
	): WorkflowReviewInboxItem {
		return {
			...this.toReviewSummary(entity, participants),
			workflowName: linkedWorkflow?.workflowName ?? null,
			workflowVersionId: linkedWorkflow?.workflowVersionId ?? null,
		};
	}
}
