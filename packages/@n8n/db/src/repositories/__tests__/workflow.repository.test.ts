import { GlobalConfig } from '@n8n/config';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { WorkflowEntity } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { FolderRepository } from '../folder.repository';
import { WorkflowRepository } from '../workflow.repository';

describe('WorkflowRepository', () => {
	const entityManager = mockEntityManager(WorkflowEntity);
	const globalConfig = mockInstance(GlobalConfig, {
		database: { type: 'postgresdb' },
	});
	const folderRepository = mockInstance(FolderRepository);
	const workflowRepository = new WorkflowRepository(
		entityManager.connection,
		globalConfig,
		folderRepository,
	);

	let queryBuilder: jest.Mocked<SelectQueryBuilder<WorkflowEntity>>;

	beforeEach(() => {
		jest.resetAllMocks();

		queryBuilder = mock<SelectQueryBuilder<WorkflowEntity>>();
		queryBuilder.where.mockReturnThis();
		queryBuilder.andWhere.mockReturnThis();
		queryBuilder.orWhere.mockReturnThis();
		queryBuilder.select.mockReturnThis();
		queryBuilder.addSelect.mockReturnThis();
		queryBuilder.leftJoin.mockReturnThis();
		queryBuilder.innerJoin.mockReturnThis();
		queryBuilder.orderBy.mockReturnThis();
		queryBuilder.addOrderBy.mockReturnThis();
		queryBuilder.skip.mockReturnThis();
		queryBuilder.take.mockReturnThis();
		queryBuilder.getMany.mockResolvedValue([]);
		queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

		Object.defineProperty(queryBuilder, 'expressionMap', {
			value: {
				aliases: [],
			},
			writable: true,
		});

		jest.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
	});

	describe('applyNameFilter', () => {
		it('should search for workflows containing any word from the query', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'Users database' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('OR'),
				expect.objectContaining({
					searchWord0: '%users%',
					searchWord1: '%database%',
				}),
			);
		});

		it('should handle single word searches', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'workflow' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					searchWord0: '%workflow%',
				}),
			);
		});

		it('should handle queries with extra whitespace', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: '  Users   database  ' },
			};

			await workflowRepository.getMany(workflowIds, options);

			// Should still result in just two words
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					searchWord0: '%users%',
					searchWord1: '%database%',
				}),
			);
		});

		it('should not apply filter when query is empty', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: '' },
			};

			await workflowRepository.getMany(workflowIds, options);

			// andWhere should not be called for name filter
			const nameFilterCalls = (queryBuilder.andWhere as jest.Mock).mock.calls.filter((call) =>
				call[0]?.includes('workflow.name'),
			);
			expect(nameFilterCalls).toHaveLength(0);
		});

		it('should not apply filter when query is only whitespace', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: '   ' },
			};

			await workflowRepository.getMany(workflowIds, options);

			// andWhere should not be called for name filter
			const nameFilterCalls = (queryBuilder.andWhere as jest.Mock).mock.calls.filter((call) =>
				call[0]?.includes('workflow.name'),
			);
			expect(nameFilterCalls).toHaveLength(0);
		});

		it('should use SQLite concatenation syntax for SQLite database', async () => {
			// Create a new repository instance with SQLite config
			const sqliteConfig = mockInstance(GlobalConfig, {
				database: { type: 'sqlite' },
			});
			const sqliteWorkflowRepository = new WorkflowRepository(
				entityManager.connection,
				sqliteConfig,
				folderRepository,
			);
			jest.spyOn(sqliteWorkflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'test search' },
			};

			await sqliteWorkflowRepository.getMany(workflowIds, options);

			// Check for SQLite-specific concatenation syntax (||)
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining("workflow.name || ' ' || COALESCE"),
				expect.any(Object),
			);
		});

		it('should use CONCAT syntax for non-SQLite databases', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'test search' },
			};

			await workflowRepository.getMany(workflowIds, options);

			// Check for CONCAT syntax
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('CONCAT(workflow.name'),
				expect.any(Object),
			);
		});

		it('should search in both name and description fields', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'automation' },
			};

			await workflowRepository.getMany(workflowIds, options);

			const andWhereCall = (queryBuilder.andWhere as jest.Mock).mock.calls.find((call) =>
				call[0]?.includes('workflow.name'),
			);

			expect(andWhereCall).toBeDefined();
			expect(andWhereCall[0]).toContain('workflow.name');
			expect(andWhereCall[0]).toContain('workflow.description');
		});

		it('should handle special characters in search query', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'test% _query' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					searchWord0: '%test%%',
					searchWord1: '%_query%',
				}),
			);
		});

		it('should be case-insensitive', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'USERS Database' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('LOWER'),
				expect.objectContaining({
					searchWord0: '%users%',
					searchWord1: '%database%',
				}),
			);
		});
	});

	describe('getMany', () => {
		it('should apply multiple filters together', async () => {
			const workflowIds = ['workflow1', 'workflow2'];
			const options = {
				filter: {
					query: 'automation task',
					active: true,
					projectId: 'project1',
				},
				take: 10,
				skip: 0,
			};

			await workflowRepository.getMany(workflowIds, options);

			// Check that filters were applied
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('workflow.name'),
				expect.objectContaining({
					searchWord0: '%automation%',
					searchWord1: '%task%',
				}),
			);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith('workflow.activeVersionId IS NOT NULL');

			expect(queryBuilder.innerJoin).toHaveBeenCalledWith('workflow.shared', 'shared');
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('shared.projectId = :projectId', {
				projectId: 'project1',
			});

			// Check pagination
			expect(queryBuilder.skip).toHaveBeenCalledWith(0);
			expect(queryBuilder.take).toHaveBeenCalledWith(10);
		});
	});

	describe('applyActiveVersionRelation', () => {
		it('should join activeVersion relation when select.activeVersion is true', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				select: { activeVersion: true } as const,
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.leftJoin).toHaveBeenCalledWith('workflow.activeVersion', 'activeVersion');
			expect(queryBuilder.addSelect).toHaveBeenCalledWith([
				'activeVersion.versionId',
				'activeVersion.nodes',
				'activeVersion.connections',
			]);
		});

		it('should not join activeVersion relation by default when select is undefined', async () => {
			const workflowIds = ['workflow1'];

			await workflowRepository.getMany(workflowIds, {});

			const leftJoinCalls = (queryBuilder.leftJoin as jest.Mock).mock.calls.filter(
				(call) => call[0] === 'workflow.activeVersion',
			);
			expect(leftJoinCalls).toHaveLength(0);
		});

		it('should not join activeVersion relation when activeVersion is not in select', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				select: { name: true, createdAt: true } as const,
			};

			await workflowRepository.getMany(workflowIds, options);

			const leftJoinCalls = (queryBuilder.leftJoin as jest.Mock).mock.calls.filter(
				(call) => call[0] === 'workflow.activeVersion',
			);
			expect(leftJoinCalls).toHaveLength(0);
		});
	});
});
