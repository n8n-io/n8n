import { mockInstance } from '@n8n/backend-test-utils';
import { LicenseState } from '@n8n/backend-common';
import type {
	User,
	UserRepository,
	WorkflowPublishedVersionRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestReviewerRepository,
} from '@n8n/db';
import { WorkflowReviewRequestRepository, WorkflowReviewRequestWorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import type { WorkflowReviewAccessService } from '../workflow-review-access.service';
import type { WorkflowReviewEligibilityService } from '../workflow-review-eligibility.service';
import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewInboxService } from '../workflow-review-inbox.service';

describe('WorkflowReviewInboxService', () => {
	const workflowReviewPolicyService = mockInstance(WorkflowReviewPolicyService);
	const accessService = mock<WorkflowReviewAccessService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const publishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const workflowReviewRequestRepository = mockInstance(WorkflowReviewRequestRepository);
	const workflowReviewRequestWorkflowRepository = mockInstance(
		WorkflowReviewRequestWorkflowRepository,
	);
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const userRepository = mock<UserRepository>();
	const licenseState = mockInstance(LicenseState);

	let service: WorkflowReviewInboxService;

	const user = mock<User>({ id: 'user-1', role: { slug: 'global:member', scopes: [] } });

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		reviewerRepository.findByRequestIds.mockResolvedValue([]);
		authorRepository.findByRequestIds.mockResolvedValue([]);
		userRepository.findManyByIds.mockResolvedValue([]);

		service = new WorkflowReviewInboxService(
			new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
			accessService,
			workflowHistoryService,
			publishedVersionRepository,
			workflowReviewRequestRepository,
			workflowReviewRequestWorkflowRepository,
			reviewerRepository,
			authorRepository,
			userRepository,
			mock<WorkflowReviewEligibilityService>(),
		);
	});

	describe('listForInbox', () => {
		function mockAccessibleProjects(projectIds: string[] = ['proj-1']) {
			accessService.resolveAccessibleProjectIds.mockResolvedValueOnce(projectIds);
		}

		it('returns paginated data with hasMore and nextCursor', async () => {
			mockAccessibleProjects();
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
			workflowReviewRequestRepository.findManyForInbox.mockResolvedValue(rows);
			workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
				new Map([['req-2', { workflowName: 'Linked workflow', workflowVersionId: 'ver-2' }]]),
			);

			const result = await service.listForInbox(user, { limit: 1 });

			expect(workflowReviewRequestRepository.findManyForInbox).toHaveBeenCalledWith({
				projectIds: ['proj-1'],
				requesterId: 'user-1',
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
			expect(authorRepository.findByRequestIds).toHaveBeenCalledWith(['req-2']);
			expect(reviewerRepository.findByRequestIds).toHaveBeenCalledWith(['req-2']);
		});

		it('decodes the incoming cursor into a keyset boundary', async () => {
			mockAccessibleProjects();
			workflowReviewRequestRepository.findManyForInbox.mockResolvedValue([]);
			workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
				new Map(),
			);
			const cursor = Buffer.from('2024-01-02T00:00:00.000Z|req-2', 'utf8').toString('base64url');

			await service.listForInbox(user, { limit: 15, cursor });

			expect(workflowReviewRequestRepository.findManyForInbox).toHaveBeenCalledWith(
				expect.objectContaining({
					cursor: { createdAt: new Date('2024-01-02T00:00:00.000Z'), id: 'req-2' },
				}),
			);
		});

		it('rejects a malformed cursor', async () => {
			mockAccessibleProjects();
			const cursor = Buffer.from('not-a-valid-cursor', 'utf8').toString('base64url');

			await expect(service.listForInbox(user, { limit: 15, cursor })).rejects.toThrow(
				'Invalid pagination cursor',
			);
		});
	});
	describe('participants on inbox items', () => {
		const inboxRow = mock<WorkflowReviewRequest>({
			id: 'req-1',
			projectId: 'proj-1',
			title: 'First',
			decision: 'pending',
			state: 'open',
			createdById: 'requester-1',
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
			updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		});

		function mockUsers(...ids: string[]) {
			userRepository.findManyByIds.mockResolvedValue(
				ids.map((id) =>
					mock<User>({ id, email: `${id}@example.com`, firstName: id, lastName: id }),
				),
			);
		}

		beforeEach(() => {
			accessService.resolveAccessibleProjectIds.mockResolvedValue(['proj-1']);
			workflowReviewRequestRepository.findManyForInbox.mockResolvedValue([inboxRow]);
			workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
				new Map(),
			);
		});

		it('returns the requester, every author, and the reviewers', async () => {
			authorRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: 'req-1', userId: 'requester-1' }),
				mock({ workflowReviewRequestId: 'req-1', userId: 'author-2' }),
			]);
			reviewerRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: 'req-1', userId: 'reviewer-1' }),
			]);
			mockUsers('requester-1', 'author-2', 'reviewer-1');

			const [item] = (await service.listForInbox(user, { limit: 15 })).data;

			expect(item?.requester).toMatchObject({ id: 'requester-1' });
			// The requester stays in `authors`; deduplication is the frontend's job.
			expect(item?.authors.map((author) => author.id)).toEqual(['requester-1', 'author-2']);
			expect(item?.reviewers.map((reviewer) => reviewer.id)).toEqual(['reviewer-1']);
		});

		it('resolves a user holding several roles with a single deduplicated lookup', async () => {
			authorRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: 'req-1', userId: 'requester-1' }),
				mock({ workflowReviewRequestId: 'req-1', userId: 'reviewer-1' }),
			]);
			reviewerRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: 'req-1', userId: 'reviewer-1' }),
			]);
			mockUsers('requester-1', 'reviewer-1');

			const [item] = (await service.listForInbox(user, { limit: 15 })).data;

			expect(userRepository.findManyByIds).toHaveBeenCalledTimes(1);
			expect(userRepository.findManyByIds).toHaveBeenCalledWith(['requester-1', 'reviewer-1']);
			expect(item?.authors.map((author) => author.id)).toEqual(['requester-1', 'reviewer-1']);
		});

		it('omits an author whose user no longer resolves, keeping the others', async () => {
			authorRepository.findByRequestIds.mockResolvedValue([
				mock({ workflowReviewRequestId: 'req-1', userId: 'requester-1' }),
				mock({ workflowReviewRequestId: 'req-1', userId: 'deleted-author' }),
			]);
			mockUsers('requester-1');

			const [item] = (await service.listForInbox(user, { limit: 15 })).data;

			expect(item?.authors.map((author) => author.id)).toEqual(['requester-1']);
		});

		it('returns no authors when the review has no author rows', async () => {
			mockUsers('requester-1');

			const [item] = (await service.listForInbox(user, { limit: 15 })).data;

			expect(item?.authors).toEqual([]);
		});
	});
});
