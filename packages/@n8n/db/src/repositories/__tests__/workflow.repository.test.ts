import { GlobalConfig } from '@n8n/config';
import { In, IsNull, MoreThan, Not, type SelectQueryBuilder } from '@n8n/typeorm';
import type { IWorkflowSettings } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { WorkflowEntity } from '../../entities';
import type { TransactionRunner } from '../../services/transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { mockInstance } from '../../utils/test-utils/mock-instance';
import { FolderRepository } from '../folder.repository';
import { SharedWorkflowRepository } from '../shared-workflow.repository';
import { WorkflowRepository } from '../workflow.repository';

describe('WorkflowRepository', () => {
	const entityManager = mockEntityManager(WorkflowEntity);
	const globalConfig = mockInstance(GlobalConfig, {
		database: { type: 'postgresdb' },
	});
	const folderRepository = mockInstance(FolderRepository);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const transactionRunner = mock<TransactionRunner>();
	const workflowRepository = new WorkflowRepository(
		entityManager.connection,
		globalConfig,
		folderRepository,
		sharedWorkflowRepository,
		transactionRunner,
	);

	let queryBuilder: Mocked<SelectQueryBuilder<WorkflowEntity>>;

	beforeEach(() => {
		vi.resetAllMocks();

		queryBuilder = mock<SelectQueryBuilder<WorkflowEntity>>();

		queryBuilder.where.mockReturnThis();
		queryBuilder.andWhere.mockReturnThis();
		queryBuilder.orWhere.mockReturnThis();
		queryBuilder.select.mockReturnThis();
		queryBuilder.addSelect.mockReturnThis();
		queryBuilder.leftJoin.mockReturnThis();
		queryBuilder.leftJoinAndSelect.mockReturnThis();
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

		vi.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
	});

	describe('applyNameFilter', () => {
		it('should search for workflows containing all words from the query', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'Users database' },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('AND'),
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
			const nameFilterCalls = (queryBuilder.andWhere as Mock).mock.calls.filter((call) =>
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
			const nameFilterCalls = (queryBuilder.andWhere as Mock).mock.calls.filter((call) =>
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
				sharedWorkflowRepository,
				transactionRunner,
			);
			vi.spyOn(sqliteWorkflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

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

			const andWhereCall = (queryBuilder.andWhere as Mock).mock.calls.find((call) =>
				call[0]?.includes('workflow.name'),
			);

			expect(andWhereCall).toBeDefined();
			expect(andWhereCall![0]).toContain('workflow.name');
			expect(andWhereCall![0]).toContain('workflow.description');
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

	describe('applyIdsFilter', () => {
		it('should filter by the requested workflow ids', async () => {
			await workflowRepository.getMany(['permitted-workflow'], {
				filter: { ids: ['workflow-1', 'workflow-2'] },
			});

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'workflow.id IN (:...filteredWorkflowIds)',
				{ filteredWorkflowIds: ['workflow-1', 'workflow-2'] },
			);
		});

		it('should return no workflows for an empty ids filter', async () => {
			await workflowRepository.getMany(['permitted-workflow'], { filter: { ids: [] } });

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'workflow.id IN (:...filteredWorkflowIds)',
				{ filteredWorkflowIds: [''] },
			);
		});

		it('should return no workflows for a malformed ids filter', async () => {
			await workflowRepository.getMany(['permitted-workflow'], { filter: { ids: [1] } });

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'workflow.id IN (:...filteredWorkflowIds)',
				{ filteredWorkflowIds: [''] },
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
		it('should join activeVersion with the shared list columns when select.activeVersion is true', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				select: { activeVersion: true } as const,
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.leftJoin).toHaveBeenCalledWith('workflow.activeVersion', 'activeVersion');
			expect(queryBuilder.addSelect).toHaveBeenCalledWith([
				'activeVersion.versionId',
				'activeVersion.workflowId',
				'activeVersion.nodes',
				'activeVersion.connections',
				'activeVersion.nodeGroups',
				'activeVersion.authors',
				'activeVersion.name',
				'activeVersion.description',
				'activeVersion.autosaved',
				'activeVersion.createdAt',
				'activeVersion.updatedAt',
			]);
		});

		it('should not join activeVersion relation by default when select is undefined', async () => {
			const workflowIds = ['workflow1'];

			await workflowRepository.getMany(workflowIds, {});

			const leftJoinCalls = (queryBuilder.leftJoin as Mock).mock.calls.filter(
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

			const leftJoinCalls = (queryBuilder.leftJoin as Mock).mock.calls.filter(
				(call) => call[0] === 'workflow.activeVersion',
			);
			expect(leftJoinCalls).toHaveLength(0);
		});
	});

	describe('applyTriggerNodeTypesFilter', () => {
		it('should left join activeVersion with addSelect and use COALESCE for PostgreSQL with single trigger type', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'] },
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.leftJoin).toHaveBeenCalledWith('workflow.activeVersion', 'activeVersion');
			// addSelect ensures TypeORM includes the join when using raw SQL in andWhere
			expect(queryBuilder.addSelect).toHaveBeenCalledWith('activeVersion.versionId');
			// Should use COALESCE to check activeVersion.nodes first, falling back to workflow.nodes
			// PostgreSQL uses quoted identifiers
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'(COALESCE("activeVersion"."nodes"::text, "workflow"."nodes"::text) LIKE :triggerNodeType0)',
				{ triggerNodeType0: '%n8n-nodes-base.executeWorkflowTrigger%' },
			);
		});

		it('should filter by multiple trigger types with OR condition for PostgreSQL', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: {
					triggerNodeTypes: [
						'n8n-nodes-base.executeWorkflowTrigger',
						'n8n-nodes-base.webhook',
						'n8n-nodes-base.scheduleTrigger',
					],
				},
			};

			await workflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.leftJoin).toHaveBeenCalledWith('workflow.activeVersion', 'activeVersion');
			expect(queryBuilder.addSelect).toHaveBeenCalledWith('activeVersion.versionId');
			// Should use OR conditions for multiple trigger types
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'(COALESCE("activeVersion"."nodes"::text, "workflow"."nodes"::text) LIKE :triggerNodeType0 OR COALESCE("activeVersion"."nodes"::text, "workflow"."nodes"::text) LIKE :triggerNodeType1 OR COALESCE("activeVersion"."nodes"::text, "workflow"."nodes"::text) LIKE :triggerNodeType2)',
				{
					triggerNodeType0: '%n8n-nodes-base.executeWorkflowTrigger%',
					triggerNodeType1: '%n8n-nodes-base.webhook%',
					triggerNodeType2: '%n8n-nodes-base.scheduleTrigger%',
				},
			);
		});

		it('should left join activeVersion with addSelect and use COALESCE for SQLite', async () => {
			const sqliteConfig = mockInstance(GlobalConfig, {
				database: { type: 'sqlite' },
			});
			const sqliteWorkflowRepository = new WorkflowRepository(
				entityManager.connection,
				sqliteConfig,
				folderRepository,
				sharedWorkflowRepository,
				transactionRunner,
			);
			vi.spyOn(sqliteWorkflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

			const workflowIds = ['workflow1'];
			const options = {
				filter: { triggerNodeTypes: ['n8n-nodes-base.errorTrigger'] },
			};

			await sqliteWorkflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.leftJoin).toHaveBeenCalledWith('workflow.activeVersion', 'activeVersion');
			expect(queryBuilder.addSelect).toHaveBeenCalledWith('activeVersion.versionId');
			// Should use COALESCE to check activeVersion.nodes first, falling back to workflow.nodes
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'(COALESCE(activeVersion.nodes, workflow.nodes) LIKE :triggerNodeType0)',
				{ triggerNodeType0: '%n8n-nodes-base.errorTrigger%' },
			);
		});

		it('should filter by multiple trigger types with OR condition for SQLite', async () => {
			const sqliteConfig = mockInstance(GlobalConfig, {
				database: { type: 'sqlite' },
			});
			const sqliteWorkflowRepository = new WorkflowRepository(
				entityManager.connection,
				sqliteConfig,
				folderRepository,
				sharedWorkflowRepository,
				transactionRunner,
			);
			vi.spyOn(sqliteWorkflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

			const workflowIds = ['workflow1'];
			const options = {
				filter: {
					triggerNodeTypes: ['n8n-nodes-base.webhook', 'n8n-nodes-base.scheduleTrigger'],
				},
			};

			await sqliteWorkflowRepository.getMany(workflowIds, options);

			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'(COALESCE(activeVersion.nodes, workflow.nodes) LIKE :triggerNodeType0 OR COALESCE(activeVersion.nodes, workflow.nodes) LIKE :triggerNodeType1)',
				{
					triggerNodeType0: '%n8n-nodes-base.webhook%',
					triggerNodeType1: '%n8n-nodes-base.scheduleTrigger%',
				},
			);
		});

		it('should not join activeVersion again if already joined', async () => {
			// Simulate activeVersion already being joined
			Object.defineProperty(queryBuilder, 'expressionMap', {
				value: {
					aliases: [{ name: 'activeVersion' }],
				},
				writable: true,
			});

			const workflowIds = ['workflow1'];
			const options = {
				filter: { triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'] },
			};

			await workflowRepository.getMany(workflowIds, options);

			// leftJoin should not be called for activeVersion since it's already joined
			const activeVersionJoinCalls = (queryBuilder.leftJoin as Mock).mock.calls.filter(
				(call) => call[0] === 'workflow.activeVersion',
			);
			expect(activeVersionJoinCalls).toHaveLength(0);

			// But the filter should still be applied (with quoted identifiers for PostgreSQL)
			expect(queryBuilder.andWhere).toHaveBeenCalledWith(
				'(COALESCE("activeVersion"."nodes"::text, "workflow"."nodes"::text) LIKE :triggerNodeType0)',
				{ triggerNodeType0: '%n8n-nodes-base.executeWorkflowTrigger%' },
			);
		});

		it('should not apply filter when triggerNodeTypes is not provided', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { query: 'test' },
			};

			await workflowRepository.getMany(workflowIds, options);

			const triggerFilterCalls = (queryBuilder.andWhere as Mock).mock.calls.filter((call) =>
				call[0]?.includes?.('triggerNodeType'),
			);
			expect(triggerFilterCalls).toHaveLength(0);
		});

		it('should not apply filter when triggerNodeTypes is undefined', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { triggerNodeTypes: undefined },
			};

			await workflowRepository.getMany(workflowIds, options);

			const triggerFilterCalls = (queryBuilder.andWhere as Mock).mock.calls.filter((call) =>
				call[0]?.includes?.('triggerNodeType'),
			);
			expect(triggerFilterCalls).toHaveLength(0);
		});

		it('should not apply filter when triggerNodeTypes is empty array', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: { triggerNodeTypes: [] },
			};

			await workflowRepository.getMany(workflowIds, options);

			const triggerFilterCalls = (queryBuilder.andWhere as Mock).mock.calls.filter((call) =>
				call[0]?.includes?.('triggerNodeType'),
			);
			expect(triggerFilterCalls).toHaveLength(0);
		});

		it('should work in combination with other filters', async () => {
			const workflowIds = ['workflow1'];
			const options = {
				filter: {
					query: 'workflow',
					triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'],
					active: true,
				},
			};

			await workflowRepository.getMany(workflowIds, options);

			// Should have called andWhere for both name and triggerNodeTypes filters
			const nameFilterCalls = (queryBuilder.andWhere as Mock).mock.calls.filter((call) =>
				call[0]?.includes?.('workflow.name'),
			);
			const triggerFilterCalls = (queryBuilder.andWhere as Mock).mock.calls.filter((call) =>
				call[0]?.includes?.('triggerNodeType'),
			);
			expect(nameFilterCalls.length).toBeGreaterThan(0);
			expect(triggerFilterCalls.length).toBeGreaterThan(0);

			// Should left join activeVersion for the trigger filter
			expect(queryBuilder.leftJoin).toHaveBeenCalledWith('workflow.activeVersion', 'activeVersion');
		});
	});

	describe('findByIds', () => {
		it('should return an empty array and not call the database when no workflow ids are provided', async () => {
			const findSpy = vi.spyOn(workflowRepository, 'find');
			const workflowIds: string[] = [];
			const result = await workflowRepository.findByIds(workflowIds);

			expect(result).toEqual([]);
			expect(findSpy).not.toHaveBeenCalled();
		});

		it('should call the database when workflow ids are provided', async () => {
			const findSpy = vi.spyOn(workflowRepository, 'find').mockResolvedValue([]);
			const workflowIds = ['workflow1'];
			const result = await workflowRepository.findByIds(workflowIds);
			expect(result).toEqual([]);
			expect(findSpy).toHaveBeenCalledTimes(1);
			expect(findSpy).toHaveBeenCalledWith({ where: { id: In(workflowIds) } });
		});

		it('merges workflows returned from different chunks', async () => {
			const first = Object.assign(new WorkflowEntity(), { id: 'first' });
			const last = Object.assign(new WorkflowEntity(), { id: 'last' });
			const findSpy = vi
				.spyOn(workflowRepository, 'find')
				.mockResolvedValueOnce([first])
				.mockResolvedValueOnce([last]);
			const workflowIds = Array.from({ length: 10_001 }, (_, index) => `workflow-${index}`);

			const result = await workflowRepository.findByIds(workflowIds, { fields: ['name'] });

			expect(findSpy).toHaveBeenCalledTimes(2);
			expect(findSpy).toHaveBeenNthCalledWith(2, {
				where: { id: In(['workflow-10000']) },
				select: ['id', 'name'],
			});
			expect(result).toEqual([first, last]);
		});
	});

	describe('findSettings', () => {
		it('selects only the settings column', async () => {
			const settings: IWorkflowSettings = { engineType: 'v2' };
			const findOneSpy = vi
				.spyOn(workflowRepository, 'findOne')
				.mockResolvedValue(Object.assign(new WorkflowEntity(), { settings }));

			await expect(workflowRepository.findSettings('workflow1')).resolves.toEqual(settings);

			expect(findOneSpy).toHaveBeenCalledWith({
				select: ['settings'],
				where: { id: 'workflow1' },
			});
		});

		it('returns undefined for a workflow that does not exist', async () => {
			vi.spyOn(workflowRepository, 'findOne').mockResolvedValue(null);

			await expect(workflowRepository.findSettings('missing')).resolves.toBeUndefined();
		});
	});

	describe('getIdsAfter', () => {
		it('should return the first ids when no cursor is given', async () => {
			const findSpy = vi
				.spyOn(workflowRepository, 'find')
				.mockResolvedValue([Object.assign(new WorkflowEntity(), { id: 'a' })]);

			const result = await workflowRepository.getIdsAfter(undefined, 100);

			expect(result).toEqual(['a']);
			expect(findSpy).toHaveBeenCalledWith({
				select: { id: true },
				where: {},
				take: 100,
				order: { id: 'ASC' },
			});
		});

		it('should return only ids greater than the cursor', async () => {
			const findSpy = vi
				.spyOn(workflowRepository, 'find')
				.mockResolvedValue([
					Object.assign(new WorkflowEntity(), { id: 'b' }),
					Object.assign(new WorkflowEntity(), { id: 'c' }),
				]);

			const result = await workflowRepository.getIdsAfter('a', 100);

			expect(result).toEqual(['b', 'c']);
			expect(findSpy).toHaveBeenCalledWith({
				select: { id: true },
				where: { id: MoreThan('a') },
				take: 100,
				order: { id: 'ASC' },
			});
		});
	});

	describe('findMigrationScanPage', () => {
		it('should return the scan fields of the workflows after the cursor', async () => {
			const page = [Object.assign(new WorkflowEntity(), { id: 'b', name: 'B' })];
			const findSpy = vi.spyOn(workflowRepository, 'find').mockResolvedValue(page);
			const select = ['id', 'name', 'active', 'activeVersionId', 'versionId', 'nodes', 'updatedAt'];

			const first = await workflowRepository.findMigrationScanPage(undefined, 100);
			const next = await workflowRepository.findMigrationScanPage('a', 100);

			expect(first).toBe(page);
			expect(next).toBe(page);
			expect(findSpy).toHaveBeenNthCalledWith(1, {
				select,
				where: {},
				take: 100,
				order: { id: 'ASC' },
			});
			expect(findSpy).toHaveBeenNthCalledWith(2, {
				select,
				where: { id: MoreThan('a') },
				take: 100,
				order: { id: 'ASC' },
			});
		});
	});

	describe('findMigrationScanWorkflow', () => {
		it('should return the workflow with the scan fields', async () => {
			const workflow = Object.assign(new WorkflowEntity(), { id: 'a' });
			const findOneSpy = vi.spyOn(workflowRepository, 'findOne').mockResolvedValue(workflow);

			expect(await workflowRepository.findMigrationScanWorkflow('a')).toBe(workflow);
			expect(findOneSpy).toHaveBeenCalledWith({
				select: ['id', 'name', 'active', 'activeVersionId', 'versionId', 'nodes', 'updatedAt'],
				where: { id: 'a' },
			});
		});
	});

	describe('findExistingIds', () => {
		it('returns only the ids that still exist', async () => {
			entityManager.find.mockResolvedValue([
				Object.assign(new WorkflowEntity(), { id: 'a' }),
				Object.assign(new WorkflowEntity(), { id: 'c' }),
			]);

			const result = await workflowRepository.findExistingIds(['a', 'b', 'c']);

			expect(result).toEqual(['a', 'c']);
			expect(entityManager.find).toHaveBeenCalledWith(WorkflowEntity, {
				select: { id: true },
				where: { id: In(['a', 'b', 'c']) },
			});
		});

		it('does not query when no ids are given', async () => {
			const result = await workflowRepository.findExistingIds([]);

			expect(result).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});
	});

	describe('findPreExistingWorkflows', () => {
		it('merges workflows returned from different chunks', async () => {
			const first = Object.assign(new WorkflowEntity(), { id: 'first' });
			const last = Object.assign(new WorkflowEntity(), { id: 'last' });
			queryBuilder.getMany.mockResolvedValueOnce([first]).mockResolvedValueOnce([last]);
			const workflowIds = Array.from({ length: 10_001 }, (_, index) => `workflow-${index}`);

			const result = await workflowRepository.findPreExistingWorkflows(workflowIds);

			expect(queryBuilder.getMany).toHaveBeenCalledTimes(2);
			expect(result).toEqual([first, last]);
			expect(queryBuilder.where.mock.calls[1]).toEqual([
				'workflow.id IN (:...workflowIds)',
				{ workflowIds: ['workflow-10000'] },
			]);
		});
	});

	describe('getPublishedPersonalWorkflowsCount', () => {
		it('should return count from query builder with correct joins and filters', async () => {
			queryBuilder.getCount.mockResolvedValue(5);

			const result = await workflowRepository.getPublishedPersonalWorkflowsCount();

			expect(result).toBe(5);
			expect(queryBuilder.innerJoin).toHaveBeenCalledWith('workflow.shared', 'shared');
			expect(queryBuilder.innerJoin).toHaveBeenCalledWith('shared.project', 'project');
			expect(queryBuilder.where).toHaveBeenCalledWith('workflow.activeVersionId IS NOT NULL');
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('project.type = :type', {
				type: 'personal',
			});
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('shared.role = :role', {
				role: 'workflow:owner',
			});
			expect(queryBuilder.getCount).toHaveBeenCalled();
		});

		it('should return 0 when no workflows exist', async () => {
			queryBuilder.getCount.mockResolvedValue(0);

			const result = await workflowRepository.getPublishedPersonalWorkflowsCount();

			expect(result).toBe(0);
		});

		it('should return correct count for multiple published personal workflows', async () => {
			queryBuilder.getCount.mockResolvedValue(3);

			const result = await workflowRepository.getPublishedPersonalWorkflowsCount();

			expect(result).toBe(3);
		});
	});

	describe('getPublishedCount', () => {
		it('should count non-archived workflows with an active version', async () => {
			const countSpy = vi.spyOn(workflowRepository, 'count').mockResolvedValue(7);

			const result = await workflowRepository.getPublishedCount();

			expect(result).toBe(7);
			expect(countSpy).toHaveBeenCalledWith({
				where: {
					activeVersionId: Not(IsNull()),
					isArchived: false,
				},
			});
		});
	});

	describe('findByCredentialResolverId', () => {
		it('should use PostgreSQL JSON operator for postgresdb', async () => {
			const workflows = [{ id: 'wf-1', name: 'Workflow 1' }] as WorkflowEntity[];
			queryBuilder.getMany.mockResolvedValue(workflows);

			const result = await workflowRepository.findByCredentialResolverId('resolver-123');

			expect(queryBuilder.select).toHaveBeenCalledWith(['workflow.id', 'workflow.name']);
			expect(queryBuilder.where).toHaveBeenCalledWith(
				"workflow.settings ->> 'credentialResolverId' = :resolverId",
				{ resolverId: 'resolver-123' },
			);
			expect(result).toEqual(workflows);
		});

		it('should use SQLite JSON_EXTRACT for sqlite', async () => {
			const sqliteConfig = mockInstance(GlobalConfig, {
				database: { type: 'sqlite' },
			});
			const sqliteWorkflowRepository = new WorkflowRepository(
				entityManager.connection,
				sqliteConfig,
				folderRepository,
				sharedWorkflowRepository,
				transactionRunner,
			);
			vi.spyOn(sqliteWorkflowRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);
			queryBuilder.getMany.mockResolvedValue([]);

			const result = await sqliteWorkflowRepository.findByCredentialResolverId('resolver-123');

			expect(queryBuilder.where).toHaveBeenCalledWith(
				"JSON_EXTRACT(workflow.settings, '$.credentialResolverId') = :resolverId",
				{ resolverId: 'resolver-123' },
			);
			expect(result).toEqual([]);
		});

		it('should return empty array when no workflows match', async () => {
			queryBuilder.getMany.mockResolvedValue([]);

			const result = await workflowRepository.findByCredentialResolverId('no-match');

			expect(result).toEqual([]);
		});
	});

	describe('clearCredentialResolverId', () => {
		it('should use PostgreSQL jsonb removal for postgresdb', async () => {
			const mockExecute = vi.fn().mockResolvedValue({ affected: 1 });
			const mockUpdateWhere = vi.fn().mockReturnValue({ execute: mockExecute });
			const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
			const updateQb = { update: mockUpdate } as unknown as SelectQueryBuilder<WorkflowEntity>;

			vi.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue(updateQb);

			await workflowRepository.clearCredentialResolverId('resolver-123');

			expect(mockUpdate).toHaveBeenCalled();
			expect(mockSet).toHaveBeenCalledWith({
				settings: expect.any(Function),
			});
			expect(mockUpdateWhere).toHaveBeenCalledWith(
				"settings ->> 'credentialResolverId' = :resolverId",
				{ resolverId: 'resolver-123' },
			);
			expect(mockExecute).toHaveBeenCalled();
		});

		it('should use SQLite json_remove for sqlite', async () => {
			const mockExecute = vi.fn().mockResolvedValue({ affected: 1 });
			const mockUpdateWhere = vi.fn().mockReturnValue({ execute: mockExecute });
			const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
			const updateQb = { update: mockUpdate } as unknown as SelectQueryBuilder<WorkflowEntity>;

			const sqliteConfig = mockInstance(GlobalConfig, {
				database: { type: 'sqlite' },
			});
			const sqliteWorkflowRepository = new WorkflowRepository(
				entityManager.connection,
				sqliteConfig,
				folderRepository,
				sharedWorkflowRepository,
				transactionRunner,
			);
			vi.spyOn(sqliteWorkflowRepository, 'createQueryBuilder').mockReturnValue(updateQb);

			await sqliteWorkflowRepository.clearCredentialResolverId('resolver-123');

			expect(mockUpdate).toHaveBeenCalled();
			expect(mockSet).toHaveBeenCalledWith({
				settings: expect.any(Function),
			});
			expect(mockUpdateWhere).toHaveBeenCalledWith(
				"JSON_EXTRACT(settings, '$.credentialResolverId') = :resolverId",
				{ resolverId: 'resolver-123' },
			);
			expect(mockExecute).toHaveBeenCalled();
		});
	});

	describe('caller allowlist purge', () => {
		let writes: Array<{ id: string; callerIds: string }>;
		let writtenSettings: Array<IWorkflowSettings | undefined>;
		let selectQb: { where: Mock; andWhere: Mock; setLock: Mock };

		const stubCandidates = (candidates: Array<Partial<WorkflowEntity>>) => {
			writes = [];
			writtenSettings = [];

			const select = {
				select: vi.fn(),
				where: vi.fn(),
				andWhere: vi.fn(),
				setLock: vi.fn(),
				getMany: vi.fn().mockResolvedValue(candidates),
			};
			select.select.mockReturnValue(select);
			select.where.mockReturnValue(select);
			select.andWhere.mockReturnValue(select);
			select.setLock.mockReturnValue(select);

			let pendingId = '';
			let pendingCallerIds = '';
			let pendingSettings: IWorkflowSettings | undefined;
			const update = {
				update: vi.fn(),
				set: vi.fn(),
				where: vi.fn(),
				setParameter: vi.fn(),
				execute: vi.fn(async () => {
					writes.push({ id: pendingId, callerIds: pendingCallerIds });
					writtenSettings.push(pendingSettings);
				}),
			};
			update.update.mockReturnValue(update);
			// Postgres writes the whole document, SQLite the one key through a parameter.
			update.set.mockImplementation((values: { settings: unknown }) => {
				if (typeof values.settings === 'object' && values.settings !== null) {
					pendingSettings = values.settings as IWorkflowSettings;
					pendingCallerIds = pendingSettings.callerIds ?? '';
				}
				return update;
			});
			update.where.mockImplementation((_sql: string, parameters: { workflowId: string }) => {
				pendingId = parameters.workflowId;
				return update;
			});
			update.setParameter.mockImplementation((_name: string, value: string) => {
				pendingCallerIds = value;
				return update;
			});

			vi.mocked(entityManager.createQueryBuilder).mockImplementation(((...args: unknown[]) =>
				args.length > 0 ? select : update) as never);

			transactionRunner.run.mockImplementation(
				async (ctx: unknown, fn: (c: unknown) => Promise<unknown>) => await fn(ctx),
			);

			selectQb = select;
			return select;
		};

		it('removes the entry and keeps the rest in order, whatever whitespace separates them', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,\n second , ,\tthird' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['second'], {});

			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'first,third' }]);
		});

		it('rewrites only the allowlists that hold the id as an entry of its own', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'abc,abcdef' },
				},
				{
					id: 'subworkflow-2',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'abcdef' },
				},
				{ id: 'subworkflow-3', settings: { callerPolicy: 'workflowsFromAList' } },
			]);

			await workflowRepository.removeFromCallerAllowlists(['abc'], {});

			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'abcdef' }]);
		});

		it('leaves an allowlist alone when the id only appears inside another entry', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'abc-1, abc-2' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['abc'], {});

			expect(writes).toEqual([]);
		});

		it('rewrites every workflow that names the id', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,second' },
				},
				{
					id: 'subworkflow-2',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'second,third' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['second'], {});

			expect(writes).toEqual([
				{ id: 'subworkflow-1', callerIds: 'first' },
				{ id: 'subworkflow-2', callerIds: 'third' },
			]);
		});

		it('takes every id out of one allowlist in a single write', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,second,third' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['first', 'third'], {});

			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'second' }]);
		});

		it('reads the candidates once, whatever the batch size, and locks only the ones it rewrites', async () => {
			const select = stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'one,first' },
				},
				{
					id: 'subworkflow-2',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['one', 'two'], {});

			expect(select.where).toHaveBeenCalledTimes(2);
			expect(select.where).toHaveBeenNthCalledWith(1, expect.stringContaining('callerIds'));
			expect(select.where).toHaveBeenNthCalledWith(2, 'workflow.id IN (:...ids)', {
				ids: ['subworkflow-1'],
			});
			expect(select.setLock).toHaveBeenCalledTimes(1);
			expect(select.setLock).toHaveBeenCalledWith('pessimistic_write');
			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'first' }]);
		});

		it('locks nothing when no allowlist names a removed id', async () => {
			const select = stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['one'], {});

			expect(select.setLock).not.toHaveBeenCalled();
			expect(writes).toEqual([]);
		});

		it('matches candidates on the stored document, never on a value read out of it', async () => {
			const select = stubCandidates([]);

			await workflowRepository.removeFromCallerAllowlists(['one'], {});

			expect(select.where).toHaveBeenCalledWith('workflow.settings::text LIKE \'%"callerIds"%\'');
		});

		it('keeps a value the binary JSON form has no room for', async () => {
			const noBinaryJsonForm = String.fromCharCode(0);
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: {
						callerPolicy: 'workflowsFromAList',
						callerIds: 'first,second',
						errorWorkflow: `error-workflow${noBinaryJsonForm}`,
					},
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['second'], {});

			expect(writtenSettings).toEqual([
				{
					callerPolicy: 'workflowsFromAList',
					callerIds: 'first',
					errorWorkflow: `error-workflow${noBinaryJsonForm}`,
				},
			]);
		});

		it('purges a row that exists at an id being removed', async () => {
			stubCandidates([
				{
					id: 'recreated-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,second' },
				},
			]);

			await workflowRepository.removeFromCallerAllowlists(['recreated-1', 'second'], {});

			expect(writes).toEqual([{ id: 'recreated-1', callerIds: 'first' }]);
		});

		it('writes nothing when given no ids', async () => {
			stubCandidates([]);

			await workflowRepository.removeFromCallerAllowlists([], {});

			expect(selectQb.where).not.toHaveBeenCalled();
			expect(writes).toEqual([]);
		});

		it('removes only the entries naming an id without a row', async () => {
			stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'deleted,survivor,other' },
				},
			]);
			vi.mocked(entityManager.find).mockResolvedValue([{ id: 'survivor' }, { id: 'other' }]);

			await workflowRepository.removeMissingFromCallerAllowlists({});

			expect(entityManager.find).toHaveBeenCalledWith(WorkflowEntity, {
				select: ['id'],
				where: { id: In(['deleted', 'survivor', 'other']) },
			});
			expect(writes).toEqual([{ id: 'subworkflow-1', callerIds: 'survivor,other' }]);
		});

		it('locks and writes nothing when every named id has a row', async () => {
			const select = stubCandidates([
				{
					id: 'subworkflow-1',
					settings: { callerPolicy: 'workflowsFromAList', callerIds: 'first,second' },
				},
			]);
			vi.mocked(entityManager.find).mockResolvedValue([{ id: 'first' }, { id: 'second' }]);

			await workflowRepository.removeMissingFromCallerAllowlists({});

			expect(select.setLock).not.toHaveBeenCalled();
			expect(writes).toEqual([]);
		});
	});
});
