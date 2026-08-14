import type { User } from '@n8n/db';
import z from 'zod';

import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';

import { LIST_N8N_CONNECT_SERVICES_TOOL_NAME, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

const inputSchema = {} satisfies z.ZodRawShape;

const outputSchema = {
	available: z
		.boolean()
		.describe(
			'True when n8n credits is available for this instance. When false, the remaining fields are omitted.',
		),
	credentialTypes: z
		.array(z.string())
		.optional()
		.describe('Credential type names Connect can provide (e.g. "openAiApi").'),
	nodes: z
		.array(z.string())
		.optional()
		.describe('Node types Connect covers (e.g. "@n8n/n8n-nodes-langchain.openAi").'),
	supportedActions: z
		.record(z.record(z.array(z.string())))
		.optional()
		.describe(
			'Per-node allowlist keyed by node type, then resource (or `__operation_only__` for nodes without a resource dimension). Values are supported operation names.',
		),
	minNodeTypeVersion: z
		.record(z.number())
		.optional()
		.describe('Minimum `typeVersion` per node type for Connect coverage.'),
	hiddenNodeProperties: z
		.record(z.array(z.string()))
		.optional()
		.describe('Per-node property names hidden from the user when Connect provides the credential.'),
} satisfies z.ZodRawShape;

/**
 * Returns the current n8n Connect coverage snapshot for the
 * instance: which node types and credential types Connect can serve, plus
 * per-node action allowlists, min versions, and hidden properties.
 *
 * Read-only. Omits all coverage fields when Connect is unavailable
 * (unlicensed, misconfigured, or gateway down) — callers should key on
 * `available: false` and fall back to user credentials.
 */
export const createListN8nConnectServicesTool = (
	user: User,
	aiGatewayService: AiGatewayService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: LIST_N8N_CONNECT_SERVICES_TOOL_NAME,
	config: {
		description:
			'List n8n credits coverage: node and credential types the platform can provide managed credentials for, plus supported resource+operation combinations, minimum type versions, and hidden node properties. Use this to decide which nodes let the user skip credential setup.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'List services available with n8n credits',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: LIST_N8N_CONNECT_SERVICES_TOOL_NAME,
		};

		const availability = await aiGatewayService.isAvailable();

		if (!availability.available) {
			const payload = { available: false as const };
			telemetryPayload.results = { success: true, data: { available: false } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		}

		const { config } = availability;
		const payload = {
			available: true as const,
			credentialTypes: config.credentialTypes,
			nodes: config.nodes,
			...(config.supportedActions ? { supportedActions: config.supportedActions } : {}),
			...(config.minNodeTypeVersion ? { minNodeTypeVersion: config.minNodeTypeVersion } : {}),
			...(config.hiddenNodeProperties ? { hiddenNodeProperties: config.hiddenNodeProperties } : {}),
		};
		telemetryPayload.results = { success: true, data: { available: true } };
		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

		return {
			content: [{ type: 'text', text: JSON.stringify(payload) }],
			structuredContent: payload,
		};
	},
});
