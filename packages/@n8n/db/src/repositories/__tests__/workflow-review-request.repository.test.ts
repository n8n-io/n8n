import { Container } from '@n8n/di';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { SharedWorkflow } from '../../entities/shared-workflow';
import { WorkflowReviewRequestAuthor } from '../../entities/workflow-review-request-author.ee';
import { WorkflowReviewRequestReviewer } from '../../entities/workflow-review-request-reviewer.ee';
import { WorkflowReviewRequestWorkflow } from '../../entities/workflow-review-request-workflow.ee';
import { WorkflowReviewRequest } from '../../entities/workflow-review-request.ee';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import {
	WorkflowReviewRequestRepository,
	type InboxVisibility,
} from '../workflow-review-request.repository';

/** Stand-ins for the SQL TypeORM would render for the correlated junction subqueries. */
const AUTHOR_SUBQUERY_SQL = '(SELECT 1 FROM workflow_review_request_authors author WHERE ...)';
const REVIEWER_SUBQUERY_SQL =
	'(SELECT 1 FROM workflow_review_request_reviewers reviewer WHERE ...)';
const LINK_SUBQUERY_SQL = '(SELECT 1 FROM workflow_review_request_workflows link WHERE ...)';
const SHARED_SUBQUERY_SQL = '(SELECT 1 FROM shared_workflow shared WHERE ...)';

/** The workflow-readability half the visibility predicate always appends. */
const READABLE_WORKFLOW_SQL = `(NOT EXISTS ${LINK_SUBQUERY_SQL} OR EXISTS ${SHARED_SUBQUERY_SQL})`;
const PARTICIPANT_SQL = `(EXISTS ${AUTHOR_SUBQUERY_SQL} OR EXISTS ${REVIEWER_SUBQUERY_SQL})`;

const DEFAULT_WORKFLOW_ROLES = ['workflow:owner', 'workflow:editor'];

const SUBQUERY_SQL_BY_ENTITY = new Map<unknown, string>([
	[WorkflowReviewRequestAuthor, AUTHOR_SUBQUERY_SQL],
	[WorkflowReviewRequestReviewer, REVIEWER_SUBQUERY_SQL],
	[WorkflowReviewRequestWorkflow, LINK_SUBQUERY_SQL],
	[SharedWorkflow, SHARED_SUBQUERY_SQL],
]);

const allVisibility: InboxVisibility = { scope: 'all' };

function involvedVisibility(
	overrides: Partial<Extract<InboxVisibility, { scope: 'involved' }>> = {},
): InboxVisibility {
	return {
		scope: 'involved',
		userId: 'user-1',
		adminProjectIds: [],
		readableProjectIds: ['proj-1'],
		readableWorkflowRoles: DEFAULT_WORKFLOW_ROLES,
		...overrides,
	};
}

describe('WorkflowReviewRequestRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequest);
	const repo = Container.get(WorkflowReviewRequestRepository);

	let queryBuilder: Mocked<SelectQueryBuilder<WorkflowReviewRequest>>;
	let subQueryBuilders: Array<Mocked<SelectQueryBuilder<WorkflowReviewRequestAuthor>>>;

	beforeEach(() => {
		vi.resetAllMocks();

		subQueryBuilders = [];

		queryBuilder = mock<SelectQueryBuilder<WorkflowReviewRequest>>();
		// Each subQuery() call yields a fresh builder whose rendered SQL names the
		// junction table it was built from, so assertions can tell them apart.
		queryBuilder.subQuery.mockImplementation(() => {
			const subQueryBuilder = mock<SelectQueryBuilder<WorkflowReviewRequestAuthor>>();
			subQueryBuilder.select.mockReturnThis();
			subQueryBuilder.where.mockReturnThis();
			subQueryBuilder.andWhere.mockReturnThis();
			subQueryBuilder.innerJoin.mockReturnThis();
			let renderedSql = '';
			subQueryBuilder.from.mockImplementation((entity) => {
				renderedSql = SUBQUERY_SQL_BY_ENTITY.get(entity) ?? '(SELECT 1 FROM unknown WHERE ...)';
				return subQueryBuilder;
			});
			subQueryBuilder.getQuery.mockImplementation(() => renderedSql);
			subQueryBuilders.push(subQueryBuilder);
			return subQueryBuilder as unknown as SelectQueryBuilder<WorkflowReviewRequest>;
		});
		queryBuilder.where.mockReturnThis();
		queryBuilder.andWhere.mockReturnThis();
		queryBuilder.orderBy.mockReturnThis();
		queryBuilder.addOrderBy.mockReturnThis();
		queryBuilder.select.mockReturnThis();
		queryBuilder.addSelect.mockReturnThis();
		queryBuilder.groupBy.mockReturnThis();
		queryBuilder.take.mockReturnThis();
		queryBuilder.limit.mockReturnThis();
		queryBuilder.getMany.mockResolvedValue([]);
		queryBuilder.getRawMany.mockResolvedValue([]);

		vi.spyOn(repo, 'createQueryBuilder').mockReturnValue(queryBuilder);
	});

	describe('createRequest', () => {
		it('persists an open pending request with audit fields initialised', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequest,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createRequest(
				{
					id: 'req-1',
					projectId: 'proj-1',
					title: 'Review title',
					description: 'Optional description',
					createdById: 'user-1',
				},
				{},
			);

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'req-1',
				projectId: 'proj-1',
				state: 'open',
				decision: 'pending',
				title: 'Review title',
				description: 'Optional description',
				createdById: 'user-1',
				updatedById: 'user-1',
				closedById: null,
				approvedAt: null,
			});
		});

		it('uses the explicit updatedById when provided', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequest,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createRequest(
				{
					projectId: 'proj-1',
					title: 'Review title',
					createdById: 'user-1',
					updatedById: 'user-2',
				},
				{},
			);

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				updatedById: 'user-2',
			});
		});
	});

	describe('findRequestsForWorkflow', () => {
		let queryBuilder: Mocked<SelectQueryBuilder<WorkflowReviewRequest>>;

		beforeEach(() => {
			queryBuilder = mock<SelectQueryBuilder<WorkflowReviewRequest>>();
			queryBuilder.innerJoin.mockReturnThis();
			queryBuilder.addSelect.mockReturnThis();
			queryBuilder.where.mockReturnThis();
			queryBuilder.andWhere.mockReturnThis();
			queryBuilder.orderBy.mockReturnThis();
			queryBuilder.addOrderBy.mockReturnThis();
			queryBuilder.skip.mockReturnThis();
			queryBuilder.take.mockReturnThis();
			queryBuilder.getRawAndEntities.mockResolvedValue({ entities: [], raw: [] });
			queryBuilder.getCount.mockResolvedValue(0);
			(entityManager.createQueryBuilder as Mock).mockReturnValue(queryBuilder);
		});

		it('scopes to the requested workflow and orders newest first, ties broken by id', async () => {
			await repo.findRequestsForWorkflow('workflow-1');

			expect(queryBuilder.where).toHaveBeenCalledWith('requestWorkflow.workflowId = :workflowId', {
				workflowId: 'workflow-1',
			});
			expect(queryBuilder.orderBy).toHaveBeenCalledWith('request.createdAt', 'DESC');
			expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('request.id', 'DESC');
			expect(queryBuilder.andWhere).not.toHaveBeenCalled();
			expect(queryBuilder.skip).not.toHaveBeenCalled();
			expect(queryBuilder.take).not.toHaveBeenCalled();
		});

		it.each(['open', 'closed'] as const)('narrows to state %s when given', async (state) => {
			await repo.findRequestsForWorkflow('workflow-1', { state });

			expect(queryBuilder.andWhere).toHaveBeenCalledWith('request.state = :state', { state });
		});

		it('applies skip and take while returning the total match count', async () => {
			const rows = [mock<WorkflowReviewRequest>({ id: 'req-2' })];
			queryBuilder.getRawAndEntities.mockResolvedValue({
				entities: rows,
				raw: [{ request_id: 'req-2', pinnedWorkflowVersionId: 'ver-2' }],
			});
			queryBuilder.getCount.mockResolvedValue(5);

			const [data, count] = await repo.findRequestsForWorkflow('workflow-1', {
				skip: 1,
				take: 1,
			});

			expect(queryBuilder.skip).toHaveBeenCalledWith(1);
			expect(queryBuilder.take).toHaveBeenCalledWith(1);
			expect(data).toHaveLength(1);
			expect(data[0]).toMatchObject({ id: 'req-2', workflowVersionId: 'ver-2' });
			expect(count).toBe(5);
		});

		it('projects the fields the workflow-scoped use case needs', async () => {
			queryBuilder.getRawAndEntities.mockResolvedValue({
				// A real entity, not a mock: `mock<T>()` proxies Date fields
				entities: [
					Object.assign(new WorkflowReviewRequest(), {
						id: 'req-1',
						state: 'open',
						decision: 'changes_requested',
						// The reviewer who last decided — resolved into the decision actor
						updatedById: 'user-2',
						createdAt: new Date('2026-07-20T10:00:00.000Z'),
						updatedAt: new Date('2026-07-21T10:00:00.000Z'),
					}),
				],
				raw: [{ request_id: 'req-1', pinnedWorkflowVersionId: 'ver-1' }],
			});

			const [data] = await repo.findRequestsForWorkflow('workflow-1');

			expect(data[0]).toEqual({
				id: 'req-1',
				state: 'open',
				decision: 'changes_requested',
				updatedById: 'user-2',
				workflowVersionId: 'ver-1',
				createdAt: new Date('2026-07-20T10:00:00.000Z'),
				updatedAt: new Date('2026-07-21T10:00:00.000Z'),
			});
		});

		it('applies skip and take when they are zero', async () => {
			await repo.findRequestsForWorkflow('workflow-1', { skip: 0, take: 0 });

			expect(queryBuilder.skip).toHaveBeenCalledWith(0);
			expect(queryBuilder.take).toHaveBeenCalledWith(0);
		});

		it('enriches each request with the pinned version, keyed by request id', async () => {
			queryBuilder.getRawAndEntities.mockResolvedValue({
				entities: [
					mock<WorkflowReviewRequest>({ id: 'req-1' }),
					mock<WorkflowReviewRequest>({ id: 'req-2' }),
				],
				raw: [
					{ request_id: 'req-1', pinnedWorkflowVersionId: 'ver-1' },
					{ request_id: 'req-2', pinnedWorkflowVersionId: null },
				],
			});
			queryBuilder.getCount.mockResolvedValue(2);

			const [data] = await repo.findRequestsForWorkflow('workflow-1');

			expect(queryBuilder.addSelect).toHaveBeenCalledWith(
				'requestWorkflow.workflowVersionId',
				'pinnedWorkflowVersionId',
			);
			expect(data[0]).toMatchObject({ id: 'req-1', workflowVersionId: 'ver-1' });
			expect(data[1]).toMatchObject({ id: 'req-2', workflowVersionId: null });
		});
	});

	describe('findOpenRequestsForWorkflows', () => {
		let queryBuilder: Mocked<SelectQueryBuilder<WorkflowReviewRequest>>;

		beforeEach(() => {
			queryBuilder = mock<SelectQueryBuilder<WorkflowReviewRequest>>();
			queryBuilder.innerJoin.mockReturnThis();
			queryBuilder.addSelect.mockReturnThis();
			queryBuilder.where.mockReturnThis();
			queryBuilder.andWhere.mockReturnThis();
			queryBuilder.getRawAndEntities.mockResolvedValue({ entities: [], raw: [] });
			(entityManager.createQueryBuilder as Mock).mockReturnValue(queryBuilder);
		});

		it('returns an empty list without querying when no workflow ids are given', async () => {
			const result = await repo.findOpenRequestsForWorkflows([], {});

			expect(result).toEqual([]);
			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
		});

		it('scopes to the given workflows and to open requests only', async () => {
			await repo.findOpenRequestsForWorkflows(['workflow-1', 'workflow-2'], {});

			expect(queryBuilder.where).toHaveBeenCalledWith(
				'requestWorkflow.workflowId IN (:...workflowIds)',
				{ workflowIds: ['workflow-1', 'workflow-2'] },
			);
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('request.state = :state', {
				state: 'open',
			});
		});

		it('maps each request to the linked workflows it was matched by, with their pins', async () => {
			queryBuilder.getRawAndEntities.mockResolvedValue({
				entities: [
					mock<WorkflowReviewRequest>({ id: 'req-1' }),
					mock<WorkflowReviewRequest>({ id: 'req-2' }),
				],
				raw: [
					{ request_id: 'req-1', linkedWorkflowId: 'workflow-1', linkedWorkflowVersionId: 'ver-1' },
					{ request_id: 'req-1', linkedWorkflowId: 'workflow-2', linkedWorkflowVersionId: null },
					{ request_id: 'req-2', linkedWorkflowId: 'workflow-2', linkedWorkflowVersionId: 'ver-2' },
				],
			});

			const result = await repo.findOpenRequestsForWorkflows(['workflow-1', 'workflow-2'], {});

			expect(queryBuilder.addSelect).toHaveBeenCalledWith(
				'requestWorkflow.workflowVersionId',
				'linkedWorkflowVersionId',
			);
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				links: [
					{ workflowId: 'workflow-1', workflowVersionId: 'ver-1' },
					{ workflowId: 'workflow-2', workflowVersionId: null },
				],
			});
			expect(result[0].request.id).toBe('req-1');
			expect(result[1]).toMatchObject({
				links: [{ workflowId: 'workflow-2', workflowVersionId: 'ver-2' }],
			});
			expect(result[1].request.id).toBe('req-2');
		});

		it("reads through the context's transaction manager", async () => {
			const transactionManager = mock<EntityManager>();
			(transactionManager.createQueryBuilder as Mock).mockReturnValue(queryBuilder);

			await repo.findOpenRequestsForWorkflows(['workflow-1'], {
				trx: new TypeOrmTransaction(transactionManager),
			});

			expect(transactionManager.createQueryBuilder).toHaveBeenCalled();
			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
		});
	});

	describe('findById', () => {
		it("reads through the context's transaction manager", async () => {
			const transactionManager = mock<EntityManager>();
			const request = mock<WorkflowReviewRequest>({ id: 'req-1' });
			transactionManager.findOne.mockResolvedValue(request);

			const result = await repo.findById('req-1', {
				trx: new TypeOrmTransaction(transactionManager),
			});

			expect(result).toBe(request);
			expect(transactionManager.findOne).toHaveBeenCalledWith(WorkflowReviewRequest, {
				where: { id: 'req-1' },
			});
			expect(entityManager.findOne).not.toHaveBeenCalled();
		});
	});

	describe('findManyForInbox', () => {
		it('skips visibility filtering entirely for the whole-inbox scope', async () => {
			const rows = [mock<WorkflowReviewRequest>({ id: 'req-1' })];
			queryBuilder.getMany.mockResolvedValueOnce(rows);

			const result = await repo.findManyForInbox({
				visibility: allVisibility,
				state: 'open',
				limit: 15,
			});

			expect(result).toBe(rows);
			expect(repo.createQueryBuilder).toHaveBeenCalledWith('review');
			expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
				expect.stringContaining('review.projectId'),
				expect.anything(),
			);
			expect(queryBuilder.orderBy).toHaveBeenCalledWith('review.createdAt', 'DESC');
			expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('review.id', 'ASC');
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('review.state = :state', {
				state: 'open',
			});
			expect(queryBuilder.take).toHaveBeenCalledWith(15);
		});

		it('matches admin projects OR involvement, always gated on a readable workflow', async () => {
			const rows = [mock<WorkflowReviewRequest>({ id: 'req-1' })];
			queryBuilder.getMany.mockResolvedValueOnce(rows);

			const result = await repo.findManyForInbox({
				visibility: involvedVisibility({
					adminProjectIds: ['admin-proj'],
					readableProjectIds: ['read-1', 'read-2'],
				}),
				limit: 15,
			});

			expect(result).toBe(rows);
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				`(review.projectId IN (:...adminProjectIds) OR ${PARTICIPANT_SQL}) AND ${READABLE_WORKFLOW_SQL}`,
				{
					adminProjectIds: ['admin-proj'],
					readableProjectIds: ['read-1', 'read-2'],
					readableWorkflowRoles: DEFAULT_WORKFLOW_ROLES,
					involvedUserId: 'user-1',
				},
			);
		});

		it('resolves workflow readability through shared_workflow, not the stored project', async () => {
			await repo.findManyForInbox({
				visibility: involvedVisibility({ readableProjectIds: ['read-1'] }),
				limit: 15,
			});

			const sharedSubQuery = subQueryBuilders.find((builder) =>
				builder.from.mock.calls.some(([entity]) => entity === SharedWorkflow),
			);
			expect(sharedSubQuery).toBeDefined();
			expect(sharedSubQuery?.innerJoin).toHaveBeenCalledWith(
				WorkflowReviewRequestWorkflow,
				'visibilityLink',
				'visibilityLink.workflowId = visibilityShared.workflowId',
			);
			expect(sharedSubQuery?.where).toHaveBeenCalledWith(
				'visibilityLink.workflowReviewRequestId = review.id',
			);
			expect(sharedSubQuery?.andWhere).toHaveBeenCalledWith(
				'visibilityShared.projectId IN (:...readableProjectIds)',
			);
		});

		it('drops the readability conjunct entirely when the caller is unrestricted', async () => {
			await repo.findManyForInbox({
				visibility: involvedVisibility({ readableProjectIds: null }),
				limit: 15,
			});

			expect(
				subQueryBuilders.some((builder) =>
					builder.from.mock.calls.some(([entity]) => entity === SharedWorkflow),
				),
			).toBe(false);
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(`(${PARTICIPANT_SQL})`, {
				involvedUserId: 'user-1',
			});
		});

		it('correlates both involvement subqueries through their entities, never literal table names', async () => {
			await repo.findManyForInbox({ visibility: involvedVisibility(), limit: 15 });

			const [authorSubQuery, reviewerSubQuery] = subQueryBuilders;
			expect(authorSubQuery.from).toHaveBeenCalledWith(
				WorkflowReviewRequestAuthor,
				'visibilityAuthor',
			);
			expect(authorSubQuery.where).toHaveBeenCalledWith(
				'visibilityAuthor.workflowReviewRequestId = review.id',
			);
			expect(authorSubQuery.andWhere).toHaveBeenCalledWith(
				'visibilityAuthor.userId = :involvedUserId',
			);
			expect(reviewerSubQuery.where).toHaveBeenCalledWith(
				'visibilityReviewer.workflowReviewRequestId = review.id',
			);
			expect(reviewerSubQuery.andWhere).toHaveBeenCalledWith(
				'visibilityReviewer.userId = :involvedUserId',
			);
		});

		it('returns nothing when no project is readable, admin projects included', async () => {
			await repo.findManyForInbox({
				visibility: involvedVisibility({ adminProjectIds: ['admin-proj'], readableProjectIds: [] }),
				limit: 15,
			});

			// An admin who can read no workflow sees no reviews either.
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('1 = 0');
		});

		it('matches nothing when the caller administers no project and can read none', async () => {
			const result = await repo.findManyForInbox({
				visibility: involvedVisibility({ adminProjectIds: [], readableProjectIds: [] }),
				limit: 15,
			});

			expect(result).toEqual([]);
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('1 = 0');
		});

		it('applies the keyset boundary carried in the cursor without an anchor lookup', async () => {
			const findOneSpy = vi.spyOn(repo, 'findOne');
			queryBuilder.getMany.mockResolvedValueOnce([]);
			const createdAt = new Date('2024-01-02T00:00:00.000Z');

			await repo.findManyForInbox({
				visibility: involvedVisibility(),
				limit: 10,
				cursor: { createdAt, id: 'req-cursor' },
			});

			expect(findOneSpy).not.toHaveBeenCalled();
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'(review.createdAt < :createdAt OR (review.createdAt = :createdAt AND review.id > :id))',
				{ createdAt, id: 'req-cursor' },
			);
		});

		describe('category filter', () => {
			it('leaves the query untouched when no category is requested', async () => {
				await repo.findManyForInbox({
					visibility: allVisibility,
					limit: 15,
				});

				expect(queryBuilder.subQuery).not.toHaveBeenCalled();
			});

			it('correlates both junction subqueries through their entities, never literal table names', async () => {
				await repo.findManyForInbox({
					visibility: allVisibility,
					category: { userId: 'user-1', category: 'authored' },
					limit: 15,
				});

				const [authorSubQuery, reviewerSubQuery] = subQueryBuilders;
				expect(authorSubQuery.select).toHaveBeenCalledWith('1');
				expect(authorSubQuery.from).toHaveBeenCalledWith(WorkflowReviewRequestAuthor, 'author');
				expect(authorSubQuery.where).toHaveBeenCalledWith(
					'author.workflowReviewRequestId = review.id',
				);
				expect(authorSubQuery.andWhere).toHaveBeenCalledWith('author.userId = :categoryUserId');
				expect(reviewerSubQuery.where).toHaveBeenCalledWith(
					'reviewer.workflowReviewRequestId = review.id',
				);
				expect(reviewerSubQuery.andWhere).toHaveBeenCalledWith('reviewer.userId = :categoryUserId');
			});

			// The requester always has an author row, so neither predicate needs
			// the nullable `createdById`.
			it('matches a non-reviewing author for the authored section', async () => {
				await repo.findManyForInbox({
					visibility: allVisibility,
					category: { userId: 'user-1', category: 'authored' },
					limit: 15,
				});

				expect(queryBuilder.andWhere).toHaveBeenCalledWith(
					`(EXISTS ${AUTHOR_SUBQUERY_SQL} AND NOT EXISTS ${REVIEWER_SUBQUERY_SQL})`,
					{ categoryUserId: 'user-1' },
				);
			});

			it('matches assigned reviewers first for the waiting section', async () => {
				await repo.findManyForInbox({
					visibility: allVisibility,
					category: { userId: 'user-1', category: 'waiting' },
					limit: 15,
				});

				expect(queryBuilder.andWhere).toHaveBeenCalledWith(
					`(EXISTS ${REVIEWER_SUBQUERY_SQL} OR NOT EXISTS ${AUTHOR_SUBQUERY_SQL})`,
					{ categoryUserId: 'user-1' },
				);
			});

			it('narrows the visibility predicate instead of replacing it', async () => {
				await repo.findManyForInbox({
					visibility: involvedVisibility(),
					category: { userId: 'user-1', category: 'waiting' },
					limit: 15,
				});

				// Visibility renders first; the category filter may only narrow what it allowed.
				const visibilityCall = queryBuilder.andWhere.mock.calls[0];
				const categoryCall = queryBuilder.andWhere.mock.calls[1];
				expect(visibilityCall[0]).toContain(READABLE_WORKFLOW_SQL);
				expect(categoryCall[0]).toContain(`NOT EXISTS ${AUTHOR_SUBQUERY_SQL}`);
			});

			it('applies the category filter before the limit and the cursor boundary', async () => {
				const createdAt = new Date('2024-01-02T00:00:00.000Z');

				await repo.findManyForInbox({
					visibility: allVisibility,
					category: { userId: 'user-1', category: 'authored' },
					state: 'open',
					limit: 15,
					cursor: { createdAt, id: 'req-cursor' },
				});

				const categoryCall = queryBuilder.andWhere.mock.invocationCallOrder[0];
				const cursorCall = queryBuilder.andWhere.mock.invocationCallOrder.at(-1);
				expect(queryBuilder.andWhere.mock.calls[0][0]).toContain('EXISTS');
				expect(categoryCall).toBeLessThan(cursorCall!);
				expect(categoryCall).toBeLessThan(queryBuilder.take.mock.invocationCallOrder[0]);
			});
		});
	});

	describe('countByStateForInbox', () => {
		it('groups by state under the involvement visibility predicate', async () => {
			queryBuilder.getRawMany.mockResolvedValueOnce([{ state: 'open', count: '2' }]);

			const result = await repo.countByStateForInbox({
				visibility: involvedVisibility({ readableProjectIds: ['proj-1', 'proj-2'] }),
			});

			expect(result).toEqual({ open: 2, closed: 0 });
			expect(repo.createQueryBuilder).toHaveBeenCalledWith('review');
			expect(queryBuilder.select).toHaveBeenCalledWith('review.state', 'state');
			expect(queryBuilder.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
			expect(queryBuilder.groupBy).toHaveBeenCalledWith('review.state');
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				`(${PARTICIPANT_SQL}) AND ${READABLE_WORKFLOW_SQL}`,
				{
					readableProjectIds: ['proj-1', 'proj-2'],
					readableWorkflowRoles: DEFAULT_WORKFLOW_ROLES,
					involvedUserId: 'user-1',
				},
			);
		});

		it('counts every review for the whole-inbox scope', async () => {
			queryBuilder.getRawMany.mockResolvedValueOnce([
				{ state: 'open', count: '3' },
				{ state: 'closed', count: '12' },
			]);

			const result = await repo.countByStateForInbox({ visibility: allVisibility });

			expect(result).toEqual({ open: 3, closed: 12 });
			expect(queryBuilder.andWhere).not.toHaveBeenCalled();
			expect(queryBuilder.groupBy).toHaveBeenCalledWith('review.state');
		});

		it('counts nothing when the caller administers no project and can read none', async () => {
			queryBuilder.getRawMany.mockResolvedValueOnce([]);

			const result = await repo.countByStateForInbox({
				visibility: involvedVisibility({ adminProjectIds: [], readableProjectIds: [] }),
			});

			expect(result).toEqual({ open: 0, closed: 0 });
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('1 = 0');
		});
	});
});
