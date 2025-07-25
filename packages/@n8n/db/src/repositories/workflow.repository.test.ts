import type { GlobalConfig, DatabaseConfig } from '@n8n/config';
import type { DataSource } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { FolderRepository } from './folder.repository';
import { WorkflowRepository } from './workflow.repository';

describe('WorkflowRepository', () => {
	let workflowRepository: WorkflowRepository;
	const mockDataSource = mock<DataSource>();
	const mockGlobalConfig = mock<GlobalConfig>();
	const mockFolderRepository = mock<FolderRepository>();

	beforeEach(() => {
		workflowRepository = new WorkflowRepository(
			mockDataSource,
			mockGlobalConfig,
			mockFolderRepository,
		);
	});

	it('should be defined', () => {
		expect(workflowRepository).toBeDefined();
	});

	it('should findWorkflowsWithNodeType be defined', () => {
		expect(workflowRepository.findWorkflowsWithNodeType).toBeDefined();
	});

	describe('filterWorkflowsByNodesConstructWhereClause', () => {
		it('should return the correct WHERE clause and parameters for sqlite', () => {
			const mockDatabaseConfig = mock<DatabaseConfig>({ type: 'sqlite' });
			mockGlobalConfig.database = mockDatabaseConfig;
			workflowRepository = new WorkflowRepository(
				mockDataSource,
				mockGlobalConfig,
				mockFolderRepository,
			);
			const nodeTypes = ['HTTP Request', 'Set'];
			const expectedInQuery =
				"FROM json_each(workflow.nodes) WHERE json_extract(json_each.value, '$.type')";
			const expectedParameters = {
				nodeType0: 'HTTP Request',
				nodeType1: 'Set',
				nodeTypes,
			};

			const { whereClause, parameters } =
				workflowRepository['filterWorkflowsByNodesConstructWhereClause'](nodeTypes);

			expect(whereClause).toContain(expectedInQuery);
			expect(parameters).toEqual(expectedParameters);
		});

		it('should return the correct WHERE clause and parameters for postgresdb', () => {
			const mockDatabaseConfig = mock<DatabaseConfig>({ type: 'postgresdb' });
			mockGlobalConfig.database = mockDatabaseConfig;
			workflowRepository = new WorkflowRepository(
				mockDataSource,
				mockGlobalConfig,
				mockFolderRepository,
			);
			const nodeTypes = ['HTTP Request', 'Set'];
			const expectedInQuery = 'FROM jsonb_array_elements(workflow.nodes::jsonb) AS node';
			const expectedParameters = { nodeTypes };

			const { whereClause, parameters } =
				workflowRepository['filterWorkflowsByNodesConstructWhereClause'](nodeTypes);

			expect(whereClause).toContain(expectedInQuery);
			expect(parameters).toEqual(expectedParameters);
		});

		it('should return the correct WHERE clause and parameters for mysqldb', () => {
			const mockDatabaseConfig = mock<DatabaseConfig>({ type: 'mysqldb' });
			mockGlobalConfig.database = mockDatabaseConfig;
			workflowRepository = new WorkflowRepository(
				mockDataSource,
				mockGlobalConfig,
				mockFolderRepository,
			);
			const nodeTypes = ['HTTP Request', 'Set'];
			const expectedWhereClause =
				"(JSON_SEARCH(JSON_EXTRACT(workflow.nodes, '$[*].type'), 'one', :nodeType0) IS NOT NULL OR JSON_SEARCH(JSON_EXTRACT(workflow.nodes, '$[*].type'), 'one', :nodeType1) IS NOT NULL)";
			const expectedParameters = {
				nodeType0: 'HTTP Request',
				nodeType1: 'Set',
				nodeTypes,
			};

			const { whereClause, parameters } =
				workflowRepository['filterWorkflowsByNodesConstructWhereClause'](nodeTypes);

			expect(whereClause).toEqual(expectedWhereClause);
			expect(parameters).toEqual(expectedParameters);
		});
	});
});
