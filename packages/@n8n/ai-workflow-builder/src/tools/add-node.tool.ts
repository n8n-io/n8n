import { tool } from '@langchain/core/tools';
import type { INode, INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { createNodeInstance, generateUniqueName } from './utils/node-creation.utils';
import { calculateNodePosition } from './utils/node-positioning.utils';
import { isSubNode } from '../utils/node-helpers';
import type { ToolError } from './helpers/progress';
import { createProgressReporter, createBatchProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, addNodesToWorkflow, getWorkflowState } from './helpers/state';
import { findNodeType } from './helpers/validation';

/**
 * Output type for the add nodes tool
 */
interface AddNodesOutput {
	addedNodes: AddedNode[];
	errors: string[];
	totalRequested: number;
	successCount: number;
	message: string;
}

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
 * Schema for batch node creation
 */
export const addNodesSchema = z.object({
	nodes: z.array(nodeCreationSchema).describe('Array of nodes to add to the workflow'),
});

/**
 * Result of adding a node
 */
export interface AddedNode {
	id: string;
	name: string;
	type: string;
	displayName?: string;
	parameters?: INodeParameters;
	position: [number, number];
}

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

	// Validate and filter connection parameters if provided
	let parameters = {};
	if (connectionParameters) {
		// const validation = validateConnectionParameters(connectionParameters);
		// if (validation.warnings.length > 0) {
		// 	logConnectionParameterWarnings(validation.warnings, nodeType.name);
		// }
		parameters = connectionParameters;
	}

	// Create the node instance with connection parameters
	return createNodeInstance(nodeType, uniqueName, position, parameters);
}

/**
 * Build the response message for added nodes
 */
function buildResponseMessage(
	addedNodes: AddedNode[],
	errors: string[],
	nodeTypes: INodeTypeDescription[],
): string {
	const parts: string[] = [];

	// Success message
	if (addedNodes.length > 0) {
		parts.push(`Successfully added ${addedNodes.length} node${addedNodes.length > 1 ? 's' : ''}:`);

		for (const node of addedNodes) {
			const nodeType = nodeTypes.find((nt) => nt.name === node.type);
			const nodeTypeInfo = nodeType && isSubNode(nodeType) ? ' (sub-node)' : '';
			parts.push(
				`- "${node.name}" (${node.displayName ?? node.type})${nodeTypeInfo} with ID ${node.id}`,
			);
		}
	}

	// Error messages
	if (errors.length > 0) {
		if (parts.length > 0) parts.push('');
		parts.push('Errors:');
		errors.forEach((error) => parts.push(`- ${error}`));
	}

	return parts.join('\n');
}

/**
 * Factory function to create the add nodes tool
 */
export function createAddNodeTool(nodeTypes: INodeTypeDescription[]) {
	return tool(
		async (input, config) => {
			const reporter = createProgressReporter(config, 'add_nodes');

			try {
				// Validate input using Zod schema
				const validatedInput = addNodesSchema.parse(input);
				const { nodes } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				const addedNodes: INode[] = [];
				const addedNodeInfo: AddedNode[] = [];
				const errors: string[] = [];

				// Create a copy of current nodes to track additions
				const currentNodes = [...workflow.nodes];

				// Create batch reporter for progress tracking
				const batchReporter = createBatchProgressReporter(reporter, 'Adding nodes');
				batchReporter.init(nodes.length);

				// Process each node in the array
				for (let i = 0; i < nodes.length; i++) {
					const nodeInput = nodes[i];
					const { nodeType, name, connectionParametersReasoning, connectionParameters } = nodeInput;

					// Report progress with reasoning
					batchReporter.next(`${name} (${connectionParametersReasoning})`);

					// Find the node type
					const nodeTypeDesc = findNodeType(nodeType, nodeTypes);
					if (!nodeTypeDesc) {
						errors.push(`Node type "${nodeType}" not found`);
						continue;
					}

					// Create the new node
					const newNode = createNode(
						nodeTypeDesc,
						name,
						currentNodes,
						nodeTypes,
						connectionParameters as INodeParameters,
					);

					addedNodes.push(newNode);
					addedNodeInfo.push({
						id: newNode.id,
						name: newNode.name,
						type: newNode.type,
						displayName: nodeTypeDesc.displayName,
						position: newNode.position,
						parameters: newNode.parameters,
					});
					currentNodes.push(newNode);
				}

				// Complete batch reporting
				batchReporter.complete();

				// Check if all nodes failed
				if (addedNodes.length === 0 && errors.length > 0) {
					const error = {
						message: `Failed to add nodes: ${errors.join(', ')}`,
						code: 'ALL_NODES_FAILED',
						details: { errors },
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Build success message
				const message = buildResponseMessage(addedNodeInfo, errors, nodeTypes);

				// Report completion
				const output: AddNodesOutput = {
					addedNodes: addedNodeInfo,
					errors,
					totalRequested: nodes.length,
					successCount: addedNodes.length,
					message,
				};
				reporter.complete(output);

				// Return success with state updates
				const stateUpdates = addNodesToWorkflow(addedNodes);
				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				// Handle validation or unexpected errors
				const toolError: ToolError = {
					message: error instanceof Error ? error.message : 'Unknown error occurred',
					code: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'EXECUTION_ERROR',
					details: error instanceof z.ZodError ? error.errors : undefined,
				};

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: 'add_nodes',
			description: `Add one or more nodes to the workflow canvas. Each node represents a specific action or operation (e.g., HTTP request, data transformation, database query). Always provide descriptive names that explain what each node does (e.g., "Get Customer Data", "Filter Active Users", "Send Email Notification"). The tool handles automatic positioning. Use this tool after searching for available node types to ensure they exist.

CRITICAL: For EVERY node, you MUST provide:
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
			schema: addNodesSchema,
		},
	);
}
