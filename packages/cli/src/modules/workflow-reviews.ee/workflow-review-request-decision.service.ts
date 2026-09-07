import type {
	DecideWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestResponse,
	WorkflowReviewAutoPublishOutcome,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	UserRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowReviewAuthorizationService } from './workflow-review-authorization.service';
import {
	resolveDecisionCapability,
	type WorkflowReviewDecisionFacts,
} from './workflow-review-decision-policy';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toRequestSummary } from './workflow-review.mapper';
import {
	assertWorkflowReviewRequestUpdatable,
	WorkflowReviewRequestMutationGuard,
} from './workflow-review-request-mutation-guard.service';
import { WorkflowReviewStateNotifier } from './workflow-review-state-notifier.service';

@Service()
export class WorkflowReviewRequestDecisionService {
	constructor(
		private readonly logger: Logger,
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly userRepository: UserRepository,
		private readonly dbLockService: DbLockService,
		private readonly collaborationService: CollaborationService,
		private readonly workflowService: WorkflowService,
		private readonly authorizationService: WorkflowReviewAuthorizationService,
		private readonly eventService: EventService,
		private readonly mutationGuard: WorkflowReviewRequestMutationGuard,
		private readonly stateNotifier: WorkflowReviewStateNotifier,
	) {}

	async decide(
		user: User,
		workflowReviewRequestId: string,
		dto: DecideWorkflowReviewRequestDto,
	): Promise<DecideWorkflowReviewRequestResponse> {
		await this.featureGate.assertAvailable();

		const request = await this.workflowReviewRequestRepository.findById(
			workflowReviewRequestId,
			{},
		);
		if (!request) {
			throw new NotFoundError('Could not find review request');
		}

		const workflowRows = await this.workflowReviewRequestWorkflowRepository.findByRequestId(
			workflowReviewRequestId,
			{},
		);
		// Reviews contain one workflow today. Publishing and events still rely on this.
		const [workflowRow] = workflowRows;
		if (!workflowRow) {
			throw new NotFoundError('Could not find review request');
		}

		// The reviewer must be able to read every workflow in the request.
		const readableWorkflows = await Promise.all(
			workflowRows.map(
				async (row) =>
					await this.workflowFinderService.findWorkflowForUser(row.workflowId, user, [
						'workflow:read',
					]),
			),
		);
		const canReadEveryWorkflow = readableWorkflows.every((workflow) => workflow !== null);
		// Return 404 before checking state so inaccessible requests cannot be discovered.
		if (!canReadEveryWorkflow) {
			throw new NotFoundError('Could not find review request');
		}

		assertWorkflowReviewRequestUpdatable(request);

		// Resolve roles before the lock to avoid needing another database connection inside it.
		const hasAdminOverride = await this.authorizationService.isAdminForProject(
			user,
			request.projectId,
		);

		// Reject ineligible callers before they wait for the lock.
		const isAuthor = await this.workflowReviewRequestAuthorRepository.isAuthor(
			{ workflowReviewRequestId, userId: user.id },
			{},
		);
		const isAssignedReviewer = await this.workflowReviewRequestReviewerRepository.isReviewer(
			{ workflowReviewRequestId, userId: user.id },
			{},
		);
		this.assertDecisionAllowed({
			canReadEveryWorkflow,
			isAuthor,
			isAssignedReviewer,
			hasAdminOverride,
		});

		// Resolve this before the lock because role and user lookups need another connection.
		// It controls auto-publish and whether the close has a user.
		const requesterPublishability =
			dto.decision === 'approved'
				? await this.resolveRequesterPublishability(request.createdById, workflowRow.workflowId)
				: null;

		// Check permissions first so callers who cannot decide do not receive payload details.
		if (dto.decision === 'changes_requested' && !dto.note) {
			throw new BadRequestError('A note is required when requesting changes');
		}

		const {
			request: saved,
			pinnedVersionId,
			decidedAsAssignedReviewer,
		} = await this.dbLockService.withLockContext(DbLock.WORKFLOW_REVIEW_MUTATION, async (ctx) => {
			// Re-check under the lock to avoid racing a version update or another decision.
			const current = await this.workflowReviewRequestRepository.findById(
				workflowReviewRequestId,
				ctx,
			);
			if (!current) {
				throw new NotFoundError('Could not find review request');
			}
			assertWorkflowReviewRequestUpdatable(current);

			// A version update may add an author, and reviewer assignments may change.
			const isAuthorNow = await this.workflowReviewRequestAuthorRepository.isAuthor(
				{ workflowReviewRequestId, userId: user.id },
				ctx,
			);
			const isAssignedReviewerNow = await this.workflowReviewRequestReviewerRepository.isReviewer(
				{ workflowReviewRequestId, userId: user.id },
				ctx,
			);
			this.assertDecisionAllowed({
				canReadEveryWorkflow,
				isAuthor: isAuthorNow,
				isAssignedReviewer: isAssignedReviewerNow,
				hasAdminOverride,
			});

			// Re-read the pinned version in case another update completed first.
			const currentRows = await this.workflowReviewRequestWorkflowRepository.findByRequestId(
				workflowReviewRequestId,
				ctx,
			);
			const currentRow = currentRows.find((row) => row.workflowId === workflowRow.workflowId);
			if (!currentRow) {
				throw new NotFoundError('Could not find review request');
			}

			// Archive and transfer may commit while this decision waits for the lock.
			await this.mutationGuard.assertWorkflowStillReviewable(
				currentRow.workflowId,
				current.projectId,
				ctx,
				'review',
			);

			if (dto.decision === 'approved') {
				// Capture the published version before auto-publish changes it.
				for (const row of currentRows) {
					await this.workflowReviewRequestWorkflowRepository.captureApprovalBaseline(
						{
							workflowReviewRequestId,
							workflowId: row.workflowId,
						},
						ctx,
					);
				}
			}

			current.decision = dto.decision;
			current.updatedById = user.id;
			if (dto.decision === 'approved') {
				current.state = 'closed';
				// Use a system close when the requester cannot publish.
				current.closedById = requesterPublishability?.canPublish === true ? user.id : null;
				current.approvedAt = new Date();
			}

			const savedRequest = await this.workflowReviewRequestRepository.saveRequest(current, ctx);

			await this.activityRepository.createActivity(
				{
					workflowReviewRequestId,
					type: dto.decision === 'approved' ? 'review.approved' : 'review.changes_requested',
					data: {
						// Omit pinned versions that were pruned.
						workflowVersions: currentRows.flatMap((row) =>
							row.workflowVersionId === null
								? []
								: [{ workflowId: row.workflowId, workflowVersionId: row.workflowVersionId }],
						),
						note: dto.note ?? null,
					},
					createdById: user.id,
				},
				ctx,
			);

			return {
				request: savedRequest,
				pinnedVersionId: currentRow.workflowVersionId,
				decidedAsAssignedReviewer: isAssignedReviewerNow,
			};
		});

		this.stateNotifier.notify(workflowRow.workflowId);

		this.eventService.emit('workflow-review-decided', {
			user,
			workflowReviewRequestId,
			workflowId: workflowRow.workflowId,
			workflowVersionId: pinnedVersionId,
			decision: dto.decision,
			decidedVia: decidedAsAssignedReviewer ? 'assigned-reviewer' : 'admin-override',
			reviewCreatedAt: saved.createdAt,
		});

		const summary = toRequestSummary(saved, pinnedVersionId);

		if (dto.decision !== 'approved' || requesterPublishability === null) {
			return summary;
		}

		if (!requesterPublishability.canPublish) {
			this.logger.warn('Cannot publish approved review: requester cannot publish', {
				workflowId: workflowRow.workflowId,
				message: requesterPublishability.failureMessage,
			});
			return {
				...summary,
				autoPublish: {
					status: 'failed',
					message: requesterPublishability.failureMessage,
				},
			};
		}

		return {
			...summary,
			autoPublish: await this.publishApprovedVersion(
				requesterPublishability.requester,
				workflowRow.workflowId,
				pinnedVersionId,
			),
		};
	}

	/**
	 * Checks whether the requester can publish. Approval publishes as the requester, so the
	 * reviewer only needs read access. This runs before the decision lock.
	 */
	private async resolveRequesterPublishability(
		createdById: string | null,
		workflowId: string,
	): Promise<
		{ canPublish: true; requester: User } | { canPublish: false; failureMessage: string }
	> {
		if (!createdById) {
			return {
				canPublish: false,
				failureMessage: 'The review requester is no longer available',
			};
		}

		const [requester] = await this.userRepository.findManyByIds([createdById], {
			includeRole: true,
		});
		if (!requester || requester.disabled) {
			return {
				canPublish: false,
				failureMessage: 'The review requester is no longer available',
			};
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, requester, [
			'workflow:publish',
		]);
		if (!workflow) {
			return {
				canPublish: false,
				failureMessage: 'The review requester no longer has permission to publish this workflow',
			};
		}

		return { canPublish: true, requester };
	}

	private async publishApprovedVersion(
		requester: User,
		workflowId: string,
		pinnedVersionId: string | null,
	): Promise<WorkflowReviewAutoPublishOutcome> {
		if (pinnedVersionId === null) {
			// A pruned version does not change the published workflow. (LIGO-879)
			this.logger.warn('Cannot publish approved review: the pinned version was pruned', {
				workflowId,
			});
			return { status: 'failed', message: 'The reviewed workflow version no longer exists' };
		}

		try {
			await this.workflowService.activateWorkflow(requester, workflowId, {
				versionId: pinnedVersionId,
				source: 'review-approval',
			});
		} catch (error) {
			this.logger.error('Failed to publish workflow after review approval', {
				workflowId,
				pinnedVersionId,
				error,
			});
			return { status: 'failed', message: ensureError(error).message };
		}

		// Notify open editors in the same way as manual activation.
		this.collaborationService
			.broadcastWorkflowUpdate(workflowId, requester.id)
			.catch((error) =>
				this.logger.warn('Failed to broadcast workflow update', { workflowId, error }),
			);

		return { status: 'published' };
	}

	/**
	 * Authors receive 403 because they know the request exists. Other refusals return 404.
	 * Authorship and reviewer assignment are checked again under the lock; roles are not.
	 */
	private assertDecisionAllowed(facts: WorkflowReviewDecisionFacts): void {
		const capability = resolveDecisionCapability(facts);
		if (capability.allowed) {
			return;
		}

		if (capability.reason === 'author') {
			throw new ForbiddenError('Authors cannot decide on their own review request');
		}

		throw new NotFoundError('Could not find review request');
	}
}
