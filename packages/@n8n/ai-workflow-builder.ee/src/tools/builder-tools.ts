import type { INodeTypeDescription } from 'n8n-workflow';

import {
	CODE_BUILDER_GET_NODE_TYPES_TOOL,
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL,
	CODE_BUILDER_SEARCH_NODES_TOOL,
	CODE_BUILDER_TEXT_EDITOR_TOOL,
	CODE_BUILDER_VALIDATE_TOOL,
} from '@/code-builder/constants';
import type { BuilderToolBase } from '@/utils/stream-processor';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { getAddNodeToolBase } from './add-node.tool';
import { CONNECT_NODES_TOOL } from './connect-nodes.tool';
import { GET_DOCUMENTATION_TOOL } from './get-documentation.tool';
import { GET_EXECUTION_LOGS_TOOL } from './get-execution-logs.tool';
import { GET_EXECUTION_SCHEMA_TOOL } from './get-execution-schema.tool';
import { GET_EXPRESSION_DATA_MAPPING_TOOL } from './get-expression-data-mapping.tool';
import { GET_NODE_CONTEXT_TOOL } from './get-node-context.tool';
import { GET_NODE_PARAMETER_TOOL } from './get-node-parameter.tool';
import { GET_WORKFLOW_EXAMPLES_TOOL } from './get-workflow-examples.tool';
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
