import type { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Request } from 'express';

import { McpServerShareService } from './mcp-server-share.service';

/**
 * The share page of a server. The page reads the signed-in route when the person is signed in,
 * and the public route when not. Both answer 404 for an unknown server and when the flag is off.
 */
@RestController('/mcp-servers/share')
export class McpServerShareController {
	constructor(private readonly service: McpServerShareService) {}

	/** The description and the tools only when the person can connect to the server. */
	@Get('/:slug')
	async share(req: AuthenticatedRequest<{ slug: string }>) {
		const share = await this.service.shareFor(req.params.slug, req.user);
		if (!share) throw new NotFoundError('MCP server not found');
		return share;
	}

	@Get('/:slug/public', { skipAuth: true, ipRateLimit: true })
	async publicShare(req: Request<{ slug: string }>) {
		const share = await this.service.publicShare(req.params.slug);
		if (!share) throw new NotFoundError('MCP server not found');
		return share;
	}
}
