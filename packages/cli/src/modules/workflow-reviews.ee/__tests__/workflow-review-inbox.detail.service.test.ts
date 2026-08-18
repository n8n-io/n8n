import type { LicenseState } from '@n8n/backend-common';
import type {
	User,
	UserRepository,
	WorkflowHistory,
	WorkflowPublishedVersionRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowDetailRow,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import type { WorkflowReviewAccessService } from '../workflow-review-access.service';
import type { WorkflowReviewEligibilityService } from '../workflow-review-eligibility.service';
import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewInboxService } from '../workflow-review-inbox.service';

const requestId = 'req-1';
const workflowId = 'wf-1';

/** No global scopes, so visibility falls through to project scopes. */
const requester = mock<User>({ id: 'requester-1', role: { slug: 'global:member', scopes: [] } });

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

describe('WorkflowReviewInboxService.getDetail', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const accessService = mock<WorkflowReviewAccessService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const publishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const userRepository = mock<UserRepository>();
	const eligibilityService = mock<WorkflowReviewEligibilityService>();
	const licenseState = mock<LicenseState>();

	const service = new WorkflowReviewInboxService(
		new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
		accessService,
		mock<WorkflowFinderService>(),
		workflowHistoryService,
		publishedVersionRepository,
		requestRepository,
		workflowRepository,
		reviewerRepository,
		authorRepository,
		userRepository,
		eligibilityService,
	);

	/** The read gate resolved: `readableWorkflowRows` are what the caller may still read. */
	function mockGate(readableWorkflowRows: WorkflowReviewRequestWorkflowDetailRow[] = []) {
		accessService.findReadableRequestOrFail.mockResolvedValue({
			request: reviewRequest(),
			readableWorkflowRows,
			pinnedWorkflowId: readableWorkflowRows.at(0)?.workflowId ?? null,
			canReadPinnedWorkflow: readableWorkflowRows.length > 0,
		});
	}

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		mockGate();
		reviewerRepository.findByRequestIds.mockResolvedValue([]);
		authorRepository.findByRequestIds.mockResolvedValue([]);
		userRepository.findManyByIds.mockResolvedValue([]);
		publishedVersionRepository.getPublishedVersionId.mockResolvedValue(null);
		workflowHistoryService.findVersion.mockResolvedValue(null);
		eligibilityService.resolveViewerEligibility.mockResolvedValue({
			canDecide: true,
			decisionIneligibilityReason: null,
			canComment: true,
		});
	});

	/** One readable child row pinned to `pinnedVersionId`. */
	function mockChildRow(
		pinnedVersionId: string | null = 'ver-pinned',
		workflowName = 'My workflow',
	) {
		mockGate([{ workflowId, workflowName, workflowVersionId: pinnedVersionId }]);
	}

	describe('when reviews are unavailable', () => {
		it('refuses to open a review on an instance without a workflow reviews licence', async () => {
			licenseState.isWorkflowReviewsLicensed.mockReturnValue(false);

			await expect(service.getDetail(requester, requestId)).rejects.toThrow(ForbiddenError);
			expect(accessService.findReadableRequestOrFail).not.toHaveBeenCalled();
		});

		it('refuses to open a review when an admin has turned reviews off', async () => {
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

			await expect(service.getDetail(requester, requestId)).rejects.toThrow(ForbiddenError);
			expect(accessService.findReadableRequestOrFail).not.toHaveBeenCalled();
		});
	});

	describe('what the response contains', () => {
		it('returns the review together with the workflows it covers', async () => {
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

		// A covered workflow is removed along with the workflow itself, so a closed
		// review — history of a deleted workflow — can legitimately cover none
		it('returns a closed review with no workflows when its workflow was deleted', async () => {
			requestRepository.findById.mockResolvedValue(reviewRequest({ state: 'closed' }));
			workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([]);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows).toEqual([]);
			expect(detail.workflowName).toBeNull();
			expect(detail.workflowVersionId).toBeNull();
		});

		// An open review can transiently cover no workflow when a delete orphaned
		// it and the sweep hasn't closed it yet — it stays readable until then
		it('returns an open review with no workflows when its workflow was deleted', async () => {
			workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([]);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.state).toBe('open');
			expect(detail.workflows).toEqual([]);
			expect(detail.workflowName).toBeNull();
		});
	});

	describe('the people on the review', () => {
		function mockUsers(...ids: string[]) {
			userRepository.findManyByIds.mockResolvedValue(
				ids.map((id) =>
					mock<User>({ id, email: `${id}@example.com`, firstName: id, lastName: id }),
				),
			);
		}

		it('returns the requester, every author, and the reviewers', async () => {
			authorRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: requestId, userId: requester.id }),
				mock({ workflowReviewRequestId: requestId, userId: 'author-2' }),
			]);
			reviewerRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: requestId, userId: 'reviewer-1' }),
			]);
			mockUsers(requester.id, 'author-2', 'reviewer-1');

			const detail = await service.getDetail(requester, requestId);

			expect(authorRepository.findByRequestIds).toHaveBeenCalledWith([requestId]);
			expect(detail.requester).toMatchObject({ id: requester.id });
			// The requester stays in `authors`; deduplication is the frontend's job.
			expect(detail.authors.map((author) => author.id)).toEqual([requester.id, 'author-2']);
			expect(detail.reviewers.map((reviewer) => reviewer.id)).toEqual(['reviewer-1']);
		});

		it('resolves a user holding several roles with a single deduplicated lookup', async () => {
			authorRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: requestId, userId: requester.id }),
				mock({ workflowReviewRequestId: requestId, userId: 'reviewer-1' }),
			]);
			reviewerRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: requestId, userId: 'reviewer-1' }),
			]);
			mockUsers(requester.id, 'reviewer-1');

			await service.getDetail(requester, requestId);

			expect(userRepository.findManyByIds).toHaveBeenCalledTimes(1);
			expect(userRepository.findManyByIds).toHaveBeenCalledWith([requester.id, 'reviewer-1']);
		});

		it('omits an author whose user no longer resolves, keeping the others', async () => {
			authorRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: requestId, userId: requester.id }),
				mock({ workflowReviewRequestId: requestId, userId: 'deleted-author' }),
			]);
			mockUsers(requester.id);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.authors.map((author) => author.id)).toEqual([requester.id]);
		});

		it('returns no authors when the review has no author rows', async () => {
			const detail = await service.getDetail(requester, requestId);

			expect(detail.authors).toEqual([]);
		});
	});

	describe('viewer eligibility', () => {
		it('tells the client the viewer may both decide and comment', async () => {
			const detail = await service.getDetail(requester, requestId);

			expect(detail.viewerCanDecide).toBe(true);
			expect(detail.viewerDecisionIneligibilityReason).toBeNull();
			expect(detail.viewerCanComment).toBe(true);
		});

		it('tells an author why they cannot decide while still letting them comment', async () => {
			eligibilityService.resolveViewerEligibility.mockResolvedValue({
				canDecide: false,
				decisionIneligibilityReason: 'author',
				canComment: true,
			});

			const detail = await service.getDetail(requester, requestId);

			expect(detail.viewerCanDecide).toBe(false);
			expect(detail.viewerDecisionIneligibilityReason).toBe('author');
			expect(detail.viewerCanComment).toBe(true);
		});

		it('checks what the viewer may do against the workflow under review, even one they cannot open', async () => {
			// The requester keeps their record after losing view access to the covered
			// workflow — eligibility must still be checked against that pinned row.
			accessService.findReadableRequestOrFail.mockResolvedValue({
				request: reviewRequest(),
				readableWorkflowRows: [],
				pinnedWorkflowId: workflowId,
				canReadPinnedWorkflow: false,
			});
			eligibilityService.resolveViewerEligibility.mockResolvedValue({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			});

			const detail = await service.getDetail(requester, requestId);

			expect(eligibilityService.resolveViewerEligibility).toHaveBeenCalledWith(requester, {
				request: expect.objectContaining({ id: requestId }),
				readableWorkflowRows: [],
				pinnedWorkflowId: workflowId,
				canReadPinnedWorkflow: false,
			});
			expect(detail.workflows).toEqual([]);
			expect(detail.viewerCanDecide).toBe(false);
			expect(detail.viewerDecisionIneligibilityReason).toBe('missing_permission');
			expect(detail.viewerCanComment).toBe(false);
		});

		it('passes no workflow id when a closed review no longer covers any workflow', async () => {
			requestRepository.findById.mockResolvedValue(reviewRequest({ state: 'closed' }));
			workflowRepository.findLinkedWorkflowDetailsByRequestId.mockResolvedValue([]);

			await service.getDetail(requester, requestId);

			expect(eligibilityService.resolveViewerEligibility).toHaveBeenCalledWith(
				requester,
				expect.objectContaining({ pinnedWorkflowId: null, canReadPinnedWorkflow: false }),
			);
		});
	});

	describe('the two versions to compare', () => {
		it('returns the version under review and the published version to compare it against', async () => {
			mockChildRow('ver-pinned');
			publishedVersionRepository.getPublishedVersionId.mockResolvedValue('ver-published');
			workflowHistoryService.findVersion.mockImplementation(async (_workflowId, versionId) =>
				historyVersion(versionId),
			);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.pinnedVersion).toEqual({
				versionId: 'ver-pinned',
				name: 'My workflow',
				nodes: [expect.objectContaining({ name: 'node-ver-pinned' })],
				connections: {},
				nodeGroups: [],
				createdAt: '2026-06-01T00:00:00.000Z',
			});
			expect(detail.workflows[0]?.baselineVersion).toMatchObject({ versionId: 'ver-published' });
		});

		it('has nothing to compare against when the workflow was never published', async () => {
			mockChildRow('ver-pinned');
			publishedVersionRepository.getPublishedVersionId.mockResolvedValue(null);
			workflowHistoryService.findVersion.mockResolvedValue(historyVersion('ver-pinned'));

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.pinnedVersion).toMatchObject({ versionId: 'ver-pinned' });
			expect(detail.workflows[0]?.baselineVersion).toBeNull();
		});

		it('has nothing to compare against when the published version is no longer stored', async () => {
			mockChildRow('ver-pinned');
			publishedVersionRepository.getPublishedVersionId.mockResolvedValue('ver-published');
			workflowHistoryService.findVersion.mockImplementation(async (_workflowId, versionId) =>
				versionId === 'ver-pinned' ? historyVersion(versionId) : null,
			);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.baselineVersion).toBeNull();
		});

		it('returns no version under review when the review does not point at one', async () => {
			mockChildRow(null);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.pinnedVersion).toBeNull();
			expect(detail.workflows[0]?.workflowVersionId).toBeNull();
			// Nothing is looked up for a workflow that points at no version
			expect(workflowHistoryService.findVersion).not.toHaveBeenCalled();
		});

		it('returns no version under review when it is no longer stored', async () => {
			mockChildRow('ver-pruned');
			workflowHistoryService.findVersion.mockResolvedValue(null);

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.workflowVersionId).toBe('ver-pruned');
			expect(detail.workflows[0]?.pinnedVersion).toBeNull();
		});

		it('does not reveal who edited a version', async () => {
			mockChildRow('ver-pinned');
			workflowHistoryService.findVersion.mockResolvedValue(historyVersion('ver-pinned'));

			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows[0]?.pinnedVersion).not.toHaveProperty('authors');
		});
	});
});
