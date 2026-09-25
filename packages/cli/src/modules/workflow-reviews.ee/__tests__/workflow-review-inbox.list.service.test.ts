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

	it('returns paginated data with hasMore and nextCursor', async () => {
		mockVisibility();
		const rows = [
			mock<WorkflowReviewRequest>({
				id: 'req-2',
				projectId: 'proj-1',
				title: 'Second',
				decision: 'pending',
				state: 'open',
				createdAt: new Date('2024-01-02T00:00:00.000Z'),
				updatedAt: new Date('2024-01-02T00:00:00.000Z'),
			}),
			mock<WorkflowReviewRequest>({
				id: 'req-1',
				projectId: 'proj-1',
				title: 'First',
				decision: 'pending',
				state: 'open',
				createdAt: new Date('2024-01-01T00:00:00.000Z'),
				updatedAt: new Date('2024-01-01T00:00:00.000Z'),
			}),
		];
		workflowReviewInboxRepository.findRequests.mockResolvedValue(rows);
		workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
			new Map([['req-2', { workflowName: 'Linked workflow', workflowVersionId: 'ver-2' }]]),
		);

		const result = await service.listForInbox(user, { limit: 1 });

		expect(workflowReviewInboxRepository.findRequests).toHaveBeenCalledWith({
			visibility: involvedVisibility,
			state: 'open',
			limit: 2,
			cursor: undefined,
		});
		expect(result.data).toHaveLength(1);
		expect(result.data[0]?.workflowName).toBe('Linked workflow');
		expect(result.data[0]?.workflowVersionId).toBe('ver-2');
		expect(result.hasMore).toBe(true);
		// nextCursor encodes the last row's keyset boundary (createdAt + id).
		const expectedCursor = Buffer.from('2024-01-02T00:00:00.000Z|req-2', 'utf8').toString(
			'base64url',
		);
		expect(result.nextCursor).toBe(expectedCursor);
		// Participants are only resolved for the page, never for the lookahead row.
		expect(participantResolver.resolve).toHaveBeenCalledWith([rows[0]]);
	});

	it('decodes the incoming cursor into a keyset boundary', async () => {
		mockVisibility();
		workflowReviewInboxRepository.findRequests.mockResolvedValue([]);
		workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
			new Map(),
		);
		const cursor = Buffer.from('2024-01-02T00:00:00.000Z|req-2', 'utf8').toString('base64url');

		await service.listForInbox(user, { limit: 15, cursor });

		expect(workflowReviewInboxRepository.findRequests).toHaveBeenCalledWith(
			expect.objectContaining({
				cursor: { createdAt: new Date('2024-01-02T00:00:00.000Z'), id: 'req-2' },
			}),
		);
	});

	it('rejects a malformed cursor', async () => {
		mockVisibility();
		const cursor = Buffer.from('not-a-valid-cursor', 'utf8').toString('base64url');

		await expect(service.listForInbox(user, { limit: 15, cursor })).rejects.toThrow(
			'Invalid pagination cursor',
		);
	});

	describe('category', () => {
		beforeEach(() => {
			workflowReviewInboxRepository.findRequests.mockResolvedValue([]);
			workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
				new Map(),
			);
		});

		it.each(['authored', 'waiting'] as const)(
			'passes category %s through with the requesting user',
			async (category) => {
				mockVisibility();

				await service.listForInbox(user, { limit: 15, category });

				expect(workflowReviewInboxRepository.findRequests).toHaveBeenCalledWith(
					expect.objectContaining({ category: { userId: 'user-1', category } }),
				);
			},
		);

		it('derives the user from the request, never from the query', async () => {
			mockVisibility();
			const otherUser = mock<User>({ id: 'user-2', role: { slug: 'global:member', scopes: [] } });

			await service.listForInbox(otherUser, { limit: 15, category: 'authored' });

			expect(workflowReviewInboxRepository.findRequests).toHaveBeenCalledWith(
				expect.objectContaining({ category: { userId: 'user-2', category: 'authored' } }),
			);
		});

		it('leaves the query unfiltered when the category is omitted', async () => {
			mockVisibility();

			await service.listForInbox(user, { limit: 15 });

			expect(workflowReviewInboxRepository.findRequests).toHaveBeenCalledWith(
				expect.objectContaining({ category: undefined }),
			);
		});
	});
});
