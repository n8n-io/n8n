import type { LicenseState } from '@n8n/backend-common';
import type {
	User,
	UserRepository,
	WorkflowHistory,
	WorkflowPublishedVersionRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowDetailRow,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
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
	const userRepository = mock<UserRepository>();
	const eligibilityService = mock<WorkflowReviewEligibilityService>();
	const licenseState = mock<LicenseState>();

	const service = new WorkflowReviewInboxService(
		new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
		accessService,
		workflowHistoryService,
		publishedVersionRepository,
		requestRepository,
		workflowRepository,
		reviewerRepository,
		userRepository,
		eligibilityService,
	);

	/** The read gate resolved: `readableRows` are what the caller may still read. */
	function mockGate(readableRows: WorkflowReviewRequestWorkflowDetailRow[] = []) {
		accessService.findReadableRequestOrFail.mockResolvedValue({
			request: reviewRequest(),
			readableRows,
			pinnedWorkflowId: readableRows.at(0)?.workflowId ?? null,
			canReadPinnedWorkflow: readableRows.length > 0,
		});
	}

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		mockGate();
		reviewerRepository.findByRequestIds.mockResolvedValue([]);
		userRepository.findManyByIds.mockResolvedValue([]);
		publishedVersionRepository.getPublishedVersionId.mockResolvedValue(null);
		workflowHistoryService.findVersion.mockResolvedValue(null);
		eligibilityService.resolveViewerEligibility.mockResolvedValue({
			canDecide: true,
			reason: null,
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

		// A covered workflow is removed along with the workflow itself, so a review can end up with none
		it('returns no workflows when the review no longer covers any', async () => {
			const detail = await service.getDetail(requester, requestId);

			expect(detail.workflows).toEqual([]);
			expect(detail.workflowName).toBeNull();
			expect(detail.workflowVersionId).toBeNull();
		});
	});

	describe('viewer eligibility', () => {
		it('carries the resolved capabilities on the detail', async () => {
			const detail = await service.getDetail(requester, requestId);

			expect(detail.viewerCanDecide).toBe(true);
			expect(detail.viewerDecisionIneligibilityReason).toBeNull();
			expect(detail.viewerCanComment).toBe(true);
		});

		it('surfaces the ineligibility reason for an author who may still comment', async () => {
			eligibilityService.resolveViewerEligibility.mockResolvedValue({
				canDecide: false,
				reason: 'author',
				canComment: true,
			});

			const detail = await service.getDetail(requester, requestId);

			expect(detail.viewerCanDecide).toBe(false);
			expect(detail.viewerDecisionIneligibilityReason).toBe('author');
			expect(detail.viewerCanComment).toBe(true);
		});

		it('resolves eligibility against the pinned workflow, even one the caller cannot read', async () => {
			// The requester keeps their record after losing read access to the covered
			// workflow — eligibility must still be checked against that pinned row.
			accessService.findReadableRequestOrFail.mockResolvedValue({
				request: reviewRequest(),
				readableRows: [],
				pinnedWorkflowId: workflowId,
				canReadPinnedWorkflow: false,
			});
			eligibilityService.resolveViewerEligibility.mockResolvedValue({
				canDecide: false,
				reason: 'missing_publish_permission',
				canComment: false,
			});

			const detail = await service.getDetail(requester, requestId);

			expect(eligibilityService.resolveViewerEligibility).toHaveBeenCalledWith(requester, {
				request: expect.objectContaining({ id: requestId }),
				readableRows: [],
				pinnedWorkflowId: workflowId,
				canReadPinnedWorkflow: false,
			});
			expect(detail.workflows).toEqual([]);
			expect(detail.viewerCanDecide).toBe(false);
			expect(detail.viewerDecisionIneligibilityReason).toBe('missing_publish_permission');
			expect(detail.viewerCanComment).toBe(false);
		});

		it('passes no workflow id when the review no longer covers any workflow', async () => {
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
