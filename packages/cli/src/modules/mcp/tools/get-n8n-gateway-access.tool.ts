import type { TelemetryProxy } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import z from 'zod';

import type { AiGatewayService } from '@/services/ai-gateway.service';

import { GET_N8N_GATEWAY_ACCESS_TOOL_NAME, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

const inputSchema = {} satisfies z.ZodRawShape;

const outputSchema = {
	available: z
		.boolean()
		.describe(
			'True when Gateway credits are available for this user. When false, the rest is omitted.',
		),
	gatewayUrl: z.string().optional().describe('Base URL of the n8n AI Gateway.'),
	token: z
		.string()
		.optional()
		.describe('Bearer token for the gateway, billed to this user. Never show it in a reply.'),
	expiresAt: z.string().optional().describe('When the token expires, as an ISO 8601 timestamp.'),
} satisfies z.ZodRawShape;

/**
 * Hands a client app (such as Nod) a gateway URL and a short-lived token, so it
 * can call models and gateway MCP tools directly, billed to the signed-in user's
 * Gateway credits. Meant for the client's own code, not for its model.
 */
export const createGetN8nGatewayAccessTool = (
	user: User,
	aiGatewayService: AiGatewayService,
	telemetry: TelemetryProxy,
): ToolDefinition<typeof inputSchema> => ({
	name: GET_N8N_GATEWAY_ACCESS_TOOL_NAME,
	config: {
		description:
			'Get a short-lived token for calling the n8n AI Gateway directly with Gateway credits. For client apps that connect to the gateway themselves; do not call it to answer a user.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get n8n Gateway access',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: GET_N8N_GATEWAY_ACCESS_TOOL_NAME,
		};

		if (!aiGatewayService.isEnabled()) {
			const payload = { available: false as const };
			telemetryPayload.results = { success: true, data: { available: false } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		}

		const access = await aiGatewayService.getUserGatewayAccess(user.id);
		const payload = { available: true as const, ...access };
		telemetryPayload.results = { success: true, data: { available: true } };
		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

		return {
			content: [{ type: 'text', text: JSON.stringify(payload) }],
			structuredContent: payload,
		};
	},
});
