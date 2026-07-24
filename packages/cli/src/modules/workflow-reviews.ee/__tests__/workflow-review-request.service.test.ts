import type {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ListWorkflowReviewRequestsQueryDto,
} from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import type {
	AuthIdentity,
	DbLockService,
	Project,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowEntity,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { DbLock, User } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewRequestService } from '../workflow-review-request.service';

const user = mock<User>({ id: 'user-1' });

/** Build a real `User` with `isPending` computed, as TypeORM does after load. */
function loadedUser(fields: Partial<User> & { id: string; email: string }): User {
	const loaded = Object.assign(new User(), { password: 'hashed', authIdentities: [], ...fields });
	loaded.computeIsPending();
	return loaded;
}

const dto: CreateWorkflowReviewRequestDto = {
	title: 'Please review',
	description: 'A description',
	workflows: [{ workflowId: 'wf-1', workflowVersionId: 'ver-1' }],
};

describe('WorkflowReviewRequestService', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const userRepository = mock<UserRepository>();
	const roleService = mock<RoleService>();
	const projectService = mock<ProjectService>();
	const licenseState = mock<LicenseState>();
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();
	const logger = mock<Logger>();
	const tx = mock<EntityManager>();

	const service = new WorkflowReviewRequestService(
		logger,
		workflowReviewPolicyService,
		workflowFinderService,
		workflowHistoryService,
		sharedWorkflowRepository,
		requestRepository,
		workflowRepository,
		authorRepository,
		reviewerRepository,
		userRepository,
		roleService,
		projectService,
		licenseState,
		dbLockService,
		collaborationService,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		// Feature enabled by default; the disabled path is exercised explicitly.
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		// By default, run the critical section against the mocked transaction.
		dbLockService.withLock.mockImplementation(async (_id, fn) => await fn(tx));
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	describe('create', () => {
		const mockSuccessfulCreatePath = () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
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
		};

		it('throws when the instance policy is disabled, before any lookup or lock', async () => {
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

			await expect(service.create(user, dto)).rejects.toThrow(ForbiddenError);

			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('creates the review request, workflow reference, and author in one transaction', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
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

			const result = await service.create(user, dto);

			expect(result.id).toBe('req-1');
			expect(dbLockService.withLock).toHaveBeenCalledWith(
				DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
				expect.any(Function),
			);
			expect(requestRepository.createRequest).toHaveBeenCalledWith(
				{
					projectId: 'project-1',
					title: 'Please review',
					description: 'A description',
					createdById: 'user-1',
				},
				tx,
			);
			expect(workflowRepository.createWorkflowRow).toHaveBeenCalledWith(
				{ workflowReviewRequestId: 'req-1', workflowId: 'wf-1', workflowVersionId: 'ver-1' },
				tx,
			);
			expect(authorRepository.addAuthor).toHaveBeenCalledWith(
				{ workflowReviewRequestId: 'req-1', userId: 'user-1' },
				tx,
			);
		});

		it('throws NotFoundError without acquiring a lock when the workflow cannot be found', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.create(user, dto)).rejects.toThrow(NotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:publish',
			]);
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('throws BadRequestError and never takes the lock for an archived workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: true }),
			);

			await expect(service.create(user, dto)).rejects.toThrow(BadRequestError);
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('throws BadRequestError and never takes the lock when the version does not exist', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(null);

			await expect(service.create(user, dto)).rejects.toThrow(BadRequestError);
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the workflow has no owning project', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(service.create(user, dto)).rejects.toThrow(NotFoundError);
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('throws ConflictError carrying the existing id and writes nothing when an open review exists', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
				mock<WorkflowReviewRequest>({ id: 'existing-1' }),
			);

			const error = await service.create(user, dto).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(ConflictError);
			expect((error as ConflictError).meta).toEqual({ workflowReviewRequestId: 'existing-1' });

			expect(requestRepository.createRequest).not.toHaveBeenCalled();
			expect(workflowRepository.createWorkflowRow).not.toHaveBeenCalled();
			expect(authorRepository.addAuthor).not.toHaveBeenCalled();
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

				await service.create(user, {
					...dto,
					reviewerUserIds: ['user-2', 'user-2', 'user-3'],
				});

				expect(reviewerRepository.addReviewers).toHaveBeenCalledWith(
					{ workflowReviewRequestId: 'req-1', userIds: ['user-2', 'user-3'] },
					tx,
				);
			});

			it('rejects self-assignment before checking eligibility or taking the lock', async () => {
				mockSuccessfulCreatePath();

				await expect(service.create(user, { ...dto, reviewerUserIds: ['user-1'] })).rejects.toThrow(
					BadRequestError,
				);

				expect(userRepository.findEligibleByProjectOrGlobalRoles).not.toHaveBeenCalled();
				expect(dbLockService.withLock).not.toHaveBeenCalled();
			});

			it('rejects reviewers outside the eligible set before taking the lock, naming them', async () => {
				mockSuccessfulCreatePath();
				mockEligibleReviewers('user-2');

				await expect(
					service.create(user, { ...dto, reviewerUserIds: ['user-2', 'user-99'] }),
				).rejects.toThrow('These users are not eligible to review this workflow: user-99');

				expect(dbLockService.withLock).not.toHaveBeenCalled();
			});

			it('rejects a pending user as reviewer even when their role qualifies', async () => {
				mockSuccessfulCreatePath();
				roleService.rolesWithScope.mockResolvedValue(['some-role']);
				userRepository.findEligibleByProjectOrGlobalRoles.mockResolvedValue([
					loadedUser({ id: 'user-2', email: 'user-2@n8n.io', password: null }),
				]);

				await expect(service.create(user, { ...dto, reviewerUserIds: ['user-2'] })).rejects.toThrow(
					BadRequestError,
				);
			});

			it.each<[string, string[] | undefined]>([
				['omitted', undefined],
				['empty', []],
			])(
				'skips the eligibility lookup and the reviewer write when reviewers are %s',
				async (_name, reviewerUserIds) => {
					mockSuccessfulCreatePath();

					await service.create(user, { ...dto, reviewerUserIds });

					expect(userRepository.findEligibleByProjectOrGlobalRoles).not.toHaveBeenCalled();
					expect(reviewerRepository.addReviewers).not.toHaveBeenCalled();
				},
			);
		});

		describe('review state broadcast', () => {
			it('broadcasts exactly once after the lock resolves', async () => {
				mockSuccessfulCreatePath();
				let lockResolved = false;
				dbLockService.withLock.mockImplementation(async (_id, fn) => {
					const result = await fn(tx);
					lockResolved = true;
					return result;
				});
				collaborationService.broadcastWorkflowReviewStateChanged.mockImplementation(async () => {
					expect(lockResolved).toBe(true);
				});

				await service.create(user, dto);

				expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledTimes(1);
				expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith(
					'wf-1',
				);
			});

			it('does not broadcast on conflict', async () => {
				mockSuccessfulCreatePath();
				requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
					mock<WorkflowReviewRequest>({ id: 'existing-1' }),
				);

				await expect(service.create(user, dto)).rejects.toThrow(ConflictError);

				expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
			});

			it('resolves and logs a warning when the broadcast rejects', async () => {
				mockSuccessfulCreatePath();
				collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
					new Error('push down'),
				);

				const result = await service.create(user, dto);
				expect(result.id).toBe('req-1');

				// Let the fire-and-forget rejection handler run.
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

			await expect(service.getEligibleReviewers(user, query)).rejects.toThrow(NotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:publish',
			]);
			expect(userRepository.findEligibleByProjectOrGlobalRoles).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the workflow has no owning project', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(service.getEligibleReviewers(user, query)).rejects.toThrow(NotFoundError);
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

			const result = await service.getEligibleReviewers(user, query);

			expect(result.data).toEqual([
				{ id: 'user-sso', email: 'sso@n8n.io', firstName: null, lastName: null },
			]);
		});
	});

	describe('list', () => {
		const query = mock<ListWorkflowReviewRequestsQueryDto>({
			workflowId: 'wf-1',
			state: 'open',
			skip: 0,
			take: 1,
		});

		it('throws NotFoundError when the user has no read access to the workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.list(user, query)).rejects.toThrow(NotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:read',
			]);
			expect(requestRepository.findRequestsForWorkflow).not.toHaveBeenCalled();
		});
	});
});
