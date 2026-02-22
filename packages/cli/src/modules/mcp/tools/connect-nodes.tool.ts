import { type User } from '@n8n/db';
import type { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes, UserError } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { workflowJsonSchema } from './schemas';

import {
	createConnection,
	inferConnectionType,
} from '@n8n/ai-workflow-builder/dist/tools/utils/connection.utils';

import type { Telemetry } from '@/telemetry';

const inputSchema = {
	workflowJson: workflowJsonSchema.describe('The current workflow JSON'),
	sourceNodeName: z.string().describe('Name of the source node'),
	targetNodeName: z.string().describe('Name of the target node'),
	connectionType: z
		.string()
		.optional()
		.describe(
			'Connection type (e.g., "main", "ai_languageModel", "ai_tool"). If not provided, it will be inferred automatically.',
		),
	sourceOutputIndex: z
		.number()
		.int()
		.min(0)
		.optional()
		.default(0)
		.describe('Output index on the source node (default: 0)'),
	targetInputIndex: z
		.number()
		.int()
		.min(0)
		.optional()
		.default(0)
		.describe('Input index on the target node (default: 0)'),
} satisfies z.ZodRawShape;

export const createConnectNodesTool = (
	user: User,
	nodeTypes: INodeTypeDescription[],
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'connect_nodes',
	config: {
		description:
			'Connect two nodes in a workflow. Automatically infers the connection type if not specified. Returns the updated workflow JSON.',
		inputSchema,
		annotations: {
			title: 'Connect Nodes',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowJson,
		sourceNodeName,
		targetNodeName,
		connectionType,
		sourceOutputIndex = 0,
		targetInputIndex = 0,
	}) => {
		const parameters = { sourceNodeName, targetNodeName, connectionType };
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'connect_nodes',
			parameters,
		};

		try {
			const sourceNode = workflowJson.nodes.find((n) => n.name === sourceNodeName);
			const targetNode = workflowJson.nodes.find((n) => n.name === targetNodeName);

			if (!sourceNode) {
				throw new UserError(`Source node "${sourceNodeName}" not found in workflow`);
			}
			if (!targetNode) {
				throw new UserError(`Target node "${targetNodeName}" not found in workflow`);
			}

			let resolvedConnectionType: NodeConnectionType;
			let swapped = false;
			let actualSourceName = sourceNodeName;
			let actualTargetName = targetNodeName;

			if (connectionType) {
				resolvedConnectionType = connectionType as NodeConnectionType;
			} else {
				const sourceNodeType = nodeTypes.find((nt) => nt.name === sourceNode.type);
				const targetNodeType = nodeTypes.find((nt) => nt.name === targetNode.type);

				if (!sourceNodeType || !targetNodeType) {
					throw new UserError('Could not find node type descriptions for connection inference');
				}

				const result = inferConnectionType(sourceNode, targetNode, sourceNodeType, targetNodeType);

				if (result.error && !result.connectionType) {
					throw new UserError(result.error);
				}

				resolvedConnectionType = result.connectionType ?? NodeConnectionTypes.Main;

				if (result.requiresSwap) {
					swapped = true;
					actualSourceName = targetNodeName;
					actualTargetName = sourceNodeName;
				}
			}

			const updatedConnections = createConnection(
				structuredClone(workflowJson.connections),
				actualSourceName,
				actualTargetName,
				resolvedConnectionType,
				sourceOutputIndex,
				targetInputIndex,
			);

			const updatedWorkflow = {
				nodes: workflowJson.nodes,
				connections: updatedConnections,
			};

			const payload = {
				workflowJson: updatedWorkflow,
				connection: {
					sourceNode: actualSourceName,
					targetNode: actualTargetName,
					connectionType: resolvedConnectionType,
					swapped,
				},
			};

			telemetryPayload.results = {
				success: true,
				data: {
					connection_type: resolvedConnectionType,
					swapped,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
				structuredContent: payload,
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
