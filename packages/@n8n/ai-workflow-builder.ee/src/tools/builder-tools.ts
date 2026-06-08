import type { INodeTypeDescription } from 'n8n-workflow';

import {
	CODE_BUILDER_GET_NODE_TYPES_TOOL,
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL,
	CODE_BUILDER_SEARCH_NODES_TOOL,
	CODE_BUILDER_TEXT_EDITOR_TOOL,
	CODE_BUILDER_VALIDATE_TOOL,
} from '@/code-builder/constants.js';
import type { BuilderToolBase } from '@/utils/stream-processor.js';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent.js';

<<<<<<< HEAD
import { getAddNodeToolBase } from './add-node.tool';
import { CONNECT_NODES_TOOL } from './connect-nodes.tool';
import { GET_DOCUMENTATION_TOOL } from './get-documentation.tool';
import { GET_EXECUTION_LOGS_TOOL } from './get-execution-logs.tool';
import { GET_EXECUTION_SCHEMA_TOOL } from './get-execution-schema.tool';
import { GET_EXPRESSION_DATA_MAPPING_TOOL } from './get-expression-data-mapping.tool';
import { GET_NODE_CONTEXT_TOOL } from './get-node-context.tool';
import { GET_NODE_PARAMETER_TOOL } from './get-node-parameter.tool';
import { GET_WORKFLOW_OVERVIEW_TOOL } from './get-workflow-overview.tool';
import { INTROSPECT_TOOL } from './introspect.tool';
import { NODE_DETAILS_TOOL } from './node-details.tool';
import { NODE_SEARCH_TOOL } from './node-search.tool';
import { REMOVE_CONNECTION_TOOL } from './remove-connection.tool';
import { REMOVE_NODE_TOOL } from './remove-node.tool';
import { RENAME_NODE_TOOL } from './rename-node.tool';
import { UPDATING_NODE_PARAMETER_TOOL } from './update-node-parameters.tool';
import { VALIDATE_CONFIGURATION_TOOL } from './validate-configuration.tool';
import { VALIDATE_STRUCTURE_TOOL } from './validate-structure.tool';
=======
import { getAddNodeToolBase } from './add-node.tool.js';
import { CONNECT_NODES_TOOL } from './connect-nodes.tool.js';
import { GET_DOCUMENTATION_TOOL } from './get-documentation.tool.js';
import { GET_EXECUTION_LOGS_TOOL } from './get-execution-logs.tool.js';
import { GET_EXECUTION_SCHEMA_TOOL } from './get-execution-schema.tool.js';
import { GET_EXPRESSION_DATA_MAPPING_TOOL } from './get-expression-data-mapping.tool.js';
import { GET_NODE_CONTEXT_TOOL } from './get-node-context.tool.js';
import { GET_NODE_PARAMETER_TOOL } from './get-node-parameter.tool.js';
import { GET_WORKFLOW_EXAMPLES_TOOL } from './get-workflow-examples.tool.js';
import { GET_WORKFLOW_OVERVIEW_TOOL } from './get-workflow-overview.tool.js';
import { INTROSPECT_TOOL } from './introspect.tool.js';
import { NODE_DETAILS_TOOL } from './node-details.tool.js';
import { NODE_SEARCH_TOOL } from './node-search.tool.js';
import { REMOVE_CONNECTION_TOOL } from './remove-connection.tool.js';
import { REMOVE_NODE_TOOL } from './remove-node.tool.js';
import { RENAME_NODE_TOOL } from './rename-node.tool.js';
import { UPDATING_NODE_PARAMETER_TOOL } from './update-node-parameters.tool.js';
import { VALIDATE_CONFIGURATION_TOOL } from './validate-configuration.tool.js';
import { VALIDATE_STRUCTURE_TOOL } from './validate-structure.tool.js';
>>>>>>> 566376fa25 (chore: switch to NodeNext module resolution + add import extensions (no-changelog))
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

	// Add remaining tools
	tools.push(
		NODE_SEARCH_TOOL,
		NODE_DETAILS_TOOL,
		getAddNodeToolBase(nodeTypes),
		CONNECT_NODES_TOOL,
		REMOVE_CONNECTION_TOOL,
		REMOVE_NODE_TOOL,
		RENAME_NODE_TOOL,
		UPDATING_NODE_PARAMETER_TOOL,
		GET_NODE_PARAMETER_TOOL,
		VALIDATE_STRUCTURE_TOOL,
		VALIDATE_CONFIGURATION_TOOL,
		GET_EXECUTION_SCHEMA_TOOL,
		GET_EXECUTION_LOGS_TOOL,
		GET_EXPRESSION_DATA_MAPPING_TOOL,
		// Workflow context tools
		GET_WORKFLOW_OVERVIEW_TOOL,
		GET_NODE_CONTEXT_TOOL,
		// CodeBuilderAgent tools
		CODE_BUILDER_TEXT_EDITOR_TOOL,
		CODE_BUILDER_VALIDATE_TOOL,
		CODE_BUILDER_SEARCH_NODES_TOOL,
		CODE_BUILDER_GET_NODE_TYPES_TOOL,
		CODE_BUILDER_GET_SUGGESTED_NODES_TOOL,
	);

	// Conditionally add introspection tool based on feature flag
	if (featureFlags?.enableIntrospection === true) {
		tools.push(INTROSPECT_TOOL);
	}

	return tools;
}
