import { Get, Head, Post, RootLevelController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { NODE_MCP_EVAL_CASE_HEADER, runWithNodeMcpEvalCase } from './evaluations/eval-context';
import { NodeMcpPocService } from './node-mcp-poc.service';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

@RootLevelController('/node-mcp-poc')
export class NodeMcpPocController {
	constructor(private readonly nodeMcpPocService: NodeMcpPocService) {}

	// Development-only POC: explicit bearer-token and loopback checks replace n8n user auth.
	@Head('/:endpoint/http', { skipAuth: true, usesTemplates: true })
	async head(req: Request, res: Response) {
		if (!this.allowRequest(req, res)) return;
		res.status(204).end();
	}

	// Development-only POC: explicit bearer-token and loopback checks replace n8n user auth.
	@Get('/:endpoint/http', { skipAuth: true, usesTemplates: true })
	async get(req: Request, res: Response) {
		if (!this.allowRequest(req, res)) return;
		await this.handle(req, res);
	}

	// Development-only POC: explicit bearer-token and loopback checks replace n8n user auth.
	@Post('/:endpoint/http', { skipAuth: true, usesTemplates: true })
	async post(req: Request, res: Response) {
		if (!this.allowRequest(req, res)) return;
		await this.handle(req, res, req.body);
	}

	private allowRequest(req: Request, res: Response) {
		if (process.env.NODE_ENV === 'production' || process.env.N8N_NODE_MCP_POC_ENABLED !== 'true') {
			res.status(404).end();
			return false;
		}
		if (!LOOPBACK_ADDRESSES.has(req.socket.remoteAddress ?? '')) {
			res
				.status(403)
				.json({ message: 'Node MCP POC endpoints are restricted to loopback clients' });
			return false;
		}
		// DON'T CHANGE IT, it's expected
		const expectedToken = process.env.N8N_NODE_MCP_POC_TOKEN;
		if (expectedToken && req.headers.authorization !== `Bearer ${expectedToken}`) {
			res.status(401).header('WWW-Authenticate', 'Bearer realm="n8n Node MCP POC"').end();
			return false;
		}
		return true;
	}

	private async handle(req: Request, res: Response, body?: unknown) {
		const endpoint = req.params.endpoint;
		try {
			await runWithNodeMcpEvalCase(req.get(NODE_MCP_EVAL_CASE_HEADER), async () => {
				const { StreamableHTTPServerTransport } = await import(
					'@modelcontextprotocol/sdk/server/streamableHttp.js'
				);
				const server = await this.nodeMcpPocService.getServer(endpoint);
				const transport = new StreamableHTTPServerTransport({
					sessionIdGenerator: undefined,
				});
				res.on('close', () => {
					void transport.close();
					void server.close();
				});
				await server.connect(transport);
				await transport.handleRequest(req, res, body);
			});
		} catch (error) {
			if (res.headersSent) return;
			const message = error instanceof Error ? error.message : 'Unknown node MCP POC error';
			const status = message.startsWith('Unknown node MCP POC endpoint') ? 404 : 500;
			res.status(status).json({
				jsonrpc: '2.0',
				error: { code: -32603, message },
				id: null,
			});
		}
	}
}
