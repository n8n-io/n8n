import type { LicenseState, Logger } from '@n8n/backend-common';
import type {
	DbLockService,
	SharedWorkflowRepository,
	User,
	UserRepository,
	WorkflowHistory,
	WorkflowPublishedVersionRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewRequestService } from '../workflow-review-request.service';

const requestId = 'req-1';
const workflowId = 'wf-1';

/** Plain member: no global scopes, so visibility falls through to project scopes. */
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
		state: 'open',
		decision: 'pending',
		title: 'Please review',
		description: 'Some context',
		createdById: requester.id,
		createdAt: new Date('2026-07-01T00:00:00.000Z'),
		updatedAt: new Date('2026-07-02T00:00:00.000Z'),
		...overrides,
	});
}

// A plain object, not a deep mock: the snapshot mapper copies `connections`
// through verbatim, and a proxy there is not comparable with toEqual.
function historyVersion(versionId: string) {
	return {
		versionId,
		workflowId,
		nodes: [{ name: `node-${versionId}` }],
		connections: {},
		nodeGroups: [],
		authors: 'Some Author',
		name: 'My workflow',
		createdAt: new Date('2026-06-01T00:00:00.000Z'),
	} as unknown as WorkflowHistory;
}

describe('WorkflowReviewRequestService.getDetail', () => {
	const logger = mock<Logger>();
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const publishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
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

	const service = new WorkflowReviewRequestService(
		logger,
		workflowReviewPolicyService,
		workflowFinderService,
		workflowHistoryService,
		sharedWorkflowRepository,
		publishedVersionRepository,
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
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		requestRepository.findById.mockResolvedValue(reviewRequest());
		workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([]);
		reviewerRepository.findByRequestIds.mockResolvedValue([]);
		userRepository.findManyByIds.mockResolvedValue([]);
		publishedVersionRepository.getPublishedVersionId.mockResolvedValue(null);
		workflowHistoryService.findVersion.mockResolvedValue(null);
	});

	/** One child row pinned to `pinnedVersionId`. */
	function mockChildRow(
		pinnedVersionId: string | null = 'ver-pinned',
		workflowName = 'My workflow',
	) {
		workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([
			{ workflowId, workflowName, workflowVersionId: pinnedVersionId },
		]);
	}

	describe('feature gate', () => {
		it('throws 403 when the license lacks workflow reviews', async () => {
			licenseState.isWorkflowReviewsLicensed.mockReturnValue(false);

			await expect(service.getDetail(requester, requestId)).rejects.toThrow(ForbiddenError);
			expect(requestRepository.findById).not.toHaveBeenCalled();
		});

		it('throws 403 when the instance policy is disabled', async () => {
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

			await expect(service.getDetail(requester, requestId)).rejects.toThrow(ForbiddenError);
			expect(requestRepository.findById).not.toHaveBeenCalled();
		});
	});

	describe('visibility', () => {
		it('throws 404 for an unknown review request id', async () => {
			requestRepository.findById.mockResolvedValue(null);

			await expect(service.getDetail(requester, requestId)).rejects.toThrow(NotFoundError);
		});

		it('throws the same 404 when the user has no publish scope in the project', async () => {
			projectService.getProjectIdsWithScope.mockResolvedValue(['other-proj']);

			// Same error as the unknown-id case: existence must not leak
			await expect(service.getDetail(member, requestId)).rejects.toThrow(NotFoundError);
			await expect(service.getDetail(member, requestId)).rejects.toThrow(
				'Could not find review request',
			);
			// Nothing beyond the record itself is loaded for a user who cannot see it
			expect(workflowRepository.findLinkedWorkflowDetailsByRequestId).not.toHaveBeenCalled();
		});

		it('allows a member with publish scope in the review project', async () => {
			projectService.getProjectIdsWithScope.mockResolvedValue(['proj-1']);

			const detail = await service.getDetail(member, requestId);

			expect(detail.id).toBe(requestId);
		});

		it('allows the requester without resolving project scopes', async () => {
			const detail = await service.getDetail(requester, requestId);

			expect(detail.id).toBe(requestId);
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});

		it('allows a user with global workflow:publish without enumerating projects', async () => {
			const detail = await service.getDetail(globalPublisher, requestId);

			expect(detail.id).toBe(requestId);
			expect(projectService.getProjectIdsWithScope).not.toHaveBeenCalled();
		});
	});

	describe('record and child rows', () => {
		it('returns the review record with its child rows', async () => {
			mockChildRow('ver-pinned');
			workflowHistoryService.findVersion.mockResolvedValue(historyVersion('ver-pinned'));

			const detail = await service.getDetail(requester, requestId);

			expect(detail).toMatchObject({
				id: requestId,
				projectId: 'proj-1',
				state: 'open',
				decision: 'pending',
				title: 'Please review',
				description: 'Some context',
				workflowName: 'My workflow',
				workflowVersionId: 'ver-pinned',
				createdAt: '2026-07-01T00:00:00.000Z',
				updatedAt: '2026-07-02T00:00:00.000Z',
			});
			expect(detail.workflows).toHaveLength(1);
			expect(detail.workflows[0]).toMatchObject({ workflowId, workflowName: 'My workflow' });
		});

		// The child row cascades away with its workflow, so a review can end up with none
		it('returns an empty workflows array when the review has no child rows', async () => {
			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows).toEqual([]);
			expect(detail.workflowName).toBeNull();
			expect(detail.workflowVersionId).toBeNull();
		});
	});

	describe('diff inputs', () => {
		it('returns the pinned version content and the latest published baseline', async () => {
			mockChildRow('ver-pinned');
			publishedVersionRepository.getPublishedVersionId.mockResolvedValue('ver-published');
			workflowHistoryService.findVersion.mockImplementation((_workflowId, versionId) =>
				Promise.resolve(historyVersion(versionId)),
			);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.pinnedVersion).toEqual({
				versionId: 'ver-pinned',
				nodes: [expect.objectContaining({ name: 'node-ver-pinned' })],
				connections: {},
				nodeGroups: [],
				createdAt: '2026-06-01T00:00:00.000Z',
			});
			expect(detail.workflows[0]?.baselineVersion).toMatchObject({ versionId: 'ver-published' });
		});

		it('falls back to an empty baseline when the workflow was never published', async () => {
			mockChildRow('ver-pinned');
			publishedVersionRepository.getPublishedVersionId.mockResolvedValue(null);
			workflowHistoryService.findVersion.mockResolvedValue(historyVersion('ver-pinned'));

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.pinnedVersion).toMatchObject({ versionId: 'ver-pinned' });
			expect(detail.workflows[0]?.baselineVersion).toBeNull();
		});

		it('falls back to an empty baseline when the published history row was pruned', async () => {
			mockChildRow('ver-pinned');
			publishedVersionRepository.getPublishedVersionId.mockResolvedValue('ver-published');
			workflowHistoryService.findVersion.mockImplementation((_workflowId, versionId) =>
				Promise.resolve(versionId === 'ver-pinned' ? historyVersion(versionId) : null),
			);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.baselineVersion).toBeNull();
		});

		it('returns a null pinned version when the child row has no pinned version', async () => {
			mockChildRow(null);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.pinnedVersion).toBeNull();
			expect(detail.workflows[0]?.workflowVersionId).toBeNull();
			// No lookup is attempted for a row that pins nothing
			expect(workflowHistoryService.findVersion).not.toHaveBeenCalled();
		});

		it('returns a null pinned version when the pinned history row was pruned', async () => {
			mockChildRow('ver-pruned');
			workflowHistoryService.findVersion.mockResolvedValue(null);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.workflowVersionId).toBe('ver-pruned');
			expect(detail.workflows[0]?.pinnedVersion).toBeNull();
		});

		it('never exposes the raw authors string of a version', async () => {
			mockChildRow('ver-pinned');
			workflowHistoryService.findVersion.mockResolvedValue(historyVersion('ver-pinned'));

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.pinnedVersion).not.toHaveProperty('authors');
		});
	});

	describe('participants', () => {
		it('hydrates the requester and requested reviewers', async () => {
			reviewerRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: requestId, userId: 'reviewer-1' }),
			]);
			userRepository.findManyByIds.mockResolvedValue([
				mock<User>({
					id: requester.id,
					email: 'requester@example.com',
					firstName: 'Reqi',
					lastName: 'Ester',
				}),
				mock<User>({
					id: 'reviewer-1',
					email: 'reviewer@example.com',
					firstName: 'Revi',
					lastName: 'Ewer',
				}),
			]);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.requester).toEqual({
				id: requester.id,
				email: 'requester@example.com',
				firstName: 'Reqi',
				lastName: 'Ester',
			});
			expect(detail.reviewers).toEqual([
				{
					id: 'reviewer-1',
					email: 'reviewer@example.com',
					firstName: 'Revi',
					lastName: 'Ewer',
				},
			]);
		});

		it('drops participants whose accounts were deleted', async () => {
			reviewerRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: requestId, userId: 'departed-reviewer' }),
			]);
			userRepository.findManyByIds.mockResolvedValue([]);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.requester).toBeNull();
			expect(detail.reviewers).toEqual([]);
		});
	});
});
