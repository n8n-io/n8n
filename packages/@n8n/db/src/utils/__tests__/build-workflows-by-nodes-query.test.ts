import { buildWorkflowsByNodesQuery } from '../build-workflows-by-nodes-query';

describe('WorkflowRepository', () => {
	describe('filterWorkflowsByNodesConstructWhereClause', () => {
		it('should return the correct WHERE clause and parameters for sqlite', () => {
			const nodeTypes = ['HTTP Request', 'Set'];
			const expectedInQuery =
				"FROM json_each(workflow.nodes) WHERE json_extract(json_each.value, '$.type')";
			const expectedParameters = {
				nodeType0: 'HTTP Request',
				nodeType1: 'Set',
				nodeTypes,
			};

			const { whereClause, parameters } = buildWorkflowsByNodesQuery(nodeTypes, 'sqlite');

			expect(whereClause).toContain(expectedInQuery);
			expect(parameters).toEqual(expectedParameters);
		});

		it('should return the correct WHERE clause and parameters for postgresdb', () => {
			const nodeTypes = ['HTTP Request', 'Set'];
			const expectedInQuery = 'FROM jsonb_array_elements(workflow.nodes::jsonb) AS node';
			const expectedParameters = { nodeTypes };

			const { whereClause, parameters } = buildWorkflowsByNodesQuery(nodeTypes, 'postgresdb');

			expect(whereClause).toContain(expectedInQuery);
			expect(parameters).toEqual(expectedParameters);
		});

		it('should return the correct WHERE clause and parameters for mysqldb', () => {
			const nodeTypes = ['HTTP Request', 'Set'];
			const expectedWhereClause =
				"(JSON_SEARCH(JSON_EXTRACT(workflow.nodes, '$[*].type'), 'one', :nodeType0) IS NOT NULL OR JSON_SEARCH(JSON_EXTRACT(workflow.nodes, '$[*].type'), 'one', :nodeType1) IS NOT NULL)";
			const expectedParameters = {
				nodeType0: 'HTTP Request',
				nodeType1: 'Set',
				nodeTypes,
			};

			const { whereClause, parameters } = buildWorkflowsByNodesQuery(nodeTypes, 'mysqldb');

			expect(whereClause).toEqual(expectedWhereClause);
			expect(parameters).toEqual(expectedParameters);
		});
	});
});
