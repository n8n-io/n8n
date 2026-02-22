import type { User } from '@n8n/db';
import type { INodeTypeDescription, NodeParameterValueType } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import {
	createNodeInstance,
	generateUniqueName,
	getLatestVersion,
} from '@n8n/ai-workflow-builder/dist/tools/utils/node-creation.utils';
import { calculateNodePosition } from '@n8n/ai-workflow-builder/dist/tools/utils/node-positioning.utils';
import { isSubNode } from '@n8n/ai-workflow-builder/dist/utils/node-helpers';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { workflowJsonSchema, type WorkflowJson } from './schemas';

import type { Telemetry } from '@/telemetry';

const inputSchema = {
	workflowJson: workflowJsonSchema.describe('The current workflow state'),
	nodeType: z.string().describe('The node type name (e.g., "n8n-nodes-base.httpRequest")'),
	nodeVersion: z.number().optional().describe('Specific version. Defaults to latest.'),
	name: z.string().optional().describe('Custom name for the node. Auto-generated if not provided.'),
	parameters: z.record(z.unknown()).optional().describe('Initial node parameters'),
} satisfies z.ZodRawShape;

type AddNodeInput = {
	workflowJson: WorkflowJson;
	nodeType: string;
	nodeVersion?: number;
	name?: string;
	parameters?: Record<string, unknown>;
};

type AddedNodeInfo = {
	id: string;
	name: string;
	type: string;
	position: [number, number];
	parameters: Record<string, NodeParameterValueType>;
};

type AddNodeOutput = {
	workflowJson: WorkflowJson;
	addedNode: AddedNodeInfo;
};

/**
 * Creates an MCP tool definition for adding a new node to a workflow.
 * Accepts workflowJson as input and returns the modified version with the new node added.
 */
export const createAddNodeTool = (
	user: User,
	nodeTypes: INodeTypeDescription[],
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'add_node',
	config: {
		description:
			'Add a new node to a workflow. Returns the updated workflow JSON with the new node added. The node is automatically positioned.',
		inputSchema,
		annotations: {
			title: 'Add Node',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
		},
	},
	handler: async ({ workflowJson, nodeType, nodeVersion, name, parameters }: AddNodeInput) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'add_node',
			parameters: { nodeType, name },
		};

		try {
			const output = addNode(workflowJson, nodeType, nodeTypes, nodeVersion, name, parameters);

			telemetryPayload.results = {
				success: true,
				data: {
					node_type: output.addedNode.type,
					node_name: output.addedNode.name,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});

function addNode(
	workflowJson: WorkflowJson,
	nodeType: string,
	nodeTypes: INodeTypeDescription[],
	nodeVersion?: number,
	name?: string,
	parameters?: Record<string, unknown>,
): AddNodeOutput {
	// 1. Find node type description
	const nodeTypeDesc = nodeTypes.find((nt) => nt.name === nodeType);
	if (!nodeTypeDesc) {
		throw new UserError(`Node type "${nodeType}" not found`);
	}

	// 2. Determine version
	const version = nodeVersion ?? getLatestVersion(nodeTypeDesc);

	// 3. Check if sub-node
	const isSubNodeType = isSubNode(nodeTypeDesc);

	// 4. Calculate position
	const position = calculateNodePosition(workflowJson.nodes, isSubNodeType, nodeTypes);

	// 5. Generate unique name
	const uniqueName = generateUniqueName(name ?? nodeTypeDesc.displayName, workflowJson.nodes);

	// 6. Create node instance
	const newNode = createNodeInstance(
		nodeTypeDesc,
		version,
		uniqueName,
		position,
		(parameters ?? {}) as Record<string, NodeParameterValueType>,
	);

	// 7. Build updated workflow (immutable)
	const updatedWorkflow: WorkflowJson = {
		...workflowJson,
		nodes: [...workflowJson.nodes, newNode],
	};

	// 8. Build added node info
	const addedNode: AddedNodeInfo = {
		id: newNode.id,
		name: newNode.name,
		type: newNode.type,
		position: newNode.position,
		parameters: newNode.parameters,
	};

	return { workflowJson: updatedWorkflow, addedNode };
}
