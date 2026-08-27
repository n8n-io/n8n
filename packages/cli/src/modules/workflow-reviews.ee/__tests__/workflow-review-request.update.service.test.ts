import type { UpdateWorkflowReviewRequestVersionDto } from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import { DbLock } from '@n8n/db';
import type {
	DbLockService,
	Project,
	SharedWorkflowRepository,
	User,
	UserRepository,
	WorkflowEntity,
	WorkflowHistory,
	WorkflowHistoryRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflow,
	WorkflowReviewRequestWorkflowRepository,
	WorkflowRepository,
	Transaction,
	OperationContext,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';
import type { RoleService } from '@/services/role.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewRequestMutationGuard } from '../workflow-review-request-mutation-guard.service';
import { WorkflowReviewRequestSubmissionService } from '../workflow-review-request-submission.service';
import { WorkflowReviewStateNotifier } from '../workflow-review-state-notifier.service';

const user = mock<User>({ id: 'user-1' });

const requestId = 'req-1';
const projectId = 'proj-1';
const dto: UpdateWorkflowReviewRequestVersionDto = {
	workflowId: 'wf-1',
	workflowVersionId: 'ver-2',
	workflowVersionName: 'Release candidate',
};

describe('WorkflowReviewRequestSubmissionService.updateVersion', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
	const workflowEntityRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const activityRepository = mock<WorkflowReviewActivityRepository>();
	const userRepository = mock<UserRepository>();
	const roleService = mock<RoleService>();
	const licenseState = mock<LicenseState>();
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();
	const logger = mock<Logger>();
	const eventService = mock<EventService>();
	/** Transaction context used inside the lock. */
	const ctx: OperationContext = { trx: mock<Transaction>() };

	const service = new WorkflowReviewRequestSubmissionService(
		new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
		workflowFinderService,
		workflowHistoryService,
		workflowHistoryRepository,
		sharedWorkflowRepository,
		requestRepository,
		workflowRepository,
		authorRepository,
		reviewerRepository,
		activityRepository,
		userRepository,
		roleService,
		dbLockService,
		eventService,
		new WorkflowReviewRequestMutationGuard(workflowEntityRepository, sharedWorkflowRepository),
		new WorkflowReviewStateNotifier(logger, collaborationService),
	);

	const openRequest = (overrides: Partial<WorkflowReviewRequest> = {}) =>
		mock<WorkflowReviewRequest>({
			id: requestId,
			projectId,
			state: 'open',
			decision: 'pending',
			description: null,
			createdAt: new Date('2026-07-20T10:00:00.000Z'),
			updatedAt: new Date('2026-07-20T11:00:00.000Z'),
			...overrides,
		});

	const mockSuccessfulUpdatePath = () => {
		requestRepository.findById.mockResolvedValue(openRequest());
		workflowRepository.findByRequestId.mockResolvedValue([
			mock<WorkflowReviewRequestWorkflow>({
				workflowReviewRequestId: requestId,
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
			}),
		]);
		workflowFinderService.findWorkflowForUser.mockResolvedValue(
			mock<WorkflowEntity>({ isArchived: false }),
		);
		workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: false });
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
			mock<Project>({ id: projectId }),
		);
		workflowHistoryService.findVersion.mockResolvedValue(mock());
		workflowHistoryRepository.updateVersionMetadata.mockResolvedValue(1);
		requestRepository.saveRequest.mockImplementation(async (request) => request);
	};

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		// Run locked work with the transaction context by default.
		dbLockService.withLockContext.mockImplementation(async (_id, fn) => await fn(ctx));
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	it('throws when the instance policy is disabled, before any lookup or lock', async () => {
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(ForbiddenError);

		expect(requestRepository.findById).not.toHaveBeenCalled();
		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the review request does not exist', async () => {
		requestRepository.findById.mockResolvedValue(null);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(NotFoundError);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the request does not cover the given workflow', async () => {
		requestRepository.findById.mockResolvedValue(openRequest());
		workflowRepository.findByRequestId.mockResolvedValue([
			mock<WorkflowReviewRequestWorkflow>({ workflowId: 'other-wf' }),
		]);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(NotFoundError);

		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the user lacks publish access to the workflow', async () => {
		mockSuccessfulUpdatePath();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(NotFoundError);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
			'workflow:publish',
		]);
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws BadRequestError and never takes the lock for an archived workflow', async () => {
		mockSuccessfulUpdatePath();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(
			mock<WorkflowEntity>({ isArchived: true }),
		);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(BadRequestError);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it.each([
		['closed', openRequest({ state: 'closed' })],
		['approved', openRequest({ decision: 'approved' })],
	])('throws ConflictError and never takes the lock when the request is %s', async (_name, req) => {
		mockSuccessfulUpdatePath();
		requestRepository.findById.mockResolvedValue(req);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(ConflictError);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws BadRequestError and never takes the lock when the version does not exist', async () => {
		mockSuccessfulUpdatePath();
		workflowHistoryService.findVersion.mockResolvedValue(null);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(BadRequestError);

		expect(workflowHistoryService.findVersion).toHaveBeenCalledWith('wf-1', 'ver-2');
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('returns the current summary without lock, writes, or broadcast when the version is unchanged', async () => {
		mockSuccessfulUpdatePath();
		workflowRepository.findByRequestId.mockResolvedValue([
			mock<WorkflowReviewRequestWorkflow>({
				workflowReviewRequestId: requestId,
				workflowId: 'wf-1',
				workflowVersionId: 'ver-2',
			}),
		]);

		const result = await service.updateVersion(user, requestId, dto);

		expect(result).toEqual({
			id: requestId,
			state: 'open',
			decision: 'pending',
			workflowVersionId: 'ver-2',
			createdAt: '2026-07-20T10:00:00.000Z',
			updatedAt: '2026-07-20T11:00:00.000Z',
		});
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
		expect(authorRepository.addAuthorIfMissing).not.toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('re-pins the version, resets the decision, and appends the author in one transaction', async () => {
		mockSuccessfulUpdatePath();

		const result = await service.updateVersion(user, requestId, dto);

		expect(dbLockService.withLockContext).toHaveBeenCalledWith(
			DbLock.WORKFLOW_REVIEW_MUTATION,
			expect.any(Function),
		);
		// Re-check using the lock transaction.
		expect(requestRepository.findById).toHaveBeenCalledWith(requestId, ctx);
		expect(workflowRepository.updateWorkflowVersion).toHaveBeenCalledWith(
			{ workflowReviewRequestId: requestId, workflowId: 'wf-1', workflowVersionId: 'ver-2' },
			ctx,
		);
		expect(requestRepository.saveRequest).toHaveBeenCalledWith(
			expect.objectContaining({ decision: 'pending', updatedById: 'user-1' }),
			ctx,
		);
		expect(authorRepository.addAuthorIfMissing).toHaveBeenCalledWith(
			{ workflowReviewRequestId: requestId, userId: 'user-1' },
			ctx,
		);
		expect(result).toEqual({
			id: requestId,
			state: 'open',
			decision: 'pending',
			workflowVersionId: 'ver-2',
			createdAt: '2026-07-20T10:00:00.000Z',
			updatedAt: '2026-07-20T11:00:00.000Z',
		});
		expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('workflow-review-version-updated', {
			user: expect.objectContaining({ id: 'user-1' }),
			workflowReviewRequestId: requestId,
			workflowId: 'wf-1',
			workflowVersionId: 'ver-2',
		});
	});

	it('throws ConflictError and writes nothing when the request closes between check and lock', async () => {
		mockSuccessfulUpdatePath();
		requestRepository.findById
			.mockResolvedValueOnce(openRequest())
			.mockResolvedValueOnce(openRequest({ state: 'closed' }));

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(ConflictError);

		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
		expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		expect(authorRepository.addAuthorIfMissing).not.toHaveBeenCalled();
	});

	it('writes and broadcasts nothing when a concurrent identical sync wins the lock first', async () => {
		mockSuccessfulUpdatePath();
		workflowRepository.findByRequestId
			.mockResolvedValueOnce([
				mock<WorkflowReviewRequestWorkflow>({
					workflowReviewRequestId: requestId,
					workflowId: 'wf-1',
					workflowVersionId: 'ver-1',
				}),
			])
			// Another update pins the version before this call gets the lock.
			.mockResolvedValueOnce([
				mock<WorkflowReviewRequestWorkflow>({
					workflowReviewRequestId: requestId,
					workflowId: 'wf-1',
					workflowVersionId: 'ver-2',
				}),
			]);

		const result = await service.updateVersion(user, requestId, dto);

		expect(workflowRepository.findByRequestId).toHaveBeenLastCalledWith(requestId, ctx);
		expect(result.workflowVersionId).toBe('ver-2');
		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
		expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		expect(authorRepository.addAuthorIfMissing).not.toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('refuses to re-pin a workflow archived while the update waited for the lock', async () => {
		mockSuccessfulUpdatePath();
		// The workflow is archived while this update waits for the lock.
		workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: true });

		const update = service.updateVersion(user, requestId, dto);
		await expect(update).rejects.toThrow(BadRequestError);
		await expect(update).rejects.toThrow(
			"The workflow 'wf-1' is archived and cannot be submitted as a new review version",
		);

		// Do not record a version update after the workflow stops being reviewable.
		expect(activityRepository.createActivity).not.toHaveBeenCalled();
		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
		expect(requestRepository.saveRequest).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the request disappears between check and lock', async () => {
		mockSuccessfulUpdatePath();
		requestRepository.findById.mockResolvedValueOnce(openRequest()).mockResolvedValueOnce(null);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(NotFoundError);

		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
	});

	describe('pinned version naming', () => {
		/** The request already points to the submitted version. */
		const mockAlreadyPinned = (
			currentName: string | null,
			currentDescription: string | null = null,
		) => {
			mockSuccessfulUpdatePath();
			workflowRepository.findByRequestId.mockResolvedValue([
				mock<WorkflowReviewRequestWorkflow>({
					workflowReviewRequestId: requestId,
					workflowId: 'wf-1',
					workflowVersionId: 'ver-2',
				}),
			]);
			workflowHistoryService.findVersion.mockResolvedValue(
				mock<WorkflowHistory>({ name: currentName, description: currentDescription }),
			);
		};

		it('names the newly pinned version in the same transaction as the re-pin', async () => {
			mockSuccessfulUpdatePath();

			await service.updateVersion(user, requestId, {
				...dto,
				workflowVersionName: '  Release candidate  ',
			});

			expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
				{ workflowId: 'wf-1', versionId: 'ver-2', name: 'Release candidate' },
				ctx,
			);
		});

		it('writes a trimmed description alongside the name on a re-pin', async () => {
			mockSuccessfulUpdatePath();

			await service.updateVersion(user, requestId, {
				...dto,
				workflowVersionDescription: '  What changed  ',
			});

			expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'What changed' }),
				ctx,
			);
		});

		it('updates the review description in the same transaction as the re-pin', async () => {
			mockSuccessfulUpdatePath();

			await service.updateVersion(user, requestId, {
				...dto,
				description: '  Updated review context  ',
			});

			expect(requestRepository.saveRequest).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'Updated review context' }),
				ctx,
			);
		});

		it('throws BadRequestError when the version was pruned before the naming write', async () => {
			mockSuccessfulUpdatePath();
			workflowHistoryRepository.updateVersionMetadata.mockResolvedValue(0);

			await expect(
				service.updateVersion(user, requestId, {
					...dto,
					workflowVersionName: 'Release candidate',
				}),
			).rejects.toThrow(BadRequestError);
		});

		it('renames without taking the lock when only the name changed', async () => {
			mockAlreadyPinned('Old name');

			await service.updateVersion(user, requestId, { ...dto, workflowVersionName: 'New name' });

			expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
				{ workflowId: 'wf-1', versionId: 'ver-2', name: 'New name' },
				// This metadata-only update does not need the request lock.
				{},
			);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
		});

		it('writes nothing when the pinned version already carries the same name', async () => {
			mockAlreadyPinned('Same name');

			await service.updateVersion(user, requestId, { ...dto, workflowVersionName: 'Same name' });
			expect(workflowHistoryRepository.updateVersionMetadata).not.toHaveBeenCalled();
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('updates without taking the lock when only the description changed', async () => {
			mockAlreadyPinned('Same name', 'Old description');

			await service.updateVersion(user, requestId, {
				...dto,
				workflowVersionName: 'Same name',
				workflowVersionDescription: 'New description',
			});

			expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
				{
					workflowId: 'wf-1',
					versionId: 'ver-2',
					name: 'Same name',
					description: 'New description',
				},
				// This metadata-only update does not need the request lock.
				{},
			);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('clears the description when an empty string is sent for the pinned version', async () => {
			mockAlreadyPinned('Same name', 'Old description');

			await service.updateVersion(user, requestId, {
				...dto,
				workflowVersionName: 'Same name',
				workflowVersionDescription: '   ',
			});

			expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
				expect.objectContaining({ description: null }),
				{},
			);
		});

		it('writes nothing when the pinned version already carries the same name and description', async () => {
			mockAlreadyPinned('Same name', 'Same description');

			await service.updateVersion(user, requestId, {
				...dto,
				workflowVersionName: 'Same name',
				workflowVersionDescription: 'Same description',
			});

			expect(workflowHistoryRepository.updateVersionMetadata).not.toHaveBeenCalled();
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('updates the review description under the lock when the version is already pinned', async () => {
			mockAlreadyPinned('Same name');
			requestRepository.findById.mockResolvedValue(
				openRequest({ description: 'Original review description' }),
			);

			await service.updateVersion(user, requestId, {
				...dto,
				workflowVersionName: 'Same name',
				description: '  Updated review description  ',
			});

			expect(dbLockService.withLockContext).toHaveBeenCalledOnce();
			expect(requestRepository.saveRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					description: 'Updated review description',
					updatedById: user.id,
				}),
				ctx,
			);
			expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
			// The review changed, but no new version was submitted for review.
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('clears the review description when an empty string is sent', async () => {
			mockAlreadyPinned('Same name');
			requestRepository.findById.mockResolvedValue(
				openRequest({ description: 'Original review description' }),
			);

			await service.updateVersion(user, requestId, {
				...dto,
				workflowVersionName: 'Same name',
				description: '   ',
			});

			expect(requestRepository.saveRequest).toHaveBeenCalledWith(
				expect.objectContaining({ description: null }),
				ctx,
			);
		});

		it('preserves the review description when it is omitted', async () => {
			mockAlreadyPinned('Same name');
			requestRepository.findById.mockResolvedValue(
				openRequest({ description: 'Original review description' }),
			);

			await service.updateVersion(user, requestId, {
				...dto,
				workflowVersionName: 'Same name',
			});

			expect(requestRepository.saveRequest).not.toHaveBeenCalled();
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('still names the version when a concurrent sync re-pinned it first', async () => {
			mockSuccessfulUpdatePath();
			workflowHistoryService.findVersion.mockResolvedValue(
				mock<WorkflowHistory>({ name: 'Old name' }),
			);
			workflowRepository.findByRequestId
				// The initial read still points to the old version.
				.mockResolvedValueOnce([
					mock<WorkflowReviewRequestWorkflow>({
						workflowReviewRequestId: requestId,
						workflowId: 'wf-1',
						workflowVersionId: 'ver-1',
					}),
				])
				// Another update pins the version first, leaving only the rename.
				.mockResolvedValueOnce([
					mock<WorkflowReviewRequestWorkflow>({
						workflowReviewRequestId: requestId,
						workflowId: 'wf-1',
						workflowVersionId: 'ver-2',
					}),
				]);

			await service.updateVersion(user, requestId, { ...dto, workflowVersionName: 'New name' });

			expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
				{ workflowId: 'wf-1', versionId: 'ver-2', name: 'New name' },
				ctx,
			);
			// Only the version name needs to change.
			expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
			expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		});
	});

	describe('review state broadcast', () => {
		it('broadcasts exactly once after the lock resolves', async () => {
			mockSuccessfulUpdatePath();
			let lockResolved = false;
			dbLockService.withLockContext.mockImplementation(async (_id, fn) => {
				const result = await fn(ctx);
				lockResolved = true;
				return result;
			});
			collaborationService.broadcastWorkflowReviewStateChanged.mockImplementation(async () => {
				expect(lockResolved).toBe(true);
			});

			await service.updateVersion(user, requestId, dto);

			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledTimes(1);
			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
		});

		it('does not broadcast on an in-transaction conflict', async () => {
			mockSuccessfulUpdatePath();
			requestRepository.findById
				.mockResolvedValueOnce(openRequest())
				.mockResolvedValueOnce(openRequest({ state: 'closed' }));

			await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(ConflictError);

			expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
		});

		it('resolves and logs a warning when the broadcast rejects', async () => {
			mockSuccessfulUpdatePath();
			collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
				new Error('push down'),
			);

			const result = await service.updateVersion(user, requestId, dto);
			expect(result.id).toBe(requestId);

			// Wait for the rejected notification to be logged.
			await new Promise(process.nextTick);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to broadcast review state change',
				expect.objectContaining({ workflowId: 'wf-1' }),
			);
		});
	});
});
