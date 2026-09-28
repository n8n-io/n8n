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
import { WorkflowReviewRequestDecisionService } from '../workflow-review-request-decision.service';
import { WorkflowReviewRequestMutationGuard } from '../workflow-review-request-mutation-guard.service';
import { WorkflowReviewStateNotifier } from '../workflow-review-state-notifier.service';

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

describe('WorkflowReviewRequestDecisionService.decide', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
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
	/** Transaction context used inside the lock. */
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

	const service = new WorkflowReviewRequestDecisionService(
		logger,
		new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
		workflowFinderService,
		requestRepository,
		workflowRepository,
		authorRepository,
		reviewerRepository,
		activityRepository,
		userRepository,
		dbLockService,
		collaborationService,
		workflowService,
		// Use the real authorization service to cover the shared admin rule.
		authorizationService,
		eventService,
		new WorkflowReviewRequestMutationGuard(workflowEntityRepository, sharedWorkflowRepository),
		new WorkflowReviewStateNotifier(logger, collaborationService),
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
		// Run locked work with the transaction context by default.
		dbLockService.withLockContext.mockImplementation(async (_id, fn) => await fn(ctx));
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
		collaborationService.broadcastWorkflowUpdate.mockResolvedValue(undefined);
	});

	it('refuses everything once an admin turns reviews off, before any lookup or lock', async () => {
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			ForbiddenError,
		);

		expect(requestRepository.findById).not.toHaveBeenCalled();
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('refuses a review that does not exist', async () => {
		requestRepository.findById.mockResolvedValue(null);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('refuses a review that covers no workflow', async () => {
		requestRepository.findById.mockResolvedValue(openRequest());
		workflowRepository.findByRequestId.mockResolvedValue([]);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('hides a review whose workflow the caller cannot view', async () => {
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

	it('hides a review when the caller cannot view every workflow it covers', async () => {
		mockSuccessfulDecidePath();
		workflowRepository.findByRequestId.mockResolvedValue([
			pinnedRow('ver-1', 'wf-1'),
			pinnedRow('ver-2', 'wf-2'),
		]);
		workflowFinderService.findWorkflowForUser.mockImplementation(async (workflowId) =>
			workflowId === 'wf-1' ? mock<WorkflowEntity>({ isArchived: false }) : null,
		);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	it('hides a review from someone who was not asked to review it', async () => {
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
	])('refuses a review that is already %s, before taking the lock', async (_name, req) => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(req);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			ConflictError,
		);

		expect(dbLockService.withLockContext).not.toHaveBeenCalled();
	});

	describe('who is refused, and how', () => {
		it('tells an author outright that they cannot decide their own review', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
				ForbiddenError,
			);

			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		// Check authorization before revealing that the note is invalid.
		it('refuses an author before complaining about their missing note', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			reviewerRepository.isReviewer.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			await expect(
				service.decide(memberUser(), requestId, { decision: 'changes_requested' }),
			).rejects.toThrow(ForbiddenError);
		});

		it('still lets an assigned reviewer decide after a re-pin made them an author too', async () => {
			mockSuccessfulDecidePath();
			// A version update adds the caller as an author before the decision gets the lock.
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
			// An assigned reviewer remains eligible after becoming an author.
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith(
				'workflow-review-decided',
				expect.objectContaining({ decidedVia: 'assigned-reviewer' }),
			);
		});

		it('refuses someone unassigned while they waited for the lock', async () => {
			mockSuccessfulDecidePath();
			reviewerRepository.isReviewer.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
			authorRepository.isAuthor.mockResolvedValue(false);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
				NotFoundError,
			);
			expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		});

		it('lets a project admin decide their own review, recorded as an override', async () => {
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

		it('resolves the admin override once, before taking the lock', async () => {
			mockSuccessfulDecidePath();

			await service.decide(memberUser(), requestId, approveDto);

			// Resolve the override before the lock because it needs another database connection.
			const [overrideOrder] =
				projectRelationRepository.getAccessibleProjectsByRoles.mock.invocationCallOrder;
			const [lockOrder] = dbLockService.withLockContext.mock.invocationCallOrder;
			expect(overrideOrder).toBeLessThan(lockOrder);
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledOnce();
		});
	});

	it('closes the review on approval, recording who approved it and when, and tells open editors', async () => {
		const request = mockSuccessfulDecidePath();

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(dbLockService.withLockContext).toHaveBeenCalledWith(
			DbLock.WORKFLOW_REVIEW_MUTATION,
			expect.any(Function),
		);
		// Re-check using the lock transaction.
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

	// Use several rows to cover the approval baseline loop.
	it('freezes a comparison baseline for every workflow the review covers', async () => {
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

	it('leaves the review open and unstamped when a reviewer asks for changes', async () => {
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

	it('lets a second reviewer ask for changes again', async () => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(openRequest({ decision: 'changes_requested' }));

		const result = await service.decide(memberUser('user-2'), requestId, requestChangesDto);

		expect(result.decision).toBe('changes_requested');
		const savedEntity = requestRepository.saveRequest.mock.calls[0]?.[0];
		expect(savedEntity).toMatchObject({ updatedById: 'user-2' });
	});

	it('lets a reviewer approve a review that had changes requested', async () => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(openRequest({ decision: 'changes_requested' }));

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(result.decision).toBe('approved');
		expect(result.state).toBe('closed');
	});

	it('writes and announces nothing when the review closes while the decision waits for the lock', async () => {
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
		// The workflow is archived while the decision waits for the lock.
		workflowEntityRepository.findArchivedState.mockResolvedValue({ isArchived: true });

		const decision = service.decide(memberUser(), requestId, approveDto);
		await expect(decision).rejects.toThrow(BadRequestError);
		// Use an error message that describes the reviewer's action.
		await expect(decision).rejects.toThrow(
			"The workflow 'wf-1' is archived and cannot be reviewed",
		);

		// Do not record approval after the workflow stops being reviewable.
		expect(activityRepository.createActivity).not.toHaveBeenCalled();
		expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
	});

	it('reports and publishes the version a concurrent re-pin left behind', async () => {
		mockSuccessfulDecidePath();
		workflowRepository.findByRequestId
			.mockResolvedValueOnce([pinnedRow('ver-1')])
			// Another update pins the new version before the decision gets the lock.
			.mockResolvedValueOnce([pinnedRow('ver-2')]);

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(workflowRepository.findByRequestId).toHaveBeenLastCalledWith(requestId, ctx);
		expect(result.workflowVersionId).toBe('ver-2');
		// Publish the version that was approved.
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
			// Approval must commit before the publish gate runs.
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

		it('publishes nothing when a reviewer asks for changes, and reports no outcome', async () => {
			mockSuccessfulDecidePath();

			const result = await service.decide(memberUser(), requestId, requestChangesDto);

			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(result).not.toHaveProperty('autoPublish');
		});

		it('keeps the approval and reports the failure when publishing rejects', async () => {
			mockSuccessfulDecidePath();
			workflowService.activateWorkflow.mockRejectedValue(new Error('webhook path conflict'));

			const result = await service.decide(memberUser(), requestId, approveDto);

			// Publish failure does not undo the approval.
			expect(requestRepository.saveRequest.mock.calls[0]?.[0]).toMatchObject({
				decision: 'approved',
				state: 'closed',
			});
			expect(result).toMatchObject({
				state: 'closed',
				decision: 'approved',
				autoPublish: { status: 'failed', message: 'webhook path conflict' },
			});
			// Activation failure is an error because it may leave the workflow inactive.
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to publish workflow after review approval',
				expect.objectContaining({ workflowId: 'wf-1', pinnedVersionId: 'ver-1' }),
			);
			expect(collaborationService.broadcastWorkflowUpdate).not.toHaveBeenCalled();
			// Report the committed approval once even if publishing fails.
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
			// Omit null versions so the activity remains readable.
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
});
