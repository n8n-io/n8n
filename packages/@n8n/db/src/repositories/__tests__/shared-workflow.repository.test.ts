import { Container } from '@n8n/di';
import { In, type EntityManager, type SelectQueryBuilder } from '@n8n/typeorm';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type {
	Folder,
	Project,
	WorkflowEntity,
	WorkflowHistory,
	WorkflowPublishHistory,
} from '../../entities';
import { SharedWorkflow } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { SharedWorkflowRepository } from '../shared-workflow.repository';
import { WorkflowPublishHistoryRepository } from '../workflow-publish-history.repository';

describe('SharedWorkflowRepository', () => {
	const entityManager = mockEntityManager(SharedWorkflow);
	const workflowPublishHistoryRepository = mockInstance(WorkflowPublishHistoryRepository);
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

	describe('workflow access IDs', () => {
		const rows = [
			mock<SharedWorkflow>({ workflowId: 'workflow-1' }),
			mock<SharedWorkflow>({ workflowId: 'workflow-2' }),
		];

		it('finds all workflow IDs for global access', async () => {
			entityManager.find.mockResolvedValue(rows);

			const result = await sharedWorkflowRepository.findWorkflowIdsForGlobalAccess();

			expect(entityManager.find).toHaveBeenCalledWith(SharedWorkflow, {
				select: ['workflowId'],
			});
			expect(result).toEqual(['workflow-1', 'workflow-2']);
		});

		it('limits global access workflow IDs to a project', async () => {
			entityManager.find.mockResolvedValue(rows);

			await sharedWorkflowRepository.findWorkflowIdsForGlobalAccess('project-1');

			expect(entityManager.find).toHaveBeenCalledWith(SharedWorkflow, {
				select: ['workflowId'],
				where: { projectId: 'project-1' },
			});
		});

		it('finds workflow IDs accessible through project and workflow roles', async () => {
			entityManager.find.mockResolvedValue(rows);

			const result = await sharedWorkflowRepository.findWorkflowIdsAccessibleToUser(
				'user-1',
				['workflow:owner'],
				['project:viewer'],
			);

			expect(entityManager.find).toHaveBeenCalledWith(SharedWorkflow, {
				select: ['workflowId'],
				where: {
					role: In(['workflow:owner']),
					project: {
						projectRelations: {
							userId: 'user-1',
							role: { slug: In(['project:viewer']) },
						},
					},
				},
			});
			expect(result).toEqual(['workflow-1', 'workflow-2']);
		});

		it('finds workflow IDs shared with a user', async () => {
			entityManager.find.mockResolvedValue(rows);

			const result = await sharedWorkflowRepository.findWorkflowIdsSharedWithUser('user-1');

			expect(entityManager.find).toHaveBeenCalledWith(SharedWorkflow, {
				select: ['workflowId'],
				where: {
					role: 'workflow:editor',
					project: {
						projectRelations: {
							userId: 'user-1',
							role: { slug: 'project:personalOwner' },
						},
					},
				},
			});
			expect(result).toEqual(['workflow-1', 'workflow-2']);
		});

		it('finds workflow IDs owned in a personal project', async () => {
			entityManager.find.mockResolvedValue(rows);

			const result = await sharedWorkflowRepository.findOwnedWorkflowIdsInPersonalProject('user-1');

			expect(entityManager.find).toHaveBeenCalledWith(SharedWorkflow, {
				select: ['workflowId'],
				where: {
					role: 'workflow:owner',
					project: {
						projectRelations: {
							userId: 'user-1',
							role: { slug: 'project:personalOwner' },
						},
					},
				},
			});
			expect(result).toEqual(['workflow-1', 'workflow-2']);
		});
	});

	describe('findOwnedWorkflowRemovalCandidates', () => {
		const rootWorkflow = mock<WorkflowEntity>({
			id: 'root',
			name: 'Root workflow',
			parentFolder: null,
		});
		const folderWorkflow = mock<WorkflowEntity>({
			id: 'nested',
			name: 'Nested workflow',
			parentFolder: mock<Folder>({ id: 'folder' }),
		});
		const rootRow = mock<SharedWorkflow>({ workflow: rootWorkflow });
		const folderRow = mock<SharedWorkflow>({ workflow: folderWorkflow });

		it('returns no candidates without querying for an empty list', async () => {
			expect(
				await sharedWorkflowRepository.findOwnedWorkflowRemovalCandidates('project', []),
			).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});

		it('limits the query to distinct requested ids owned by the project and not archived', async () => {
			entityManager.find.mockResolvedValue([rootRow, folderRow]);

			const result = await sharedWorkflowRepository.findOwnedWorkflowRemovalCandidates('project', [
				'root',
				'nested',
				'root',
			]);

			expect(entityManager.find).toHaveBeenCalledExactlyOnceWith(SharedWorkflow, {
				where: {
					projectId: 'project',
					workflowId: In(['root', 'nested']),
					role: 'workflow:owner',
					workflow: { isArchived: false },
				},
				relations: { workflow: { parentFolder: true } },
				select: {
					workflowId: true,
					workflow: { id: true, name: true, parentFolder: { id: true } },
				},
			});
			expect(result).toEqual([
				{ id: 'root', name: 'Root workflow', parentFolderId: null },
				{ id: 'nested', name: 'Nested workflow', parentFolderId: 'folder' },
			]);
		});

		it('includes archived workflows when asked to', async () => {
			entityManager.find.mockResolvedValue([rootRow]);

			const result = await sharedWorkflowRepository.findOwnedWorkflowRemovalCandidates(
				'project',
				['root'],
				{ includeArchived: true },
			);

			expect(entityManager.find).toHaveBeenCalledExactlyOnceWith(
				SharedWorkflow,
				expect.objectContaining({
					where: { projectId: 'project', workflowId: In(['root']), role: 'workflow:owner' },
				}),
			);
			expect(result).toEqual([{ id: 'root', name: 'Root workflow', parentFolderId: null }]);
		});

		it('combines candidates from bounded queries for a large list', async () => {
			const middleIds = Array.from({ length: 9_999 }, (_, index) => `workflow-${index}`);
			entityManager.find.mockResolvedValueOnce([rootRow]).mockResolvedValueOnce([folderRow]);

			const result = await sharedWorkflowRepository.findOwnedWorkflowRemovalCandidates('project', [
				'root',
				...middleIds,
				'root',
				'nested',
			]);

			expect(entityManager.find).toHaveBeenCalledTimes(2);
			expect(entityManager.find).toHaveBeenNthCalledWith(
				1,
				SharedWorkflow,
				expect.objectContaining({
					where: {
						projectId: 'project',
						workflowId: In(['root', ...middleIds]),
						role: 'workflow:owner',
						workflow: { isArchived: false },
					},
				}),
			);
			expect(entityManager.find).toHaveBeenNthCalledWith(
				2,
				SharedWorkflow,
				expect.objectContaining({
					where: {
						projectId: 'project',
						workflowId: In(['nested']),
						role: 'workflow:owner',
						workflow: { isArchived: false },
					},
				}),
			);
			expect(result).toEqual([
				{ id: 'root', name: 'Root workflow', parentFolderId: null },
				{ id: 'nested', name: 'Nested workflow', parentFolderId: 'folder' },
			]);
		});
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

	describe('findWorkflowWithOptions', () => {
		const sharedWorkflowWith = (activeVersion: WorkflowHistory | null) =>
			mock<SharedWorkflow>({ workflow: mock<WorkflowEntity>({ activeVersion }) });

		it('loads the publish history of the active version in a separate query', async () => {
			const activeVersion = mock<WorkflowHistory>({ versionId: 'version-1' });
			const events = [mock<WorkflowPublishHistory>({ id: 1 })];
			entityManager.findOne.mockResolvedValueOnce(sharedWorkflowWith(activeVersion));
			workflowPublishHistoryRepository.findByVersion.mockResolvedValueOnce(events);

			const result = await sharedWorkflowRepository.findWorkflowWithOptions('workflow-1', {
				includeActiveVersion: true,
			});

			expect(entityManager.findOne).toHaveBeenCalledWith(
				SharedWorkflow,
				expect.objectContaining({
					relations: expect.objectContaining({
						workflow: expect.objectContaining({ activeVersion: true }),
					}),
				}),
			);
			expect(workflowPublishHistoryRepository.findByVersion).toHaveBeenCalledWith(
				'workflow-1',
				'version-1',
				'all',
				entityManager,
			);
			expect(result?.workflow.activeVersion?.workflowPublishHistory).toBe(events);
		});

		it('passes the requested publish history scope to the query', async () => {
			entityManager.findOne.mockResolvedValueOnce(
				sharedWorkflowWith(mock<WorkflowHistory>({ versionId: 'version-1' })),
			);
			workflowPublishHistoryRepository.findByVersion.mockResolvedValueOnce([]);

			await sharedWorkflowRepository.findWorkflowWithOptions('workflow-1', {
				includeActiveVersion: true,
				publishHistory: 'latestActivation',
			});

			expect(workflowPublishHistoryRepository.findByVersion).toHaveBeenCalledWith(
				'workflow-1',
				'version-1',
				'latestActivation',
				entityManager,
			);
		});

		it('does not load publish history when the scope is none', async () => {
			entityManager.findOne.mockResolvedValueOnce(
				sharedWorkflowWith(mock<WorkflowHistory>({ versionId: 'version-1' })),
			);

			await sharedWorkflowRepository.findWorkflowWithOptions('workflow-1', {
				includeActiveVersion: true,
				publishHistory: 'none',
			});

			expect(workflowPublishHistoryRepository.findByVersion).not.toHaveBeenCalled();
		});

		it('loads the publish history with the entity manager of the caller', async () => {
			const trx = mock<EntityManager>();
			trx.findOne.mockResolvedValueOnce(
				sharedWorkflowWith(mock<WorkflowHistory>({ versionId: 'version-1' })),
			);
			workflowPublishHistoryRepository.findByVersion.mockResolvedValueOnce([]);

			await sharedWorkflowRepository.findWorkflowWithOptions('workflow-1', {
				includeActiveVersion: true,
				em: trx,
			});

			expect(workflowPublishHistoryRepository.findByVersion).toHaveBeenCalledWith(
				'workflow-1',
				'version-1',
				'all',
				trx,
			);
		});

		it('does not load publish history when the workflow has no active version', async () => {
			entityManager.findOne.mockResolvedValueOnce(sharedWorkflowWith(null));

			await sharedWorkflowRepository.findWorkflowWithOptions('workflow-1', {
				includeActiveVersion: true,
			});

			expect(workflowPublishHistoryRepository.findByVersion).not.toHaveBeenCalled();
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

	describe('findOwnedWorkflowIdsByProjects', () => {
		it('returns an empty list without querying for an empty projectIds list', async () => {
			const result = await sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([]);

			expect(result).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});

		it('returns the owned workflow ids for the given projects', async () => {
			entityManager.find.mockResolvedValueOnce([
				{ workflowId: 'wf-1' },
				{ workflowId: 'wf-2' },
			] as unknown as SharedWorkflow[]);

			const result = await sharedWorkflowRepository.findOwnedWorkflowIdsByProjects(['proj-1']);

			expect(entityManager.find).toHaveBeenCalledWith(SharedWorkflow, {
				select: { workflowId: true },
				where: { projectId: In(['proj-1']), role: 'workflow:owner' },
			});
			expect(result).toEqual(['wf-1', 'wf-2']);
		});
	});
});
