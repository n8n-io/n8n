import { In, Like } from '@n8n/typeorm';
import { PROJECT_ROOT } from 'n8n-workflow';

import { buildWorkflowsByNodesQuery } from '../../utils/build-workflows-by-nodes-query';
import { isStringArray } from '../../utils/is-string-array';

// Mock the utility functions
jest.mock('../../utils/build-workflows-by-nodes-query');
jest.mock('../../utils/is-string-array');

// Mock TypeORM classes
jest.mock('@n8n/typeorm', () => ({
	...jest.requireActual('@n8n/typeorm'),
	Repository: jest.fn(),
}));

describe('WorkflowRepository', () => {
	let WorkflowRepository: any;
	let workflowRepository: any;
	let mockDataSource: any;
	let mockGlobalConfig: any;
	let mockFolderRepository: any;
	let mockQueryBuilder: any;
	let mockUpdateQueryBuilder: any;

	beforeAll(async () => {
		// Dynamically import the module to avoid DI issues at module load time
		const module = await import('../workflow.repository');
		WorkflowRepository = module.WorkflowRepository;
	});

	beforeEach(() => {
		mockUpdateQueryBuilder = {
			update: jest.fn().mockReturnThis(),
			set: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			execute: jest.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
		};

		mockQueryBuilder = {
			select: jest.fn().mockReturnThis(),
			addSelect: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			leftJoin: jest.fn().mockReturnThis(),
			innerJoin: jest.fn().mockReturnThis(),
			leftJoinAndSelect: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			addOrderBy: jest.fn().mockReturnThis(),
			groupBy: jest.fn().mockReturnThis(),
			having: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			take: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnValue(mockUpdateQueryBuilder),
			execute: jest.fn().mockResolvedValue([]),
			getMany: jest.fn().mockResolvedValue([]),
			getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
			getOne: jest.fn().mockResolvedValue(null),
			getRawMany: jest.fn().mockResolvedValue([]),
			getRawOne: jest.fn().mockResolvedValue({ count: 0 }),
			getCount: jest.fn().mockResolvedValue(0),
			subQuery: jest.fn().mockReturnThis(),
			getQuery: jest.fn().mockReturnValue('SELECT * FROM workflow'),
			setParameters: jest.fn().mockReturnThis(),
			createQueryBuilder: jest.fn().mockReturnThis(),
			addCommonTableExpression: jest.fn().mockReturnThis(),
			from: jest.fn().mockReturnThis(),
			escape: jest.fn().mockImplementation((str) => `"${str}"`),
			distinct: jest.fn().mockReturnThis(),
			expressionMap: {
				aliases: [],
			},
		};

		mockDataSource = {
			manager: {
				createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
				update: jest.fn().mockResolvedValue({ affected: 1 }),
			},
		};

		mockGlobalConfig = {
			database: {
				type: 'postgresdb',
			},
			tags: {
				disabled: false,
			},
		};

		mockFolderRepository = {
			getManyQuery: jest.fn().mockReturnValue(mockQueryBuilder),
			getAllFolderIdsInHierarchy: jest.fn().mockResolvedValue(['folder-1', 'folder-2']),
			getMany: jest.fn().mockResolvedValue([]),
		};

		workflowRepository = new WorkflowRepository(
			mockDataSource,
			mockGlobalConfig,
			mockFolderRepository,
		);

		// Mock inherited repository methods
		workflowRepository.findOne = jest.fn();
		workflowRepository.find = jest.fn();
		workflowRepository.count = jest.fn();
		workflowRepository.sum = jest.fn();
		workflowRepository.update = jest.fn();
		workflowRepository.findBy = jest.fn();
		workflowRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

		// Mock utility functions
		(buildWorkflowsByNodesQuery as jest.Mock).mockReturnValue({
			whereClause: 'workflow.nodes LIKE :nodeType',
			parameters: { nodeType: 'n8n-nodes-base.webhook' },
		});
		(isStringArray as unknown as jest.Mock).mockImplementation(
			(value) => Array.isArray(value) && value.every((item) => typeof item === 'string'),
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Basic CRUD Operations', () => {
		describe('get', () => {
			it('should find workflow with relations', async () => {
				const where = { id: 'workflow-1' };
				const options = { relations: ['tags', 'shared'] };
				const expectedWorkflow = { id: 'workflow-1', name: 'Test Workflow' };

				workflowRepository.findOne.mockResolvedValue(expectedWorkflow);

				const result = await workflowRepository.get(where, options);

				expect(workflowRepository.findOne).toHaveBeenCalledWith({
					where,
					relations: options.relations,
				});
				expect(result).toEqual(expectedWorkflow);
			});

			it('should find workflow without relations', async () => {
				const where = { name: 'Test Workflow' };
				const expectedWorkflow = { id: 'workflow-1', name: 'Test Workflow' };

				workflowRepository.findOne.mockResolvedValue(expectedWorkflow);

				const result = await workflowRepository.get(where);

				expect(workflowRepository.findOne).toHaveBeenCalledWith({
					where,
					relations: undefined,
				});
				expect(result).toEqual(expectedWorkflow);
			});
		});

		describe('getAllActiveIds', () => {
			it('should return all active workflow IDs with project relations', async () => {
				const activeWorkflows = [{ id: 'workflow-1' }, { id: 'workflow-2' }];
				workflowRepository.find.mockResolvedValue(activeWorkflows);

				const result = await workflowRepository.getAllActiveIds();

				expect(workflowRepository.find).toHaveBeenCalledWith({
					select: { id: true },
					where: { active: true },
					relations: { shared: { project: { projectRelations: true } } },
				});
				expect(result).toEqual(['workflow-1', 'workflow-2']);
			});
		});

		describe('getActiveIds', () => {
			it('should return active workflow IDs without limit', async () => {
				const activeWorkflows = [{ id: 'workflow-1' }, { id: 'workflow-2' }];
				workflowRepository.find.mockResolvedValue(activeWorkflows);

				const result = await workflowRepository.getActiveIds();

				expect(workflowRepository.find).toHaveBeenCalledWith({
					select: ['id'],
					where: { active: true },
				});
				expect(result).toEqual(['workflow-1', 'workflow-2']);
			});

			it('should return active workflow IDs with limit and ordering', async () => {
				const activeWorkflows = [{ id: 'workflow-1' }];
				const maxResults = 1;
				workflowRepository.find.mockResolvedValue(activeWorkflows);

				const result = await workflowRepository.getActiveIds({ maxResults });

				expect(workflowRepository.find).toHaveBeenCalledWith({
					select: ['id'],
					where: { active: true },
					take: maxResults,
					order: { createdAt: 'ASC' },
				});
				expect(result).toEqual(['workflow-1']);
			});
		});

		describe('findById', () => {
			it('should find workflow by ID with project relations', async () => {
				const workflowId = 'workflow-1';
				const expectedWorkflow = { id: 'workflow-1', name: 'Test Workflow' };
				workflowRepository.findOne.mockResolvedValue(expectedWorkflow);

				const result = await workflowRepository.findById(workflowId);

				expect(workflowRepository.findOne).toHaveBeenCalledWith({
					where: { id: workflowId },
					relations: { shared: { project: { projectRelations: true } } },
				});
				expect(result).toEqual(expectedWorkflow);
			});
		});

		describe('findByIds', () => {
			it('should find workflows by IDs without field selection', async () => {
				const workflowIds = ['workflow-1', 'workflow-2'];
				const mockWorkflows = [
					{ id: 'workflow-1', name: 'Test 1' },
					{ id: 'workflow-2', name: 'Test 2' },
				];
				workflowRepository.find.mockResolvedValue(mockWorkflows);

				const result = await workflowRepository.findByIds(workflowIds);

				expect(workflowRepository.find).toHaveBeenCalledWith({
					where: { id: In(workflowIds) },
				});
				expect(result).toEqual(mockWorkflows);
			});

			it('should find workflows by IDs with field selection', async () => {
				const workflowIds = ['workflow-1', 'workflow-2'];
				const fields = ['id', 'name', 'active'];
				const mockWorkflows = [
					{ id: 'workflow-1', name: 'Test 1', active: true },
					{ id: 'workflow-2', name: 'Test 2', active: false },
				];
				workflowRepository.find.mockResolvedValue(mockWorkflows);

				const result = await workflowRepository.findByIds(workflowIds, { fields });

				expect(workflowRepository.find).toHaveBeenCalledWith({
					where: { id: In(workflowIds) },
					select: fields,
				});
				expect(result).toEqual(mockWorkflows);
			});
		});
	});

	describe('Trigger Count Management', () => {
		describe('getActiveTriggerCount', () => {
			it('should return sum of trigger counts for active workflows', async () => {
				const expectedCount = 10;
				workflowRepository.sum.mockResolvedValue(expectedCount);

				const result = await workflowRepository.getActiveTriggerCount();

				expect(workflowRepository.sum).toHaveBeenCalledWith('triggerCount', {
					active: true,
				});
				expect(result).toBe(expectedCount);
			});

			it('should return 0 when sum returns null', async () => {
				workflowRepository.sum.mockResolvedValue(null);

				const result = await workflowRepository.getActiveTriggerCount();

				expect(result).toBe(0);
			});
		});

		describe('updateWorkflowTriggerCount', () => {
			it('should update trigger count for PostgreSQL', async () => {
				const workflowId = 'workflow-1';
				const triggerCount = 5;
				const updateResult = { affected: 1, raw: {}, generatedMaps: [] };

				mockGlobalConfig.database.type = 'postgresdb';
				mockUpdateQueryBuilder.execute.mockResolvedValue(updateResult);

				const result = await workflowRepository.updateWorkflowTriggerCount(
					workflowId,
					triggerCount,
				);

				expect(mockQueryBuilder.update).toHaveBeenCalled();
				expect(mockUpdateQueryBuilder.set).toHaveBeenCalledWith({
					triggerCount,
					updatedAt: expect.any(Function),
				});
				expect(mockUpdateQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: workflowId });
				expect(result).toEqual(updateResult);
			});

			it('should update trigger count for MySQL/MariaDB', async () => {
				const workflowId = 'workflow-1';
				const triggerCount = 5;
				const updateResult = { affected: 1, raw: {}, generatedMaps: [] };

				mockGlobalConfig.database.type = 'mysqldb';
				mockUpdateQueryBuilder.execute.mockResolvedValue(updateResult);

				const result = await workflowRepository.updateWorkflowTriggerCount(
					workflowId,
					triggerCount,
				);

				expect(mockQueryBuilder.update).toHaveBeenCalled();
				expect(mockUpdateQueryBuilder.set).toHaveBeenCalledWith({
					triggerCount,
					updatedAt: expect.any(Function),
				});
				expect(mockUpdateQueryBuilder.where).toHaveBeenCalledWith('id = :id', { id: workflowId });
				expect(result).toEqual(updateResult);
			});
		});
	});

	describe('Union Query Operations', () => {
		describe('buildBaseUnionQuery', () => {
			it('should build base union query with default options', () => {
				const workflowIds = ['workflow-1', 'workflow-2'];

				workflowRepository.getManyQuery = jest.fn().mockReturnValue(mockQueryBuilder);
				jest.spyOn(workflowRepository, 'parseSortingParams').mockReturnValue(['updatedAt', 'ASC']);
				// Mock the manager property properly
				Object.defineProperty(workflowRepository, 'manager', {
					value: mockDataSource.manager,
					writable: true,
				});

				const result = workflowRepository.buildBaseUnionQuery(workflowIds);

				expect(mockFolderRepository.getManyQuery).toHaveBeenCalled();
				expect(workflowRepository.getManyQuery).toHaveBeenCalled();
				expect(mockQueryBuilder.addCommonTableExpression).toHaveBeenCalledTimes(3);
				expect(result).toHaveProperty('baseQuery');
				expect(result).toHaveProperty('sortByColumn', 'updatedAt');
				expect(result).toHaveProperty('sortByDirection', 'ASC');
			});
		});

		describe('applySortingToUnionQuery', () => {
			it('should apply name sorting with case-insensitive ordering', () => {
				const options = { sortByColumn: 'name', sortByDirection: 'ASC' as const };

				workflowRepository.applySortingToUnionQuery(mockQueryBuilder, mockQueryBuilder, options);

				expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('"RESULT"."resource"', 'ASC');
				expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
					'LOWER("RESULT"."name")',
					'name_lower',
				);
				expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('name_lower', 'ASC');
			});

			it('should apply non-name column sorting', () => {
				const options = { sortByColumn: 'createdAt', sortByDirection: 'DESC' as const };

				workflowRepository.applySortingToUnionQuery(mockQueryBuilder, mockQueryBuilder, options);

				expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('"RESULT"."resource"', 'ASC');
				expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('"RESULT"."createdAt"', 'DESC');
			});
		});

		describe('removeNameLowerFromResults', () => {
			it('should remove name_lower property from results', () => {
				const results = [
					{
						id: 'workflow-1',
						name: 'Test',
						name_lower: 'test',
						resource: 'workflow',
						createdAt: new Date(),
						updatedAt: new Date(),
					},
					{
						id: 'folder-1',
						name: 'Folder',
						name_lower: 'folder',
						resource: 'folder',
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				];

				const cleaned = workflowRepository.removeNameLowerFromResults(results);

				expect(cleaned).toEqual([
					{
						id: 'workflow-1',
						name: 'Test',
						resource: 'workflow',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
					},
					{
						id: 'folder-1',
						name: 'Folder',
						resource: 'folder',
						createdAt: expect.any(Date),
						updatedAt: expect.any(Date),
					},
				]);
			});
		});
	});

	describe('Query Building and Filtering', () => {
		describe('createBaseQuery', () => {
			it('should create base query with workflow IDs', () => {
				const workflowIds = ['workflow-1', 'workflow-2'];

				const result = workflowRepository.createBaseQuery(workflowIds);

				expect(mockQueryBuilder.where).toHaveBeenCalledWith('workflow.id IN (:...workflowIds)', {
					workflowIds,
				});
				expect(result).toBe(mockQueryBuilder);
			});

			it('should handle empty workflow IDs array', () => {
				const workflowIds: string[] = [];

				workflowRepository.createBaseQuery(workflowIds);

				expect(mockQueryBuilder.where).toHaveBeenCalledWith('workflow.id IN (:...workflowIds)', {
					workflowIds: [''], // Should add dummy value to prevent SQL error
				});
			});
		});

		describe('applyNameFilter', () => {
			it('should apply name filter with LIKE pattern', () => {
				const filter = { name: 'Test Workflow' };

				workflowRepository.applyNameFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('LOWER(workflow.name) LIKE :name', {
					name: '%test workflow%',
				});
			});

			it('should not apply filter for empty name', () => {
				const filter = { name: '' };

				workflowRepository.applyNameFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
			});

			it('should not apply filter for undefined name', () => {
				workflowRepository.applyNameFilter(mockQueryBuilder, undefined);

				expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
			});
		});

		describe('applyParentFolderFilter', () => {
			it('should apply filter for PROJECT_ROOT', () => {
				const filter = { parentFolderId: PROJECT_ROOT };

				workflowRepository.applyParentFolderFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('workflow.parentFolderId IS NULL');
			});

			it('should apply filter for specific parent folder', () => {
				const filter = { parentFolderId: 'folder-1' };

				workflowRepository.applyParentFolderFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
					'workflow.parentFolderId = :parentFolderId',
					{
						parentFolderId: 'folder-1',
					},
				);
			});

			it('should apply filter for multiple parent folder IDs', () => {
				const filter = { parentFolderIds: ['folder-1', 'folder-2'] };

				workflowRepository.applyParentFolderFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
					'workflow.parentFolderId IN (:...parentFolderIds)',
					{
						parentFolderIds: ['folder-1', 'folder-2'],
					},
				);
			});

			it('should not apply filter for empty parentFolderIds array', () => {
				const filter = { parentFolderIds: [] };

				workflowRepository.applyParentFolderFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
			});
		});

		describe('applyTagsFilter', () => {
			it('should apply tags filter with complex subquery', () => {
				const filter = { tags: ['tag1', 'tag2'] };
				(isStringArray as unknown as jest.Mock).mockReturnValue(true);

				workflowRepository.applyTagsFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.subQuery).toHaveBeenCalled();
				expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
					'workflow.id IN (SELECT * FROM workflow)',
				);
				expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith({
					tagNames: ['tag1', 'tag2'],
					tagCount: 2,
				});
			});

			it('should not apply filter for empty tags array', () => {
				const filter = { tags: [] };
				(isStringArray as unknown as jest.Mock).mockReturnValue(true);

				workflowRepository.applyTagsFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
			});

			it('should not apply filter for non-string array', () => {
				const filter = { tags: [1, 2, 3] };
				(isStringArray as unknown as jest.Mock).mockReturnValue(false);

				workflowRepository.applyTagsFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
			});
		});

		describe('applyActiveFilter', () => {
			it('should apply active filter for true', () => {
				const filter = { active: true };

				workflowRepository.applyActiveFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('workflow.active = :active', {
					active: true,
				});
			});

			it('should apply active filter for false', () => {
				const filter = { active: false };

				workflowRepository.applyActiveFilter(mockQueryBuilder, filter);

				expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('workflow.active = :active', {
					active: false,
				});
			});

			it('should not apply filter for undefined active', () => {
				workflowRepository.applyActiveFilter(mockQueryBuilder, undefined);

				expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
			});
		});
	});

	describe('Workflow Management Operations', () => {
		describe('findStartingWith', () => {
			it('should find workflows starting with pattern', async () => {
				const workflowName = 'Test';
				const expectedWorkflows = [{ name: 'Test Workflow 1' }, { name: 'Test Workflow 2' }];
				workflowRepository.find.mockResolvedValue(expectedWorkflows);

				const result = await workflowRepository.findStartingWith(workflowName);

				expect(workflowRepository.find).toHaveBeenCalledWith({
					select: ['name'],
					where: { name: Like('Test%') },
				});
				expect(result).toEqual(expectedWorkflows);
			});
		});

		describe('updateActiveState', () => {
			it('should update workflow active state', async () => {
				const workflowId = 'workflow-1';
				const newState = false;
				const updateResult = { affected: 1 };
				workflowRepository.update.mockResolvedValue(updateResult);

				const result = await workflowRepository.updateActiveState(workflowId, newState);

				expect(workflowRepository.update).toHaveBeenCalledWith(
					{ id: workflowId },
					{ active: newState },
				);
				expect(result).toEqual(updateResult);
			});
		});

		describe('deactivateAll', () => {
			it('should deactivate all active workflows', async () => {
				const updateResult = { affected: 5 };
				workflowRepository.update.mockResolvedValue(updateResult);

				const result = await workflowRepository.deactivateAll();

				expect(workflowRepository.update).toHaveBeenCalledWith({ active: true }, { active: false });
				expect(result).toEqual(updateResult);
			});
		});

		describe('activateAll', () => {
			it('should activate all inactive workflows', async () => {
				const updateResult = { affected: 3 };
				workflowRepository.update.mockResolvedValue(updateResult);

				const result = await workflowRepository.activateAll();

				expect(workflowRepository.update).toHaveBeenCalledWith({ active: false }, { active: true });
				expect(result).toEqual(updateResult);
			});
		});

		describe('moveToFolder', () => {
			it('should move specific workflows to folder', async () => {
				const workflowIds = ['workflow-1', 'workflow-2'];
				const toFolderId = 'folder-1';
				workflowRepository.update.mockResolvedValue({ affected: 2 });

				await workflowRepository.moveToFolder(workflowIds, toFolderId);

				expect(workflowRepository.update).toHaveBeenCalledWith(
					{ id: In(workflowIds) },
					{ parentFolder: { id: toFolderId } },
				);
			});

			it('should move workflows to PROJECT_ROOT', async () => {
				const workflowIds = ['workflow-1'];
				const toFolderId = PROJECT_ROOT;

				await workflowRepository.moveToFolder(workflowIds, toFolderId);

				expect(workflowRepository.update).toHaveBeenCalledWith(
					{ id: In(workflowIds) },
					{ parentFolder: null },
				);
			});
		});
	});

	describe('Search and Node Type Operations', () => {
		describe('findWorkflowsWithNodeType', () => {
			it('should find workflows with specific node types', async () => {
				const nodeTypes = ['n8n-nodes-base.webhook', 'n8n-nodes-base.httpRequest'];
				const expectedWorkflows = [
					{ id: 'workflow-1', name: 'Webhook Flow', active: true },
					{ id: 'workflow-2', name: 'HTTP Flow', active: false },
				];

				(buildWorkflowsByNodesQuery as jest.Mock).mockReturnValue({
					whereClause: 'workflow.nodes LIKE :nodeType0 OR workflow.nodes LIKE :nodeType1',
					parameters: { nodeType0: nodeTypes[0], nodeType1: nodeTypes[1] },
				});
				mockQueryBuilder.getMany.mockResolvedValue(expectedWorkflows);

				const result = await workflowRepository.findWorkflowsWithNodeType(nodeTypes);

				expect(buildWorkflowsByNodesQuery).toHaveBeenCalledWith(nodeTypes, 'postgresdb');
				expect(mockQueryBuilder.select).toHaveBeenCalledWith([
					'workflow.id',
					'workflow.name',
					'workflow.active',
				]);
				expect(mockQueryBuilder.where).toHaveBeenCalledWith(
					'workflow.nodes LIKE :nodeType0 OR workflow.nodes LIKE :nodeType1',
					{ nodeType0: nodeTypes[0], nodeType1: nodeTypes[1] },
				);
				expect(result).toEqual(expectedWorkflows);
			});

			it('should return empty array for empty node types', async () => {
				const result = await workflowRepository.findWorkflowsWithNodeType([]);

				expect(result).toEqual([]);
				expect(buildWorkflowsByNodesQuery).not.toHaveBeenCalled();
			});

			it('should return empty array for null node types', async () => {
				const result = await workflowRepository.findWorkflowsWithNodeType(null);

				expect(result).toEqual([]);
			});
		});
	});

	describe('Folder Hierarchy Operations', () => {
		describe('getAllWorkflowIdsInHierarchy', () => {
			it('should get all workflow IDs in folder hierarchy', async () => {
				const folderId = 'folder-1';
				const projectId = 'project-1';
				const subFolderIds = ['subfolder-1', 'subfolder-2'];
				const workflowIds = ['workflow-1', 'workflow-2'];

				mockFolderRepository.getAllFolderIdsInHierarchy.mockResolvedValue(subFolderIds);
				workflowRepository.applySelect = jest.fn();
				workflowRepository.applyParentFolderFilter = jest.fn();
				mockQueryBuilder.getMany.mockResolvedValue([{ id: 'workflow-1' }, { id: 'workflow-2' }]);

				const result = await workflowRepository.getAllWorkflowIdsInHierarchy(folderId, projectId);

				expect(mockFolderRepository.getAllFolderIdsInHierarchy).toHaveBeenCalledWith(
					folderId,
					projectId,
				);
				expect(workflowRepository.applySelect).toHaveBeenCalledWith(mockQueryBuilder, { id: true });
				expect(workflowRepository.applyParentFolderFilter).toHaveBeenCalledWith(mockQueryBuilder, {
					parentFolderIds: [folderId, ...subFolderIds],
				});
				expect(result).toEqual(workflowIds);
			});
		});
	});

	describe('Sorting and Pagination', () => {
		describe('parseSortingParams', () => {
			it('should parse sorting parameters correctly', () => {
				const result = workflowRepository.parseSortingParams('name:desc');

				expect(result).toEqual(['name', 'DESC']);
			});

			it('should handle uppercase direction', () => {
				const result = workflowRepository.parseSortingParams('createdAt:ASC');

				expect(result).toEqual(['createdAt', 'ASC']);
			});
		});

		describe('applySortingByColumn', () => {
			it('should apply name sorting with case-insensitive ordering', () => {
				workflowRepository.applySortingByColumn(mockQueryBuilder, 'name', 'ASC');

				expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
					'LOWER(workflow.name)',
					'workflow_name_lower',
				);
				expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('workflow_name_lower', 'ASC');
			});

			it('should apply standard column sorting', () => {
				workflowRepository.applySortingByColumn(mockQueryBuilder, 'createdAt', 'DESC');

				expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('workflow.createdAt', 'DESC');
			});
		});
	});

	describe('Performance and optimization', () => {
		describe('getMany', () => {
			it('should return empty array for empty workflow IDs', async () => {
				const result = await workflowRepository.getMany([]);

				expect(result).toEqual([]);
			});

			it('should get many workflows with options', async () => {
				const workflowIds = ['workflow-1', 'workflow-2'];
				const options = { filter: { active: true } };
				const mockWorkflows = [
					{ id: 'workflow-1', name: 'Test 1', active: true },
					{ id: 'workflow-2', name: 'Test 2', active: true },
				];

				workflowRepository.getManyQuery = jest.fn().mockReturnValue(mockQueryBuilder);
				mockQueryBuilder.getMany.mockResolvedValue(mockWorkflows);

				const result = await workflowRepository.getMany(workflowIds, options);

				expect(workflowRepository.getManyQuery).toHaveBeenCalledWith(workflowIds, options);
				expect(result).toEqual(mockWorkflows);
			});
		});

		describe('getManyAndCount', () => {
			it('should return empty result for empty workflow IDs', async () => {
				const result = await workflowRepository.getManyAndCount([]);

				expect(result).toEqual({ workflows: [], count: 0 });
			});

			it('should get many workflows and count', async () => {
				const workflowIds = ['workflow-1', 'workflow-2'];
				const options = { filter: { active: true } };
				const mockWorkflows = [
					{ id: 'workflow-1', name: 'Test 1', active: true },
					{ id: 'workflow-2', name: 'Test 2', active: true },
				];

				workflowRepository.getManyQuery = jest.fn().mockReturnValue(mockQueryBuilder);
				mockQueryBuilder.getManyAndCount.mockResolvedValue([mockWorkflows, 2]);

				const result = await workflowRepository.getManyAndCount(workflowIds, options);

				expect(result).toEqual({ workflows: mockWorkflows, count: 2 });
			});
		});
	});

	describe('Edge cases and error handling', () => {
		it('should handle null/undefined values in filters gracefully', () => {
			const filters = [
				{ name: null },
				{ name: undefined },
				{ active: null },
				{ tags: null },
				{ tags: undefined },
				{ parentFolderIds: null },
			];

			filters.forEach((filter) => {
				expect(() => {
					workflowRepository.applyFilters(mockQueryBuilder, filter);
				}).not.toThrow();
			});
		});

		it('should handle database errors gracefully in trigger count update', async () => {
			const workflowId = 'workflow-1';
			const triggerCount = 5;
			const error = new Error('Database connection failed');

			mockUpdateQueryBuilder.execute.mockRejectedValue(error);

			await expect(
				workflowRepository.updateWorkflowTriggerCount(workflowId, triggerCount),
			).rejects.toThrow('Database connection failed');
		});
	});
});
