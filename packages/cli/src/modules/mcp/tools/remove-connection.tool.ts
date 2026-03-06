import { type User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { workflowJsonSchema } from './schemas';

import { removeConnection } from '@n8n/ai-workflow-builder';

import type { Telemetry } from '@/telemetry';

const inputSchema = {
	workflowJson: workflowJsonSchema.describe('The current workflow JSON'),
	sourceNodeName: z.string().describe('Name of the source node'),
	targetNodeName: z.string().describe('Name of the target node'),
	connectionType: z
		.string()
		.optional()
		.default('main')
		.describe('Connection type to remove (default: "main")'),
	sourceOutputIndex: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Source output index. If not provided, removes all connections to the target.'),
	targetInputIndex: z.number().int().min(0).optional().describe('Target input index'),
} satisfies z.ZodRawShape;

export const createRemoveConnectionTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'remove_connection',
	config: {
		description:
			'Remove a connection between two nodes in a workflow. Returns the updated workflow JSON.',
		inputSchema,
		annotations: {
			title: 'Remove Connection',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowJson,
		sourceNodeName,
		targetNodeName,
		connectionType = 'main',
		sourceOutputIndex,
		targetInputIndex,
	}) => {
		const parameters = { sourceNodeName, targetNodeName, connectionType };
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'remove_connection',
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

			const updatedConnections = removeConnection(
				structuredClone(workflowJson.connections),
				sourceNodeName,
				targetNodeName,
				connectionType,
				sourceOutputIndex,
				targetInputIndex,
			);

			const payload = {
				workflowJson: {
					nodes: workflowJson.nodes,
					connections: updatedConnections,
				},
			};

			telemetryPayload.results = { success: true };
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
