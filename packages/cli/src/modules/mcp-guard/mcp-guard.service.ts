import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { GymAdmin } from './gym-admin';
import type { HydrationModel } from './hydration-llm';
import { RunRegistry } from './runs';
import { GUARD_PROFILES, type GuardServiceProfile } from './services';

function bearer(req: Request): string | undefined {
	const h = req.headers.get('authorization');
	return h ? /^Bearer\s+(.+)$/i.exec(h)?.[1] : undefined;
}

// Env per service: AI_GYM_<NAME>_URL, GYM_<NAME>_MCP_URL and <NAME>_MCP_URL. Linear also keeps the
// old names AI_GYM_URL, GYM_MCP_URL and LINEAR_MCP_URL.
function runConfig(profile: GuardServiceProfile) {
	const key = profile.name.toUpperCase();
	const legacy = profile.name === 'linear';
	return {
		profile,
		admin: new GymAdmin(
			process.env[`AI_GYM_${key}_URL`] ??
				(legacy ? process.env.AI_GYM_URL : undefined) ??
				profile.defaultAdminUrl,
		),
		upstreamMcpUrl: process.env[`${key}_MCP_URL`] ?? `https://${profile.host}/mcp`,
		gymMcpUrl:
			process.env[`GYM_${key}_MCP_URL`] ??
			(legacy ? process.env.GYM_MCP_URL : undefined) ??
			profile.defaultGymMcpUrl,
	};
}

@Service()
export class McpGuardService {
	// One registry per service. Each service can use its own gym process.
	private readonly registries = new Map<string, RunRegistry>(
		GUARD_PROFILES.map((profile) => [profile.host, new RunRegistry(runConfig(profile))]),
	);

	constructor(private readonly logger: Logger) {}

	// In-process: takes the MCP Request from the test-run fetch wrapper and returns the Response.
	async handleMcp(
		host: string,
		runId: string,
		req: Request,
		model?: HydrationModel,
	): Promise<Response> {
		const registry = this.registries.get(host);
		if (!registry) return new Response(null, { status: 404 });
		// The real upstream key is only used for upstream reads. Never log it.
		const token = bearer(req);
		if (!token) return new Response(null, { status: 401 });

		let run;
		try {
			run = await registry.getOrCreate(runId, token, model);
		} catch (e) {
			this.logger.error(
				`mcp-guard run setup failed: ${e instanceof Error ? e.message : 'unknown'}`,
			);
			return new Response('gym unavailable', { status: 502 });
		}

		// The tools are not static, so the low-level server of `McpServer` answers the requests.
		const mcp = new McpServer(
			{ name: 'mcp-guard', version: '0.1.0' },
			{ capabilities: { tools: {} } },
		);
		const server = mcp.server;
		server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: await run.router.listTools(),
		}));
		server.setRequestHandler(CallToolRequestSchema, async (r) => {
			const args = isRecord(r.params.arguments) ? r.params.arguments : {};
			return await run.router.callTool(r.params.name, args);
		});
		// Stateless: one transport and server for each request.
		const transport = new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true,
		});
		await mcp.connect(transport);
		try {
			return await transport.handleRequest(req);
		} finally {
			void transport.close();
			void mcp.close();
		}
	}
}
