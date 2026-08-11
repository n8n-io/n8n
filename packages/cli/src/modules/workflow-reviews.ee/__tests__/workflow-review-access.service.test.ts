import type {
	User,
	WorkflowEntity,
	WorkflowReviewRequest,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowReviewAccessService } from '../workflow-review-access.service';

const requestId = 'req-1';
const workflowId = 'wf-1';

const member = mock<User>({ id: 'user-1', role: { slug: 'global:member', scopes: [] } });
const requester = mock<User>({ id: 'requester-1', role: { slug: 'global:member', scopes: [] } });
const globalPublisher = mock<User>({
	id: 'admin-1',
	role: { slug: 'global:admin', scopes: [{ slug: 'workflow:publish' }] },
});

function reviewRequest(overrides: Partial<WorkflowReviewRequest> = {}) {
	return mock<WorkflowReviewRequest>({
		id: requestId,
		projectId: 'proj-1',
		createdById: requester.id,
		...overrides,
	});
}

describe('WorkflowReviewAccessService', () => {
	const workflowFinderService = mock<WorkflowFinderService>();
	const projectService = mock<ProjectService>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();

	const service = new WorkflowReviewAccessService(
		workflowFinderService,
		projectService,
		requestRepository,
		workflowRepository,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		requestRepository.findById.mockResolvedValue(reviewRequest());
		workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
		workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([]);
	});

	function mockChildRow(pinnedVersionId: string | null = 'ver-pinned') {
		workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([
			{ workflowId, workflowName: 'My workflow', workflowVersionId: pinnedVersionId },
		]);
	}

	describe('who is allowed to open a review', () => {
		it('reports a review that does not exist as not found', async () => {
			requestRepository.findById.mockResolvedValue(null);

			await expect(service.findReadableRequestOrFail(requester, requestId)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('hides a review from someone who cannot publish in its project, without revealing that it exists', async () => {
			projectService.getProjectIdsWithScope.mockResolvedValue(['other-proj']);

			// Same error as a review that does not exist: existence must not leak
			await expect(service.findReadableRequestOrFail(member, requestId)).rejects.toThrow(
				NotFoundError,
			);
			await expect(service.findReadableRequestOrFail(member, requestId)).rejects.toThrow(
				'Could not find review request',
			);
			// The gate short-circuits before any workflow row is loaded
			expect(workflowRepository.findLinkedWorkflowDetailsByRequestId).not.toHaveBeenCalled();
		});

		it('lets someone who can publish in the review project open it', async () => {
			projectService.getProjectIdsWithScope.mockResolvedValue(['proj-1']);

			const { request } = await service.findReadableRequestOrFail(member, requestId);

			expect(request.id).toBe(requestId);
		});

		it('always lets the person who asked for the review open it', async () => {
			const { request } = await service.findReadableRequestOrFail(requester, requestId);

			expect(request.id).toBe(requestId);
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});

		it('lets someone who can publish anywhere on the instance open any review', async () => {
			const { request } = await service.findReadableRequestOrFail(globalPublisher, requestId);

			expect(request.id).toBe(requestId);
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});

		it('leaves out a workflow the person who asked for the review can no longer read', async () => {
			mockChildRow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			const result = await service.findReadableRequestOrFail(requester, requestId);

			expect(result.request.id).toBe(requestId);
			expect(result.readableWorkflowRows).toEqual([]);
			// Eligibility still resolves against the pinned row, which they cannot read
			expect(result.pinnedWorkflowId).toBe(workflowId);
			expect(result.canReadPinnedWorkflow).toBe(false);
		});

		it('hides the review when someone else can read none of the workflows it covers', async () => {
			projectService.getProjectIdsWithScope.mockResolvedValue(['proj-1']);
			mockChildRow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.findReadableRequestOrFail(member, requestId)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('treats the first covered workflow as the one under review', async () => {
			mockChildRow();

			const result = await service.findReadableRequestOrFail(requester, requestId);

			expect(result.readableWorkflowRows).toEqual([
				{ workflowId, workflowName: 'My workflow', workflowVersionId: 'ver-pinned' },
			]);
			expect(result.pinnedWorkflowId).toBe(workflowId);
			expect(result.canReadPinnedWorkflow).toBe(true);
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				workflowId,
				requester,
				['workflow:read'],
			);
		});

		it('has no workflow under review once the review covers none', async () => {
			const result = await service.findReadableRequestOrFail(requester, requestId);

			expect(result.pinnedWorkflowId).toBeNull();
			expect(result.canReadPinnedWorkflow).toBe(false);
		});
	});

	describe('which projects a viewer sees reviews from', () => {
		it('limits a member to the projects where they may publish', async () => {
			projectService.getProjectIdsWithScope.mockResolvedValueOnce(['publish-proj']);

			expect(await service.resolveAccessibleProjectIds(member)).toEqual(['publish-proj']);
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(member, [
				'workflow:publish',
			]);
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledTimes(1);
			// Requesters see their own reviews via the repository's requesterId filter,
			// so no personal-project fallback is needed here.
			expect(projectService.getPersonalProject).not.toHaveBeenCalled();
		});

		it('lets someone who can publish anywhere see reviews in every project', async () => {
			const owner = mock<User>({
				role: {
					slug: 'global:owner',
					scopes: [{ slug: 'workflow:publish' }],
				},
			});

			expect(await service.resolveAccessibleProjectIds(owner)).toBeNull();
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});

		it('still checks project membership for a global role that cannot publish', async () => {
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
