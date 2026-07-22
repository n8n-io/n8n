import { mockInstance } from '@n8n/backend-test-utils';
import { LicenseState, type Logger } from '@n8n/backend-common';
import type {
	DbLockService,
	Project,
	SharedWorkflowRepository,
	User,
	WorkflowReviewRequest,
} from '@n8n/db';
import {
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import { ProjectService } from '@/services/project.service.ee';
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
		projectService.getPersonalProject.mockResolvedValue(null);

		service = new WorkflowReviewRequestService(
			logger,
			workflowReviewPolicyService,
			workflowFinderService,
			workflowHistoryService,
			sharedWorkflowRepository,
			workflowReviewRequestRepository,
			workflowReviewRequestWorkflowRepository,
			workflowReviewRequestAuthorRepository,
			projectService,
			licenseState,
			dbLockService,
			collaborationService,
		);
	});

	describe('listForInbox', () => {
		function mockAccessibleProjects(projectIds: string[] = ['proj-1']) {
			projectService.getProjectIdsWithScope
				.mockResolvedValueOnce(projectIds)
				.mockResolvedValueOnce(projectIds);
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
		it('unions admin, publisher, and personal project ids for members', async () => {
			projectService.getProjectIdsWithScope
				.mockResolvedValueOnce(['admin-proj'])
				.mockResolvedValueOnce(['publish-proj']);
			projectService.getPersonalProject.mockResolvedValue(mock<Project>({ id: 'personal-proj' }));

			expect(await service.resolveAccessibleProjectIds(user)).toEqual([
				'admin-proj',
				'publish-proj',
				'personal-proj',
			]);
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(user, ['project:delete']);
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(user, [
				'workflow:publish',
			]);
			expect(projectService.getPersonalProject).toHaveBeenCalledWith(user);
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledTimes(2);
		});

		it('does not duplicate the personal project when it is already in scope', async () => {
			projectService.getProjectIdsWithScope
				.mockResolvedValueOnce(['personal-proj'])
				.mockResolvedValueOnce(['publish-proj']);
			projectService.getPersonalProject.mockResolvedValue(mock<Project>({ id: 'personal-proj' }));

			expect(await service.resolveAccessibleProjectIds(user)).toEqual([
				'personal-proj',
				'publish-proj',
			]);
		});

		it('returns null (all projects) for global-scope users without enumerating projects', async () => {
			const owner = mock<User>({
				role: {
					slug: 'global:owner',
					scopes: [{ slug: 'project:delete' }, { slug: 'workflow:publish' }],
				},
			});

			expect(await service.resolveAccessibleProjectIds(owner)).toBeNull();
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
			expect(projectService.getPersonalProject).not.toHaveBeenCalled();
		});
	});
});
