import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { GymAdmin, isRecord } from './gym-admin';
import { RunRegistry } from './runs';

function bearer(req: Request): string | undefined {
	const h = req.headers.get('authorization');
	return h ? /^Bearer\s+(.+)$/i.exec(h)?.[1] : undefined;
}

@Service()
export class McpGuardService {
	private readonly registry = new RunRegistry({
		admin: new GymAdmin(process.env.AI_GYM_URL ?? 'http://localhost:9090'),
		linearMcpUrl: process.env.LINEAR_MCP_URL ?? 'https://mcp.linear.app/mcp',
		gymMcpUrl: process.env.GYM_MCP_URL ?? 'http://localhost:8080/mcp',
	});

	constructor(private readonly logger: Logger) {}

	async deleteRun(runId: string): Promise<boolean> {
		return await this.registry.delete(runId);
	}

	// In-process: takes the MCP Request from the test-run fetch wrapper and returns the Response.
	async handleMcp(runId: string, req: Request): Promise<Response> {
		// The real Linear key is only used for upstream reads. Never log it.
		const token = bearer(req);
		if (!token) return new Response(null, { status: 401 });

		let run;
		try {
			run = await this.registry.getOrCreate(runId, token);
		} catch (e) {
			this.logger.error(`mcp-guard run setup failed: ${e instanceof Error ? e.message : 'unknown'}`);
			return new Response('gym unavailable', { status: 502 });
		}

		const server = new Server(
			{ name: 'mcp-guard', version: '0.1.0' },
			{ capabilities: { tools: {} } },
		);
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
		await server.connect(transport);
		try {
			return await transport.handleRequest(req);
		} finally {
			void transport.close();
			void server.close();
		}
	}
}
