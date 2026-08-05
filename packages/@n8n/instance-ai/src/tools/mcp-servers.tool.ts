import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const mcpServersInputSchema = z.object({
	action: z
		.literal('search')
		.describe('Search the available MCP servers for connecting to a third party service.'),
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
			tools: z.array(z.string()),
		}),
	),
	hint: z.string().optional(),
});

const MAX_RESULTS = 5;

const DESCRIPTION = `Find tools you can use in this conversation to work with a third-party service (e.g. Notion, Linear, Slack).
Use it when the user asks for a service you have no connected tool for, before saying the integration is unavailable.
Read-only — only the user can connect one. Only services that are *not* connected yet come back. Already-connected services' tools are already available to you.`;

const CONNECT_HINT = `Not connected yet — tell the user how to connect it:
open the right sidebar if it is hidden, then under "Connections" click the "+" button,
find the service in the Tools dialog and click "Connect", picking an existing credential or creating one.`;

const TRUNCATED_HINT =
	'More services matched than are shown, search again with a narrower query if none of these fit.';

export function createMcpServersTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.MCP_SERVERS)
		.description(DESCRIPTION)
		.input(mcpServersInputSchema)
		.output(mcpServersOutputSchema)
		.handler(async (input) => {
			const { queries } = mcpServersInputSchema.parse(input);
			const mcpService = context.mcpService;
			if (!mcpService) {
				throw new Error('MCP server search is not available on this instance.');
			}

			const matches = await mcpService.search(queries);
			const results = matches.slice(0, MAX_RESULTS);

			const hint = [
				results.length > 0 && CONNECT_HINT,
				matches.length > results.length && TRUNCATED_HINT,
			]
				.filter((line): line is string => typeof line === 'string')
				.join('\n\n');

			return { results, hint: hint || undefined };
		})
		.build();
}
