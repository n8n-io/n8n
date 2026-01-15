import type { INodeTypeDescription } from 'n8n-workflow';

import type { BuilderToolBase } from '@/utils/stream-processor';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { getAddNodeToolBase } from './add-node.tool';
import { CONNECT_NODES_TOOL } from './connect-nodes.tool';
import { GET_DOCUMENTATION_TOOL } from './get-documentation.tool';
import { GET_NODE_PARAMETER_TOOL } from './get-node-parameter.tool';
import { GET_WORKFLOW_EXAMPLES_TOOL } from './get-workflow-examples.tool';
import { NODE_DETAILS_TOOL } from './node-details.tool';
import { NODE_SEARCH_TOOL } from './node-search.tool';
import { REMOVE_CONNECTION_TOOL } from './remove-connection.tool';
import { REMOVE_NODE_TOOL } from './remove-node.tool';
import { UPDATING_NODE_PARAMETER_TOOL } from './update-node-parameters.tool';
import { VALIDATE_CONFIGURATION_TOOL } from './validate-configuration.tool';
import { VALIDATE_STRUCTURE_TOOL } from './validate-structure.tool';

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
	const tools: BuilderToolBase[] = [GET_DOCUMENTATION_TOOL];

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
		VALIDATE_STRUCTURE_TOOL,
		VALIDATE_CONFIGURATION_TOOL,
	);

	return tools;
}
