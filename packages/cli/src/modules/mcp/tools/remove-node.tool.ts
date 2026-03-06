import { type User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { workflowJsonSchema } from './schemas';

import { getNodeConnections, removeConnection } from '@n8n/ai-workflow-builder';

import type { Telemetry } from '@/telemetry';

const inputSchema = {
	workflowJson: workflowJsonSchema.describe('The current workflow JSON'),
	nodeName: z.string().describe('Name of the node to remove'),
} satisfies z.ZodRawShape;

export const createRemoveNodeTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'remove_node',
	config: {
		description:
			'Remove a node from a workflow along with all its connections. Returns the updated workflow JSON.',
		inputSchema,
		annotations: {
			title: 'Remove Node',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowJson, nodeName }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'remove_node',
			parameters: { nodeName },
		};

		try {
			const nodeIndex = workflowJson.nodes.findIndex((n) => n.name === nodeName);
			if (nodeIndex === -1) {
				throw new UserError(`Node "${nodeName}" not found in workflow`);
			}

			// Remove node from array
			const updatedNodes = workflowJson.nodes.filter((n) => n.name !== nodeName);

			// Remove all connections involving this node
			let updatedConnections = structuredClone(workflowJson.connections);

			// Remove outgoing connections
			const outgoing = getNodeConnections(updatedConnections, nodeName, 'source');
			for (const conn of outgoing) {
				updatedConnections = removeConnection(
					updatedConnections,
					nodeName,
					conn.node,
					conn.type,
					conn.sourceIndex,
					conn.targetIndex,
				);
			}

			// Remove incoming connections
			const incoming = getNodeConnections(updatedConnections, nodeName, 'target');
			for (const conn of incoming) {
				updatedConnections = removeConnection(
					updatedConnections,
					conn.node,
					nodeName,
					conn.type,
					conn.sourceIndex,
					conn.targetIndex,
				);
			}

			// Also remove the node's own connection entry if it still exists
			delete updatedConnections[nodeName];

			const payload = {
				workflowJson: {
					nodes: updatedNodes,
					connections: updatedConnections,
				},
				removedNode: nodeName,
				removedConnectionCount: outgoing.length + incoming.length,
			};

			telemetryPayload.results = {
				success: true,
				data: {
					removed_connections: outgoing.length + incoming.length,
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
