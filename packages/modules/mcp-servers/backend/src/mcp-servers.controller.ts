import type { AuthenticatedRequest } from '@n8n/db';
import { Get, ProjectScope, RestController } from '@n8n/decorators';

import { CustomMcpServersFlagGate } from './custom-mcp-servers-flag-gate';
import { McpServerToolsService } from './mcp-server-tools.service';

type ServerRequest = AuthenticatedRequest<{ projectId: string; serverId: string }>;

@RestController('/projects/:projectId/mcp-servers')
export class McpServersController {
	constructor(
		private readonly flagGate: CustomMcpServersFlagGate,
		private readonly toolsService: McpServerToolsService,
	) {}

	/** One server with its tools. Each tool says if it is broken, and why. */
	@Get('/:serverId')
	@ProjectScope('mcpServer:read')
	async get(req: ServerRequest) {
		await this.flagGate.assertEnabled(req.user);
		return await this.toolsService.getServer(req.params.projectId, req.params.serverId);
	}
}
