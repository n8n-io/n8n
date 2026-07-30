import { Container } from '@n8n/di';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewRequest } from '../../entities/workflow-review-request.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestRepository } from '../workflow-review-request.repository';

describe('WorkflowReviewRequestRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequest);
	const repo = Container.get(WorkflowReviewRequestRepository);

	let queryBuilder: Mocked<SelectQueryBuilder<WorkflowReviewRequest>>;

	beforeEach(() => {
		vi.resetAllMocks();

		queryBuilder = mock<SelectQueryBuilder<WorkflowReviewRequest>>();
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

			await repo.createRequest({
				id: 'req-1',
				projectId: 'proj-1',
				title: 'Review title',
				description: 'Optional description',
				createdById: 'user-1',
			});

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

			await repo.createRequest({
				projectId: 'proj-1',
				title: 'Review title',
				createdById: 'user-1',
				updatedById: 'user-2',
			});

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
			queryBuilder.skip.mockReturnThis();
			queryBuilder.take.mockReturnThis();
			queryBuilder.getRawAndEntities.mockResolvedValue({ entities: [], raw: [] });
			queryBuilder.getCount.mockResolvedValue(0);
			(entityManager.createQueryBuilder as Mock).mockReturnValue(queryBuilder);
		});

		it('scopes to the requested workflow and orders by createdAt DESC', async () => {
			await repo.findRequestsForWorkflow('workflow-1');

			expect(queryBuilder.where).toHaveBeenCalledWith('requestWorkflow.workflowId = :workflowId', {
				workflowId: 'workflow-1',
			});
			expect(queryBuilder.orderBy).toHaveBeenCalledWith('request.createdAt', 'DESC');
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

	describe('findById', () => {
		it('reads through the provided transaction manager', async () => {
			const trx = mock<EntityManager>();
			const request = mock<WorkflowReviewRequest>({ id: 'req-1' });
			trx.findOne.mockResolvedValue(request);

			const result = await repo.findById('req-1', trx);

			expect(result).toBe(request);
			expect(trx.findOne).toHaveBeenCalledWith(WorkflowReviewRequest, { where: { id: 'req-1' } });
			expect(entityManager.findOne).not.toHaveBeenCalled();
		});
	});

	describe('findManyForInbox', () => {
		it('filters by requester only when projectIds is empty', async () => {
			const rows = [mock<WorkflowReviewRequest>({ id: 'req-1' })];
			queryBuilder.getMany.mockResolvedValueOnce(rows);

			const result = await repo.findManyForInbox({
				projectIds: [],
				requesterId: 'user-1',
				limit: 15,
			});

			expect(result).toBe(rows);
			expect(repo.createQueryBuilder).toHaveBeenCalledWith('review');
			expect(queryBuilder.where).toHaveBeenCalledWith('review.createdById = :requesterId', {
				requesterId: 'user-1',
			});
			expect(queryBuilder.take).toHaveBeenCalledWith(15);
		});

		it('skips the projectId filter when projectIds is null', async () => {
			const rows = [mock<WorkflowReviewRequest>({ id: 'req-1' })];
			queryBuilder.getMany.mockResolvedValueOnce(rows);

			const result = await repo.findManyForInbox({
				projectIds: null,
				requesterId: 'user-1',
				state: 'open',
				limit: 15,
			});

			expect(result).toBe(rows);
			expect(repo.createQueryBuilder).toHaveBeenCalledWith('review');
			expect(queryBuilder.where).not.toHaveBeenCalled();
			expect(queryBuilder.orderBy).toHaveBeenCalledWith('review.createdAt', 'DESC');
			expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('review.id', 'ASC');
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('review.state = :state', {
				state: 'open',
			});
			expect(queryBuilder.take).toHaveBeenCalledWith(15);
		});

		it('matches projects OR the requester, filtering by state and ordering newest first', async () => {
			const rows = [mock<WorkflowReviewRequest>({ id: 'req-1' })];
			queryBuilder.getMany.mockResolvedValueOnce(rows);

			const result = await repo.findManyForInbox({
				projectIds: ['proj-1', 'proj-2'],
				requesterId: 'user-1',
				state: 'open',
				limit: 15,
			});

			expect(result).toBe(rows);
			expect(repo.createQueryBuilder).toHaveBeenCalledWith('review');
			expect(queryBuilder.where).toHaveBeenCalledWith(
				'(review.projectId IN (:...projectIds) OR review.createdById = :requesterId)',
				{ projectIds: ['proj-1', 'proj-2'], requesterId: 'user-1' },
			);
			expect(queryBuilder.orderBy).toHaveBeenCalledWith('review.createdAt', 'DESC');
			expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('review.id', 'ASC');
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('review.state = :state', {
				state: 'open',
			});
			expect(queryBuilder.take).toHaveBeenCalledWith(15);
		});

		it('applies the keyset boundary carried in the cursor without an anchor lookup', async () => {
			const findOneSpy = vi.spyOn(repo, 'findOne');
			queryBuilder.getMany.mockResolvedValueOnce([]);
			const createdAt = new Date('2024-01-02T00:00:00.000Z');

			await repo.findManyForInbox({
				projectIds: ['proj-1'],
				requesterId: 'user-1',
				limit: 10,
				cursor: { createdAt, id: 'req-cursor' },
			});

			expect(findOneSpy).not.toHaveBeenCalled();
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'(review.createdAt < :createdAt OR (review.createdAt = :createdAt AND review.id > :id))',
				{ createdAt, id: 'req-cursor' },
			);
		});
	});

	describe('countByStateForInbox', () => {
		it('groups by state applying the requester-only filter when projectIds is empty', async () => {
			queryBuilder.getRawMany.mockResolvedValueOnce([{ state: 'open', count: '2' }]);

			const result = await repo.countByStateForInbox({ projectIds: [], requesterId: 'user-1' });

			expect(result).toEqual({ open: 2, closed: 0 });
			expect(repo.createQueryBuilder).toHaveBeenCalledWith('review');
			expect(queryBuilder.select).toHaveBeenCalledWith('review.state', 'state');
			expect(queryBuilder.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
			expect(queryBuilder.groupBy).toHaveBeenCalledWith('review.state');
			expect(queryBuilder.where).toHaveBeenCalledWith('review.createdById = :requesterId', {
				requesterId: 'user-1',
			});
		});

		it('skips the projectId filter when projectIds is null (global scope counts all)', async () => {
			queryBuilder.getRawMany.mockResolvedValueOnce([
				{ state: 'open', count: '3' },
				{ state: 'closed', count: '12' },
			]);

			const result = await repo.countByStateForInbox({ projectIds: null, requesterId: 'user-1' });

			expect(result).toEqual({ open: 3, closed: 12 });
			expect(queryBuilder.where).not.toHaveBeenCalled();
			expect(queryBuilder.groupBy).toHaveBeenCalledWith('review.state');
		});

		it('matches projects OR the requester', async () => {
			queryBuilder.getRawMany.mockResolvedValueOnce([
				{ state: 'open', count: 1 },
				{ state: 'closed', count: 4 },
			]);

			const result = await repo.countByStateForInbox({
				projectIds: ['proj-1', 'proj-2'],
				requesterId: 'user-1',
			});

			expect(result).toEqual({ open: 1, closed: 4 });
			expect(queryBuilder.where).toHaveBeenCalledWith(
				'(review.projectId IN (:...projectIds) OR review.createdById = :requesterId)',
				{ projectIds: ['proj-1', 'proj-2'], requesterId: 'user-1' },
			);
		});

		it('defaults absent states to zero', async () => {
			queryBuilder.getRawMany.mockResolvedValueOnce([]);

			const result = await repo.countByStateForInbox({
				projectIds: ['proj-1'],
				requesterId: 'user-1',
			});

			expect(result).toEqual({ open: 0, closed: 0 });
		});
	});
});
