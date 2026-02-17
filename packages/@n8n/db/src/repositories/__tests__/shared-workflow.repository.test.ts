import { Container } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { SharedWorkflow } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { SharedWorkflowRepository } from '../shared-workflow.repository';

describe('SharedWorkflowRepository', () => {
	mockEntityManager(SharedWorkflow);
	const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);

	let queryBuilder: jest.Mocked<SelectQueryBuilder<SharedWorkflow>>;

	beforeEach(() => {
		jest.resetAllMocks();

		queryBuilder = mock<SelectQueryBuilder<SharedWorkflow>>();
		queryBuilder.where.mockReturnThis();
		queryBuilder.andWhere.mockReturnThis();
		queryBuilder.innerJoin.mockReturnThis();
		queryBuilder.select.mockReturnThis();

		jest.spyOn(sharedWorkflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
	});

	describe('getSharedPersonalWorkflowsCount', () => {
		it('should return count with correct joins and filters', async () => {
			queryBuilder.getCount.mockResolvedValue(5);

			const result = await sharedWorkflowRepository.getSharedPersonalWorkflowsCount();

			expect(result).toBe(5);
			expect(sharedWorkflowRepository.createQueryBuilder).toHaveBeenCalledWith('sw');
			expect(queryBuilder.innerJoin).toHaveBeenCalledWith('sw.project', 'project');
			expect(queryBuilder.where).toHaveBeenCalledWith('sw.role = :role', {
				role: 'workflow:owner',
			});
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('project.type = :type', {
				type: 'personal',
			});
			// EXISTS subquery callback
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.any(Function));
			expect(queryBuilder.getCount).toHaveBeenCalled();
		});

		it('should return 0 when no shared workflows exist', async () => {
			queryBuilder.getCount.mockResolvedValue(0);

			const result = await sharedWorkflowRepository.getSharedPersonalWorkflowsCount();

			expect(result).toBe(0);
		});

		it('should return correct count for multiple shared workflows', async () => {
			queryBuilder.getCount.mockResolvedValue(12);

			const result = await sharedWorkflowRepository.getSharedPersonalWorkflowsCount();

			expect(result).toBe(12);
		});
	});
});
