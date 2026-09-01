import type {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	UpdateWorkflowReviewRequestVersionDto,
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import {
	DbLock,
	DbLockService,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type OperationContext,
	type User,
	type WorkflowReviewRequest,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { RoleService } from '@/services/role.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toEligibleReviewer, toRequestSummary } from './workflow-review.mapper';
import {
	assertWorkflowReviewRequestUpdatable,
	WorkflowReviewRequestMutationGuard,
} from './workflow-review-request-mutation-guard.service';
import { WorkflowReviewStateNotifier } from './workflow-review-state-notifier.service';
/** Undefined leaves the value unchanged; blank text clears it. */
function normalizeDescription(description: string | undefined): string | null | undefined {
	if (description === undefined) return undefined;
	return description.trim() || null;
}

@Service()
export class WorkflowReviewRequestSubmissionService {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly activityRepository: WorkflowReviewActivityRepository,
		private readonly userRepository: UserRepository,
		private readonly roleService: RoleService,
		private readonly dbLockService: DbLockService,
		private readonly eventService: EventService,
		private readonly mutationGuard: WorkflowReviewRequestMutationGuard,
		private readonly stateNotifier: WorkflowReviewStateNotifier,
	) {}

	private async findEligibleReviewers(projectId: string, excludeUserId: string): Promise<User[]> {
		const [projectRoleSlugs, globalRoleSlugs] = await Promise.all([
			this.roleService.rolesWithScope('project', ['workflow:read']),
			this.roleService.rolesWithScope('global', ['workflow:read']),
		]);

		const users = await this.userRepository.findEligibleByProjectOrGlobalRoles({
			projectId,
			projectRoleSlugs,
			globalRoleSlugs,
		});

		return users
			.filter((user) => !user.isPending && user.id !== excludeUserId)
			.sort((a, b) => a.email.localeCompare(b.email));
	}

	async getEligibleReviewers(
		user: User,
		query: GetWorkflowReviewEligibleReviewersQueryDto,
	): Promise<WorkflowReviewEligibleReviewersList> {
		await this.featureGate.assertAvailable();

		const workflow = await this.workflowFinderService.findWorkflowForUser(query.workflowId, user, [
			'workflow:publish',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(query.workflowId);
		if (!project) {
			throw new NotFoundError('Could not find workflow');
		}

		const reviewers = await this.findEligibleReviewers(project.id, user.id);

		// The result is limited to project members and instance admins.
		return {
			count: reviewers.length,
			data: reviewers.map(toEligibleReviewer),
		};
	}

	/** Updates version metadata in the request transaction and fails if the version was pruned. */
	private async nameVersion(
		workflowId: string,
		versionId: string,
		name: string,
		description: string | null | undefined,
		ctx: OperationContext,
	): Promise<void> {
		const affected = await this.workflowHistoryRepository.updateVersionMetadata(
			{ workflowId, versionId, name, description },
			ctx,
		);

		if (affected === 0) {
			throw new BadRequestError(
				`Version '${versionId}' does not exist for workflow '${workflowId}'`,
			);
		}
	}

	private async updateVersionMetadataIfChanged(
		current: { name: string | null; description: string | null },
		workflowId: string,
		versionId: string,
		name: string,
		description: string | null | undefined,
		ctx: OperationContext,
	): Promise<void> {
		const changed =
			name !== current.name || (description !== undefined && description !== current.description);
		if (changed) {
			await this.nameVersion(workflowId, versionId, name, description, ctx);
		}
	}

	async create(
		user: User,
		dto: CreateWorkflowReviewRequestDto,
	): Promise<WorkflowReviewRequestSummary> {
		const { workflowId, workflowVersionId, workflowVersionName, workflowVersionDescription } =
			dto.workflows[0];
		const versionName = workflowVersionName.trim();
		const versionDescription = normalizeDescription(workflowVersionDescription);

		await this.featureGate.assertAvailable();

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:publish',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		if (workflow.isArchived) {
			throw new BadRequestError(
				`The workflow '${workflowId}' is archived and cannot be submitted for review`,
			);
		}

		const version = await this.workflowHistoryService.findVersion(workflowId, workflowVersionId);
		if (!version) {
			throw new BadRequestError(
				`Version '${workflowVersionId}' does not exist for workflow '${workflowId}'`,
			);
		}

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		if (!project) {
			throw new NotFoundError('Could not find workflow');
		}

		const reviewerUserIds = [...new Set(dto.reviewerUserIds)];
		if (reviewerUserIds.length === 0) {
			throw new BadRequestError('You must assign at least one reviewer');
		}

		if (reviewerUserIds.includes(user.id)) {
			throw new BadRequestError('You cannot assign yourself as a reviewer');
		}

		const eligibleIds = new Set(
			(await this.findEligibleReviewers(project.id, user.id)).map((reviewer) => reviewer.id),
		);
		// The requester can already list eligible reviewer IDs.
		const ineligibleIds = reviewerUserIds.filter((id) => !eligibleIds.has(id));
		if (ineligibleIds.length > 0) {
			throw new BadRequestError(
				`These users are not eligible to review this workflow: ${ineligibleIds.join(', ')}`,
			);
		}

		const request = await this.dbLockService.withLockContext(
			DbLock.WORKFLOW_REVIEW_MUTATION,
			async (ctx) => {
				// The workflow may have been archived or moved while this request waited.
				await this.mutationGuard.assertWorkflowStillReviewable(
					workflowId,
					project.id,
					ctx,
					'submit',
				);

				const existing = await this.workflowReviewRequestRepository.findOpenRequestForWorkflow(
					workflowId,
					ctx,
				);
				if (existing) {
					throw new ConflictError(
						'An open review request already exists for this workflow',
						'Update the existing review request instead of creating a new one',
						{ workflowReviewRequestId: existing.id },
					);
				}

				const created = await this.workflowReviewRequestRepository.createRequest(
					{
						projectId: project.id,
						title: dto.title,
						description: normalizeDescription(dto.description) ?? null,
						createdById: user.id,
					},
					ctx,
				);

				await this.workflowReviewRequestWorkflowRepository.createWorkflowRow(
					{
						workflowReviewRequestId: created.id,
						workflowId,
						workflowVersionId,
					},
					ctx,
				);

				// Do not change version metadata when an open request already exists.
				await this.nameVersion(workflowId, workflowVersionId, versionName, versionDescription, ctx);

				await this.workflowReviewRequestAuthorRepository.addAuthor(
					{ workflowReviewRequestId: created.id, userId: user.id },
					ctx,
				);

				await this.workflowReviewRequestReviewerRepository.addReviewers(
					{ workflowReviewRequestId: created.id, userIds: reviewerUserIds },
					ctx,
				);

				// Keep the opening version in activity after the request moves to another version.
				await this.activityRepository.createActivity(
					{
						workflowReviewRequestId: created.id,
						type: 'review.opened',
						data: { workflowVersions: [{ workflowId, workflowVersionId }] },
						createdById: user.id,
					},
					ctx,
				);

				return created;
			},
		);

		this.stateNotifier.notify(workflowId);

		this.eventService.emit('workflow-review-requested', {
			user,
			workflowReviewRequestId: request.id,
			projectId: project.id,
			workflowId,
			workflowVersionId,
			reviewerCount: reviewerUserIds.length,
		});

		return toRequestSummary(request, workflowVersionId);
	}

	/** Moves an open request to another workflow version without losing its history. */
	async updateVersion(
		user: User,
		workflowReviewRequestId: string,
		dto: UpdateWorkflowReviewRequestVersionDto,
	): Promise<WorkflowReviewRequestSummary> {
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
		const workflowRow = workflowRows.find((row) => row.workflowId === dto.workflowId);
		if (!workflowRow) {
			throw new NotFoundError('Could not find review request');
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(dto.workflowId, user, [
			'workflow:publish',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		if (workflow.isArchived) {
			throw new BadRequestError(
				`The workflow '${dto.workflowId}' is archived and its review cannot be updated`,
			);
		}

		assertWorkflowReviewRequestUpdatable(request);

		const version = await this.workflowHistoryService.findVersion(
			dto.workflowId,
			dto.workflowVersionId,
		);
		if (!version) {
			throw new BadRequestError(
				`Version '${dto.workflowVersionId}' does not exist for workflow '${dto.workflowId}'`,
			);
		}

		const versionName = dto.workflowVersionName.trim();
		const versionDescription = normalizeDescription(dto.workflowVersionDescription);
		const reviewDescription = normalizeDescription(dto.description);
		const hasReviewDescriptionChanged = (current: WorkflowReviewRequest) =>
			reviewDescription !== undefined && reviewDescription !== current.description;

		// Skip the lock when neither the pinned version nor request details change.
		if (
			workflowRow.workflowVersionId === dto.workflowVersionId &&
			!hasReviewDescriptionChanged(request)
		) {
			// Version metadata can still change without updating the request.
			await this.updateVersionMetadataIfChanged(
				version,
				dto.workflowId,
				dto.workflowVersionId,
				versionName,
				versionDescription,
				{},
			);

			return toRequestSummary(request, workflowRow.workflowVersionId);
		}

		const {
			request: updated,
			changed,
			versionUpdated,
		} = await this.dbLockService.withLockContext(DbLock.WORKFLOW_REVIEW_MUTATION, async (ctx) => {
			// Re-check under the lock to avoid racing a close or approval.
			const current = await this.workflowReviewRequestRepository.findById(
				workflowReviewRequestId,
				ctx,
			);
			if (!current) {
				throw new NotFoundError('Could not find review request');
			}
			assertWorkflowReviewRequestUpdatable(current);

			// Another update may have pinned this version while this call waited.
			const currentRows = await this.workflowReviewRequestWorkflowRepository.findByRequestId(
				workflowReviewRequestId,
				ctx,
			);
			const currentRow = currentRows.find((row) => row.workflowId === dto.workflowId);
			if (!currentRow) {
				throw new NotFoundError('Could not find review request');
			}

			// Archive and transfer may commit while this update waits for the lock.
			await this.mutationGuard.assertWorkflowStillReviewable(
				currentRow.workflowId,
				current.projectId,
				ctx,
				'update',
			);

			if (currentRow.workflowVersionId === dto.workflowVersionId) {
				// Apply metadata that may still differ after another update pinned the version.
				await this.updateVersionMetadataIfChanged(
					version,
					dto.workflowId,
					dto.workflowVersionId,
					versionName,
					versionDescription,
					ctx,
				);

				if (reviewDescription === undefined || reviewDescription === current.description) {
					return { request: current, changed: false, versionUpdated: false };
				}

				current.description = reviewDescription;
				current.updatedById = user.id;
				const saved = await this.workflowReviewRequestRepository.saveRequest(current, ctx);

				return { request: saved, changed: true, versionUpdated: false };
			}

			// Save the previous version for the activity entry.
			const fromWorkflowVersionId = currentRow.workflowVersionId;

			await this.workflowReviewRequestWorkflowRepository.updateWorkflowVersion(
				{
					workflowReviewRequestId,
					workflowId: dto.workflowId,
					workflowVersionId: dto.workflowVersionId,
				},
				ctx,
			);

			await this.nameVersion(
				dto.workflowId,
				dto.workflowVersionId,
				versionName,
				versionDescription,
				ctx,
			);

			current.decision = 'pending';
			if (reviewDescription !== undefined) {
				current.description = reviewDescription;
			}
			current.updatedById = user.id;
			const saved = await this.workflowReviewRequestRepository.saveRequest(current, ctx);

			await this.workflowReviewRequestAuthorRepository.addAuthorIfMissing(
				{ workflowReviewRequestId, userId: user.id },
				ctx,
			);

			await this.activityRepository.createActivity(
				{
					workflowReviewRequestId,
					type: 'review.version_updated',
					data: {
						workflowId: dto.workflowId,
						fromWorkflowVersionId,
						toWorkflowVersionId: dto.workflowVersionId,
					},
					createdById: user.id,
				},
				ctx,
			);

			return { request: saved, changed: true, versionUpdated: true };
		});

		if (changed) {
			this.stateNotifier.notify(dto.workflowId);
		}

		// Emit this event only when the pinned version changed.
		if (versionUpdated) {
			this.eventService.emit('workflow-review-version-updated', {
				user,
				workflowReviewRequestId,
				workflowId: dto.workflowId,
				workflowVersionId: dto.workflowVersionId,
			});
		}

		return toRequestSummary(updated, dto.workflowVersionId);
	}
}
