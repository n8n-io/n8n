import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const MAX_RESULTS = 5;

const connectedAction = z.object({
	action: z.literal('connected').describe('List connected MCP servers and their tool counts.'),
});

const detailsAction = z.object({
	action: z.literal('details').describe("One connected server's tool names."),
	slug: z.string().min(1).describe('Server slug, as returned by `connected`.'),
});

const searchAction = z.object({
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

const mcpServersRuntimeInputSchema = z.discriminatedUnion('action', [
	connectedAction,
	detailsAction,
	searchAction,
]);

const mcpServersToolInputSchema = sanitizeInputSchema(mcpServersRuntimeInputSchema);

const connectedOutputSchema = z.object({
	servers: z.array(z.object({ slug: z.string(), toolCount: z.number() })),
	hint: z.string().optional(),
});

const detailsOutputSchema = z.object({
	slug: z.string(),
	tools: z.array(z.string()),
	hint: z.string().optional(),
});

const searchOutputSchema = z.object({
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

const mcpServersOutputSchema = z.union([
	connectedOutputSchema,
	detailsOutputSchema,
	searchOutputSchema,
]);

const DESCRIPTION = `The user's MCP servers: connections to third-party services that persist across conversations, exposing tools you can use here. Not \`credentials\`, which only stores what a node authenticates with when a workflow runs, and not for building — a workflow that talks to a service uses that service's node and credential.
\`connected\`: which servers are connected, and each one's tool count. Only the user connects or disconnects, so a server missing here is one they never connected or disconnected — ask here instead of answering from the conversation. A connected server with no tools has a broken or expired connection.
\`details\`: one server's tool names; \`connected\` never returns them. \`search_tools\` finds a tool by keyword.
\`search\`: find a server for a service nothing connected covers, before saying it is unavailable. Read-only — only the user can connect one.`;

const NOTHING_CONNECTED_HINT =
	'Nothing connected. Only the user can connect a server: `search` for it, then tell them how.';

const BROKEN_CONNECTION_HINT =
	'No tools means a broken or expired connection — its tools do not exist here, so never guess their names. Tell the user to reconnect it under "Connections".';

const NOT_CONNECTED_HINT = 'Not connected. `connected` lists what is.';

const CONNECT_HINT = `Not connected yet — tell the user how to connect it:
open the right sidebar if it is hidden, then under "Connections" click the "+" button,
find the service in the Tools dialog and click "Connect", picking an existing credential or creating one.`;

const TRUNCATED_HINT = 'More matched than are shown — search again with a narrower query.';

function joinHints(...lines: Array<string | false>): string | undefined {
	const hint = lines.filter((line): line is string => typeof line === 'string').join('\n\n');
	return hint || undefined;
}

function handleConnected(context: InstanceAiContext): z.infer<typeof connectedOutputSchema> {
	const servers = context.connectedMcpServices ?? [];
	return {
		servers: servers.map(({ slug, toolNames }) => ({ slug, toolCount: toolNames.length })),
		hint: joinHints(
			servers.length === 0 && NOTHING_CONNECTED_HINT,
			servers.some((service) => service.toolNames.length === 0) && BROKEN_CONNECTION_HINT,
		),
	};
}

function handleDetails(
	context: InstanceAiContext,
	slug: string,
): z.infer<typeof detailsOutputSchema> {
	const service = (context.connectedMcpServices ?? []).find((entry) => entry.slug === slug);
	if (!service) return { slug, tools: [], hint: NOT_CONNECTED_HINT };

	return {
		slug,
		tools: service.toolNames,
		hint: service.toolNames.length === 0 ? BROKEN_CONNECTION_HINT : undefined,
	};
}

async function handleSearch(
	context: InstanceAiContext,
	queries: string[],
): Promise<z.infer<typeof searchOutputSchema>> {
	const { mcpService } = context;
	if (!mcpService) {
		throw new Error('MCP server search is not available on this instance.');
	}

	const matches = await mcpService.search(queries);
	const results = matches.slice(0, MAX_RESULTS);

	return {
		results,
		hint: joinHints(
			results.length > 0 && CONNECT_HINT,
			matches.length > results.length && TRUNCATED_HINT,
		),
	};
}

export function createMcpServersTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.MCP_SERVERS)
		.description(DESCRIPTION)
		.input(mcpServersToolInputSchema)
		.output(mcpServersOutputSchema)
		.handler(async (input) => {
			const parsed = mcpServersRuntimeInputSchema.parse(input);
			if (parsed.action === 'connected') return handleConnected(context);
			if (parsed.action === 'details') return handleDetails(context, parsed.slug);
			return await handleSearch(context, parsed.queries);
		})
		.build();
}
