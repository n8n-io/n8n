import type { DecideWorkflowReviewRequestDto } from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import type {
	DbLockService,
	Project,
	ProjectRelationRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
	UserRepository,
	WorkflowEntity,
	WorkflowHistoryRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflow,
	WorkflowReviewRequestWorkflowRepository,
	WorkflowRepository,
	Transaction,
	OperationContext,
} from '@n8n/db';
import { DbLock } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewAuthorizationService } from '../workflow-review-authorization.service';
import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewRequestService } from '../workflow-review-request.service';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowService } from '@/workflows/workflow.service';

const memberUser = (id = 'user-1') => mock<User>({ id, role: { slug: 'global:member' } });
const requesterUser = mock<User>({
	id: 'requester-1',
	disabled: false,
	role: { slug: 'global:member' },
});

const requestId = 'req-1';
const projectId = 'proj-1';
const approveDto: DecideWorkflowReviewRequestDto = { decision: 'approved' };
const requestChangesDto: DecideWorkflowReviewRequestDto = {
	decision: 'changes_requested',
	note: 'Please rename the node',
};

describe('WorkflowReviewRequestService.decide', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
	const workflowEntityRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const activityRepository = mock<WorkflowReviewActivityRepository>();
	const userRepository = mock<UserRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const roleService = mock<RoleService>();
	const licenseState = mock<LicenseState>();
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();
	const workflowService = mock<WorkflowService>();
	const logger = mock<Logger>();
	const eventService = mock<EventService>();
	/** The lock's context. Distinct from the root `{}` so tests can tell the two apart. */
	const ctx: OperationContext = { trx: mock<Transaction>() };

	const authorizationService = new WorkflowReviewAuthorizationService(
		workflowFinderService,
		mock<ProjectService>(),
		roleService,
		mock<ProjectRepository>(),
		projectRelationRepository,
		requestRepository,
		workflowRepository,
		authorRepository,
		reviewerRepository,
	);

	const service = new WorkflowReviewRequestService(
		logger,
		new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
		workflowFinderService,
		workflowHistoryService,
		workflowHistoryRepository,
		workflowEntityRepository,
		sharedWorkflowRepository,
		requestRepository,
		workflowRepository,
		authorRepository,
		reviewerRepository,
		activityRepository,
		userRepository,
		roleService,
		dbLockService,
		collaborationService,
		workflowService,
		// Real service over the same mocks, so the override assertions below exercise
		// the actual admin rule decide() shares with the read side.
		authorizationService,
		eventService,
	);

	const openRequest = (overrides: Partial<WorkflowReviewRequest> = {}) =>
		mock<WorkflowReviewRequest>({
			id: requestId,
			projectId,
			state: 'open',
			decision: 'pending',
			closedById: null,
			approvedAt: null,
			createdById: requesterUser.id,
			createdAt: new Date('2026-07-20T10:00:00.000Z'),
			updatedAt: new Date('2026-07-20T11:00:00.000Z'),
			...overrides,
		});

	const pinnedRow = (workflowVersionId: string | null = 'ver-1', workflowId = 'wf-1') =>
		mock<WorkflowReviewRequestWorkflow>({
			workflowReviewRequestId: requestId,
			workflowId,
			workflowVersionId,
		});

	const mockSuccessfulDecidePath = () => {
		const request = openRequest();
		requestRepository.findById.mockResolvedValue(request);
		workflowRepository.findByRequestId.mockResolvedValue([pinnedRow()]);
		workflowRepository.captureApprovalBaseline.mockResolvedValue(undefined);
		workflowFinderService.findWorkflowForUser.mockResolvedValue(
			mock<WorkflowEntity>({ isArchived: false }),
		);
		workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: false });
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
			mock<Project>({ id: projectId }),
		);
		authorRepository.isAuthor.mockResolvedValue(false);
		reviewerRepository.isReviewer.mockResolvedValue(true);
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
		userRepository.findManyByIds.mockResolvedValue([requesterUser]);
		requestRepository.saveRequest.mockImplementation(async (saved) => saved);
		return request;
	};

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		// By default, run the critical section against the mocked transaction.
		dbLockService.withLockContext.mockImplementation(async (_id, fn) => await fn(ctx));
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
		collaborationService.broadcastWorkflowUpdate.mockResolvedValue(undefined);
	});

	it('throws when the instance policy is disabled, before any lookup or lock', async () => {
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			ForbiddenError,
		);

		expect(requestRepository.findById).not.toHaveBeenCalled();
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the review request does not exist', async () => {
		requestRepository.findById.mockResolvedValue(null);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the request has no linked workflow row', async () => {
		requestRepository.findById.mockResolvedValue(openRequest());
		workflowRepository.findByRequestId.mockResolvedValue([]);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the user cannot view the workflow', async () => {
		mockSuccessfulDecidePath();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
			'wf-1',
			expect.anything(),
			['workflow:read'],
		);
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('throws NotFoundError for a non-assigned viewer without an admin override', async () => {
		mockSuccessfulDecidePath();
		reviewerRepository.isReviewer.mockResolvedValue(false);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it.each([
		['closed', openRequest({ state: 'closed' })],
		['approved', openRequest({ decision: 'approved' })],
	])('throws ConflictError and never takes the lock when the request is %s', async (_name, req) => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(req);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			ConflictError,
		);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	describe('author eligibility', () => {
		it('allows an assigned reviewer to decide even when they authored a version', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(true);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(result.decision).toBe('approved');
		});

		it('throws ForbiddenError for a non-assigned author without an admin override', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
				ForbiddenError,
			);

			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		// The missing note is a payload problem, and a non-reviewer author is not entitled to
		// hear about it: they may not decide at all, whatever they sent.
		it('tells an author they may not decide even when their note is missing too', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			await expect(
				service.decide(memberUser(), requestId, { decision: 'changes_requested' }),
			).rejects.toThrow(ForbiddenError);
		});

		it('still allows an assigned reviewer who became an author while waiting for the lock', async () => {
			mockSuccessfulDecidePath();
			// Not an author before the lock, but a version sync won the lock first and
			// added them to the author set before the critical section runs.
			authorRepository.isAuthor.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(result.decision).toBe('approved');
			expect(authorRepository.isAuthor).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ workflowReviewRequestId: requestId }),
				ctx,
			);
			expect(requestRepository.saveRequest).toHaveBeenCalled();
			// Being an author does not take away the assignment that entitled them to decide.
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith(
				'workflow-review-decided',
				expect.objectContaining({ decidedVia: 'assigned-reviewer' }),
			);
		});

		it('rejects a caller unassigned while waiting for the lock', async () => {
			mockSuccessfulDecidePath();
			reviewerRepository.isReviewer.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
			authorRepository.isAuthor.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
				NotFoundError,
			);
			expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		});

		it.each([['global:admin'], ['global:owner']])(
			'allows an author with the %s role without querying project relations',
			async (slug) => {
				mockSuccessfulDecidePath();
				authorRepository.isAuthor.mockResolvedValue(true);
				reviewerRepository.isReviewer.mockResolvedValue(false);
				const admin = mock<User>({ id: 'user-1', role: { slug } });

				const result = await service.decide(admin, requestId, approveDto);

				expect(result.decision).toBe('approved');
				expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
			},
		);

		it('allows an author who is a project admin of the review project', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([projectId]);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(result.decision).toBe('approved');
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith(
				'user-1',
				['project:admin'],
			);
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith(
				'workflow-review-decided',
				expect.objectContaining({ decidedVia: 'admin-override' }),
			);
		});

		it('throws ForbiddenError for an author who is only a project admin elsewhere', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue(['other-proj']);

			await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
				ForbiddenError,
			);

			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('resolves the admin override once, before taking the lock', async () => {
			mockSuccessfulDecidePath();

			await service.decide(memberUser(), requestId, approveDto);

			// The override query must never run inside the lock transaction: with a
			// single-connection pool it would deadlock waiting for a second connection.
			const [overrideOrder] =
				projectRelationRepository.getAccessibleProjectsByRoles.mock.invocationCallOrder;
			const [lockOrder] = dbLockService.withLockContext.mock.invocationCallOrder;
			expect(overrideOrder).toBeLessThan(lockOrder);
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledOnce();
		});
	});

	it('approves: closes the request, stamps closedById and approvedAt, and broadcasts', async () => {
		const request = mockSuccessfulDecidePath();

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(dbLockService.withLockContext).toHaveBeenCalledWith(
			DbLock.WORKFLOW_REVIEW_MUTATION,
			expect.any(Function),
		);
		// Re-checked under the lock through the transaction manager.
		expect(requestRepository.findById).toHaveBeenCalledWith(requestId, ctx);
		expect(workflowRepository.captureApprovalBaseline).toHaveBeenCalledExactlyOnceWith(
			{ workflowReviewRequestId: requestId, workflowId: 'wf-1' },
			ctx,
		);
		const savedEntity = requestRepository.saveRequest.mock.calls[0]?.[0];
		expect(savedEntity).toMatchObject({
			decision: 'approved',
			state: 'closed',
			updatedById: 'user-1',
			closedById: 'user-1',
			approvedAt: expect.any(Date),
		});
		expect(result).toEqual({
			id: requestId,
			state: 'closed',
			decision: 'approved',
			workflowVersionId: 'ver-1',
			createdAt: '2026-07-20T10:00:00.000Z',
			updatedAt: '2026-07-20T11:00:00.000Z',
			autoPublish: { status: 'published' },
		});
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
		expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('workflow-review-decided', {
			user: expect.objectContaining({ id: 'user-1' }),
			workflowReviewRequestId: requestId,
			workflowId: 'wf-1',
			workflowVersionId: 'ver-1',
			decision: 'approved',
			decidedVia: 'assigned-reviewer',
			reviewCreatedAt: request.createdAt,
		});
	});

	// Reviews carry exactly one workflow today (the create DTO enforces it), so this
	// covers the capture loop for the multi-workflow bundles it was written for.
	it('approves: freezes a baseline for every workflow the request covers', async () => {
		mockSuccessfulDecidePath();
		workflowRepository.findByRequestId.mockResolvedValue([
			pinnedRow('ver-1', 'wf-1'),
			pinnedRow('ver-2', 'wf-2'),
		]);

		await service.decide(memberUser(), requestId, approveDto);

		expect(workflowRepository.captureApprovalBaseline).toHaveBeenCalledTimes(2);
		expect(workflowRepository.captureApprovalBaseline).toHaveBeenCalledWith(
			{ workflowReviewRequestId: requestId, workflowId: 'wf-1' },
			ctx,
		);
		expect(workflowRepository.captureApprovalBaseline).toHaveBeenCalledWith(
			{ workflowReviewRequestId: requestId, workflowId: 'wf-2' },
			ctx,
		);
	});

	it('requests changes: keeps the request open and leaves closedById/approvedAt untouched', async () => {
		const request = mockSuccessfulDecidePath();

		const result = await service.decide(memberUser(), requestId, requestChangesDto);

		expect(workflowRepository.captureApprovalBaseline).not.toHaveBeenCalled();
		const savedEntity = requestRepository.saveRequest.mock.calls[0]?.[0];
		expect(savedEntity).toMatchObject({
			decision: 'changes_requested',
			state: 'open',
			updatedById: 'user-1',
			closedById: null,
			approvedAt: null,
		});
		expect(result.state).toBe('open');
		expect(result.decision).toBe('changes_requested');
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
		expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('workflow-review-decided', {
			user: expect.objectContaining({ id: 'user-1' }),
			workflowReviewRequestId: requestId,
			workflowId: 'wf-1',
			workflowVersionId: 'ver-1',
			decision: 'changes_requested',
			decidedVia: 'assigned-reviewer',
			reviewCreatedAt: request.createdAt,
		});
	});

	it('allows repeating changes_requested (e.g. a second reviewer)', async () => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(openRequest({ decision: 'changes_requested' }));

		const result = await service.decide(memberUser('user-2'), requestId, requestChangesDto);

		expect(result.decision).toBe('changes_requested');
		const savedEntity = requestRepository.saveRequest.mock.calls[0]?.[0];
		expect(savedEntity).toMatchObject({ updatedById: 'user-2' });
	});

	it('allows approving a changes_requested review', async () => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(openRequest({ decision: 'changes_requested' }));

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(result.decision).toBe('approved');
		expect(result.state).toBe('closed');
	});

	it('throws ConflictError and saves/broadcasts nothing when the request closes between check and lock', async () => {
		mockSuccessfulDecidePath();
		requestRepository.findById
			.mockResolvedValueOnce(openRequest())
			.mockResolvedValueOnce(openRequest({ state: 'closed', decision: 'approved' }));

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			ConflictError,
		);

		expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('refuses to approve a workflow archived while the decision waited for the lock', async () => {
		mockSuccessfulDecidePath();
		// The pre-lock lookups still see a live workflow; only the in-lock re-read
		// sees the archive that committed while this decision queued.
		workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: true });

		const decision = service.decide(memberUser(), requestId, approveDto);
		await expect(decision).rejects.toThrow(BadRequestError);
		// The reviewer is told their review was refused, not that the workflow
		// "cannot be submitted for review" — that is the author's action, not theirs.
		await expect(decision).rejects.toThrow(
			"The workflow 'wf-1' is archived and cannot be reviewed",
		);

		// Nothing may reach the activity feed: an approval entry here would durably
		// assert a decision on a workflow that had already left the reviewable state.
		expect(activityRepository.createActivity).not.toHaveBeenCalled();
		expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
	});

	it('reports and publishes the version re-pinned by a concurrent sync that won the lock', async () => {
		mockSuccessfulDecidePath();
		workflowRepository.findByRequestId
			.mockResolvedValueOnce([pinnedRow('ver-1')])
			// In-lock re-read: a concurrent update-version re-pinned first.
			.mockResolvedValueOnce([pinnedRow('ver-2')]);

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(workflowRepository.findByRequestId).toHaveBeenLastCalledWith(requestId, ctx);
		expect(result.workflowVersionId).toBe('ver-2');
		// The published version must be the one the approval was recorded against.
		expect(workflowService.activateWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({ id: requesterUser.id }),
			'wf-1',
			{ versionId: 'ver-2', source: 'review-approval' },
		);
	});

	describe('auto-publish on approval', () => {
		it('publishes the pinned version as the requester, after the approval commits', async () => {
			mockSuccessfulDecidePath();

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(workflowService.activateWorkflow).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ id: requesterUser.id }),
				'wf-1',
				{ versionId: 'ver-1', source: 'review-approval' },
			);
			// The approval must commit before publishing: the closed review is what
			// lets the publish gate pass without a bypass.
			const [lockOrder] = dbLockService.withLockContext.mock.invocationCallOrder;
			const [publishOrder] = workflowService.activateWorkflow.mock.invocationCallOrder;
			expect(lockOrder).toBeLessThan(publishOrder);
			expect(result.autoPublish).toEqual({ status: 'published' });
		});

		it('broadcasts a workflow update to open editor sessions after publishing', async () => {
			mockSuccessfulDecidePath();

			await service.decide(memberUser(), requestId, approveDto);

			expect(collaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith(
				'wf-1',
				requesterUser.id,
			);
		});

		it('never publishes on changes_requested and omits the outcome', async () => {
			mockSuccessfulDecidePath();

			const result = await service.decide(memberUser(), requestId, requestChangesDto);

			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(result).not.toHaveProperty('autoPublish');
		});

		it('keeps the approval and reports the failure when publishing rejects', async () => {
			mockSuccessfulDecidePath();
			workflowService.activateWorkflow.mockRejectedValue(new Error('webhook path conflict'));

			const result = await service.decide(memberUser(), requestId, approveDto);

			// The approval is committed and never reverted by a publish failure.
			expect(requestRepository.saveRequest.mock.calls[0]?.[0]).toMatchObject({
				decision: 'approved',
				state: 'closed',
			});
			expect(result).toMatchObject({
				state: 'closed',
				decision: 'approved',
				autoPublish: { status: 'failed', message: 'webhook path conflict' },
			});
			// Logged at error, not warn: the failure can leave a previously published
			// workflow deactivated.
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to publish workflow after review approval',
				expect.objectContaining({ workflowId: 'wf-1', pinnedVersionId: 'ver-1' }),
			);
			expect(collaborationService.broadcastWorkflowUpdate).not.toHaveBeenCalled();
			// The approval stands, so it is reported exactly once whatever publishing did.
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith(
				'workflow-review-decided',
				expect.objectContaining({ decision: 'approved' }),
			);
		});

		it('keeps the approval as a system close when the requester user has been deleted', async () => {
			mockSuccessfulDecidePath();
			userRepository.findManyByIds.mockResolvedValue([]);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(userRepository.findManyByIds).toHaveBeenCalledWith([requesterUser.id], {
				includeRole: true,
			});
			expect(requestRepository.saveRequest.mock.calls[0]?.[0]).toMatchObject({
				decision: 'approved',
				state: 'closed',
				closedById: null,
			});
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(result.autoPublish).toEqual({
				status: 'failed',
				message: 'The review requester is no longer available',
			});
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith(
				'workflow-review-decided',
				expect.objectContaining({ decision: 'approved' }),
			);
		});

		it('keeps the approval as a system close when the requester has been deactivated', async () => {
			mockSuccessfulDecidePath();
			userRepository.findManyByIds.mockResolvedValue([
				mock<User>({ id: requesterUser.id, disabled: true, role: { slug: 'global:member' } }),
			]);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(requestRepository.saveRequest.mock.calls[0]?.[0]).toMatchObject({
				decision: 'approved',
				state: 'closed',
				closedById: null,
			});
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(result.autoPublish).toEqual({
				status: 'failed',
				message: 'The review requester is no longer available',
			});
		});

		it('keeps the approval as a system close when the requester lost publish rights', async () => {
			mockSuccessfulDecidePath();
			workflowFinderService.findWorkflowForUser
				// Decider: workflow:read
				.mockResolvedValueOnce(mock<WorkflowEntity>({ isArchived: false }))
				// Requester publishability: workflow:publish
				.mockResolvedValueOnce(null);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(requestRepository.saveRequest.mock.calls[0]?.[0]).toMatchObject({
				decision: 'approved',
				state: 'closed',
				closedById: null,
			});
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(result.autoPublish).toEqual({
				status: 'failed',
				message: 'The review requester no longer has permission to publish this workflow',
			});
		});

		it('skips publishing and reports a failure when the pinned version was pruned', async () => {
			mockSuccessfulDecidePath();
			workflowRepository.findByRequestId.mockResolvedValue([pinnedRow(null)]);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(result.autoPublish).toEqual({
				status: 'failed',
				message: 'The reviewed workflow version no longer exists',
			});
			// A `[null]` here is rejected on read, which would take the reviewer's note down
			// with it and leave an approval nobody can account for.
			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'review.approved',
					data: { workflowVersions: [], note: null },
				}),
				ctx,
			);
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith(
				'workflow-review-decided',
				expect.objectContaining({ decision: 'approved', workflowVersionId: null }),
			);
		});
	});

	it('resolves and logs a warning when the broadcast rejects', async () => {
		mockSuccessfulDecidePath();
		collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
			new Error('push down'),
		);

		const result = await service.decide(memberUser(), requestId, approveDto);
		expect(result.id).toBe(requestId);

		// Let the fire-and-forget rejection handler run.
		await new Promise(process.nextTick);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to broadcast review state change',
			expect.objectContaining({ workflowId: 'wf-1' }),
		);
	});
});
