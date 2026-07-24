import { mockInstance } from '@n8n/backend-test-utils';
import { LicenseState, type Logger } from '@n8n/backend-common';
import type {
	DbLockService,
	SharedWorkflowRepository,
	User,
	UserRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestReviewerRepository,
} from '@n8n/db';
import {
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewRequestService } from '../workflow-review-request.service';

describe('WorkflowReviewRequestService list', () => {
	const logger = mock<Logger>();
	const workflowReviewPolicyService = mockInstance(WorkflowReviewPolicyService);
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowReviewRequestRepository = mockInstance(WorkflowReviewRequestRepository);
	const workflowReviewRequestWorkflowRepository = mockInstance(
		WorkflowReviewRequestWorkflowRepository,
	);
	const workflowReviewRequestAuthorRepository = mockInstance(WorkflowReviewRequestAuthorRepository);
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const userRepository = mock<UserRepository>();
	const roleService = mock<RoleService>();
	const projectService = mockInstance(ProjectService);
	const licenseState = mockInstance(LicenseState);
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();

	let service: WorkflowReviewRequestService;

	const user = mock<User>({ id: 'user-1', role: { slug: 'global:member', scopes: [] } });

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });

		service = new WorkflowReviewRequestService(
			logger,
			workflowReviewPolicyService,
			workflowFinderService,
			workflowHistoryService,
			sharedWorkflowRepository,
			workflowReviewRequestRepository,
			workflowReviewRequestWorkflowRepository,
			workflowReviewRequestAuthorRepository,
			reviewerRepository,
			userRepository,
			roleService,
			projectService,
			licenseState,
			dbLockService,
			collaborationService,
		);
	});

	describe('listForInbox', () => {
		function mockAccessibleProjects(projectIds: string[] = ['proj-1']) {
			projectService.getProjectIdsWithScope.mockResolvedValueOnce(projectIds);
		}

		it('returns paginated data with hasMore and nextCursor', async () => {
			mockAccessibleProjects();
			const rows = [
				mock<WorkflowReviewRequest>({
					id: 'req-2',
					projectId: 'proj-1',
					title: 'Second',
					decision: 'pending',
					state: 'open',
					createdAt: new Date('2024-01-02T00:00:00.000Z'),
					updatedAt: new Date('2024-01-02T00:00:00.000Z'),
				}),
				mock<WorkflowReviewRequest>({
					id: 'req-1',
					projectId: 'proj-1',
					title: 'First',
					decision: 'pending',
					state: 'open',
					createdAt: new Date('2024-01-01T00:00:00.000Z'),
					updatedAt: new Date('2024-01-01T00:00:00.000Z'),
				}),
			];
			workflowReviewRequestRepository.findManyForInbox.mockResolvedValue(rows);
			workflowReviewRequestWorkflowRepository.findWorkflowNamesByRequestIds.mockResolvedValue(
				new Map([['req-2', 'Linked workflow']]),
			);

			const result = await service.listForInbox(user, { limit: 1 });

			expect(workflowReviewRequestRepository.findManyForInbox).toHaveBeenCalledWith({
				projectIds: ['proj-1'],
				requesterId: 'user-1',
				state: 'open',
				limit: 2,
				cursor: undefined,
			});
			expect(result.data).toHaveLength(1);
			expect(result.data[0]?.workflowName).toBe('Linked workflow');
			expect(result.hasMore).toBe(true);
			// nextCursor encodes the last row's keyset boundary (createdAt + id).
			const expectedCursor = Buffer.from('2024-01-02T00:00:00.000Z|req-2', 'utf8').toString(
				'base64url',
			);
			expect(result.nextCursor).toBe(expectedCursor);
		});

		it('decodes the incoming cursor into a keyset boundary', async () => {
			mockAccessibleProjects();
			workflowReviewRequestRepository.findManyForInbox.mockResolvedValue([]);
			workflowReviewRequestWorkflowRepository.findWorkflowNamesByRequestIds.mockResolvedValue(
				new Map(),
			);
			const cursor = Buffer.from('2024-01-02T00:00:00.000Z|req-2', 'utf8').toString('base64url');

			await service.listForInbox(user, { limit: 15, cursor });

			expect(workflowReviewRequestRepository.findManyForInbox).toHaveBeenCalledWith(
				expect.objectContaining({
					cursor: { createdAt: new Date('2024-01-02T00:00:00.000Z'), id: 'req-2' },
				}),
			);
		});

		it('rejects a malformed cursor', async () => {
			mockAccessibleProjects();
			const cursor = Buffer.from('not-a-valid-cursor', 'utf8').toString('base64url');

			await expect(service.listForInbox(user, { limit: 15, cursor })).rejects.toThrow(
				'Invalid pagination cursor',
			);
		});
	});

	describe('resolveAccessibleProjectIds', () => {
		it('returns the publish-scoped project ids for members', async () => {
			projectService.getProjectIdsWithScope.mockResolvedValueOnce(['publish-proj']);

			expect(await service.resolveAccessibleProjectIds(user)).toEqual(['publish-proj']);
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(user, [
				'workflow:publish',
			]);
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledTimes(1);
			// Requesters see their own reviews via the repository's requesterId filter,
			// so no personal-project fallback is needed here.
			expect(projectService.getPersonalProject).not.toHaveBeenCalled();
		});

		it('returns null (all projects) for users with global workflow:publish without enumerating projects', async () => {
			const owner = mock<User>({
				role: {
					slug: 'global:owner',
					scopes: [{ slug: 'workflow:publish' }],
				},
			});

			expect(await service.resolveAccessibleProjectIds(owner)).toBeNull();
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});

		it('does not short-circuit for a global project:delete role without workflow:publish', async () => {
			const admin = mock<User>({
				role: {
					slug: 'custom:global',
					scopes: [{ slug: 'project:delete' }],
				},
			});
			projectService.getProjectIdsWithScope.mockResolvedValueOnce(['publish-proj']);

			expect(await service.resolveAccessibleProjectIds(admin)).toEqual(['publish-proj']);
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(admin, [
				'workflow:publish',
			]);
		});
	});
});
