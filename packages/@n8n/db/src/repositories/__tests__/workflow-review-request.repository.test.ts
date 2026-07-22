import { Container } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewRequest } from '../../entities/workflow-review-request.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestRepository } from '../workflow-review-request.repository';

describe('WorkflowReviewRequestRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequest);
	const repo = Container.get(WorkflowReviewRequestRepository);

	beforeEach(() => {
		vi.resetAllMocks();
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
			queryBuilder.where.mockReturnThis();
			queryBuilder.andWhere.mockReturnThis();
			queryBuilder.orderBy.mockReturnThis();
			queryBuilder.skip.mockReturnThis();
			queryBuilder.take.mockReturnThis();
			queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
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
			queryBuilder.getManyAndCount.mockResolvedValue([rows, 5]);

			const [data, count] = await repo.findRequestsForWorkflow('workflow-1', {
				skip: 1,
				take: 1,
			});

			expect(queryBuilder.skip).toHaveBeenCalledWith(1);
			expect(queryBuilder.take).toHaveBeenCalledWith(1);
			expect(data).toEqual(rows);
			expect(count).toBe(5);
		});

		it('applies skip and take when they are zero', async () => {
			await repo.findRequestsForWorkflow('workflow-1', { skip: 0, take: 0 });

			expect(queryBuilder.skip).toHaveBeenCalledWith(0);
			expect(queryBuilder.take).toHaveBeenCalledWith(0);
		});
	});
});
