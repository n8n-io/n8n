import type { INodeTypeDescription } from 'n8n-workflow';

import { createNodeType, nodeTypes } from '../../../test/test-utils';
import { getAddNodeToolBase } from '../add-node.tool';
import { getBuilderToolsForDisplay } from '../builder-tools';

vi.mock('../get-documentation.tool', () => ({
	GET_DOCUMENTATION_TOOL: {
		toolName: 'get_documentation',
		displayTitle: 'Getting documentation',
	},
}));

vi.mock('../add-node.tool', () => ({
	getAddNodeToolBase: vi.fn().mockReturnValue({
		toolName: 'add_node',
		displayTitle: 'Add a node to the workflow',
	}),
}));

vi.mock('../connect-nodes.tool', () => ({
	CONNECT_NODES_TOOL: {
		toolName: 'connect_nodes',
		displayTitle: 'Connect two nodes',
	},
}));

vi.mock('../get-node-parameter.tool', () => ({
	GET_NODE_PARAMETER_TOOL: {
		toolName: 'get_node_parameter',
		displayTitle: 'Get node parameters',
	},
}));

vi.mock('../node-details.tool', () => ({
	NODE_DETAILS_TOOL: {
		toolName: 'node_details',
		displayTitle: 'Get node details',
	},
}));

vi.mock('../node-search.tool', () => ({
	NODE_SEARCH_TOOL: {
		toolName: 'node_search',
		displayTitle: 'Search for nodes',
	},
}));

vi.mock('../remove-node.tool', () => ({
	REMOVE_NODE_TOOL: {
		toolName: 'remove_node',
		displayTitle: 'Remove a node',
	},
}));

vi.mock('../rename-node.tool', () => ({
	RENAME_NODE_TOOL: {
		toolName: 'rename_node',
		displayTitle: 'Renaming node',
	},
}));

vi.mock('../update-node-parameters.tool', () => ({
	UPDATING_NODE_PARAMETER_TOOL: {
		toolName: 'update_node_parameters',
		displayTitle: 'Update node parameters',
	},
}));

vi.mock('../remove-connection.tool', () => ({
	REMOVE_CONNECTION_TOOL: {
		toolName: 'remove_connection',
		displayTitle: 'Remove a connection between two nodes',
	},
}));

vi.mock('../validate-structure.tool', () => ({
	VALIDATE_STRUCTURE_TOOL: {
		toolName: 'validate_structure',
		displayTitle: 'Validate workflow structure',
	},
}));

vi.mock('../validate-configuration.tool', () => ({
	VALIDATE_CONFIGURATION_TOOL: {
		toolName: 'validate_configuration',
		displayTitle: 'Validate node configuration',
	},
}));

vi.mock('../introspect.tool', () => ({
	INTROSPECT_TOOL: {
		toolName: 'introspect',
		displayTitle: 'Introspecting',
	},
}));

vi.mock('../get-execution-schema.tool', () => ({
	GET_EXECUTION_SCHEMA_TOOL: {
		toolName: 'get_execution_schema',
		displayTitle: 'Getting execution schema',
	},
}));

vi.mock('../get-execution-logs.tool', () => ({
	GET_EXECUTION_LOGS_TOOL: {
		toolName: 'get_execution_logs',
		displayTitle: 'Getting execution logs',
	},
}));

vi.mock('../get-expression-data-mapping.tool', () => ({
	GET_EXPRESSION_DATA_MAPPING_TOOL: {
		toolName: 'get_expression_data_mapping',
		displayTitle: 'Getting expression data mapping',
	},
}));

vi.mock('../get-workflow-overview.tool', () => ({
	GET_WORKFLOW_OVERVIEW_TOOL: {
		toolName: 'get_workflow_overview',
		displayTitle: 'Getting workflow overview',
	},
}));

vi.mock('../get-node-context.tool', () => ({
	GET_NODE_CONTEXT_TOOL: {
		toolName: 'get_node_context',
		displayTitle: 'Getting node context',
	},
}));

vi.mock('@/code-builder/constants', () => ({
	CODE_BUILDER_TEXT_EDITOR_TOOL: {
		toolName: 'str_replace_based_edit_tool',
		displayTitle: 'Editing workflow',
	},
	CODE_BUILDER_VALIDATE_TOOL: {
		toolName: 'validate_workflow',
		displayTitle: 'Validating workflow',
	},
	CODE_BUILDER_SEARCH_NODES_TOOL: {
		toolName: 'search_nodes',
		displayTitle: 'Searching nodes',
	},
	CODE_BUILDER_GET_NODE_TYPES_TOOL: {
		toolName: 'get_node_types',
		displayTitle: 'Getting node definitions',
	},
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: {
		toolName: 'get_suggested_nodes',
		displayTitle: 'Getting suggested nodes',
	},
}));

describe('builder-tools', () => {
	let parsedNodeTypes: INodeTypeDescription[];

	beforeEach(() => {
		vi.clearAllMocks();
		parsedNodeTypes = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook];
	});

	describe('getBuilderToolsForDisplay', () => {
		// Base tools (always included): get_documentation, node_search, node_details, add_node,
		// connect_nodes, remove_connection, remove_node, rename_node, update_node_parameters,
		// get_node_parameter, validate_structure, validate_configuration,
		// get_execution_schema, get_execution_logs, get_expression_data_mapping,
		// get_workflow_overview, get_node_context
		const BASE_TOOL_COUNT = 22;

		it('should return base tools when no feature flags are provided', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
			});

			expect(tools).toHaveLength(BASE_TOOL_COUNT);
			expect(tools.map((t) => t.toolName)).not.toContain('introspect');
			expect(getAddNodeToolBase).toHaveBeenCalledWith(parsedNodeTypes);
		});

		it('should include introspect tool when enableIntrospection flag is enabled', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
				featureFlags: { enableIntrospection: true },
			});

			expect(tools).toHaveLength(BASE_TOOL_COUNT + 1);
			expect(tools.map((t) => t.toolName)).toContain('introspect');
		});

		it('should work with empty node types array', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: [],
			});

			expect(tools).toHaveLength(BASE_TOOL_COUNT);
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
