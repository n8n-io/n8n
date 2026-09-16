import { Tool } from '@n8n/agents';
import { mcpConnectRequestSchema, mcpConnectResumeSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext, InstanceAiMcpService } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const MAX_RESULTS = 5;
const MAX_SUGGESTED_SERVERS = 3;

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

const connectAction = z.object({
	action: z
		.literal('connect')
		.describe(
			'Let the user connect a third party service returned by `search`, from the conversation.',
		),
	serverSlugs: z
		.array(z.string().min(1))
		.min(1)
		.max(MAX_SUGGESTED_SERVERS)
		.describe(
			`Slugs returned by \`search\`, best match first, at most ${MAX_SUGGESTED_SERVERS}. Pass one unless the request genuinely matches several servers.`,
		),
	reason: z
		.string()
		.min(1)
		.describe('One short sentence for the confirmation record: what connecting unlocks.'),
});

const mcpServersRuntimeInputSchema = z.discriminatedUnion('action', [
	connectedAction,
	detailsAction,
	searchAction,
	connectAction,
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

const connectOutputSchema = z.object({
	connectedSlugs: z.array(z.string()),
	/** Skipped, failed and invented-slug all return no slugs but need different
	 *  follow-ups, so the instruction rides here. */
	message: z.string(),
});

const mcpServersOutputSchema = z.union([
	connectedOutputSchema,
	detailsOutputSchema,
	searchOutputSchema,
	connectOutputSchema,
]);

const DESCRIPTION = `The user's MCP servers: connections to third-party services that persist across conversations, exposing tools you can use here. Not \`credentials\`, which only stores what a node authenticates with when a workflow runs, and not for building — a workflow that talks to a service uses that service's node and credential. What separates them is who runs it: reading, fetching or summarizing a service's data yourself, in this conversation, is this tool; a workflow the user runs later is a node.
\`connected\`: which servers are connected, and each one's tool count. Only the user connects or disconnects, so a server missing here is one they never connected or disconnected — ask here instead of answering from the conversation. A connected server with no tools has a broken or expired connection.
\`details\`: one server's tool names; \`connected\` never returns them. \`search_tools\` finds a tool by keyword.
\`search\`: find a server for a service nothing connected covers, before saying it is unavailable or serving that request another way.
\`connect\`: offer servers for the user to connect, resuming once they connect or skip. Only they can complete it; also use it to switch a credential or reconnect a broken server. In the same turn, first write one sentence telling them what connecting unlocks.`;

const NOTHING_CONNECTED_HINT =
	'Nothing connected. Only the user can connect a server: `search` for it, then `connect` it.';

const BROKEN_CONNECTION_HINT =
	'No tools means a broken or expired connection — its tools do not exist here, so never guess their names. Tell the user, then `connect` its slug to reconnect it.';

const NOT_CONNECTED_HINT = 'Not connected. `connected` lists what is.';

const CONNECT_HINT =
	'Not connected yet — call again with `action: "connect"` and a slug so the user can connect it in place. Do not recite the manual steps instead.';

const NOT_CONNECTED_GUIDANCE =
	' Continue without these tools and do not offer them again for this request. If the user connected something else in the meantime, its tools reach you on your next turn.';

const TRUNCATED_HINT = 'More matched than are shown — search again with a narrower query.';

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: z.literal('info'),
	mcpConnectRequest: mcpConnectRequestSchema,
});

interface McpServersToolContext {
	resumeData: z.infer<typeof mcpConnectResumeSchema> | undefined;
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>;
}

function requireMcpService(context: InstanceAiContext): InstanceAiMcpService {
	const { mcpService } = context;
	if (!mcpService) throw new Error('Tool connections are not available on this instance.');
	return mcpService;
}

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
	const mcpService = requireMcpService(context);
	const matches = await mcpService.search(queries);
	// Field by field: credential options are for the connect card, not the model.
	const results = matches.slice(0, MAX_RESULTS).map(({ slug, title, description, tools }) => ({
		slug,
		title,
		description,
		tools,
	}));

	return {
		results,
		hint: joinHints(
			results.length > 0 && CONNECT_HINT,
			matches.length > results.length && TRUNCATED_HINT,
		),
	};
}

async function resumeConnect(
	mcpService: InstanceAiMcpService,
	serverSlugs: string[],
	resumeData: z.infer<typeof mcpConnectResumeSchema>,
): Promise<z.infer<typeof connectOutputSchema>> {
	const connected = new Set((await mcpService.listConnections()).map(({ slug }) => slug));
	const claimed = resumeData.connectedSlugs ?? [];
	const connectedSlugs = serverSlugs.filter(
		(slug) => claimed.includes(slug) && connected.has(slug),
	);

	if (connectedSlugs.length === 0) {
		const outcome = resumeData.approved
			? 'No connection was created.'
			: 'The user chose not to connect.';
		return { connectedSlugs, message: outcome + NOT_CONNECTED_GUIDANCE };
	}

	return {
		connectedSlugs,
		message: `Connected: ${connectedSlugs.join(', ')}. Their tools are available now — find them with \`search_tools\` and carry on with the request.`,
	};
}

async function handleConnect(
	context: InstanceAiContext,
	input: z.infer<typeof connectAction>,
	ctx: McpServersToolContext,
): Promise<z.infer<typeof connectOutputSchema>> {
	const mcpService = requireMcpService(context);
	if (ctx.resumeData) return await resumeConnect(mcpService, input.serverSlugs, ctx.resumeData);

	const servers = await mcpService.getServers(input.serverSlugs);
	if (servers.length === 0) {
		return {
			connectedSlugs: [],
			message: `No tool matches ${input.serverSlugs.join(', ')}. Call \`action: "search"\` first and use a slug it returned.`,
		};
	}

	return await ctx.suspend({
		requestId: nanoid(),
		message: input.reason,
		severity: 'info',
		mcpConnectRequest: {
			servers: servers.map((server) => ({
				serverSlug: server.slug,
				title: server.title,
				usesCredentials: server.usesCredentials,
				...(server.description ? { tagline: server.description } : {}),
			})),
		},
	});
}

export function createMcpServersTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.MCP_SERVERS)
		.description(DESCRIPTION)
		.input(mcpServersToolInputSchema)
		.output(mcpServersOutputSchema)
		.suspend(suspendSchema)
		.resume(mcpConnectResumeSchema)
		.handler(async (input, ctx: McpServersToolContext) => {
			const parsed = mcpServersRuntimeInputSchema.parse(input);
			if (parsed.action === 'connected') return handleConnected(context);
			if (parsed.action === 'details') return handleDetails(context, parsed.slug);
			if (parsed.action === 'search') return await handleSearch(context, parsed.queries);
			return await handleConnect(context, parsed, ctx);
		})
		.build();
}
