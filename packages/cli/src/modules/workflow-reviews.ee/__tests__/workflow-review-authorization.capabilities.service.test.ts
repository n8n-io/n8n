import type {
	ProjectRelationRepository,
	ProjectRepository,
	User,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowDetailRow,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowReviewAuthorizationService } from '../workflow-review-authorization.service';

const requestId = 'req-1';
const projectId = 'proj-1';

const memberUser = (id = 'user-1') => mock<User>({ id, role: { slug: 'global:member' } });

/**
 * What a viewer may do with a review they can see. The allow/deny rule itself is a
 * pure function with its own truth table in `workflow-review-decision-policy.test.ts`;
 * what this suite covers is the facts fed into it — who counts as an admin, and what
 * "can read every covered workflow" resolves to — plus the commenting rule, which
 * only exists here.
 */
describe('WorkflowReviewAuthorizationService.resolveViewerEligibility', () => {
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();

	// Only the participation and admin lookups matter here; the read gate has its
	// own suite.
	const service = new WorkflowReviewAuthorizationService(
		mock<WorkflowFinderService>(),
		mock<ProjectService>(),
		mock<RoleService>(),
		mock<ProjectRepository>(),
		projectRelationRepository,
		mock<WorkflowReviewRequestRepository>(),
		mock<WorkflowReviewRequestWorkflowRepository>(),
		authorRepository,
		reviewerRepository,
	);

	const request = () => mock<WorkflowReviewRequest>({ id: requestId, projectId });

	const row = (id = 'wf-1') => mock<WorkflowReviewRequestWorkflowDetailRow>({ workflowId: id });

	/** By default the review covers one workflow and the viewer can read it. */
	const readable = (
		overrides: Partial<Parameters<typeof service.resolveViewerEligibility>[1]> = {},
	) => ({
		request: request(),
		workflowRows: [row()],
		readableWorkflowRows: [row()],
		...overrides,
	});

	beforeEach(() => {
		vi.resetAllMocks();
		authorRepository.isAuthor.mockResolvedValue(false);
		reviewerRepository.isReviewer.mockResolvedValue(true);
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
	});

	it('lets an assigned reviewer decide and comment', async () => {
		const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

		expect(eligibility).toEqual({
			canDecide: true,
			decisionIneligibilityReason: null,
			canComment: true,
		});
	});

	it('refuses both to someone who is not assigned to review it', async () => {
		reviewerRepository.isReviewer.mockResolvedValue(false);

		const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

		expect(eligibility).toEqual({
			canDecide: false,
			decisionIneligibilityReason: 'missing_reviewer_permission',
			canComment: false,
		});
	});

	// The only case where the two answers differ: authors keep talking about a
	// review they may not decide.
	it('lets an author who cannot decide comment anyway', async () => {
		authorRepository.isAuthor.mockResolvedValue(true);
		reviewerRepository.isReviewer.mockResolvedValue(false);

		const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

		expect(eligibility).toEqual({
			canDecide: false,
			decisionIneligibilityReason: 'author',
			canComment: true,
		});
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

	describe('what counts as reading every covered workflow', () => {
		it('refuses everything, without a participation lookup, when none is readable', async () => {
			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				readable({ readableWorkflowRows: [] }),
			);

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			});
			expect(reviewerRepository.isReviewer).not.toHaveBeenCalled();
			expect(authorRepository.isAuthor).not.toHaveBeenCalled();
		});

		it('requires every covered workflow, not just one of them', async () => {
			const rows = [row('wf-1'), row('wf-2')];

			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				readable({ workflowRows: rows, readableWorkflowRows: rows.slice(1) }),
			);

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			});
		});

		// An author who cannot view the workflow would hit the endpoint's 404 first,
		// so the surfaced reason must be the permission one, not 'author'.
		it('tells an author about the permission rather than their authorship', async () => {
			authorRepository.isAuthor.mockResolvedValue(true);

			const eligibility = await service.resolveViewerEligibility(
				memberUser(),
				readable({ readableWorkflowRows: [] }),
			);

			expect(eligibility).toEqual({
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			});
		});
	});

	describe('who counts as an admin of the review', () => {
		beforeEach(() => {
			// An admin override only matters for someone who could not decide otherwise.
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
		});

		it.each([['global:admin'], ['global:owner']])(
			'lets an instance %s decide a review they authored, without a project lookup',
			async (slug) => {
				const admin = mock<User>({ id: 'user-1', role: { slug } });

				const eligibility = await service.resolveViewerEligibility(admin, readable());

				expect(eligibility.canDecide).toBe(true);
				expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
			},
		);

		it('lets a project admin of the review project decide', async () => {
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([projectId]);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility.canDecide).toBe(true);
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith(
				'user-1',
				['project:admin'],
			);
		});

		it('does not let a project admin of some other project decide', async () => {
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue(['other-proj']);

			const eligibility = await service.resolveViewerEligibility(memberUser(), readable());

			expect(eligibility).toMatchObject({
				canDecide: false,
				decisionIneligibilityReason: 'author',
			});
		});
	});

	describe('isAdminForProject', () => {
		it.each([['global:admin'], ['global:owner']])(
			'treats a %s as admin of every project',
			async (slug) => {
				const user = mock<User>({ id: 'user-1', role: { slug } });

				await expect(service.isAdminForProject(user, projectId)).resolves.toBe(true);
				expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
			},
		);

		it('treats a project admin as admin of that project only', async () => {
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([projectId]);

			await expect(service.isAdminForProject(memberUser(), projectId)).resolves.toBe(true);
			await expect(service.isAdminForProject(memberUser(), 'other-proj')).resolves.toBe(false);
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith(
				'user-1',
				['project:admin'],
			);
		});

		it('denies a plain member without project-admin membership', async () => {
			await expect(service.isAdminForProject(memberUser(), projectId)).resolves.toBe(false);
		});
	});
});
