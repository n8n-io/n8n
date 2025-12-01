import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createRemoveConnectionTool, REMOVE_CONNECTION_TOOL } from '@/tools/remove-connection.tool';

import { createNodeType, nodeTypes } from '../../../test/test-utils';
import { createAddNodeTool, getAddNodeToolBase } from '../add-node.tool';
import { getBuilderTools, getBuilderToolsForDisplay } from '../builder-tools';
import { createCategorizePromptTool, CATEGORIZE_PROMPT_TOOL } from '../categorize-prompt.tool';
import { CONNECT_NODES_TOOL, createConnectNodesTool } from '../connect-nodes.tool';
import { GET_BEST_PRACTICES_TOOL, createGetBestPracticesTool } from '../get-best-practices.tool';
import { createGetNodeParameterTool, GET_NODE_PARAMETER_TOOL } from '../get-node-parameter.tool';
import {
	createGetWorkflowExamplesTool,
	GET_WORKFLOW_EXAMPLES_TOOL,
} from '../get-workflow-examples.tool';
import { createNodeDetailsTool, NODE_DETAILS_TOOL } from '../node-details.tool';
import { createNodeSearchTool, NODE_SEARCH_TOOL } from '../node-search.tool';
import { createRemoveNodeTool, REMOVE_NODE_TOOL } from '../remove-node.tool';
import {
	createUpdateNodeParametersTool,
	UPDATING_NODE_PARAMETER_TOOL,
} from '../update-node-parameters.tool';
import { createValidateWorkflowTool, VALIDATE_WORKFLOW_TOOL } from '../validate-workflow.tool';

jest.mock('../categorize-prompt.tool', () => ({
	CATEGORIZE_PROMPT_TOOL: {
		name: 'categorizePrompt',
		description: 'Categorize prompt',
	},
	createCategorizePromptTool: jest.fn().mockReturnValue({
		name: 'categorizePromptTool',
		tool: { name: 'categorizePromptTool' },
	}),
}));

jest.mock('../get-best-practices.tool', () => ({
	GET_BEST_PRACTICES_TOOL: {
		name: 'getBestPracticesTool',
		description: 'Get best practices',
	},
	createGetBestPracticesTool: jest.fn().mockReturnValue({
		name: 'getBestPracticesTool',
		tool: { name: 'getBestPracticesTool' },
	}),
}));

jest.mock('../get-workflow-examples.tool', () => ({
	GET_WORKFLOW_EXAMPLES_TOOL: {
		toolName: 'get_workflow_examples',
		displayTitle: 'Retrieving workflow examples',
	},
	createGetWorkflowExamplesTool: jest.fn().mockReturnValue({
		name: 'getWorkflowExamplesTool',
		tool: { name: 'getWorkflowExamplesTool' },
	}),
}));

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
		toolName: 'removeConnectionTool',
		displayTitle: 'Remove a connection between two nodes',
	},
	createRemoveConnectionTool: jest.fn().mockReturnValue({
		name: 'removeConnectionTool',
		tool: { name: 'removeConnectionTool' },
	}),
}));

jest.mock('../validate-workflow.tool', () => ({
	VALIDATE_WORKFLOW_TOOL: {
		toolName: 'validateWorkflowTool',
		displayTitle: 'Validate workflow',
	},
	createValidateWorkflowTool: jest.fn().mockReturnValue({
		name: 'validateWorkflowTool',
		tool: { name: 'validateWorkflowTool' },
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
		it('should return all builder tools including workflow examples when feature flag is enabled', () => {
			const tools = getBuilderTools({
				parsedNodeTypes,
				logger: mockLogger,
				llmComplexTask: mockLlmComplexTask,
				instanceUrl: 'https://test.n8n.io',
				featureFlags: { templateExamples: true },
			});

			expect(tools).toHaveLength(12);
			expect(createCategorizePromptTool).toHaveBeenCalledWith(mockLlmComplexTask, mockLogger);
			expect(createGetBestPracticesTool).toHaveBeenCalled();
			expect(createGetWorkflowExamplesTool).toHaveBeenCalledWith(mockLogger);
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
			expect(createValidateWorkflowTool).toHaveBeenCalledWith(parsedNodeTypes, mockLogger);
		});

		it('should exclude workflow examples tool when feature flag is disabled', () => {
			const tools = getBuilderTools({
				parsedNodeTypes,
				logger: mockLogger,
				llmComplexTask: mockLlmComplexTask,
				featureFlags: { templateExamples: false },
			});

			expect(tools).toHaveLength(11);
			expect(createGetWorkflowExamplesTool).not.toHaveBeenCalled();
		});

		it('should exclude workflow examples tool when feature flag is not provided', () => {
			const tools = getBuilderTools({
				parsedNodeTypes,
				llmComplexTask: mockLlmComplexTask,
			});

			expect(tools).toHaveLength(11);
			expect(createGetWorkflowExamplesTool).not.toHaveBeenCalled();
		});

		it('should exclude workflow examples tool when featureFlags is undefined', () => {
			const tools = getBuilderTools({
				parsedNodeTypes,
				llmComplexTask: mockLlmComplexTask,
				featureFlags: undefined,
			});

			expect(tools).toHaveLength(11);
			expect(createGetWorkflowExamplesTool).not.toHaveBeenCalled();
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
		it('should return all display tools including workflow examples when feature flag is enabled', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
				featureFlags: { templateExamples: true },
			});

			expect(tools).toHaveLength(12);
			expect(tools[0]).toBe(CATEGORIZE_PROMPT_TOOL);
			expect(tools[1]).toBe(GET_BEST_PRACTICES_TOOL);
			expect(tools[2]).toBe(GET_WORKFLOW_EXAMPLES_TOOL);
			expect(tools[3]).toBe(NODE_SEARCH_TOOL);
			expect(tools[4]).toBe(NODE_DETAILS_TOOL);
			expect(tools[6]).toBe(CONNECT_NODES_TOOL);
			expect(tools[7]).toBe(REMOVE_CONNECTION_TOOL);
			expect(tools[8]).toBe(REMOVE_NODE_TOOL);
			expect(tools[9]).toBe(UPDATING_NODE_PARAMETER_TOOL);
			expect(tools[10]).toBe(GET_NODE_PARAMETER_TOOL);
			expect(tools[11]).toBe(VALIDATE_WORKFLOW_TOOL);
			expect(getAddNodeToolBase).toHaveBeenCalledWith(parsedNodeTypes);
		});

		it('should exclude workflow examples tool when feature flag is disabled', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
				featureFlags: { templateExamples: false },
			});

			expect(tools).toHaveLength(11);
			expect(tools).not.toContain(GET_WORKFLOW_EXAMPLES_TOOL);
		});

		it('should exclude workflow examples tool when feature flag is not provided', () => {
			const tools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
			});

			expect(tools).toHaveLength(11);
			expect(tools).not.toContain(GET_WORKFLOW_EXAMPLES_TOOL);
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

	describe('consistency between getBuilderTools and getBuilderToolsForDisplay', () => {
		it('should return the same number of tools when feature flag is enabled', () => {
			const builderTools = getBuilderTools({
				parsedNodeTypes,
				llmComplexTask: mockLlmComplexTask,
				logger: mockLogger,
				featureFlags: { templateExamples: true },
			});

			const displayTools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
				featureFlags: { templateExamples: true },
			});

			expect(builderTools).toHaveLength(displayTools.length);
		});

		it('should return the same number of tools when feature flag is disabled', () => {
			const builderTools = getBuilderTools({
				parsedNodeTypes,
				llmComplexTask: mockLlmComplexTask,
				logger: mockLogger,
				featureFlags: { templateExamples: false },
			});

			const displayTools = getBuilderToolsForDisplay({
				nodeTypes: parsedNodeTypes,
				featureFlags: { templateExamples: false },
			});

			expect(builderTools).toHaveLength(displayTools.length);
		});
	});
});
