import { Container } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewRequestWorkflow } from '../../entities/workflow-review-request-workflow.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestWorkflowRepository } from '../workflow-review-request-workflow.repository';

describe('WorkflowReviewRequestWorkflowRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequestWorkflow);
	const repo = Container.get(WorkflowReviewRequestWorkflowRepository);

	let queryBuilder: Mocked<SelectQueryBuilder<WorkflowReviewRequestWorkflow>>;

	beforeEach(() => {
		vi.resetAllMocks();

		queryBuilder = mock<SelectQueryBuilder<WorkflowReviewRequestWorkflow>>();
		queryBuilder.select.mockReturnThis();
		queryBuilder.addSelect.mockReturnThis();
		queryBuilder.where.mockReturnThis();
		queryBuilder.getRawMany.mockResolvedValue([]);

		vi.spyOn(repo, 'createQueryBuilder').mockReturnValue(queryBuilder);
	});

	describe('createWorkflowRow', () => {
		it('persists a child row with the pinned workflow version', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestWorkflow,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createWorkflowRow({
				id: 'child-1',
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'child-1',
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
			});
		});

		it('allows a null workflowVersionId for future git-backed reviews', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestWorkflow,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createWorkflowRow({
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				workflowVersionId: null,
			});
		});
	});

	describe('findReviewedVersionIdsByRequestIds', () => {
		it('returns an empty map without querying for an empty request list', async () => {
			const result = await repo.findReviewedVersionIdsByRequestIds([]);

			expect(result.size).toBe(0);
			expect(repo.createQueryBuilder).not.toHaveBeenCalled();
		});

		it('maps request ids to their reviewed workflow version ids', async () => {
			queryBuilder.getRawMany.mockResolvedValueOnce([
				{ requestId: 'req-1', reviewedVersionId: 'ver-1' },
				{ requestId: 'req-2', reviewedVersionId: null },
			]);

			const result = await repo.findReviewedVersionIdsByRequestIds(['req-1', 'req-2']);

			expect(repo.createQueryBuilder).toHaveBeenCalledWith('wrw');
			expect(queryBuilder.select).toHaveBeenCalledWith('wrw.workflowReviewRequestId', 'requestId');
			expect(queryBuilder.addSelect).toHaveBeenCalledWith(
				'wrw.workflowVersionId',
				'reviewedVersionId',
			);
			expect(queryBuilder.where).toHaveBeenCalledWith(
				'wrw.workflowReviewRequestId IN (:...requestIds)',
				{ requestIds: ['req-1', 'req-2'] },
			);
			expect(result).toEqual(
				new Map([
					['req-1', 'ver-1'],
					['req-2', null],
				]),
			);
		});
	});
});
