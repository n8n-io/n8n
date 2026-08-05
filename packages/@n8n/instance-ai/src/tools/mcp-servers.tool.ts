import { Tool } from '@n8n/agents';
import { mcpConnectRequestSchema, mcpConnectResumeSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext, InstanceAiMcpService } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const MAX_RESULTS = 5;
const MAX_SUGGESTED_SERVERS = 3;

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

const mcpServersRuntimeInputSchema = z.discriminatedUnion('action', [searchAction, connectAction]);

// Anthropic rejects a tool schema with no top-level `type`, so the provider gets a
// flattened object; the handler parses the union for narrowing and per-action rules.
const mcpServersToolInputSchema = sanitizeInputSchema(mcpServersRuntimeInputSchema);

const connectionStateSchema = z.enum(['not-connected', 'connected', 'connected-not-working']);
type ConnectionState = z.infer<typeof connectionStateSchema>;

const searchOutputSchema = z.object({
	results: z.array(
		z.object({
			slug: z.string(),
			title: z.string(),
			description: z.string(),
			credentialType: z.string(),
			tools: z.array(z.string()),
			state: connectionStateSchema,
		}),
	),
	hint: z.string().optional(),
});

const connectOutputSchema = z.object({
	/** Only slugs whose tools actually reached the agent; a connected-but-broken one
	 *  is reported in `message` instead. */
	connectedSlugs: z.array(z.string()),
	/** Skipped, failed and invented-slug all return no slugs but need different
	 *  follow-ups, so the instruction rides here. */
	message: z.string(),
});

const mcpServersOutputSchema = z.union([searchOutputSchema, connectOutputSchema]);

const DESCRIPTION = `Find tools you can use in this conversation to work with a third-party service (e.g. Notion, Linear, Slack), and let the user connect one without leaving the chat.
This is how YOU get the ability to act on a service while chatting. It is not \`credentials\`, which only stores what a node authenticates with when a workflow runs.
\`search\` returns matching services with a \`state\`: \`not-connected\`, \`connected\` (its tools are already available to you through \`search_tools\`), or \`connected-not-working\` (connected, but its tools did not load, so it has none you can call).
\`connect\` pauses so the user can connect a service \`search\` returned, and resumes once they connect or skip. Only the user can complete a connection.
\`connect\` also works on an already-connected service so the user can switch its credential or reconnect a broken one — use it when its tools are missing or the user wants a different account, not when its tools already work.
In the same turn as a \`connect\` call, first write one sentence telling the user you can do what they asked once they connect that service.`;

const CONNECT_HINT =
	'A `not-connected` service has no tools here yet — call this tool again with `action: "connect"` and its slug so the user can connect it in place. Do not recite the manual steps instead.';

const ALREADY_WORKING_HINT =
	'A `connected` service already works — find its tools with `search_tools` instead of offering to connect it again.';

const BROKEN_HINT =
	'A `connected-not-working` service has no tools you can call: do not look for them with `search_tools` and never guess a tool name. Tell the user its connection is not working, then `connect` its slug so they can reconnect it.';

const NOT_CONNECTED_GUIDANCE =
	' Continue without these tools and do not offer them again for this request. If the user connected something else in the meantime, its tools reach you on your next turn.';

function brokenConnectionNote(slugs: string[]): string {
	return (
		`Connected but not working: ${slugs.join(', ')}. Their tools did not load, so they are unavailable to you — ` +
		'do not look for them with `search_tools`. Tell the user the connection is not working and ask them to reopen it and connect it again.'
	);
}

const TRUNCATED_HINT =
	'More services matched than are shown, search again with a narrower query if none of these fit.';

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

/** Empty when the host never established the view — a missing signal must not read
 *  as a broken connection. */
function brokenSlugs(context: InstanceAiContext): Set<string> {
	return new Set(
		(context.connectedMcpServices ?? [])
			.filter((service) => !service.toolsLoaded)
			.map((service) => service.slug),
	);
}

async function handleSearch(
	context: InstanceAiContext,
	input: z.infer<typeof searchAction>,
): Promise<z.infer<typeof searchOutputSchema>> {
	const mcpService = requireMcpService(context);
	const [matches, connections] = await Promise.all([
		mcpService.search(input.queries),
		mcpService.listConnections(),
	]);

	const connected = new Set(connections.map((connection) => connection.slug));
	const broken = brokenSlugs(context);
	const stateFor = (slug: string): ConnectionState => {
		if (!connected.has(slug)) return 'not-connected';
		return broken.has(slug) ? 'connected-not-working' : 'connected';
	};

	const results = matches
		.slice(0, MAX_RESULTS)
		.map((server) => ({ ...server, state: stateFor(server.slug) }));
	const states = new Set(results.map((result) => result.state));

	const hint = [
		states.has('not-connected') && CONNECT_HINT,
		states.has('connected') && ALREADY_WORKING_HINT,
		states.has('connected-not-working') && BROKEN_HINT,
		matches.length > results.length && TRUNCATED_HINT,
	]
		.filter((line): line is string => typeof line === 'string')
		.join('\n\n');

	return { results, hint: hint || undefined };
}

async function handleConnect(
	context: InstanceAiContext,
	input: z.infer<typeof connectAction>,
	ctx: McpServersToolContext,
): Promise<z.infer<typeof connectOutputSchema>> {
	const mcpService = requireMcpService(context);
	const { resumeData } = ctx;

	const [servers, connections] = await Promise.all([
		mcpService.getServers(input.serverSlugs),
		mcpService.listConnections(),
	]);
	const connected = new Set(connections.map((connection) => connection.slug));
	const known = new Set(servers.map((server) => server.slug));
	// A slug the user has a connection row for is real even when the registry no longer
	// resolves it (deprecated, or its remote is gone), so it is connected, not invented.
	const alreadyConnected = input.serverSlugs.filter((slug) => connected.has(slug));
	const unknownSlugs = input.serverSlugs.filter((slug) => !known.has(slug) && !connected.has(slug));
	const unknownNote = unknownSlugs.length
		? ` No tool matches ${unknownSlugs.join(', ')} — only use slugs \`search\` returned.`
		: '';

	if (resumeData !== undefined && resumeData !== null) {
		// The client's report is a filter, never evidence: intersecting it with the
		// server's own view lets a client understate what happened but never overstate it.
		const claimed = resumeData.connectedSlugs ?? [];
		const verified = input.serverSlugs.filter(
			(slug) => claimed.includes(slug) && connected.has(slug),
		);

		if (verified.length === 0) {
			return {
				connectedSlugs: [],
				message:
					(resumeData.approved ? 'No connection was created.' : 'The user chose not to connect.') +
					NOT_CONNECTED_GUIDANCE +
					unknownNote,
			};
		}

		const brokenSet = brokenSlugs(context);
		const working = verified.filter((slug) => !brokenSet.has(slug));
		const broken = verified.filter((slug) => brokenSet.has(slug));

		const message = [
			working.length > 0 &&
				`Connected: ${working.join(', ')}. Their tools are available now — find them with \`search_tools\` and carry on with the request.`,
			broken.length > 0 && brokenConnectionNote(broken),
		]
			.filter((line): line is string => typeof line === 'string')
			.join(' ');

		return { connectedSlugs: working, message: message + unknownNote };
	}

	if (servers.length === 0) {
		if (alreadyConnected.length === 0) {
			return {
				connectedSlugs: [],
				message: `No tool matches ${unknownSlugs.join(', ')}. Call \`action: "search"\` first and use a slug it returned.`,
			};
		}

		// No registry entry left to render a row from, so their tools cannot have loaded either.
		return {
			connectedSlugs: [],
			message: brokenConnectionNote(alreadyConnected) + unknownNote,
		};
	}

	// `message` is never shown: the UI renders the servers and the model writes its
	// own sentence, so a correction has to ride the resume result instead.
	return await ctx.suspend({
		requestId: nanoid(),
		message: input.reason,
		severity: 'info',
		mcpConnectRequest: {
			servers: servers.map((server) => ({
				serverSlug: server.slug,
				title: server.title,
				credentialType: server.credentialType,
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
			return parsed.action === 'search'
				? await handleSearch(context, parsed)
				: await handleConnect(context, parsed, ctx);
		})
		.build();
}
