import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createRemoveConnectionTool, REMOVE_CONNECTION_TOOL } from '@/tools/remove-connection.tool';

import { createNodeType, nodeTypes } from '../../../test/test-utils';
import { createAddNodeTool, getAddNodeToolBase } from '../add-node.tool';
import { getBuilderTools, getBuilderToolsForDisplay } from '../builder-tools';
import { CONNECT_NODES_TOOL, createConnectNodesTool } from '../connect-nodes.tool';
import { createGetNodeParameterTool, GET_NODE_PARAMETER_TOOL } from '../get-node-parameter.tool';
import { createNodeDetailsTool, NODE_DETAILS_TOOL } from '../node-details.tool';
import { createNodeSearchTool, NODE_SEARCH_TOOL } from '../node-search.tool';
import { createRemoveNodeTool, REMOVE_NODE_TOOL } from '../remove-node.tool';
import {
	createUpdateNodeParametersTool,
	UPDATING_NODE_PARAMETER_TOOL,
} from '../update-node-parameters.tool';

jest.mock('../add-node.tool', () => ({
	createAddNodeTool: jest.fn().mockReturnValue({
		name: 'addNodeTool',
		tool: { name: 'addNodeTool' },
	}),
	getAddNodeToolBase: jest.fn().mockReturnValue({
		name: 'addNodeTool',
		description: 'Add a node to the workflow',
	}),
}));

jest.mock('../connect-nodes.tool', () => ({
	CONNECT_NODES_TOOL: {
		name: 'connectNodesTool',
		description: 'Connect two nodes',
	},
	createConnectNodesTool: jest.fn().mockReturnValue({
		name: 'connectNodesTool',
		tool: { name: 'connectNodesTool' },
	}),
}));

jest.mock('../get-node-parameter.tool', () => ({
	GET_NODE_PARAMETER_TOOL: {
		name: 'getNodeParameterTool',
		description: 'Get node parameters',
	},
	createGetNodeParameterTool: jest.fn().mockReturnValue({
		name: 'getNodeParameterTool',
		tool: { name: 'getNodeParameterTool' },
	}),
}));

jest.mock('../node-details.tool', () => ({
	NODE_DETAILS_TOOL: {
		name: 'nodeDetailsTool',
		description: 'Get node details',
	},
	createNodeDetailsTool: jest.fn().mockReturnValue({
		name: 'nodeDetailsTool',
		tool: { name: 'nodeDetailsTool' },
	}),
}));

jest.mock('../node-search.tool', () => ({
	NODE_SEARCH_TOOL: {
		name: 'nodeSearchTool',
		description: 'Search for nodes',
	},
	createNodeSearchTool: jest.fn().mockReturnValue({
		name: 'nodeSearchTool',
		tool: { name: 'nodeSearchTool' },
	}),
}));

jest.mock('../remove-node.tool', () => ({
	REMOVE_NODE_TOOL: {
		name: 'removeNodeTool',
		description: 'Remove a node',
	},
	createRemoveNodeTool: jest.fn().mockReturnValue({
		name: 'removeNodeTool',
		tool: { name: 'removeNodeTool' },
	}),
}));

jest.mock('../update-node-parameters.tool', () => ({
	UPDATING_NODE_PARAMETER_TOOL: {
		name: 'updateNodeParametersTool',
		description: 'Update node parameters',
	},
	createUpdateNodeParametersTool: jest.fn().mockReturnValue({
		name: 'updateNodeParametersTool',
		tool: { name: 'updateNodeParametersTool' },
	}),
}));

jest.mock('../remove-connection.tool', () => ({
	REMOVE_CONNECTION_TOOL: {
		name: 'removeConnectionTool',
		description: 'Remove a connection between two nodes',
	},
	createRemoveConnectionTool: jest.fn().mockReturnValue({
		name: 'removeConnectionTool',
		tool: { name: 'removeConnectionTool' },
	}),
}));

describe('builder-tools', () => {
	let mockLogger: Logger;
	let mockLlmComplexTask: BaseChatModel;
	let parsedNodeTypes: INodeTypeDescription[];

	beforeEach(() => {
		jest.clearAllMocks();
		mockLogger = mock<Logger>();
		mockLlmComplexTask = mock<BaseChatModel>();
		parsedNodeTypes = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook];
	});

	describe('getBuilderTools', () => {
		it('should return all builder tools in the correct order', () => {
			const tools = getBuilderTools({
				parsedNodeTypes,
				logger: mockLogger,
				llmComplexTask: mockLlmComplexTask,
				instanceUrl: 'https://test.n8n.io',
			});

			expect(tools).toHaveLength(8);
			expect(createNodeSearchTool).toHaveBeenCalledWith(parsedNodeTypes);
			expect(createNodeDetailsTool).toHaveBeenCalledWith(parsedNodeTypes);
			expect(createAddNodeTool).toHaveBeenCalledWith(parsedNodeTypes);
			expect(createRemoveConnectionTool).toHaveBeenCalled();
			expect(createConnectNodesTool).toHaveBeenCalledWith(parsedNodeTypes, mockLogger);
			expect(createRemoveNodeTool).toHaveBeenCalledWith(mockLogger);
			expect(createUpdateNodeParametersTool).toHaveBeenCalledWith(
				parsedNodeTypes,
				mockLlmComplexTask,
				mockLogger,
				'https://test.n8n.io',
			);
			expect(createGetNodeParameterTool).toHaveBeenCalled();
		});

		it('should work without optional parameters', () => {
			const tools = getBuilderTools({
				parsedNodeTypes,
				llmComplexTask: mockLlmComplexTask,
			});

			expect(tools).toHaveLength(8);
			expect(createConnectNodesTool).toHaveBeenCalledWith(parsedNodeTypes, undefined);
			expect(createRemoveNodeTool).toHaveBeenCalledWith(undefined);
			expect(createUpdateNodeParametersTool).toHaveBeenCalledWith(
				parsedNodeTypes,
				mockLlmComplexTask,
				undefined,
				undefined,
			);
		});

		it('should pass through different node types', () => {
			const customNodeTypes = [
				createNodeType({ name: 'custom.node1' }),
				createNodeType({ name: 'custom.node2' }),
			];

			getBuilderTools({
				parsedNodeTypes: customNodeTypes,
				llmComplexTask: mockLlmComplexTask,
			});

			expect(createNodeSearchTool).toHaveBeenCalledWith(customNodeTypes);
			expect(createNodeDetailsTool).toHaveBeenCalledWith(customNodeTypes);
			expect(createAddNodeTool).toHaveBeenCalledWith(customNodeTypes);
			expect(createConnectNodesTool).toHaveBeenCalledWith(customNodeTypes, undefined);
		});
	});

	describe('getBuilderToolsForDisplay', () => {
		it('should return all display tools in the correct order', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
			});

			expect(tools).toHaveLength(8);
			expect(tools[0]).toBe(NODE_SEARCH_TOOL);
			expect(tools[1]).toBe(NODE_DETAILS_TOOL);
			expect(tools[3]).toBe(CONNECT_NODES_TOOL);
			expect(tools[4]).toBe(REMOVE_CONNECTION_TOOL);
			expect(tools[5]).toBe(REMOVE_NODE_TOOL);
			expect(tools[6]).toBe(UPDATING_NODE_PARAMETER_TOOL);
			expect(tools[7]).toBe(GET_NODE_PARAMETER_TOOL);
			expect(getAddNodeToolBase).toHaveBeenCalledWith(parsedNodeTypes);
		});

		it('should work with empty node types array', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: [],
			});

			expect(tools).toHaveLength(8);
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

	describe('consistency between getBuilderTools and getBuilderToolsForDisplay', () => {
		it('should return the same number of tools', () => {
			const builderTools = getBuilderTools({
				parsedNodeTypes,
				llmComplexTask: mockLlmComplexTask,
				logger: mockLogger,
			});

			const displayTools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
			});

			expect(builderTools).toHaveLength(displayTools.length);
		});
	});
});
