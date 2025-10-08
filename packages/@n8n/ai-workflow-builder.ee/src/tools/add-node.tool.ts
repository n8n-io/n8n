import { tool } from '@langchain/core/tools';
import type { INode, INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { NodeTypeNotFoundError, ValidationError } from '../errors';
import { createNodeInstance, generateUniqueName } from './utils/node-creation.utils';
import { calculateNodePosition } from './utils/node-positioning.utils';
import { isSubNode } from '../utils/node-helpers';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, addNodeToWorkflow, getWorkflowState } from './helpers/state';
import { findNodeType } from './helpers/validation';
import type { AddedNode } from '../types/nodes';
import type { AddNodeOutput, ToolError } from '../types/tools';

/**
 * Schema for node creation input
 */
export const nodeCreationSchema = z.object({
	nodeType: z.string().describe('The type of node to add (e.g., n8n-nodes-base.httpRequest)'),
	name: z
		.string()
		.describe('A descriptive name for the node that clearly indicates its purpose in the workflow'),
	connectionParametersReasoning: z
		.string()
		.describe(
			'REQUIRED: Explain your reasoning about connection parameters. Consider: Does this node have dynamic inputs/outputs? Does it need mode/operation parameters? For example: "Vector Store has dynamic inputs based on mode, so I need to set mode:insert for document input" or "HTTP Request has static inputs, so no special parameters needed"',
		),
	connectionParameters: z
		.object({})
		.passthrough()
		.describe(
			'Parameters that affect node connections (e.g., mode: "insert" for Vector Store). Pass an empty object {} if no connection parameters are needed. Only connection-affecting parameters like mode, operation, resource, action, etc. are allowed.',
		),
});

/**
 * Create a new node with proper positioning and naming
 */
function createNode(
	nodeType: INodeTypeDescription,
	customName: string,
	existingNodes: INode[],
	nodeTypes: INodeTypeDescription[],
	connectionParameters?: INodeParameters,
): INode {
	// Generate unique name
	const baseName = customName ?? nodeType.defaults?.name ?? nodeType.displayName;
	const uniqueName = generateUniqueName(baseName, existingNodes);

	// Calculate position
	const position = calculateNodePosition(existingNodes, isSubNode(nodeType), nodeTypes);

	// Create the node instance with connection parameters
	return createNodeInstance(nodeType, uniqueName, position, connectionParameters);
}

/**
 * Build the response message for added node
 */
function buildResponseMessage(addedNode: AddedNode, nodeTypes: INodeTypeDescription[]): string {
	const nodeType = nodeTypes.find((nt) => nt.name === addedNode.type);
	const nodeTypeInfo = nodeType && isSubNode(nodeType) ? ' (sub-node)' : '';
	return `Successfully added "${addedNode.name}" (${addedNode.displayName ?? addedNode.type})${nodeTypeInfo} with ID ${addedNode.id}`;
}

function getCustomNodeTitle(
	input: Record<string, unknown>,
	nodeTypes: INodeTypeDescription[],
): string {
	if ('nodeType' in input && typeof input['nodeType'] === 'string') {
		const nodeType = nodeTypes.find((type) => type.name === input.nodeType);
		if (nodeType) {
			return `Adding ${nodeType.displayName} node`;
		}
	}

	// single "node" not plural "nodes" because this pertains to this specific tool call
	return 'Adding node';
}

export function getAddNodeToolBase(nodeTypes: INodeTypeDescription[]): BuilderToolBase {
	return {
		toolName: 'add_nodes',
		displayTitle: 'Adding nodes',
		getCustomDisplayTitle: (input: Record<string, unknown>) => getCustomNodeTitle(input, nodeTypes),
	};
}

/**
 * Factory function to create the add node tool
 */
export function createAddNodeTool(nodeTypes: INodeTypeDescription[]): BuilderTool {
	const builderToolBase = getAddNodeToolBase(nodeTypes);
	const dynamicTool = tool(
		async (input, config) => {
			const reporter = createProgressReporter(
				config,
				builderToolBase.toolName,
				builderToolBase.displayTitle,
				getCustomNodeTitle(input, nodeTypes),
			);

			try {
				// Validate input using Zod schema
				const validatedInput = nodeCreationSchema.parse(input);
				const { nodeType, name, connectionParametersReasoning, connectionParameters } =
					validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Report progress with reasoning
				reporter.progress(`Adding ${name} (${connectionParametersReasoning})`);

				// Find the node type
				const nodeTypeDesc = findNodeType(nodeType, nodeTypes);
				if (!nodeTypeDesc) {
					const nodeError = new NodeTypeNotFoundError(nodeType);
					const error = {
						message: nodeError.message,
						code: 'NODE_TYPE_NOT_FOUND',
						details: { nodeType },
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Create the new node
				const newNode = createNode(
					nodeTypeDesc,
					name,
					workflow.nodes, // Use current workflow nodes
					nodeTypes,
					connectionParameters as INodeParameters,
				);

				// Build node info
				const addedNodeInfo: AddedNode = {
					id: newNode.id,
					name: newNode.name,
					type: newNode.type,
					displayName: nodeTypeDesc.displayName,
					position: newNode.position,
					parameters: newNode.parameters,
				};

				// Build success message
				const message = buildResponseMessage(addedNodeInfo, nodeTypes);

				// Report completion
				const output: AddNodeOutput = {
					addedNode: addedNodeInfo,
					message,
				};
				reporter.complete(output);

				// Return success with state updates - single node
				const stateUpdates = addNodeToWorkflow(newNode);
				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				// Handle validation or unexpected errors
				let toolError: ToolError;

				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						field: error.errors[0]?.path.join('.'),
						value: error.errors[0]?.message,
					});
					toolError = {
						message: validationError.message,
						code: 'VALIDATION_ERROR',
						details: error.errors,
					};
				} else {
					toolError = {
						message: error instanceof Error ? error.message : 'Unknown error occurred',
						code: 'EXECUTION_ERROR',
					};
				}

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: builderToolBase.toolName,
			description: `Add a node to the workflow canvas. Each node represents a specific action or operation (e.g., HTTP request, data transformation, database query). Always provide descriptive names that explain what the node does (e.g., "Get Customer Data", "Filter Active Users", "Send Email Notification"). The tool handles automatic positioning. Use this tool after searching for available node types to ensure they exist.

To add multiple nodes, call this tool multiple times in parallel.

CRITICAL: You MUST provide:
1. connectionParametersReasoning - Explain why you're choosing specific connection parameters or using {}
2. connectionParameters - The actual parameters (use {} for nodes without special needs)

IMPORTANT: DO NOT rely on default values! Always explicitly set connection-affecting parameters when they exist.

REASONING EXAMPLES:
- "Vector Store has dynamic inputs that change based on mode parameter, setting mode:insert to accept document inputs"
- "HTTP Request has static inputs/outputs, no connection parameters needed"
- "Document Loader needs textSplittingMode:custom to accept text splitter connections"
- "AI Agent has dynamic inputs, setting hasOutputParser:true to enable output parser connections"
- "Set node has standard main connections only, using empty parameters"

CONNECTION PARAMETERS (NEVER rely on defaults - always set explicitly):
- AI Agent (@n8n/n8n-nodes-langchain.agent):
  - For output parser support: { hasOutputParser: true }
  - Without output parser: { hasOutputParser: false }
- Vector Store (@n8n/n8n-nodes-langchain.vectorStoreInMemory):
  - For document input: { mode: "insert" }
  - For querying: { mode: "retrieve" }
  - For AI tool use: { mode: "retrieve-as-tool" }
- Document Loader (@n8n/n8n-nodes-langchain.documentDefaultDataLoader):
  - For text splitter input: { textSplittingMode: "custom" }
  - For built-in splitting: { textSplittingMode: "simple" }
- Regular nodes (HTTP Request, Set, Code, etc.): {}

Think through the connectionParametersReasoning FIRST, then set connectionParameters based on your reasoning. If a parameter affects connections, SET IT EXPLICITLY.`,
			schema: nodeCreationSchema,
		},
	);

	return {
		tool: dynamicTool,
		...builderToolBase,
	};
}
