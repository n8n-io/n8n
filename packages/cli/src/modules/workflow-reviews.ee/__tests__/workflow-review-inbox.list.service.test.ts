import { mockInstance } from '@n8n/backend-test-utils';
import { LicenseState } from '@n8n/backend-common';
import type {
	InboxVisibility,
	User,
	UserRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestReviewerRepository,
} from '@n8n/db';
import { WorkflowReviewRequestRepository, WorkflowReviewRequestWorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import type { WorkflowReviewAccessService } from '../workflow-review-access.service';
import type { WorkflowReviewEligibilityService } from '../workflow-review-eligibility.service';
import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewInboxService } from '../workflow-review-inbox.service';

describe('WorkflowReviewInboxService', () => {
	const workflowReviewPolicyService = mockInstance(WorkflowReviewPolicyService);
	const accessService = mock<WorkflowReviewAccessService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
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
			workflowFinderService,
			workflowHistoryService,
			workflowReviewRequestRepository,
			workflowReviewRequestWorkflowRepository,
			reviewerRepository,
			authorRepository,
			userRepository,
			mock<WorkflowReviewEligibilityService>(),
		);
	});

	const involvedVisibility: InboxVisibility = {
		scope: 'involved',
		userId: 'user-1',
		adminProjectIds: [],
		readableProjectIds: ['proj-1'],
		readableWorkflowRoles: ['workflow:owner', 'workflow:editor'],
	};

	describe('listForInbox', () => {
		function mockVisibility(visibility: InboxVisibility = involvedVisibility) {
			accessService.resolveInboxVisibility.mockResolvedValueOnce(visibility);
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
			workflowReviewRequestRepository.findManyForInbox.mockResolvedValue(rows);
			workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
				new Map([['req-2', { workflowName: 'Linked workflow', workflowVersionId: 'ver-2' }]]),
			);

			const result = await service.listForInbox(user, { limit: 1 });

			expect(workflowReviewRequestRepository.findManyForInbox).toHaveBeenCalledWith({
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
			expect(authorRepository.findByRequestIds).toHaveBeenCalledWith(['req-2']);
			expect(reviewerRepository.findByRequestIds).toHaveBeenCalledWith(['req-2']);
		});

		it('decodes the incoming cursor into a keyset boundary', async () => {
			mockVisibility();
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
			mockVisibility();
			const cursor = Buffer.from('not-a-valid-cursor', 'utf8').toString('base64url');

			await expect(service.listForInbox(user, { limit: 15, cursor })).rejects.toThrow(
				'Invalid pagination cursor',
			);
		});

		describe('category', () => {
			beforeEach(() => {
				workflowReviewRequestRepository.findManyForInbox.mockResolvedValue([]);
				workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds.mockResolvedValue(
					new Map(),
				);
			});

			it.each(['authored', 'waiting'] as const)(
				'passes category %s through with the requesting user',
				async (category) => {
					mockVisibility();

					await service.listForInbox(user, { limit: 15, category });

					expect(workflowReviewRequestRepository.findManyForInbox).toHaveBeenCalledWith(
						expect.objectContaining({ category: { userId: 'user-1', category } }),
					);
				},
			);

			it('derives the user from the request, never from the query', async () => {
				mockVisibility();
				const otherUser = mock<User>({ id: 'user-2', role: { slug: 'global:member', scopes: [] } });

				await service.listForInbox(otherUser, { limit: 15, category: 'authored' });

				expect(workflowReviewRequestRepository.findManyForInbox).toHaveBeenCalledWith(
					expect.objectContaining({ category: { userId: 'user-2', category: 'authored' } }),
				);
			});

			it('leaves the query unfiltered when the category is omitted', async () => {
				mockVisibility();

				await service.listForInbox(user, { limit: 15 });

				expect(workflowReviewRequestRepository.findManyForInbox).toHaveBeenCalledWith(
					expect.objectContaining({ category: undefined }),
				);
			});
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
			accessService.resolveInboxVisibility.mockResolvedValue(involvedVisibility);
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

	describe('getStatusesForWorkflows', () => {
		const openRequest = (id: string, projectId = 'proj-1') =>
			mock<WorkflowReviewRequest>({
				id,
				projectId,
				state: 'open',
				decision: 'pending',
				createdAt: new Date('2024-01-01T00:00:00.000Z'),
				updatedAt: new Date('2024-01-02T00:00:00.000Z'),
			});

		beforeEach(() => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());
			workflowReviewRequestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);
			accessService.resolveOpenableRequestIds.mockResolvedValue(new Set());
		});

		it('returns every requested id as null when nothing is readable, without querying reviews for them', async () => {
			workflowReviewRequestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{ request: openRequest('req-x'), links: [] },
			]);

			const { data } = await service.getStatusesForWorkflows(user, {
				workflowIds: ['wf-1', 'wf-2'],
			});

			expect(data).toEqual({ 'wf-1': null, 'wf-2': null });
			// Only the readable subset is ever sent to the review repository
			expect(
				workflowReviewRequestRepository.findOpenRequestsForWorkflows,
			).toHaveBeenCalledExactlyOnceWith([], {});
		});

		it('returns the open review summary for a readable workflow, openable or not', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-1', 'wf-2']),
			);
			workflowReviewRequestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{
					request: openRequest('req-1'),
					links: [{ workflowId: 'wf-1', workflowVersionId: 'ver-1' }],
				},
			]);

			const { data } = await service.getStatusesForWorkflows(user, {
				workflowIds: ['wf-1', 'wf-2'],
			});

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
				['wf-1', 'wf-2'],
				user,
				['workflow:read'],
			);
			expect(data['wf-1']).toEqual({
				summary: {
					id: 'req-1',
					state: 'open',
					decision: 'pending',
					workflowVersionId: 'ver-1',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				},
				viewerCanOpen: false,
			});
			expect(data['wf-2']).toBeNull();
		});

		it('marks the review openable through the shared access rule', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			workflowReviewRequestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{
					request: openRequest('req-1', 'proj-9'),
					links: [{ workflowId: 'wf-1', workflowVersionId: 'ver-1' }],
				},
			]);
			accessService.resolveOpenableRequestIds.mockResolvedValue(new Set(['req-1']));

			const { data } = await service.getStatusesForWorkflows(user, { workflowIds: ['wf-1'] });

			expect(accessService.resolveOpenableRequestIds).toHaveBeenCalledWith(user, [
				{ id: 'req-1', projectId: 'proj-9' },
			]);
			expect(data['wf-1']).toMatchObject({ viewerCanOpen: true });
		});

		it('hides an open review whose pin was pruned', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			workflowReviewRequestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{ request: openRequest('req-1'), links: [{ workflowId: 'wf-1', workflowVersionId: null }] },
			]);

			const { data } = await service.getStatusesForWorkflows(user, { workflowIds: ['wf-1'] });

			expect(data['wf-1']).toBeNull();
		});

		it('deduplicates requested ids before the readable lookup', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));

			const { data } = await service.getStatusesForWorkflows(user, {
				workflowIds: ['wf-1', 'wf-1'],
			});

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
				['wf-1'],
				user,
				['workflow:read'],
			);
			expect(data).toEqual({ 'wf-1': null });
		});
	});
});
