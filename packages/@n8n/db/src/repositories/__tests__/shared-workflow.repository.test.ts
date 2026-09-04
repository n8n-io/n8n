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

		it('merges owner projects returned from different chunks', async () => {
			const firstProject = mock<Project>({ id: 'first-project' });
			const lastProject = mock<Project>({ id: 'last-project' });
			entityManager.find
				.mockResolvedValueOnce([
					mock<SharedWorkflow>({ workflowId: 'first', project: firstProject }),
				])
				.mockResolvedValueOnce([
					mock<SharedWorkflow>({ workflowId: 'last', project: lastProject }),
				]);
			const workflowIds = Array.from({ length: 10_001 }, (_, index) => `workflow-${index}`);

			const result = await sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);

			expect(entityManager.find).toHaveBeenCalledTimes(2);
			expect(result).toEqual(
				new Map([
					['first', firstProject],
					['last', lastProject],
				]),
			);
		});
	});

	describe('findByWorkflowIds', () => {
		it('merges owner rows returned from different chunks', async () => {
			const first = mock<SharedWorkflow>({ workflowId: 'first' });
			const last = mock<SharedWorkflow>({ workflowId: 'last' });
			entityManager.find.mockResolvedValueOnce([first]).mockResolvedValueOnce([last]);
			const workflowIds = Array.from({ length: 10_001 }, (_, index) => `workflow-${index}`);

			const result = await sharedWorkflowRepository.findByWorkflowIds(workflowIds);

			expect(entityManager.find).toHaveBeenCalledTimes(2);
			expect(entityManager.find).toHaveBeenNthCalledWith(2, SharedWorkflow, {
				where: {
					role: 'workflow:owner',
					workflowId: In(['workflow-10000']),
				},
				relations: { project: { projectRelations: { user: true, role: true } } },
				loadEagerRelations: false,
			});
			expect(result).toEqual([first, last]);
		});
	});

	describe('findWorkflowIdsInUserProjects', () => {
		it('returns an empty set without querying when there are no workflow ids', async () => {
			const result = await sharedWorkflowRepository.findWorkflowIdsInUserProjects([], 'user-1', [
				'project:admin',
			]);

			expect(result).toEqual(new Set());
			expect(entityManager.find).not.toHaveBeenCalled();
		});

		it('returns an empty set without querying when no project role carries the scope', async () => {
			const result = await sharedWorkflowRepository.findWorkflowIdsInUserProjects(
				['workflow-1'],
				'user-1',
				[],
			);

			expect(result).toEqual(new Set());
			expect(entityManager.find).not.toHaveBeenCalled();
		});

		it('joins through the project relation and returns each id once', async () => {
			entityManager.find.mockResolvedValueOnce([
				mock<SharedWorkflow>({ workflowId: 'workflow-1' }),
				// Same workflow reachable through two of the user's projects.
				mock<SharedWorkflow>({ workflowId: 'workflow-1' }),
				mock<SharedWorkflow>({ workflowId: 'workflow-2' }),
			]);

			const result = await sharedWorkflowRepository.findWorkflowIdsInUserProjects(
				['workflow-1', 'workflow-2', 'workflow-3'],
				'user-1',
				['project:admin', 'project:viewer'],
			);

			expect(entityManager.find).toHaveBeenCalledWith(SharedWorkflow, {
				select: { workflowId: true },
				where: {
					workflowId: In(['workflow-1', 'workflow-2', 'workflow-3']),
					project: {
						projectRelations: {
							userId: 'user-1',
							role: { slug: In(['project:admin', 'project:viewer']) },
						},
					},
				},
			});
			expect(result).toEqual(new Set(['workflow-1', 'workflow-2']));
		});

		it('chunks the workflow ids and issues one query per chunk', async () => {
			entityManager.find
				.mockResolvedValueOnce([mock<SharedWorkflow>({ workflowId: 'workflow-0' })])
				.mockResolvedValueOnce([mock<SharedWorkflow>({ workflowId: 'workflow-10000' })]);
			const workflowIds = Array.from({ length: 10_001 }, (_, index) => `workflow-${index}`);

			const result = await sharedWorkflowRepository.findWorkflowIdsInUserProjects(
				workflowIds,
				'user-1',
				['project:admin'],
			);

			expect(entityManager.find).toHaveBeenCalledTimes(2);
			expect(entityManager.find).toHaveBeenNthCalledWith(2, SharedWorkflow, {
				select: { workflowId: true },
				where: {
					workflowId: In(['workflow-10000']),
					project: {
						projectRelations: { userId: 'user-1', role: { slug: In(['project:admin']) } },
					},
				},
			});
			expect(result).toEqual(new Set(['workflow-0', 'workflow-10000']));
		});
	});
});
