import { tool } from '@langchain/core/tools';
import type { INode, INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { NodeTypeNotFoundError, ToolExecutionError, ValidationError } from '../errors';
import {
	createNodeInstance,
	generateUniqueName,
	type NodeSettings,
} from './utils/node-creation.utils';
import { calculateNodePosition } from './utils/node-positioning.utils';
import { isSubNode } from '../utils/node-helpers';
import { createProgressReporter } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, addNodeToWorkflow, getWorkflowState } from './helpers/state';
import { findNodeType } from './helpers/validation';
import type { AddedNode } from '../types/nodes';
import type { AddNodeOutput } from '../types/tools';

/**
 * Schema for optional node execution settings
 */
const nodeSettingsSchema = z
	.object({
		executeOnce: z
			.boolean()
			.optional()
			.describe(
				'When true, node executes only once using data from the first item, ignoring all additional items',
			),
		onError: z
			.enum(['stopWorkflow', 'continueRegularOutput', 'continueErrorOutput'])
			.optional()
			.describe(
				'Error handling: stopWorkflow (halt), continueRegularOutput (continue with input data), continueErrorOutput (separate errors to error output branch)',
			),
	})
	.optional();

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
		.object({})
		.passthrough()
		.describe(
			'Initial parameters to set on the node. This includes: (1) connection-affecting parameters like mode, hasOutputParser, textSplittingMode; (2) resource/operation for nodes with multiple resources (Gmail, Notion, Google Sheets, etc.). Pass an empty object {} if no initial parameters are needed.',
		),
	nodeSettings: nodeSettingsSchema.describe(
		'Optional node execution settings. Only set when specific behavior is needed.',
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
	nodeSettings?: NodeSettings,
): INode {
	// Generate unique name
	const baseName = customName ?? nodeType.defaults?.name ?? nodeType.displayName;
	const uniqueName = generateUniqueName(baseName, existingNodes);

	// Calculate position
	const position = calculateNodePosition(existingNodes, isSubNode(nodeType), nodeTypes);

	// Create the node instance with initial parameters and settings
	return createNodeInstance(
		nodeType,
		typeVersion,
		uniqueName,
		position,
		initialParameters,
		id,
		nodeSettings,
	);
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

				const {
					nodeType,
					nodeVersion,
					name,
					initialParametersReasoning,
					initialParameters,
					nodeSettings,
				} = validatedInput;

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

				// Create the new node (id will be undefined in production, defined in E2E if provided)
				const newNode = createNode(
					nodeTypeDesc,
					nodeVersion,
					name,
					workflow.nodes, // Use current workflow nodes
					nodeTypes,
					initialParameters as INodeParameters,
					id,
					nodeSettings,
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
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: builderToolBase.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: builderToolBase.toolName,
			description: `Add a node to the workflow canvas. Each node represents a specific action or operation (e.g., HTTP request, data transformation, database query). Always provide descriptive names that explain what the node does (e.g., "Get Customer Data", "Filter Active Users", "Send Email Notification"). The tool handles automatic positioning. Use this tool after searching for available node types to ensure they exist.

To add multiple nodes, call this tool multiple times in parallel.

Provide both:
1. initialParametersReasoning - Explain why you're choosing specific initial parameters or using {}
2. initialParameters - The actual parameters (use {} for nodes without special needs)

Explicitly set parameters that affect connections or define the node's behavior rather than relying on defaults.

Reasoning examples:
- "Vector Store has dynamic inputs that change based on mode parameter, setting mode:insert to accept document inputs"
- "HTTP Request has static inputs/outputs, no initial parameters needed"
- "Gmail needs resource:message and operation:send to send emails"
- "AI Agent has dynamic inputs, setting hasOutputParser:true to enable output parser connections"
- "Set node has standard main connections only, using empty parameters"

INITIAL PARAMETERS (set explicitly when needed):
- AI Agent (@n8n/n8n-nodes-langchain.agent):
  - For output parser support: { hasOutputParser: true }
  - Without output parser: { hasOutputParser: false }
- Vector Store (@n8n/n8n-nodes-langchain.vectorStoreInMemory):
  - For document input: { mode: "insert" }
  - For querying: { mode: "retrieve" }
  - For AI Agent and tool use: { mode: "retrieve-as-tool" }
- Document Loader (@n8n/n8n-nodes-langchain.documentDefaultDataLoader):
  - For text splitter input: { textSplittingMode: "custom" }
  - For built-in splitting: { textSplittingMode: "simple" }
- Nodes with resource/operation (Gmail, Notion, Google Sheets, etc.):
  - Set resource AND operation based on user intent (e.g., { resource: "message", operation: "send" })
- Regular nodes (HTTP Request, Set, Code, etc.): {}

Consider the initialParametersReasoning first, then set initialParameters accordingly.

NODE SETTINGS (optional - only set when specific behavior is needed):
- executeOnce: true - Node executes only once using the first item, ignoring additional items (e.g., send one notification even if 10 items arrive)
- onError: Controls what happens when the node errors
  - 'stopWorkflow' (default) - Halts entire workflow immediately
  - 'continueRegularOutput' - Continues with input data passed through (error info in json), failed items not separated
  - 'continueErrorOutput' - Separates errors to dedicated error output branch (last output index), successful items continue normally`,
			schema: nodeCreationSchema,
		},
	);

	return {
		tool: dynamicTool,
		...builderToolBase,
	};
}
