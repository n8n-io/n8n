import { tool } from '@langchain/core/tools';
import type { INode, INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { ParameterEntry } from '@/schemas/parameter-entry.schema';
import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { NodeTypeNotFoundError, ValidationError } from '../errors';
import { arrayToNodeParameters } from './utils/array-to-parameters.utils';
import { isSubNode } from '../utils/node-helpers';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, addNodeToWorkflow, getWorkflowState } from './helpers/state';
import { findNodeType } from './helpers/validation';
import { createNodeInstance, generateUniqueName } from './utils/node-creation.utils';
import { calculateNodePosition } from './utils/node-positioning.utils';
import type { AddedNode } from '../types/nodes';
import type { AddNodeOutput, ToolError } from '../types/tools';

/**
 * Schema for initial parameter entries
 * Note: No 'json' type - initial parameters are simple key-value pairs
 */
const initialParameterEntrySchema = z.object({
	path: z.string().min(1).describe('Parameter name like "mode", "operation", "resource"'),
	type: z.enum(['string', 'number', 'boolean']).describe('The value type'),
	value: z.string().describe('The parameter value as string'),
});

const baseSchema = {
	nodeType: z.string().describe('The type of node to add (e.g., n8n-nodes-base.httpRequest)'),
	nodeVersion: z.number().describe('The exact node version'),
	name: z
		.string()
		.describe('A descriptive name for the node that clearly indicates its purpose in the workflow'),
	initialParametersReasoning: z
		.string()
		.describe(
			'REQUIRED: Explain your reasoning about initial parameters. Consider: Does this node have dynamic inputs/outputs? Does it need mode/operation/resource parameters? For example: "Vector Store has dynamic inputs based on mode, so I need to set mode:insert for document input" or "Gmail needs resource:message and operation:send to send emails"',
		),
	initialParameters: z
		.array(initialParameterEntrySchema)
		.describe(
			'Initial parameters to set on the node as array of entries. This includes: (1) connection-affecting parameters like mode, hasOutputParser, textSplittingMode; (2) resource/operation for nodes with multiple resources (Gmail, Notion, Google Sheets, etc.). Example: [{ "path": "mode", "type": "string", "value": "insert" }]. Pass empty array [] if no initial parameters are needed.',
		),
};

/**
 * Schema for node creation input
 */
export const nodeCreationSchema = z.object(baseSchema);

/**
 * Schema for E2E tests, we can specify the ID during E2E test runs to make them deterministic
 */
export const nodeCreationE2ESchema = z.object({
	...baseSchema,
	id: z
		.string()
		.optional()
		.describe(
			'Optional: A specific ID to use for this node. If not provided, a unique ID will be generated automatically. This is primarily used for testing purposes to ensure deterministic node IDs.',
		),
});

/**
 * Create a new node with proper positioning and naming
 */
function createNode(
	nodeType: INodeTypeDescription,
	typeVersion: number, // nodeType can have multiple versions
	customName: string,
	existingNodes: INode[],
	nodeTypes: INodeTypeDescription[],
	initialParameters?: INodeParameters,
	id?: string,
): INode {
	// Generate unique name
	const baseName = customName ?? nodeType.defaults?.name ?? nodeType.displayName;
	const uniqueName = generateUniqueName(baseName, existingNodes);

	// Calculate position
	const position = calculateNodePosition(existingNodes, isSubNode(nodeType), nodeTypes);

	// Create the node instance with initial parameters
	return createNodeInstance(nodeType, typeVersion, uniqueName, position, initialParameters, id);
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
				// Parse with appropriate schema based on environment
				let id: string | undefined;
				let validatedInput: z.infer<typeof nodeCreationSchema>;

				if (process.env.E2E_TESTS) {
					const e2eInput = nodeCreationE2ESchema.parse(input);
					id = e2eInput.id;
					validatedInput = e2eInput;
				} else {
					validatedInput = nodeCreationSchema.parse(input);
				}

				const { nodeType, nodeVersion, name, initialParametersReasoning, initialParameters } =
					validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Report progress with reasoning
				reporter.progress(`Adding ${name} (${initialParametersReasoning})`);

				// Find the node type
				const nodeTypeDesc = findNodeType(nodeType, nodeVersion, nodeTypes);
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

				// Convert initial parameters array to INodeParameters object
				const initialParamsObject =
					initialParameters && initialParameters.length > 0
						? arrayToNodeParameters(initialParameters as ParameterEntry[])
						: undefined;

				// Create the new node (id will be undefined in production, defined in E2E if provided)
				const newNode = createNode(
					nodeTypeDesc,
					nodeVersion,
					name,
					workflow.nodes, // Use current workflow nodes
					nodeTypes,
					initialParamsObject as INodeParameters,
					id,
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
1. initialParametersReasoning - Explain why you're choosing specific initial parameters or using []
2. initialParameters - Array of parameter entries (use [] for nodes without special needs)

IMPORTANT: DO NOT rely on default values! Always explicitly set parameters that affect connections or define the node's behavior.

REASONING EXAMPLES:
- "Vector Store has dynamic inputs that change based on mode parameter, setting mode:insert to accept document inputs"
- "HTTP Request has static inputs/outputs, no initial parameters needed"
- "Gmail needs resource:message and operation:send to send emails"
- "AI Agent has dynamic inputs, setting hasOutputParser:true to enable output parser connections"
- "Set node has standard main connections only, using empty parameters"

INITIAL PARAMETERS FORMAT: [{ "path": "paramName", "type": "string|number|boolean", "value": "valueAsString" }]

INITIAL PARAMETERS (NEVER rely on defaults - always set explicitly):
- AI Agent (@n8n/n8n-nodes-langchain.agent):
  - For output parser: [{ "path": "hasOutputParser", "type": "boolean", "value": "true" }]
  - Without output parser: [{ "path": "hasOutputParser", "type": "boolean", "value": "false" }]
- Vector Store (@n8n/n8n-nodes-langchain.vectorStoreInMemory):
  - For document input: [{ "path": "mode", "type": "string", "value": "insert" }]
  - For querying: [{ "path": "mode", "type": "string", "value": "retrieve" }]
  - For AI Agent/tool: [{ "path": "mode", "type": "string", "value": "retrieve-as-tool" }]
- Document Loader (@n8n/n8n-nodes-langchain.documentDefaultDataLoader):
  - Text splitter input: [{ "path": "textSplittingMode", "type": "string", "value": "custom" }]
  - Built-in splitting: [{ "path": "textSplittingMode", "type": "string", "value": "simple" }]
- Nodes with resource/operation (Gmail, Notion, Google Sheets, etc.):
  - Set resource AND operation: [{ "path": "resource", "type": "string", "value": "message" }, { "path": "operation", "type": "string", "value": "send" }]
- Regular nodes (HTTP Request, Set, Code, etc.): []

Think through the initialParametersReasoning FIRST, then set initialParameters based on your reasoning.`,
			schema: nodeCreationSchema,
		},
	);

	return {
		tool: dynamicTool,
		...builderToolBase,
	};
}
