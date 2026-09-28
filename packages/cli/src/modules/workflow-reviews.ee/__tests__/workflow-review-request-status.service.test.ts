import type { ListWorkflowReviewRequestsQueryDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import { User } from '@n8n/db';
import type {
	UserRepository,
	WorkflowEntity,
	WorkflowReviewRequestForWorkflowRow,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { WorkflowReviewAuthorizationService } from '../workflow-review-authorization.service';
import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewRequestStatusService } from '../workflow-review-request-status.service';

const user = mock<User>({ id: 'user-1' });

/** Build a loaded user with the computed pending state. */
function loadedUser(fields: Partial<User> & { id: string; email: string }): User {
	const loaded = Object.assign(new User(), { password: 'hashed', authIdentities: [], ...fields });
	loaded.computeIsPending();
	return loaded;
}

describe('WorkflowReviewRequestStatusService.list', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const userRepository = mock<UserRepository>();
	const licenseState = mock<LicenseState>();
	const authorizationService = mock<WorkflowReviewAuthorizationService>();

	const service = new WorkflowReviewRequestStatusService(
		new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
		workflowFinderService,
		requestRepository,
		userRepository,
		authorizationService,
	);

	const query = mock<ListWorkflowReviewRequestsQueryDto>({
		workflowId: 'wf-1',
		skip: 0,
		take: 1,
	});

	const reviewRow = (
		overrides: Partial<WorkflowReviewRequestForWorkflowRow> = {},
	): WorkflowReviewRequestForWorkflowRow => ({
		id: 'req-1',
		projectId: 'proj-1',
		state: 'open',
		decision: 'pending',
		description: null,
		updatedById: 'user-2',
		workflowVersionId: 'ver-1',
		workflowVersionName: null,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-02T00:00:00.000Z'),
		...overrides,
	});

	const mockLatestReview = (overrides: Partial<WorkflowReviewRequestForWorkflowRow> = {}) => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
		requestRepository.findRequestsForWorkflow.mockResolvedValue([[reviewRow(overrides)], 1]);
	};

	const reviewer = loadedUser({
		id: 'user-2',
		email: 'reviewer@example.com',
		firstName: 'Rey',
		lastName: 'Viewer',
	});

	beforeEach(() => {
		vi.resetAllMocks();
		authorizationService.resolveOpenableRequestIds.mockResolvedValue(new Set());
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
	});

	it('refuses to list reviews for a workflow the caller cannot read', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		await expect(service.list(user, query)).rejects.toThrow(NotFoundError);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
			'workflow:read',
		]);
		expect(requestRepository.findRequestsForWorkflow).not.toHaveBeenCalled();
	});

	it('refuses to list anything once an admin turns reviews off, before looking the workflow up', async () => {
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

		await expect(service.list(user, query)).rejects.toThrow(ForbiddenError);

		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(requestRepository.findRequestsForWorkflow).not.toHaveBeenCalled();
	});

	it('names who asked for changes', async () => {
		mockLatestReview({ decision: 'changes_requested' });
		userRepository.findManyByIds.mockResolvedValue([reviewer]);

		const { count, data } = await service.list(user, query);

		expect(userRepository.findManyByIds).toHaveBeenCalledWith(['user-2']);
		expect(count).toBe(1);
		expect(data).toEqual([
			{
				id: 'req-1',
				state: 'open',
				decision: 'changes_requested',
				description: null,
				workflowVersionId: 'ver-1',
				workflowVersionName: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
				decisionBy: {
					id: 'user-2',
					email: 'reviewer@example.com',
					firstName: 'Rey',
					lastName: 'Viewer',
				},
				viewerCanOpen: false,
			},
		]);
	});

	it('carries the name given to the version under review', async () => {
		mockLatestReview({ workflowVersionName: 'Release candidate' });

		const { data } = await service.list(user, query);

		expect(data[0]).toMatchObject({ workflowVersionName: 'Release candidate' });
	});

	it('names nobody once the user who asked for changes is deleted', async () => {
		mockLatestReview({ decision: 'changes_requested' });
		userRepository.findManyByIds.mockResolvedValue([]);

		const { data } = await service.list(user, query);

		expect(data[0]?.decisionBy).toBeNull();
	});

	// Only a changes-requested review names anyone: an approval is deliberately
	// unattributed in the canvas banner, and a pending review has no decider yet.
	it.each([
		['the review is still waiting for a decision', {}],
		['the review records no actor', { decision: 'changes_requested' as const, updatedById: null }],
		['the review was approved', { state: 'closed' as const, decision: 'approved' as const }],
	])('names nobody when %s', async (_label, overrides) => {
		mockLatestReview(overrides);

		const { data } = await service.list(user, query);

		expect(data[0]).toMatchObject({ decisionBy: null });
		expect(userRepository.findManyByIds).not.toHaveBeenCalled();
	});

	it('marks the rows the caller may open, resolved in one batched access check', async () => {
		mockLatestReview();
		authorizationService.resolveOpenableRequestIds.mockResolvedValue(new Set(['req-1']));

		const { data } = await service.list(user, query);

		expect(authorizationService.resolveOpenableRequestIds).toHaveBeenCalledWith(user, [
			expect.objectContaining({ id: 'req-1', projectId: 'proj-1' }),
		]);
		expect(data[0]?.viewerCanOpen).toBe(true);
	});

	it('names the deciders of many rows with a single user lookup', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());
		requestRepository.findRequestsForWorkflow.mockResolvedValue([
			[
				reviewRow({ id: 'req-1', decision: 'changes_requested', updatedById: 'user-2' }),
				reviewRow({ id: 'req-2', decision: 'changes_requested', updatedById: 'user-3' }),
				reviewRow({
					id: 'req-3',
					state: 'closed',
					decision: 'approved',
					workflowVersionId: 'ver-3',
				}),
				reviewRow({
					id: 'req-4',
					state: 'closed',
					decision: 'approved',
					workflowVersionId: 'ver-4',
				}),
			],
			4,
		]);
		userRepository.findManyByIds.mockResolvedValue([
			reviewer,
			loadedUser({ id: 'user-3', email: 'other@example.com' }),
		]);

		const { data } = await service.list(user, query);

		expect(userRepository.findManyByIds).toHaveBeenCalledTimes(1);
		expect(userRepository.findManyByIds).toHaveBeenCalledWith(['user-2', 'user-3']);
		expect(data.map((item) => item.decisionBy?.email ?? null)).toEqual([
			'reviewer@example.com',
			'other@example.com',
			null,
			null,
		]);
	});
});
