import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { createAddNodeTool, getAddNodeToolBase } from './add-node.tool';
import { CONNECT_NODES_TOOL, createConnectNodesTool } from './connect-nodes.tool';
import { createGetNodeParameterTool, GET_NODE_PARAMETER_TOOL } from './get-node-parameter.tool';
import { createNodeDetailsTool, NODE_DETAILS_TOOL } from './node-details.tool';
import { createNodeSearchTool, NODE_SEARCH_TOOL } from './node-search.tool';
import { createRemoveConnectionTool, REMOVE_CONNECTION_TOOL } from './remove-connection.tool';
import { createRemoveNodeTool, REMOVE_NODE_TOOL } from './remove-node.tool';
import {
	createUpdateNodeParametersTool,
	UPDATING_NODE_PARAMETER_TOOL,
} from './update-node-parameters.tool';

export function getBuilderTools({
	parsedNodeTypes,
	logger,
	llmComplexTask,
	instanceUrl,
}: {
	parsedNodeTypes: INodeTypeDescription[];
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
}): BuilderTool[] {
	return [
		createNodeSearchTool(parsedNodeTypes),
		createNodeDetailsTool(parsedNodeTypes),
		createAddNodeTool(parsedNodeTypes),
		createConnectNodesTool(parsedNodeTypes, logger),
		createRemoveConnectionTool(logger),
		createRemoveNodeTool(logger),
		createUpdateNodeParametersTool(parsedNodeTypes, llmComplexTask, logger, instanceUrl),
		createGetNodeParameterTool(),
	];
}

/**
 * Return display information for tools
 * Without the actual LangChain implementation
 * Used when loading previous sessions for example
 */
export function getBuilderToolsForDisplay({
	nodeTypes,
}: { nodeTypes: INodeTypeDescription[] }): BuilderToolBase[] {
	return [
		NODE_SEARCH_TOOL,
		NODE_DETAILS_TOOL,
		getAddNodeToolBase(nodeTypes),
		CONNECT_NODES_TOOL,
		REMOVE_CONNECTION_TOOL,
		REMOVE_NODE_TOOL,
		UPDATING_NODE_PARAMETER_TOOL,
		GET_NODE_PARAMETER_TOOL,
	];
}
