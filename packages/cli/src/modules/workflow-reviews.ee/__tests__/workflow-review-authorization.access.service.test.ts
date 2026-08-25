import type {
	Project,
	ProjectRelationRepository,
	ProjectRepository,
	User,
	WorkflowEntity,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewAuthorizationService } from '../workflow-review-authorization.service';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const requestId = 'req-1';
const workflowId = 'wf-1';

const member = mock<User>({ id: 'user-1', role: { slug: 'global:member', scopes: [] } });
const requester = mock<User>({ id: 'requester-1', role: { slug: 'global:member', scopes: [] } });
const globalAdmin = mock<User>({ id: 'admin-1', role: { slug: 'global:admin', scopes: [] } });

function reviewRequest(overrides: Partial<WorkflowReviewRequest> = {}) {
	return mock<WorkflowReviewRequest>({
		id: requestId,
		projectId: 'proj-1',
		createdById: requester.id,
		...overrides,
	});
}

describe('WorkflowReviewAuthorizationService: visibility and the read gate', () => {
	const workflowFinderService = mock<WorkflowFinderService>();
	const projectService = mock<ProjectService>();
	const roleService = mock<RoleService>();
	const projectRepository = mock<ProjectRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();

	const service = new WorkflowReviewAuthorizationService(
		workflowFinderService,
		projectService,
		roleService,
		projectRepository,
		projectRelationRepository,
		requestRepository,
		workflowRepository,
		authorRepository,
		reviewerRepository,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		requestRepository.findById.mockResolvedValue(reviewRequest());
		workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
		workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([]);
		projectService.getProjectIdsWithScope.mockResolvedValue([]);
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
		projectRepository.getPersonalProjectForUser.mockResolvedValue(null);
		roleService.rolesWithScope.mockResolvedValue(['workflow:owner', 'workflow:editor']);
		// `create` always writes the requester's author row, so the requester is an
		// author here and nobody else is unless a test says so.
		authorRepository.isAuthor.mockImplementation(
			async ({ userId }) => userId === reviewRequest().createdById,
		);
		reviewerRepository.isReviewer.mockResolvedValue(false);
	});

	function mockChildRow(pinnedVersionId: string | null = 'ver-pinned') {
		workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([
			{
				workflowId,
				workflowName: 'My workflow',
				workflowVersionId: pinnedVersionId,
				activeVersionId: null,
				baselineVersionId: null,
				requestState: 'open',
			},
		]);
	}

	/** The caller holds `workflow:read` in the review's project. */
	function mockReadableReviewProject() {
		projectService.getProjectIdsWithScope.mockResolvedValue(['proj-1']);
	}

	describe('who is allowed to open a review', () => {
		it('reports a review that does not exist as not found', async () => {
			requestRepository.findById.mockResolvedValue(null);

			await expect(service.findReadableRequestOrFail(requester, requestId)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('hides a review from someone who is not involved in it, without revealing that it exists', async () => {
			mockReadableReviewProject();

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

		it('lets an assigned reviewer who can read in the review project open it', async () => {
			mockReadableReviewProject();
			reviewerRepository.isReviewer.mockResolvedValue(true);

			const { request } = await service.findReadableRequestOrFail(member, requestId);

			expect(request.id).toBe(requestId);
		});

		it('lets a co-author who can read in the review project open it', async () => {
			mockReadableReviewProject();
			authorRepository.isAuthor.mockResolvedValue(true);

			const { request } = await service.findReadableRequestOrFail(member, requestId);

			expect(request.id).toBe(requestId);
		});

		it('lets the requester open it through the author row create wrote for them', async () => {
			mockReadableReviewProject();

			const { request } = await service.findReadableRequestOrFail(requester, requestId);

			expect(request.id).toBe(requestId);
			expect(authorRepository.isAuthor).toHaveBeenCalledWith(
				{ workflowReviewRequestId: requestId, userId: requester.id },
				{},
			);
		});

		it('hides a review from its requester once they lost read on the workflow it covers', async () => {
			mockChildRow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.findReadableRequestOrFail(requester, requestId)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('hides a review from an assigned reviewer once they lost read on the workflow it covers', async () => {
			mockChildRow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
			reviewerRepository.isReviewer.mockResolvedValue(true);

			await expect(service.findReadableRequestOrFail(member, requestId)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('lets the requester open a review whose workflow is only shared with them', async () => {
			// A shared workflow sits in none of the review's projects, but
			// `findWorkflowForUser` still finds it for them.
			projectService.getProjectIdsWithScope.mockResolvedValue(['unrelated-proj']);
			mockChildRow();

			const { request } = await service.findReadableRequestOrFail(requester, requestId);

			expect(request.id).toBe(requestId);
		});

		it('sees the review project through the personal project when it lives there', async () => {
			requestRepository.findById.mockResolvedValue(reviewRequest({ projectId: 'personal-proj' }));
			projectRepository.getPersonalProjectForUser.mockResolvedValue(
				mock<Project>({ id: 'personal-proj' }),
			);

			const { request } = await service.findReadableRequestOrFail(requester, requestId);

			expect(request.id).toBe(requestId);
		});

		it('lets a project admin open any review in their project without being involved', async () => {
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue(['proj-1']);

			const { request } = await service.findReadableRequestOrFail(member, requestId);

			expect(request.id).toBe(requestId);
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith(
				member.id,
				['project:admin'],
			);
		});

		it('lets a global admin open any review', async () => {
			const { request } = await service.findReadableRequestOrFail(globalAdmin, requestId);

			expect(request.id).toBe(requestId);
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});

		it('hides the review from anyone who can read none of the workflows it covers, the requester included', async () => {
			mockReadableReviewProject();
			mockChildRow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.findReadableRequestOrFail(requester, requestId)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('treats the first covered workflow as the one under review', async () => {
			mockReadableReviewProject();
			mockChildRow();

			const result = await service.findReadableRequestOrFail(requester, requestId);

			expect(result.readableWorkflowRows).toEqual([
				{
					workflowId,
					workflowName: 'My workflow',
					workflowVersionId: 'ver-pinned',
					activeVersionId: null,
					baselineVersionId: null,
					requestState: 'open',
				},
			]);
			expect(result.pinnedWorkflowId).toBe(workflowId);
			expect(result.canReadPinnedWorkflow).toBe(true);
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				workflowId,
				requester,
				['workflow:read'],
			);
		});

		it('leaves out an unreadable workflow while another one keeps the review open', async () => {
			mockReadableReviewProject();
			workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([
				{
					workflowId,
					workflowName: 'My workflow',
					workflowVersionId: 'ver-pinned',
					activeVersionId: null,
					baselineVersionId: null,
					requestState: 'open',
				},
				{
					workflowId: 'wf-2',
					workflowName: 'Other workflow',
					workflowVersionId: 'ver-other',
					activeVersionId: null,
					baselineVersionId: null,
					requestState: 'open',
				},
			]);
			workflowFinderService.findWorkflowForUser.mockImplementation(async (id) =>
				id === 'wf-2' ? mock<WorkflowEntity>() : null,
			);

			const result = await service.findReadableRequestOrFail(requester, requestId);

			expect(result.readableWorkflowRows).toEqual([
				{
					workflowId: 'wf-2',
					workflowName: 'Other workflow',
					workflowVersionId: 'ver-other',
					activeVersionId: null,
					baselineVersionId: null,
					requestState: 'open',
				},
			]);
			// Eligibility still resolves against the pinned row, which they cannot read
			expect(result.pinnedWorkflowId).toBe(workflowId);
			expect(result.canReadPinnedWorkflow).toBe(false);
		});

		it('has no workflow under review once the review covers none', async () => {
			mockReadableReviewProject();

			const result = await service.findReadableRequestOrFail(requester, requestId);

			expect(result.pinnedWorkflowId).toBeNull();
			expect(result.canReadPinnedWorkflow).toBe(false);
		});
	});

	describe('resolveOpenableRequestIds', () => {
		const requests = [
			{ id: 'req-1', projectId: 'proj-1' },
			{ id: 'req-2', projectId: 'proj-2' },
		];

		beforeEach(() => {
			authorRepository.findRequestIdsForUser.mockResolvedValue(new Set());
			reviewerRepository.findRequestIdsForUser.mockResolvedValue(new Set());
		});

		it('returns nothing for an empty batch without resolving visibility', async () => {
			expect(await service.resolveOpenableRequestIds(member, [])).toEqual(new Set());
			expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
		});

		it('lets a global admin open every request without probing participation', async () => {
			const openable = await service.resolveOpenableRequestIds(globalAdmin, requests);

			expect(openable).toEqual(new Set(['req-1', 'req-2']));
			expect(authorRepository.findRequestIdsForUser).not.toHaveBeenCalled();
			expect(reviewerRepository.findRequestIdsForUser).not.toHaveBeenCalled();
		});

		it('opens requests in administered projects and only probes participation for the rest', async () => {
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue(['proj-1']);
			reviewerRepository.findRequestIdsForUser.mockResolvedValue(new Set(['req-2']));

			const openable = await service.resolveOpenableRequestIds(member, requests);

			expect(openable).toEqual(new Set(['req-1', 'req-2']));
			expect(authorRepository.findRequestIdsForUser).toHaveBeenCalledWith(['req-2'], member.id);
			expect(reviewerRepository.findRequestIdsForUser).toHaveBeenCalledWith(['req-2'], member.id);
		});

		it('opens requests the user authored — the requester and version-pinning co-authors', async () => {
			authorRepository.findRequestIdsForUser.mockResolvedValue(new Set(['req-1']));

			expect(await service.resolveOpenableRequestIds(member, requests)).toEqual(new Set(['req-1']));
		});

		it('opens nothing for an uninvolved non-admin, whatever workflow permissions they hold', async () => {
			expect(await service.resolveOpenableRequestIds(member, requests)).toEqual(new Set());
		});

		it('answers exactly like the single-request detail gate', async () => {
			// Same fixtures as the detail-gate tests above: assigned reviewer on req-1.
			reviewerRepository.findRequestIdsForUser.mockResolvedValue(new Set(['req-1']));
			reviewerRepository.isReviewer.mockImplementation(
				async ({ workflowReviewRequestId }) => workflowReviewRequestId === 'req-1',
			);
			authorRepository.isAuthor.mockResolvedValue(false);
			projectService.getProjectIdsWithScope.mockResolvedValue(['proj-1']);

			const openable = await service.resolveOpenableRequestIds(member, requests);
			expect(openable).toEqual(new Set(['req-1']));

			await expect(service.findReadableRequestOrFail(member, requestId)).resolves.toMatchObject({
				request: { id: requestId },
			});
		});
	});

	describe('resolveInboxVisibility', () => {
		it('gives global admins and owners the whole inbox', async () => {
			const owner = mock<User>({ role: { slug: 'global:owner', scopes: [] } });

			expect(await service.resolveInboxVisibility(globalAdmin)).toEqual({ scope: 'all' });
			expect(await service.resolveInboxVisibility(owner)).toEqual({ scope: 'all' });
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});

		it('scopes a member to their admin projects plus involvement in readable projects', async () => {
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue(['admin-proj']);
			projectService.getProjectIdsWithScope.mockResolvedValue(['read-proj']);
			projectRepository.getPersonalProjectForUser.mockResolvedValue(
				mock<Project>({ id: 'personal-proj' }),
			);
			roleService.rolesWithScope.mockResolvedValue(['workflow:owner', 'workflow:editor']);

			expect(await service.resolveInboxVisibility(member)).toEqual({
				scope: 'involved',
				userId: member.id,
				adminProjectIds: ['admin-proj'],
				readableProjectIds: ['read-proj', 'personal-proj'],
				readableWorkflowRoles: ['workflow:owner', 'workflow:editor'],
			});
			expect(projectService.getProjectIdsWithScope).toHaveBeenCalledWith(member, ['workflow:read']);
			expect(roleService.rolesWithScope).toHaveBeenCalledWith('workflow', ['workflow:read']);
		});

		it('does not treat a custom global role as an admin', async () => {
			const custom = mock<User>({
				id: 'custom-1',
				role: { slug: 'custom:global', scopes: [{ slug: 'workflow:read' }] },
			});
			projectService.getProjectIdsWithScope.mockResolvedValue(['read-proj']);

			const visibility = await service.resolveInboxVisibility(custom);

			expect(visibility).toMatchObject({ scope: 'involved', userId: custom.id });
			expect(visibility).not.toEqual({ scope: 'all' });
		});

		// Enumerating every project on the instance would bind one parameter
		// per project on every inbox query.
		it('leaves readable projects unrestricted for a global workflow:read scope', async () => {
			const custom = mock<User>({
				id: 'custom-1',
				role: { slug: 'custom:global', scopes: [{ slug: 'workflow:read' }] },
			});

			expect(await service.resolveInboxVisibility(custom)).toMatchObject({
				scope: 'involved',
				readableProjectIds: null,
			});
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
			expect(projectRepository.getPersonalProjectForUser).not.toHaveBeenCalled();
		});
	});
});
