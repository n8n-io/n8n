import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { createIpRateLimit, Get, Head, Options, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';

import { McpServerChannelService } from './mcp-server-channel.service';

const agentsConfig = Container.get(AgentsConfig);

/**
 * The public endpoint of the MCP server channel, next to the webhook channel
 * of the same agent. It is a root-level controller, so only mains serve it.
 */
@RootLevelController(`/${Container.get(GlobalConfig).endpoints.agentWebhook}`)
export class McpServerChannelController {
	constructor(private readonly channel: McpServerChannelService) {}

	// Public routes: do not add a scope decorator. The service checks the OAuth token
	// against this agent's resource, and the resource checks `agent:execute`.
	@Post('/:agentId/mcp', {
		ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
		skipAuth: true,
		allowBots: true,
		usesTemplates: true,
	})
	async handle(req: Request<{ agentId: string }>, res: Response) {
		setCorsHeaders(res);
		await this.channel.handle(req.params.agentId, req, res);
	}

	/** Lets a client find the OAuth metadata before it sends a request (RFC 6750 §3). */
	@Head('/:agentId/mcp', {
		ipRateLimit: createIpRateLimit(agentsConfig.webhookChannelRateLimit),
		skipAuth: true,
		usesTemplates: true,
	})
	async discover(req: Request<{ agentId: string }>, res: Response) {
		setCorsHeaders(res);
		await this.channel.challenge(req.params.agentId, res);
	}

	/**
	 * The server is stateless, so it never offers the GET listen stream. The
	 * Streamable HTTP spec asks for 405 in that case.
	 */
	@Get('/:agentId/mcp', { skipAuth: true, usesTemplates: true })
	methodNotAllowed(_req: Request, res: Response) {
		setCorsHeaders(res);
		res.header('Allow', 'POST');
		res.status(405).json({
			jsonrpc: '2.0',
			error: { code: -32000, message: 'Method not allowed.' },
			id: null,
		});
	}

	@Options('/:agentId/mcp', { skipAuth: true, usesTemplates: true })
	preflight(_req: Request, res: Response) {
		setCorsHeaders(res);
		res.status(204).end();
	}
}

/** Browser-based MCP clients send the 2026-07-28 routing headers, so they must be allowed. */
function setCorsHeaders(res: Response) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
	res.header(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
	);
	res.header('Access-Control-Expose-Headers', 'WWW-Authenticate');
	res.header('Access-Control-Max-Age', '86400');
}
