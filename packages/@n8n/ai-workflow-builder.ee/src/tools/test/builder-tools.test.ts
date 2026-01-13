import type { INodeTypeDescription } from 'n8n-workflow';

import { createNodeType, nodeTypes } from '../../../test/test-utils';
import { getAddNodeToolBase } from '../add-node.tool';
import { getBuilderToolsForDisplay } from '../builder-tools';

jest.mock('../get-best-practices.tool', () => ({
	GET_BEST_PRACTICES_TOOL: {
		toolName: 'get_best_practices',
		displayTitle: 'Get best practices',
	},
}));

jest.mock('../get-workflow-examples.tool', () => ({
	GET_WORKFLOW_EXAMPLES_TOOL: {
		toolName: 'get_workflow_examples',
		displayTitle: 'Retrieving workflow examples',
	},
}));

jest.mock('../add-node.tool', () => ({
	getAddNodeToolBase: jest.fn().mockReturnValue({
		toolName: 'add_node',
		displayTitle: 'Add a node to the workflow',
	}),
}));

jest.mock('../connect-nodes.tool', () => ({
	CONNECT_NODES_TOOL: {
		toolName: 'connect_nodes',
		displayTitle: 'Connect two nodes',
	},
}));

jest.mock('../get-node-parameter.tool', () => ({
	GET_NODE_PARAMETER_TOOL: {
		toolName: 'get_node_parameter',
		displayTitle: 'Get node parameters',
	},
}));

jest.mock('../node-details.tool', () => ({
	NODE_DETAILS_TOOL: {
		toolName: 'node_details',
		displayTitle: 'Get node details',
	},
}));

jest.mock('../node-search.tool', () => ({
	NODE_SEARCH_TOOL: {
		toolName: 'node_search',
		displayTitle: 'Search for nodes',
	},
}));

jest.mock('../remove-node.tool', () => ({
	REMOVE_NODE_TOOL: {
		toolName: 'remove_node',
		displayTitle: 'Remove a node',
	},
}));

jest.mock('../update-node-parameters.tool', () => ({
	UPDATING_NODE_PARAMETER_TOOL: {
		toolName: 'update_node_parameters',
		displayTitle: 'Update node parameters',
	},
}));

jest.mock('../remove-connection.tool', () => ({
	REMOVE_CONNECTION_TOOL: {
		toolName: 'remove_connection',
		displayTitle: 'Remove a connection between two nodes',
	},
}));

jest.mock('../validate-structure.tool', () => ({
	VALIDATE_STRUCTURE_TOOL: {
		toolName: 'validate_structure',
		displayTitle: 'Validate workflow structure',
	},
}));

jest.mock('../validate-configuration.tool', () => ({
	VALIDATE_CONFIGURATION_TOOL: {
		toolName: 'validate_configuration',
		displayTitle: 'Validate node configuration',
	},
}));

describe('builder-tools', () => {
	let parsedNodeTypes: INodeTypeDescription[];

	beforeEach(() => {
		jest.clearAllMocks();
		parsedNodeTypes = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook];
	});

	describe('getBuilderToolsForDisplay', () => {
		it('should return all display tools including workflow examples when feature flag is enabled', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
				featureFlags: { templateExamples: true },
			});

			// 12 tools: best_practices, workflow_examples, node_search, node_details, add_node,
			// connect_nodes, remove_connection, remove_node, update_node_parameters,
			// get_node_parameter, validate_structure, validate_configuration
			expect(tools).toHaveLength(12);
			expect(getAddNodeToolBase).toHaveBeenCalledWith(parsedNodeTypes);
		});

		it('should exclude workflow examples tool when feature flag is disabled', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
				featureFlags: { templateExamples: false },
			});

			expect(tools).toHaveLength(11);
		});

		it('should exclude workflow examples tool when feature flag is not provided', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
			});

			expect(tools).toHaveLength(11);
		});

		it('should work with empty node types array', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: [],
			});

			expect(tools).toHaveLength(11);
			expect(getAddNodeToolBase).toHaveBeenCalledWith([]);
		});

		it('should work with different node types', () => {
			const customNodeTypes = [
				createNodeType({ name: 'custom.display.node1' }),
				createNodeType({ name: 'custom.display.node2' }),
			];

			getBuilderToolsForDisplay({
				nodeTypes: customNodeTypes,
			});

			expect(getAddNodeToolBase).toHaveBeenCalledWith(customNodeTypes);
		});
	});
});
