import type {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ListWorkflowReviewRequestsQueryDto,
} from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import { DbLock, User } from '@n8n/db';
import type {
	AuthIdentity,
	DbLockService,
	Project,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowEntity,
	WorkflowHistoryRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestForWorkflowRow,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestReviewerRepository,
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
import type { WorkflowReviewAuthorizationService } from '../workflow-review-authorization.service';

import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewRequestMutationGuard } from '../workflow-review-request-mutation-guard.service';
import { WorkflowReviewRequestStatusService } from '../workflow-review-request-status.service';
import { WorkflowReviewRequestSubmissionService } from '../workflow-review-request-submission.service';
import { WorkflowReviewStateNotifier } from '../workflow-review-state-notifier.service';
const user = mock<User>({ id: 'user-1' });

/** Build a loaded user with the computed pending state. */
function loadedUser(fields: Partial<User> & { id: string; email: string }): User {
	const loaded = Object.assign(new User(), { password: 'hashed', authIdentities: [], ...fields });
	loaded.computeIsPending();
	return loaded;
}

const dto: CreateWorkflowReviewRequestDto = {
	title: 'Please review',
	description: 'A description',
	workflows: [
		{ workflowId: 'wf-1', workflowVersionId: 'ver-1', workflowVersionName: 'Release candidate' },
	],
	reviewerUserIds: ['user-2'],
};

describe('workflow review request services', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
	/** Workflow entity repository; `workflowRepository` stores request links. */
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
	const authorizationService = mock<WorkflowReviewAuthorizationService>();
	const logger = mock<Logger>();
	const eventService = mock<EventService>();
	/** Transaction context used inside the lock. */
	const ctx: OperationContext = { trx: mock<Transaction>() };

	const featureGate = new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService);
	const mutationGuard = new WorkflowReviewRequestMutationGuard(
		workflowEntityRepository,
		sharedWorkflowRepository,
	);
	const submissionService = new WorkflowReviewRequestSubmissionService(
		featureGate,
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
		mutationGuard,
		new WorkflowReviewStateNotifier(logger, collaborationService),
	);
	const statusService = new WorkflowReviewRequestStatusService(
		featureGate,
		workflowFinderService,
		requestRepository,
		userRepository,
		authorizationService,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		authorizationService.resolveOpenableRequestIds.mockResolvedValue(new Set());
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		// Enable the feature unless a test overrides it.
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		// Run locked work with the transaction context by default.
		dbLockService.withLockContext.mockImplementation(async (_id, fn) => await fn(ctx));
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	describe('create', () => {
		// Provide the required eligible reviewer by default.
		beforeEach(() => {
			roleService.rolesWithScope.mockResolvedValue(['some-role']);
			userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue([
				loadedUser({ id: 'user-2', email: 'user-2@n8n.io' }),
			]);
		});

		const mockSuccessfulCreatePath = () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			// The locked check reads the latest archived state.
			workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: false });
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			requestRepository.findOpenRequestForWorkflow.mockResolvedValue(null);
			requestRepository.createRequest.mockResolvedValue(
				mock<WorkflowReviewRequest>({
					id: 'req-1',
					createdAt: new Date('2024-01-01T00:00:00.000Z'),
					updatedAt: new Date('2024-01-01T00:00:00.000Z'),
				}),
			);
			workflowHistoryRepository.updateVersionMetadata.mockResolvedValue(1);
		};

		it('throws when the instance policy is disabled, before any lookup or lock', async () => {
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

			await expect(submissionService.create(user, dto)).rejects.toThrow(ForbiddenError);

			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('creates the review request, workflow reference, and author in one transaction', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: false });
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			requestRepository.findOpenRequestForWorkflow.mockResolvedValue(null);
			requestRepository.createRequest.mockResolvedValue(
				mock<WorkflowReviewRequest>({
					id: 'req-1',
					createdAt: new Date('2024-01-01T00:00:00.000Z'),
					updatedAt: new Date('2024-01-01T00:00:00.000Z'),
				}),
			);

			const result = await submissionService.create(user, dto);

			expect(result.id).toBe('req-1');
			expect(dbLockService.withLockContext).toHaveBeenCalledWith(
				DbLock.WORKFLOW_REVIEW_MUTATION,
				expect.any(Function),
			);
			expect(requestRepository.createRequest).toHaveBeenCalledWith(
				{
					projectId: 'project-1',
					title: 'Please review',
					description: 'A description',
					createdById: 'user-1',
				},
				ctx,
			);
			expect(workflowRepository.createWorkflowRow).toHaveBeenCalledWith(
				{ workflowReviewRequestId: 'req-1', workflowId: 'wf-1', workflowVersionId: 'ver-1' },
				ctx,
			);
			expect(authorRepository.addAuthor).toHaveBeenCalledWith(
				{ workflowReviewRequestId: 'req-1', userId: 'user-1' },
				ctx,
			);
		});

		it('throws NotFoundError without acquiring a lock when the workflow cannot be found', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(submissionService.create(user, dto)).rejects.toThrow(NotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:publish',
			]);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('throws BadRequestError and never takes the lock for an archived workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: true }),
			);

			await expect(submissionService.create(user, dto)).rejects.toThrow(BadRequestError);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('throws BadRequestError and never takes the lock when the version does not exist', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(null);

			await expect(submissionService.create(user, dto)).rejects.toThrow(BadRequestError);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the workflow has no owning project', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(submissionService.create(user, dto)).rejects.toThrow(NotFoundError);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('throws ConflictError carrying the existing id and writes nothing when an open review exists', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: false });
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
				mock<WorkflowReviewRequest>({ id: 'existing-1' }),
			);

			const error = await submissionService.create(user, dto).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(ConflictError);
			expect((error as ConflictError).meta).toEqual({ workflowReviewRequestId: 'existing-1' });

			expect(requestRepository.createRequest).not.toHaveBeenCalled();
			expect(workflowRepository.createWorkflowRow).not.toHaveBeenCalled();
			expect(authorRepository.addAuthor).not.toHaveBeenCalled();
		});

		it('rejects a workflow archived between the pre-lock check and the lock', async () => {
			mockSuccessfulCreatePath();
			workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: true });

			const creation = submissionService.create(user, dto);
			await expect(creation).rejects.toThrow(BadRequestError);
			await expect(creation).rejects.toThrow(
				"The workflow 'wf-1' is archived and cannot be submitted for review",
			);

			expect(dbLockService.withLockContext).toHaveBeenCalled();
			expect(requestRepository.createRequest).not.toHaveBeenCalled();
			expect(workflowRepository.createWorkflowRow).not.toHaveBeenCalled();
		});

		it('rejects a workflow deleted between the pre-lock check and the lock', async () => {
			mockSuccessfulCreatePath();
			workflowEntityRepository.findArchivedState.mockResolvedValue(null);

			await expect(submissionService.create(user, dto)).rejects.toThrow(NotFoundError);

			expect(requestRepository.createRequest).not.toHaveBeenCalled();
			expect(workflowRepository.createWorkflowRow).not.toHaveBeenCalled();
		});

		it('rejects a workflow whose owner disappears between the pre-lock check and the lock', async () => {
			mockSuccessfulCreatePath();
			sharedWorkflowRepository.getWorkflowOwningProject
				.mockResolvedValueOnce(mock<Project>({ id: 'project-1' }))
				.mockResolvedValueOnce(undefined);

			const creation = submissionService.create(user, dto);
			await expect(creation).rejects.toThrow(NotFoundError);
			await expect(creation).rejects.toThrow('Could not find workflow');

			expect(dbLockService.withLockContext).toHaveBeenCalled();
			expect(requestRepository.createRequest).not.toHaveBeenCalled();
		});

		// Both reads must use the lock transaction.
		it('runs both in-lock re-check reads on the lock transaction', async () => {
			mockSuccessfulCreatePath();

			await submissionService.create(user, dto);

			expect(workflowEntityRepository.findArchivedState).toHaveBeenCalledWith('wf-1', ctx);
			expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenLastCalledWith(
				'wf-1',
				ctx,
			);
		});

		it('rejects a workflow moved to another project between the pre-lock check and the lock', async () => {
			mockSuccessfulCreatePath();
			sharedWorkflowRepository.getWorkflowOwningProject
				.mockResolvedValueOnce(mock<Project>({ id: 'project-1' }))
				.mockResolvedValueOnce(mock<Project>({ id: 'project-2' }));

			await expect(submissionService.create(user, dto)).rejects.toThrow(ConflictError);

			expect(dbLockService.withLockContext).toHaveBeenCalled();
			expect(requestRepository.createRequest).not.toHaveBeenCalled();
		});

		describe('reviewer assignment', () => {
			const mockEligibleReviewers = (...ids: string[]) => {
				roleService.rolesWithScope.mockResolvedValue(['some-role']);
				userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue(
					ids.map((id) => loadedUser({ id, email: `${id}@n8n.io` })),
				);
			};

			it('writes deduplicated reviewers in the same transaction as the request', async () => {
				mockSuccessfulCreatePath();
				mockEligibleReviewers('user-2', 'user-3');

				await submissionService.create(user, {
					...dto,
					reviewerUserIds: ['user-2', 'user-2', 'user-3'],
				});

				expect(reviewerRepository.addReviewers).toHaveBeenCalledWith(
					{ workflowReviewRequestId: 'req-1', userIds: ['user-2', 'user-3'] },
					ctx,
				);
			});

			it('rejects self-assignment before checking eligibility or taking the lock', async () => {
				mockSuccessfulCreatePath();

				await expect(
					submissionService.create(user, { ...dto, reviewerUserIds: ['user-1'] }),
				).rejects.toThrow(BadRequestError);

				expect(userRepository.findEligibleByProjectOrGlobalRoles).not.toHaveBeenCalled();
				expect(dbLockService.withLockContext).not.toHaveBeenCalled();
			});

			it('rejects reviewers outside the eligible set before taking the lock, naming them', async () => {
				mockSuccessfulCreatePath();
				mockEligibleReviewers('user-2');

				await expect(
					submissionService.create(user, { ...dto, reviewerUserIds: ['user-2', 'user-99'] }),
				).rejects.toThrow('These users are not eligible to review this workflow: user-99');

				expect(dbLockService.withLockContext).not.toHaveBeenCalled();
			});

			it('rejects a pending user as reviewer even when their role qualifies', async () => {
				mockSuccessfulCreatePath();
				roleService.rolesWithScope.mockResolvedValue(['some-role']);
				userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue([
					loadedUser({ id: 'user-2', email: 'user-2@n8n.io', password: null }),
				]);

				await expect(
					submissionService.create(user, { ...dto, reviewerUserIds: ['user-2'] }),
				).rejects.toThrow(BadRequestError);
			});

			// The service still validates this if DTO validation is bypassed.
			it.each<[string, string[] | undefined]>([
				['omitted', undefined],
				['empty', []],
			])('rejects a create with %s reviewers', async (_name, reviewerUserIds) => {
				mockSuccessfulCreatePath();

				await expect(
					submissionService.create(user, {
						...dto,
						reviewerUserIds,
					} as CreateWorkflowReviewRequestDto),
				).rejects.toThrow(BadRequestError);

				expect(dbLockService.withLockContext).not.toHaveBeenCalled();
				expect(reviewerRepository.addReviewers).not.toHaveBeenCalled();
			});
		});

		describe('pinned version naming', () => {
			const namedDto = (workflowVersionName: string): CreateWorkflowReviewRequestDto => ({
				...dto,
				workflows: [{ ...dto.workflows[0], workflowVersionName }],
			});

			it('names the pinned version in the same transaction as the request', async () => {
				mockSuccessfulCreatePath();

				await submissionService.create(user, namedDto('  Release candidate  '));

				expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
					{
						workflowId: 'wf-1',
						versionId: 'ver-1',
						name: 'Release candidate',
						description: undefined,
					},
					ctx,
				);
			});

			it('writes a trimmed version description alongside the name', async () => {
				mockSuccessfulCreatePath();

				await submissionService.create(user, {
					...dto,
					workflows: [{ ...dto.workflows[0], workflowVersionDescription: '  What changed  ' }],
				});

				expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
					expect.objectContaining({ description: 'What changed' }),
					ctx,
				);
			});

			it('clears the version description when an empty string is sent', async () => {
				mockSuccessfulCreatePath();

				await submissionService.create(user, {
					...dto,
					workflows: [{ ...dto.workflows[0], workflowVersionDescription: '   ' }],
				});

				expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
					expect.objectContaining({ description: null }),
					ctx,
				);
			});

			it('does not name the version when an open review already conflicts', async () => {
				mockSuccessfulCreatePath();
				requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
					mock<WorkflowReviewRequest>({ id: 'existing-1' }),
				);

				await expect(submissionService.create(user, namedDto('Release candidate'))).rejects.toThrow(
					ConflictError,
				);

				expect(workflowHistoryRepository.updateVersionMetadata).not.toHaveBeenCalled();
			});

			it('throws BadRequestError when the version was pruned before the naming write', async () => {
				mockSuccessfulCreatePath();
				workflowHistoryRepository.updateVersionMetadata.mockResolvedValue(0);

				await expect(submissionService.create(user, namedDto('Release candidate'))).rejects.toThrow(
					BadRequestError,
				);
			});
		});

		describe('review state broadcast', () => {
			it('broadcasts exactly once after the lock resolves', async () => {
				mockSuccessfulCreatePath();
				let lockResolved = false;
				dbLockService.withLockContext.mockImplementation(async (_id, fn) => {
					const result = await fn(ctx);
					lockResolved = true;
					return result;
				});
				collaborationService.broadcastWorkflowReviewStateChanged.mockImplementation(async () => {
					expect(lockResolved).toBe(true);
				});

				await submissionService.create(user, dto);

				expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledTimes(1);
				expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith(
					'wf-1',
				);
				expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('workflow-review-requested', {
					user: expect.objectContaining({ id: 'user-1' }),
					workflowReviewRequestId: 'req-1',
					projectId: 'project-1',
					workflowId: 'wf-1',
					workflowVersionId: 'ver-1',
					reviewerCount: 1,
				});
			});

			it('does not broadcast on conflict', async () => {
				mockSuccessfulCreatePath();
				requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
					mock<WorkflowReviewRequest>({ id: 'existing-1' }),
				);

				await expect(submissionService.create(user, dto)).rejects.toThrow(ConflictError);

				expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
				expect(eventService.emit).not.toHaveBeenCalled();
			});

			it('resolves and logs a warning when the broadcast rejects', async () => {
				mockSuccessfulCreatePath();
				collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
					new Error('push down'),
				);

				const result = await submissionService.create(user, dto);
				expect(result.id).toBe('req-1');

				// Wait for the rejected notification to be logged.
				await new Promise(process.nextTick);
				expect(logger.warn).toHaveBeenCalledWith(
					'Failed to broadcast review state change',
					expect.objectContaining({ workflowId: 'wf-1' }),
				);
			});
		});
	});

	describe('getEligibleReviewers', () => {
		const query = { workflowId: 'wf-1' } as GetWorkflowReviewEligibleReviewersQueryDto;

		const mockEligibleLookupPath = () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'project'
					? ['project:admin', 'project:editor', 'custom:reviewer']
					: ['global:owner', 'global:admin'],
			);
		};

		it('throws NotFoundError when the user lacks publish access to the workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(submissionService.getEligibleReviewers(user, query)).rejects.toThrow(
				NotFoundError,
			);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:publish',
			]);
			expect(userRepository.findEligibleByProjectOrGlobalRoles).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the workflow has no owning project', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(submissionService.getEligibleReviewers(user, query)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('does not misclassify an SSO user without a password as pending', async () => {
			mockEligibleLookupPath();
			userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue([
				loadedUser({
					id: 'user-sso',
					email: 'sso@n8n.io',
					password: null,
					authIdentities: [mock<AuthIdentity>({ providerType: 'ldap' })],
				}),
			]);

			const result = await submissionService.getEligibleReviewers(user, query);

			expect(result.data).toEqual([
				{ id: 'user-sso', email: 'sso@n8n.io', firstName: null, lastName: null },
			]);
		});
	});

	describe('list', () => {
		const query = mock<ListWorkflowReviewRequestsQueryDto>({
			workflowId: 'wf-1',
			skip: 0,
			take: 1,
		});

		const latestReviewRow = (
			overrides: Partial<WorkflowReviewRequestForWorkflowRow> = {},
		): WorkflowReviewRequestForWorkflowRow => ({
			id: 'req-1',
			projectId: 'proj-1',
			state: 'open',
			decision: 'pending',
			description: null,
			updatedById: 'user-2',
			workflowVersionId: 'ver-1',
			workflowVersionName: null,
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
			updatedAt: new Date('2024-01-02T00:00:00.000Z'),
			...overrides,
		});

		const mockLatestReview = (overrides: Partial<WorkflowReviewRequestForWorkflowRow> = {}) => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			requestRepository.findRequestsForWorkflow.mockResolvedValue([
				[latestReviewRow(overrides)],
				1,
			]);
		};

		const reviewer = loadedUser({
			id: 'user-2',
			email: 'reviewer@example.com',
			firstName: 'Rey',
			lastName: 'Viewer',
		});

		it('throws NotFoundError when the user has no read access to the workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(statusService.list(user, query)).rejects.toThrow(NotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:read',
			]);
			expect(requestRepository.findRequestsForWorkflow).not.toHaveBeenCalled();
		});

		it('throws when the instance policy is disabled, before any lookup', async () => {
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

			await expect(statusService.list(user, query)).rejects.toThrow(ForbiddenError);

			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
			expect(requestRepository.findRequestsForWorkflow).not.toHaveBeenCalled();
		});

		it('resolves the decision actor of a changes-requested review', async () => {
			mockLatestReview({ decision: 'changes_requested' });
			userRepository.findManyByIds.mockResolvedValue([reviewer]);

			const { count, data } = await statusService.list(user, query);

			expect(userRepository.findManyByIds).toHaveBeenCalledWith(['user-2']);
			expect(count).toBe(1);
			expect(data).toEqual([
				{
					id: 'req-1',
					state: 'open',
					decision: 'changes_requested',
					description: null,
					workflowVersionId: 'ver-1',
					workflowVersionName: null,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
					decisionBy: {
						id: 'user-2',
						email: 'reviewer@example.com',
						firstName: 'Rey',
						lastName: 'Viewer',
					},
					viewerCanOpen: false,
				},
			]);
		});

		it('carries the pinned version name through to the response', async () => {
			mockLatestReview({ workflowVersionName: 'Release candidate' });

			const { data } = await statusService.list(user, query);

			expect(data[0]).toMatchObject({ workflowVersionName: 'Release candidate' });
		});

		it('falls back to no actor when the deciding user was deleted', async () => {
			mockLatestReview({ decision: 'changes_requested' });
			userRepository.findManyByIds.mockResolvedValue([]);

			const { data } = await statusService.list(user, query);

			expect(data[0]?.decisionBy).toBeNull();
		});

		it('resolves no actor when the decision records none', async () => {
			mockLatestReview({ decision: 'changes_requested', updatedById: null });

			const { data } = await statusService.list(user, query);

			expect(userRepository.findManyByIds).not.toHaveBeenCalled();
			expect(data[0]?.decisionBy).toBeNull();
		});

		it('names no actor for an approved review', async () => {
			mockLatestReview({ state: 'closed', decision: 'approved' });

			const { data } = await statusService.list(user, query);

			expect(data[0]).toMatchObject({ decisionBy: null });
			expect(userRepository.findManyByIds).not.toHaveBeenCalled();
		});

		it('marks rows the caller may open, resolved in one batched access check', async () => {
			mockLatestReview();
			authorizationService.resolveOpenableRequestIds.mockResolvedValue(new Set(['req-1']));

			const { data } = await statusService.list(user, query);

			expect(authorizationService.resolveOpenableRequestIds).toHaveBeenCalledWith(user, [
				expect.objectContaining({ id: 'req-1', projectId: 'proj-1' }),
			]);
			expect(data[0]?.viewerCanOpen).toBe(true);
		});

		it('derives no decision actor for a pending review', async () => {
			mockLatestReview();

			const { data } = await statusService.list(user, query);

			expect(userRepository.findManyByIds).not.toHaveBeenCalled();
			expect(data[0]).toMatchObject({ decisionBy: null });
		});

		it('enriches many rows with one decision-actor lookup', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			requestRepository.findRequestsForWorkflow.mockResolvedValue([
				[
					latestReviewRow({ id: 'req-1', decision: 'changes_requested', updatedById: 'user-2' }),
					latestReviewRow({ id: 'req-2', decision: 'changes_requested', updatedById: 'user-3' }),
					latestReviewRow({
						id: 'req-3',
						state: 'closed',
						decision: 'approved',
						workflowVersionId: 'ver-3',
					}),
					latestReviewRow({
						id: 'req-4',
						state: 'closed',
						decision: 'approved',
						workflowVersionId: 'ver-4',
					}),
				],
				4,
			]);
			userRepository.findManyByIds.mockResolvedValue([
				reviewer,
				loadedUser({ id: 'user-3', email: 'other@example.com' }),
			]);
			const { data } = await statusService.list(user, query);

			expect(userRepository.findManyByIds).toHaveBeenCalledTimes(1);
			expect(userRepository.findManyByIds).toHaveBeenCalledWith(['user-2', 'user-3']);
			expect(data.map((item) => item.decisionBy?.email ?? null)).toEqual([
				'reviewer@example.com',
				'other@example.com',
				null,
				null,
			]);
		});
	});
});
