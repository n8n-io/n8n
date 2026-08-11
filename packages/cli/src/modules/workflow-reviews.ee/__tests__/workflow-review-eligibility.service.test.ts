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

	beforeEach(() => {
		vi.resetAllMocks();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
		authorRepository.isAuthor.mockResolvedValue(false);
		reviewerRepository.isReviewer.mockResolvedValue(true);
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
	});

	describe('resolveViewerEligibility', () => {
		it('lets an assigned non-author viewer decide', async () => {
			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				request(),
				workflowId,
			);

			expect(eligibility).toEqual({ canDecide: true, decisionIneligibilityReason: null });
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				workflowId,
				expect.anything(),
				['workflow:read'],
			);
		});

		it('reports a non-assigned viewer as ineligible', async () => {
			reviewerRepository.isReviewer.mockResolvedValue(false);

			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				request(),
				workflowId,
			);

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_reviewer_permission',
			});
		});

		it('reports an author without an admin override as ineligible even when assigned', async () => {
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(true);

			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				request(),
				workflowId,
			);

			expect(eligibility).toEqual({ canDecide: false, decisionIneligibilityReason: 'author' });
		});

		it.each([['global:admin'], ['global:owner']])(
			'lets an author with the %s role decide without querying project relations',
			async (slug) => {
				authorRepository.isAuthor.mockResolvedValue(true);
				reviewerRepository.isReviewer.mockResolvedValue(false);
				const admin = mock<User>({ id: 'user-1', role: { slug } });

				const eligibility = await service.resolveViewerEligibility(admin, request(), workflowId);

				expect(eligibility).toEqual({ canDecide: true, decisionIneligibilityReason: null });
				expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
				expect(authorRepository.isAuthor).not.toHaveBeenCalled();
				expect(reviewerRepository.isReviewer).not.toHaveBeenCalled();
			},
		);

		it('lets an author who is a project admin of the review project decide', async () => {
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([projectId]);

			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				request(),
				workflowId,
			);

			expect(eligibility).toEqual({ canDecide: true, decisionIneligibilityReason: null });
			expect(authorRepository.isAuthor).not.toHaveBeenCalled();
			expect(reviewerRepository.isReviewer).not.toHaveBeenCalled();
		});

		it('reports an author who is only a project admin elsewhere as ineligible', async () => {
			authorRepository.isAuthor.mockResolvedValue(true);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue(['other-proj']);

			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				request(),
				workflowId,
			);

			expect(eligibility).toEqual({ canDecide: false, decisionIneligibilityReason: 'author' });
		});

		it('still queries project roles for a non-admin', async () => {
			await service.resolveViewerEligibility(memberUser(), request(), workflowId);

			// Only global admin/owner short-circuit; everyone else hits the project-role lookup.
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledOnce();
		});

		it('reports missing view access before authorship, matching the decision endpoint order', async () => {
			// An author who cannot view the workflow would hit the endpoint's 404 first,
			// so the surfaced reason must be the permission one, not 'author'.
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
			authorRepository.isAuthor.mockResolvedValue(true);

			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				request(),
				workflowId,
			);

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
			});
			expect(authorRepository.isAuthor).not.toHaveBeenCalled();
			expect(reviewerRepository.isReviewer).not.toHaveBeenCalled();
		});

		// The capability answers "who", not "when": a closed request still reports the
		// viewer's own eligibility honestly, and callers gate on state separately.
		it.each([
			['a closed request', { state: 'closed' as const }],
			['an approved request', { decision: 'approved' as const }],
		])('still reports viewer eligibility for %s', async (_label, overrides) => {
			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				mock<WorkflowReviewRequest>({ id: requestId, projectId, ...overrides }),
				workflowId,
			);

			expect(eligibility).toEqual({ canDecide: true, decisionIneligibilityReason: null });
		});

		it('reports a review with no linked workflow as ineligible without any lookup', async () => {
			const eligibility = await service.resolveViewerEligibility(memberUser(), request(), null);

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
			});
			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		});
	});

	describe('hasAdminOverride', () => {
		it('matches the review project against the user projects with the project:admin role', async () => {
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
