import { mockInstance } from '@n8n/backend-test-utils';
import { LicenseState, type Logger } from '@n8n/backend-common';
import type {
	DbLockService,
	SharedWorkflowRepository,
	User,
	UserRepository,
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
