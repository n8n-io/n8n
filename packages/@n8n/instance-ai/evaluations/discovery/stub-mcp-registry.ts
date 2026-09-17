// ---------------------------------------------------------------------------
// Stub MCP registry + connections for discovery evals. Fakes the registry
// service; `stub-local-mcp.ts` fakes the computer-use gateway.
//
// ---------------------------------------------------------------------------

import { sanitizeToolName, wrapToolForApproval, type BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

import type { ApprovalResponder } from './confirmation-policy';
import type { Logger } from '../../src/logger';
import { McpClientManager } from '../../src/mcp/mcp-client-manager';
import { createToolRegistry } from '../../src/tool-registry';
import type {
	InstanceAiMcpService,
	InstanceAiToolRegistry,
	McpRegistryConnectServerSummary,
	McpRegistryServerSummary,
	McpServerConfig,
} from '../../src/types';

/** What production derives for cli's shared e2e fixtures (`registry/mock-servers.ts`).
 * Search below drops credential options and real relevance scoring. */
const CATALOGUE: McpRegistryConnectServerSummary[] = [
	{
		slug: 'notion',
		title: 'Notion',
		description: 'Connect to the Notion MCP Server',
		usesCredentials: [
			{ credentialType: 'notionMcpOAuth2Api', name: 'OAuth2', value: 'oAuth2' },
		],
		tools: ['notion-search', 'notion-fetch', 'notion-create-pages'],
	},
	{
		slug: 'linear',
		title: 'Linear',
		description: 'Connect to the Linear MCP Server',
		usesCredentials: [
			{ credentialType: 'linearMcpOAuth2Api', name: 'OAuth2', value: 'oAuth2' },
		],
		tools: ['list_issues', 'get_issue', 'save_issue'],
	},
	{
		slug: 'slack',
		title: 'Slack',
		description: 'Connect to the Slack MCP Server',
		usesCredentials: [
			{ credentialType: 'slackMcpOAuth2Api', name: 'OAuth2', value: 'oAuth2' },
		],
		tools: [],
	},
];

export interface StubMcpConnection {
	slug: string;
	/** Defaults to the catalogue's tools; empty models a broken connection. */
	tools?: string[];
}

export interface DiscoveryMcpState {
	registry?: string[];
	connected?: StubMcpConnection[];
}

export interface StubMcpRegistry {
	service: InstanceAiMcpService;
	markConnected: (slugs: string[]) => void;
}

function catalogueServer(slug: string): McpRegistryConnectServerSummary {
	const server = CATALOGUE.find((entry) => entry.slug === slug);
	if (!server) {
		const known = CATALOGUE.map((entry) => entry.slug).join(', ');
		throw new Error(`Unknown MCP registry slug "${slug}" — expected one of ${known}.`);
	}
	return server;
}

export function createStubMcpRegistry(state: DiscoveryMcpState): StubMcpRegistry {
	const servers = (state.registry ?? []).map(catalogueServer);
	const connected = new Set((state.connected ?? []).map((entry) => entry.slug));

	const matches = (server: McpRegistryServerSummary, query: string): boolean =>
		`${server.slug} ${server.title} ${server.description}`
			.toLowerCase()
			.includes(query.trim().toLowerCase());

	return {
		markConnected: (slugs) => slugs.forEach((slug) => connected.add(slug)),
		service: {
			// Connected servers are filtered out, as in the adapter.
			search: async (queries) =>
				await Promise.resolve(
					servers.filter(
						(server) =>
							!connected.has(server.slug) && queries.some((query) => matches(server, query)),
					).map(({ slug, title, description, tools }) => ({ slug, title, description, tools })),
				),
			getServers: async (slugs) =>
				await Promise.resolve(servers.filter((server) => slugs.includes(server.slug))),
			listConnections: async () => await Promise.resolve([...connected].map((slug) => ({ slug }))),
		},
	};
}

/** Approving a connect card claims the offered slugs on resume *and* makes them
 *  live here — `resumeConnect` counts a slug only when both hold. */
export function createMcpConnectResponder(registry: StubMcpRegistry): ApprovalResponder {
	return (payload) => {
		const request = payload.mcpConnectRequest;
		if (!isRecord(request) || !Array.isArray(request.servers)) return undefined;

		const slugs = request.servers
			.map((server) => (isRecord(server) ? server.serverSlug : undefined))
			.filter((slug): slug is string => typeof slug === 'string' && slug.length > 0);
		if (slugs.length === 0) return undefined;

		registry.markConnected(slugs);
		return { connectedSlugs: slugs };
	};
}

/** `listConnectedMcpServices` pairs a tool with its slug through this name. */
function serverName(slug: string): string {
	return `mcp_${slug}`;
}

export function stubMcpServerConfigs(state: DiscoveryMcpState): McpServerConfig[] {
	return (state.connected ?? []).map(({ slug }) => ({
		name: serverName(slug),
		url: `https://${slug}.mcp.invalid/mcp`,
		metadata: { serverSlug: slug },
	}));
}

/** Mirrors `mcp-tool-resolver`'s output, down to the server-prefixed name. */
function stubMcpTool(rawName: string, slug: string): BuiltTool {
	return {
		name: sanitizeToolName(`${serverName(slug)}_${rawName}`),
		description: `${slug} MCP tool.`,
		inputSchema: { type: 'object', properties: {} },
		mcpTool: true,
		mcpServerName: serverName(slug),
		mcpToolName: rawName,
		// An empty or apologetic result reads to the agent as an expired connection
		// and sends it to `connect` — a stub artefact that looks like a regression.
		handler: async () =>
			await Promise.resolve({
				ok: true,
				items: [{ id: `${slug}-eval-stub-1`, title: 'Eval harness result' }],
			}),
	};
}

export function createStubMcpToolRegistry(state: DiscoveryMcpState): InstanceAiToolRegistry {
	const registry = createToolRegistry();
	for (const { slug, tools } of state.connected ?? []) {
		for (const rawName of tools ?? catalogueServer(slug).tools) {
			const tool = stubMcpTool(rawName, slug);
			registry.set(tool.name, tool);
		}
	}
	return registry;
}

/** Production wraps MCP tools in the same gate whenever the caller asks for
 *  approval; the real path goes through `McpConnection.listTools`, which this stub
 *  bypasses. */
function withApprovalGate(tools: InstanceAiToolRegistry): InstanceAiToolRegistry {
	const gated = createToolRegistry();
	for (const [name, tool] of tools) {
		gated.set(name, wrapToolForApproval(tool, { requireApproval: true }));
	}
	return gated;
}

/** `CreateInstanceAgentOptions.mcpManager` is the concrete class, so this
 *  subclasses rather than structurally fakes it. */
export class StubMcpClientManager extends McpClientManager {
	constructor(private readonly stubTools: InstanceAiToolRegistry) {
		super();
	}

	override async getRegularTools(
		_configs: McpServerConfig[],
		_logger?: Logger,
		requireApproval = true,
	) {
		const tools = requireApproval ? withApprovalGate(this.stubTools) : this.stubTools;
		return await Promise.resolve({ tools, connectionFailures: [] });
	}

	override async disconnect() {
		await Promise.resolve();
	}
}
