/**
 * mcp-servers — discovery of the MCP registry. Without it the agent has no way
 * to learn that a hosted MCP server exists for a service the user asked about,
 * and falls back to nodes + credentials as if nothing else were on offer.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const mcpServersInputSchema = z.object({
	action: z.literal('search').describe('Search the available MCP servers.'),
	queries: z
		.array(z.string().min(1))
		.min(1)
		.describe(
			'Free-text queries matched against server name, title, and description — typically the service name (e.g. ["notion"], ["linear", "issue tracker"]).',
		),
});

const mcpServersOutputSchema = z.object({
	results: z.array(
		z.object({
			slug: z.string(),
			title: z.string(),
			description: z.string(),
			tools: z.array(z.object({ name: z.string(), title: z.string().optional() })),
			isConnected: z.boolean(),
		}),
	),
	hint: z.string().optional(),
});

const DESCRIPTION = `Search the MCP servers that connect the assistant to a third-party service (e.g. Notion, Linear, Slack).
Use it when the user asks for a service you have no connected tool for, before saying the integration is unavailable.
Read-only — only the user can connect a server. \`isConnected: true\` means its tools are already available to you, so do not offer to add it.`;

const CONNECT_HINT = `Tell the user how to connect to the MCP server:
open the right sidebar if it is hidden, then under "Connections" click the "+" button,
find the service in the Tools dialog and click "Connect", picking an existing credential or creating one.`;

export function createMcpServersTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.MCP_SERVERS)
		.description(DESCRIPTION)
		.input(mcpServersInputSchema)
		.output(mcpServersOutputSchema)
		.handler(async (input) => {
			const { queries } = mcpServersInputSchema.parse(input);
			const mcpService = context.mcpService;
			if (!mcpService) {
				throw new Error('MCP registry search is not available on this instance.');
			}

			const results = await mcpService.search(queries);
			const anyUnconnected = results.some((result) => !result.isConnected);
			return { results, hint: anyUnconnected ? CONNECT_HINT : undefined };
		})
		.build();
}
