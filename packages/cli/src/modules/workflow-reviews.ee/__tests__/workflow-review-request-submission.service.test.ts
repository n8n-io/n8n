import type {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
} from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import { DbLock, User } from '@n8n/db';
import type {
	AuthIdentity,
	DbLockService,
	OperationContext,
	Project,
	SharedWorkflowRepository,
	Transaction,
	UserRepository,
	WorkflowEntity,
	WorkflowHistoryRepository,
	WorkflowRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
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

describe('WorkflowReviewRequestSubmissionService', () => {
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

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		// Enable the feature unless a test overrides it.
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		// Run locked work with the transaction context by default.
		dbLockService.withLockContext.mockImplementation(async (_id, fn) => await fn(ctx));
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	describe('opening a review', () => {
		// Provide the required eligible reviewer by default.
		beforeEach(() => {
			roleService.rolesWithScope.mockResolvedValue(['some-role']);
			userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue([
				loadedUser({ id: 'user-2', email: 'user-2@n8n.io' }),
			]);
		});

		/** Everything resolved so `create` runs through to the end. */
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

		it('refuses to open anything once an admin turns reviews off, before any lookup or lock', async () => {
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

			await expect(service.create(user, dto)).rejects.toThrow(ForbiddenError);

			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('writes the review, its workflow reference, and its author in one transaction', async () => {
			mockSuccessfulCreatePath();

			const result = await service.create(user, dto);

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

		it('refuses a workflow the caller cannot publish, before taking the lock', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.create(user, dto)).rejects.toThrow(NotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:publish',
			]);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('refuses an archived workflow, before taking the lock', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: true }),
			);

			await expect(service.create(user, dto)).rejects.toThrow(BadRequestError);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('refuses a version the workflow does not have, before taking the lock', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(null);

			await expect(service.create(user, dto)).rejects.toThrow(BadRequestError);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('refuses a workflow that belongs to no project', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(service.create(user, dto)).rejects.toThrow(NotFoundError);
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('points at the review already open on the workflow, and writes nothing', async () => {
			mockSuccessfulCreatePath();
			requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
				mock<WorkflowReviewRequest>({ id: 'existing-1' }),
			);

			const error = await service.create(user, dto).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(ConflictError);
			expect((error as ConflictError).meta).toEqual({ workflowReviewRequestId: 'existing-1' });

			expect(requestRepository.createRequest).not.toHaveBeenCalled();
			expect(workflowRepository.createWorkflowRow).not.toHaveBeenCalled();
			expect(authorRepository.addAuthor).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		describe('a workflow that changes while the submission waits for the lock', () => {
			it('refuses one that was archived in the meantime', async () => {
				mockSuccessfulCreatePath();
				workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: true });

				const creation = service.create(user, dto);
				await expect(creation).rejects.toThrow(BadRequestError);
				await expect(creation).rejects.toThrow(
					"The workflow 'wf-1' is archived and cannot be submitted for review",
				);

				expect(dbLockService.withLockContext).toHaveBeenCalled();
				expect(requestRepository.createRequest).not.toHaveBeenCalled();
				expect(workflowRepository.createWorkflowRow).not.toHaveBeenCalled();
			});

			it('refuses one that was deleted in the meantime', async () => {
				mockSuccessfulCreatePath();
				workflowEntityRepository.findArchivedState.mockResolvedValue(null);

				await expect(service.create(user, dto)).rejects.toThrow(NotFoundError);

				expect(requestRepository.createRequest).not.toHaveBeenCalled();
				expect(workflowRepository.createWorkflowRow).not.toHaveBeenCalled();
			});

			it('refuses one whose owning project disappeared in the meantime', async () => {
				mockSuccessfulCreatePath();
				sharedWorkflowRepository.getWorkflowOwningProject
					.mockResolvedValueOnce(mock<Project>({ id: 'project-1' }))
					.mockResolvedValueOnce(undefined);

				const creation = service.create(user, dto);
				await expect(creation).rejects.toThrow(NotFoundError);
				await expect(creation).rejects.toThrow('Could not find workflow');

				expect(dbLockService.withLockContext).toHaveBeenCalled();
				expect(requestRepository.createRequest).not.toHaveBeenCalled();
			});

			it('refuses one that moved to another project in the meantime', async () => {
				mockSuccessfulCreatePath();
				sharedWorkflowRepository.getWorkflowOwningProject
					.mockResolvedValueOnce(mock<Project>({ id: 'project-1' }))
					.mockResolvedValueOnce(mock<Project>({ id: 'project-2' }));

				await expect(service.create(user, dto)).rejects.toThrow(ConflictError);

				expect(dbLockService.withLockContext).toHaveBeenCalled();
				expect(requestRepository.createRequest).not.toHaveBeenCalled();
			});

			it('re-reads both facts on the lock transaction', async () => {
				mockSuccessfulCreatePath();

				await service.create(user, dto);

				expect(workflowEntityRepository.findArchivedState).toHaveBeenCalledWith('wf-1', ctx);
				expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenLastCalledWith(
					'wf-1',
					ctx,
				);
			});
		});

		describe('assigning reviewers', () => {
			const mockEligibleReviewers = (...ids: string[]) => {
				roleService.rolesWithScope.mockResolvedValue(['some-role']);
				userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue(
					ids.map((id) => loadedUser({ id, email: `${id}@n8n.io` })),
				);
			};

			it('writes deduplicated reviewers in the same transaction as the review', async () => {
				mockSuccessfulCreatePath();
				mockEligibleReviewers('user-2', 'user-3');

				await service.create(user, {
					...dto,
					reviewerUserIds: ['user-2', 'user-2', 'user-3'],
				});

				expect(reviewerRepository.addReviewers).toHaveBeenCalledWith(
					{ workflowReviewRequestId: 'req-1', userIds: ['user-2', 'user-3'] },
					ctx,
				);
			});

			it('refuses a requester who assigns themselves, before checking eligibility or locking', async () => {
				mockSuccessfulCreatePath();

				await expect(service.create(user, { ...dto, reviewerUserIds: ['user-1'] })).rejects.toThrow(
					BadRequestError,
				);

				expect(userRepository.findEligibleByProjectOrGlobalRoles).not.toHaveBeenCalled();
				expect(dbLockService.withLockContext).not.toHaveBeenCalled();
			});

			it('names the reviewers who are not eligible, before taking the lock', async () => {
				mockSuccessfulCreatePath();
				mockEligibleReviewers('user-2');

				await expect(
					service.create(user, { ...dto, reviewerUserIds: ['user-2', 'user-99'] }),
				).rejects.toThrow('These users are not eligible to review this workflow: user-99');

				expect(dbLockService.withLockContext).not.toHaveBeenCalled();
			});

			it('refuses someone who has not accepted their invitation yet, whatever their role', async () => {
				mockSuccessfulCreatePath();
				roleService.rolesWithScope.mockResolvedValue(['some-role']);
				userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue([
					loadedUser({ id: 'user-2', email: 'user-2@n8n.io', password: null }),
				]);

				await expect(service.create(user, { ...dto, reviewerUserIds: ['user-2'] })).rejects.toThrow(
					BadRequestError,
				);
			});

			// The service still validates this if DTO validation is bypassed.
			it.each<[string, string[] | undefined]>([
				['omitted', undefined],
				['empty', []],
			])('refuses a review whose reviewer list is %s', async (_name, reviewerUserIds) => {
				mockSuccessfulCreatePath();

				await expect(
					service.create(user, {
						...dto,
						reviewerUserIds,
					} as CreateWorkflowReviewRequestDto),
				).rejects.toThrow(BadRequestError);

				expect(dbLockService.withLockContext).not.toHaveBeenCalled();
				expect(reviewerRepository.addReviewers).not.toHaveBeenCalled();
			});
		});

		describe('naming the version under review', () => {
			const namedDto = (workflowVersionName: string): CreateWorkflowReviewRequestDto => ({
				...dto,
				workflows: [{ ...dto.workflows[0], workflowVersionName }],
			});

			it('names the version in the same transaction as the review, trimmed', async () => {
				mockSuccessfulCreatePath();

				await service.create(user, namedDto('  Release candidate  '));

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

				await service.create(user, {
					...dto,
					workflows: [{ ...dto.workflows[0], workflowVersionDescription: '  What changed  ' }],
				});

				expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
					expect.objectContaining({ description: 'What changed' }),
					ctx,
				);
			});

			it('clears the version description when a blank one is sent', async () => {
				mockSuccessfulCreatePath();

				await service.create(user, {
					...dto,
					workflows: [{ ...dto.workflows[0], workflowVersionDescription: '   ' }],
				});

				expect(workflowHistoryRepository.updateVersionMetadata).toHaveBeenCalledWith(
					expect.objectContaining({ description: null }),
					ctx,
				);
			});

			it('leaves the version unnamed when an open review already conflicts', async () => {
				mockSuccessfulCreatePath();
				requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
					mock<WorkflowReviewRequest>({ id: 'existing-1' }),
				);

				await expect(service.create(user, namedDto('Release candidate'))).rejects.toThrow(
					ConflictError,
				);

				expect(workflowHistoryRepository.updateVersionMetadata).not.toHaveBeenCalled();
			});

			it('refuses the review when the version was pruned before the naming write', async () => {
				mockSuccessfulCreatePath();
				workflowHistoryRepository.updateVersionMetadata.mockResolvedValue(0);

				await expect(service.create(user, namedDto('Release candidate'))).rejects.toThrow(
					BadRequestError,
				);
			});
		});

		it('tells open editors and reports the request exactly once, after the lock resolves', async () => {
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

			await service.create(user, dto);

			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledTimes(1);
			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('workflow-review-requested', {
				user: expect.objectContaining({ id: 'user-1' }),
				workflowReviewRequestId: 'req-1',
				projectId: 'project-1',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
				reviewerCount: 1,
			});
		});
	});

	describe('listing who may review a workflow', () => {
		const query = { workflowId: 'wf-1' } as GetWorkflowReviewEligibleReviewersQueryDto;

		it('refuses a workflow the caller cannot publish', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.getEligibleReviewers(user, query)).rejects.toThrow(NotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:publish',
			]);
			expect(userRepository.findEligibleByProjectOrGlobalRoles).not.toHaveBeenCalled();
		});

		it('refuses a workflow that belongs to no project', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(service.getEligibleReviewers(user, query)).rejects.toThrow(NotFoundError);
		});

		it('offers an SSO user who has no password, rather than treating them as un-invited', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			roleService.rolesWithScope.mockImplementation(async (namespace) =>
				namespace === 'project'
					? ['project:admin', 'project:editor', 'custom:reviewer']
					: ['global:owner', 'global:admin'],
			);
			userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue([
				loadedUser({
					id: 'user-sso',
					email: 'sso@n8n.io',
					password: null,
					authIdentities: [mock<AuthIdentity>({ providerType: 'ldap' })],
				}),
			]);

			const result = await service.getEligibleReviewers(user, query);

			expect(result.data).toEqual([
				{ id: 'user-sso', email: 'sso@n8n.io', firstName: null, lastName: null },
			]);
		});
	});
});
