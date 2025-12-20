import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { createAddNodeTool, getAddNodeToolBase } from './add-node.tool';
import { CATEGORIZE_PROMPT_TOOL, createCategorizePromptTool } from './categorize-prompt.tool';
import { CONNECT_NODES_TOOL, createConnectNodesTool } from './connect-nodes.tool';
import { createGetBestPracticesTool, GET_BEST_PRACTICES_TOOL } from './get-best-practices.tool';
import { createGetNodeParameterTool, GET_NODE_PARAMETER_TOOL } from './get-node-parameter.tool';
import {
	createGetWorkflowExamplesTool,
	GET_WORKFLOW_EXAMPLES_TOOL,
} from './get-workflow-examples.tool';
import { createNodeDetailsTool, NODE_DETAILS_TOOL } from './node-details.tool';
import { createNodeSearchTool, NODE_SEARCH_TOOL } from './node-search.tool';
import { createRemoveConnectionTool, REMOVE_CONNECTION_TOOL } from './remove-connection.tool';
import { createRemoveNodeTool, REMOVE_NODE_TOOL } from './remove-node.tool';
import {
	createUpdateNodeParametersTool,
	UPDATING_NODE_PARAMETER_TOOL,
} from './update-node-parameters.tool';
import { createValidateWorkflowTool, VALIDATE_WORKFLOW_TOOL } from './validate-workflow.tool';

export function getBuilderTools({
	parsedNodeTypes,
	logger,
	llmComplexTask,
	instanceUrl,
	featureFlags,
}: {
	parsedNodeTypes: INodeTypeDescription[];
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
	featureFlags?: BuilderFeatureFlags;
}): BuilderTool[] {
	const tools: BuilderTool[] = [
		createCategorizePromptTool(llmComplexTask, logger),
		createGetBestPracticesTool(),
	];

	// Conditionally add workflow examples tool based on feature flag
	// Only enabled when flag is explicitly true
	if (featureFlags?.templateExamples === true) {
		tools.push(createGetWorkflowExamplesTool(logger));
	}

	// Add remaining tools
	tools.push(
		createNodeSearchTool(parsedNodeTypes),
		createNodeDetailsTool(parsedNodeTypes, logger),
		createAddNodeTool(parsedNodeTypes),
		createConnectNodesTool(parsedNodeTypes, logger),
		createRemoveConnectionTool(logger),
		createRemoveNodeTool(logger),
		createUpdateNodeParametersTool(parsedNodeTypes, llmComplexTask, logger, instanceUrl),
		createGetNodeParameterTool(),
		createValidateWorkflowTool(parsedNodeTypes, logger),
	);

	return tools;
}

/**
 * Return display information for tools
 * Without the actual LangChain implementation
 * Used when loading previous sessions for example
 */
export function getBuilderToolsForDisplay({
	nodeTypes,
	featureFlags,
}: {
	nodeTypes: INodeTypeDescription[];
	featureFlags?: BuilderFeatureFlags;
}): BuilderToolBase[] {
	const tools: BuilderToolBase[] = [CATEGORIZE_PROMPT_TOOL, GET_BEST_PRACTICES_TOOL];

	// Conditionally add workflow examples tool based on feature flag
	// Only enabled when flag is explicitly true
	if (featureFlags?.templateExamples === true) {
		tools.push(GET_WORKFLOW_EXAMPLES_TOOL);
	}

	// Add remaining tools
	tools.push(
		NODE_SEARCH_TOOL,
		NODE_DETAILS_TOOL,
		getAddNodeToolBase(nodeTypes),
		CONNECT_NODES_TOOL,
		REMOVE_CONNECTION_TOOL,
		REMOVE_NODE_TOOL,
		UPDATING_NODE_PARAMETER_TOOL,
		GET_NODE_PARAMETER_TOOL,
		VALIDATE_WORKFLOW_TOOL,
	);

	return tools;
}
