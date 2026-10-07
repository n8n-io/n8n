import { LicenseState } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { InboxVisibility, User, WorkflowReviewRequest } from '@n8n/db';
import { WorkflowReviewInboxRepository, WorkflowReviewRequestWorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowReviewAuthorizationService } from '../workflow-review-authorization.service';
import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewInboxService } from '../workflow-review-inbox.service';
import type {
	WorkflowReviewParticipantResolver,
	WorkflowReviewParticipants,
} from '../workflow-review-participant.resolver';

import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

describe('WorkflowReviewInboxService.listForInbox', () => {
	const workflowReviewPolicyService = mockInstance(WorkflowReviewPolicyService);
	const authorizationService = mock<WorkflowReviewAuthorizationService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const workflowReviewInboxRepository = mockInstance(WorkflowReviewInboxRepository);
	const workflowReviewRequestWorkflowRepository = mockInstance(
		WorkflowReviewRequestWorkflowRepository,
	);
	const participantResolver = mock<WorkflowReviewParticipantResolver>();
	const licenseState = mockInstance(LicenseState);

	let service: WorkflowReviewInboxService;

	const user = mock<User>({ id: 'user-1', role: { slug: 'global:member', scopes: [] } });

	/** The resolver is exercised in its own test; here it only has to answer. */
	function mockParticipants(participants: Partial<WorkflowReviewParticipants> = {}) {
		participantResolver.resolve.mockResolvedValue({
			for: () => ({ requester: null, authors: [], reviewers: [], ...participants }),
		});
	}

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		mockParticipants();

		service = new WorkflowReviewInboxService(
			new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
			authorizationService,
			workflowHistoryService,
			workflowReviewInboxRepository,
			workflowReviewRequestWorkflowRepository,
			participantResolver,
		);
	});

	const involvedVisibility: InboxVisibility = {
		scope: 'involved',
		userId: 'user-1',
		adminProjectIds: [],
		readableProjectIds: ['proj-1'],
		readableWorkflowRoles: ['workflow:owner', 'workflow:editor'],
	};

	function mockVisibility(visibility: InboxVisibility = involvedVisibility) {
		authorizationService.resolveInboxVisibility.mockResolvedValueOnce(visibility);
	}

	it('returns ordered source rows without slicing or creating a public cursor', async () => {
		mockVisibility();
		const rows = ['second', 'first'].map((id) =>
			mock<WorkflowReviewRequest>({
				id,
				projectId: 'proj-1',
				title: id,
				state: 'open',
				decision: 'pending',
				createdAt: new Date('2026-10-07T00:00:00.000Z'),
				updatedAt: new Date('2026-10-07T00:00:00.000Z'),
			}),
		);
		workflowReviewInboxRepository.findRequests.mockResolvedValue(rows);
		workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
			new Map([['second', { workflowName: 'Linked workflow', workflowVersionId: 'ver-2' }]]),
		);

		const result = await service.listForInbox(user, { state: 'open', limit: 2 });

		expect(workflowReviewInboxRepository.findRequests).toHaveBeenCalledWith({
			visibility: involvedVisibility,
			state: 'open',
			category: undefined,
			limit: 2,
			boundary: undefined,
		});
		expect(result.map((row) => row.id)).toEqual(['second', 'first']);
		expect(result[0]).toMatchObject({ type: 'workflow_review', workflowName: 'Linked workflow' });
		expect(participantResolver.resolve).toHaveBeenCalledWith(rows);
	});

	it.each([
		{ mode: 'beforeTime', createdAt: new Date('2026-10-07T00:00:00.000Z') },
		{ mode: 'atOrBeforeTime', createdAt: new Date('2026-10-07T00:00:00.000Z') },
		{ mode: 'afterItem', createdAt: new Date('2026-10-07T00:00:00.000Z'), id: 'last' },
	] as const)('passes the $mode boundary to its repository', async (boundary) => {
		mockVisibility();
		workflowReviewInboxRepository.findRequests.mockResolvedValue([]);
		workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
			new Map(),
		);

		await service.listForInbox(user, { state: 'closed', limit: 16, boundary });

		expect(workflowReviewInboxRepository.findRequests).toHaveBeenCalledWith({
			visibility: involvedVisibility,
			state: 'closed',
			category: undefined,
			limit: 16,
			boundary,
		});
	});

	it('checks the live policy before reading rows', async () => {
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });
		expect(await service.isInboxAvailable()).toBe(false);
		await expect(service.listForInbox(user, { state: 'open', limit: 10 })).rejects.toThrow();
		expect(workflowReviewInboxRepository.findRequests).not.toHaveBeenCalled();
	});
});
