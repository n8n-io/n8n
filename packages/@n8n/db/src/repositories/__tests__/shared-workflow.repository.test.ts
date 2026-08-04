import { Container } from '@n8n/di';
import { In, type SelectQueryBuilder } from '@n8n/typeorm';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Project } from '../../entities';
import { SharedWorkflow } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { SharedWorkflowRepository } from '../shared-workflow.repository';

describe('SharedWorkflowRepository', () => {
	const entityManager = mockEntityManager(SharedWorkflow);
	const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);

	let queryBuilder: Mocked<SelectQueryBuilder<SharedWorkflow>>;

	beforeEach(() => {
		vi.resetAllMocks();

		queryBuilder = mock<SelectQueryBuilder<SharedWorkflow>>();
		queryBuilder.where.mockReturnThis();
		queryBuilder.andWhere.mockReturnThis();
		queryBuilder.innerJoin.mockReturnThis();
		queryBuilder.select.mockReturnThis();

		vi.spyOn(sharedWorkflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
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

	describe('findOwnerProjectsByWorkflowIds', () => {
		it('should map each workflow id to its owner project', async () => {
			const projectA = mock<Project>({ id: 'project-a' });
			const projectB = mock<Project>({ id: 'project-b' });
			entityManager.find.mockResolvedValue([
				{ workflowId: 'wf-1', project: projectA },
				{ workflowId: 'wf-2', project: projectB },
			] as unknown as SharedWorkflow[]);

			const result = await sharedWorkflowRepository.findOwnerProjectsByWorkflowIds([
				'wf-1',
				'wf-2',
			]);

			expect(entityManager.find).toHaveBeenCalledWith(SharedWorkflow, {
				where: { workflowId: In(['wf-1', 'wf-2']), role: 'workflow:owner' },
				relations: { project: true },
			});
			expect(result).toEqual(
				new Map([
					['wf-1', projectA],
					['wf-2', projectB],
				]),
			);
		});

		it('should return an empty map when no owner rows are found', async () => {
			entityManager.find.mockResolvedValue([]);

			const result = await sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(['wf-1']);

			expect(result).toEqual(new Map());
		});
	});
});
