import type {
	ProjectRelationRepository,
	User,
	WorkflowEntity,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestReviewerRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowReviewEligibilityService } from '../workflow-review-eligibility.service';

const requestId = 'req-1';
const projectId = 'proj-1';
const workflowId = 'wf-1';

const memberUser = (id = 'user-1') => mock<User>({ id, role: { slug: 'global:member' } });

describe('WorkflowReviewEligibilityService', () => {
	const workflowFinderService = mock<WorkflowFinderService>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();

	const service = new WorkflowReviewEligibilityService(
		workflowFinderService,
		authorRepository,
		reviewerRepository,
		projectRelationRepository,
	);

	const request = () => mock<WorkflowReviewRequest>({ id: requestId, projectId });

	const readable = (
		overrides: Partial<Parameters<typeof service.resolveViewerEligibility>[1]> = {},
	) => ({
		request: request(),
		pinnedWorkflowId: workflowId,
		canReadPinnedWorkflow: true,
		...overrides,
	});

	beforeEach(() => {
		vi.resetAllMocks();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
		authorRepository.isAuthor.mockResolvedValue(false);
		reviewerRepository.isReviewer.mockResolvedValue(true);
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
	});

	describe('who may decide', () => {
		it('lets an assigned non-author viewer decide', async () => {
			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toEqual({
				canDecide: true,
				decisionIneligibilityReason: null,
				canComment: true,
			});
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				workflowId,
				expect.anything(),
				['workflow:read'],
			);
		});

		it('reports a non-assigned viewer as ineligible', async () => {
			reviewerRepository.isReviewer.mockResolvedValue(false);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_reviewer_permission',
				canComment: false,
			});
		});

		it('lets an assigned reviewer decide even when they authored a version', async () => {
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(true);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toEqual({
				canDecide: true,
				decisionIneligibilityReason: null,
				canComment: true,
			});
		});

		it('stops a non-assigned author from approving their own review', async () => {
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'author',
				canComment: true,
			});
		});

		it.each([['global:admin'], ['global:owner']])(
			'lets an instance %s decide on a review they authored',
			async (slug) => {
				authorRepository.isAuthor.mockResolvedValue(true);
				reviewerRepository.isReviewer.mockResolvedValue(false);
				const admin = mock<User>({ id: 'user-1', role: { slug } });

				const eligibility = await service.resolveViewerEligibility(admin, readable());

				expect(eligibility).toEqual({
					canDecide: true,
					decisionIneligibilityReason: null,
					canComment: true,
				});
				expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
				// Authorship still resolves — it feeds canComment.
				expect(authorRepository.isAuthor).toHaveBeenCalled();
				expect(reviewerRepository.isReviewer).not.toHaveBeenCalled();
			},
		);

		it('lets an author who is a project admin of the review project decide', async () => {
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([projectId]);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toEqual({
				canDecide: true,
				decisionIneligibilityReason: null,
				canComment: true,
			});
			expect(reviewerRepository.isReviewer).not.toHaveBeenCalled();
		});

		it('still stops an author whose project-admin rights are in another project', async () => {
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue(['other-proj']);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'author',
				canComment: true,
			});
		});

		it('still queries project roles for a non-admin', async () => {
			await service.resolveViewerEligibility(memberUser(), readable());

			// Only global admin/owner short-circuit; everyone else hits the project-role lookup.
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledOnce();
		});

		it('tells an author without view access about the permission, not about their authorship', async () => {
			// An author who cannot view the workflow would hit the endpoint's 404 first,
			// so the surfaced reason must be the permission one, not 'author'.
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
			authorRepository.isAuthor.mockResolvedValue(true);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			// Authorship still resolves — it feeds `canComment`, which survives the missing
			// finder result as long as the author can read the pinned workflow.
			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: true,
			});
			expect(reviewerRepository.isReviewer).not.toHaveBeenCalled();
		});

		// The capability answers "who", not "when": a closed review still reports the
		// viewer's own eligibility honestly, and callers gate on state separately.
		it.each([
			['a closed review', { state: 'closed' as const }],
			['an approved review', { decision: 'approved' as const }],
		])('still says who may act on %s', async (_label, overrides) => {
			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				readable({
					request: mock<WorkflowReviewRequest>({ id: requestId, projectId, ...overrides }),
				}),
			);

			expect(eligibility).toEqual({
				canDecide: true,
				decisionIneligibilityReason: null,
				canComment: true,
			});
		});
	});

	describe('who may comment', () => {
		it('refuses commenting to a viewer who cannot open the workflow under review', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			});
		});

		it('refuses commenting to a non-assigned viewer even when they can open the workflow', async () => {
			reviewerRepository.isReviewer.mockResolvedValue(false);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_reviewer_permission',
				canComment: false,
			});
		});

		it('refuses commenting to an author who can no longer open the workflow under review', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
			authorRepository.isAuthor.mockResolvedValue(true);

			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				readable({ canReadPinnedWorkflow: false }),
			);

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			});
		});

		it('refuses both deciding and commenting on a review whose workflow is gone', async () => {
			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				readable({ pinnedWorkflowId: null, canReadPinnedWorkflow: false }),
			);

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			});
			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		});
	});

	describe('hasAdminOverride', () => {
		it('grants the override to a project admin of the review project', async () => {
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([projectId]);

			await expect(service.hasAdminOverride(memberUser(), projectId)).resolves.toBe(true);
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith(
				'user-1',
				['project:admin'],
			);
		});

		it('denies the override to a plain member without project-admin membership', async () => {
			await expect(service.hasAdminOverride(memberUser(), projectId)).resolves.toBe(false);
		});
	});
});
