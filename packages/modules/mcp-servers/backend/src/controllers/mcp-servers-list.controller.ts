import type { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { CustomMcpServersFlagGate } from '../services/custom-mcp-servers-flag-gate';
import { McpServersService } from '../services/mcp-servers.service';

/** The servers of all projects, for the "MCP" tab on Overview. */
@RestController('/mcp-servers')
export class McpServersListController {
	constructor(
		private readonly service: McpServersService,
		private readonly flagGate: CustomMcpServersFlagGate,
	) {}

	@Get('/')
	// The route has no project id, so the service checks `mcpServer:list` in each project.
	async list(req: AuthenticatedRequest) {
		await this.flagGate.assertEnabled();
		return await this.service.listForUser(req.user);
	}
}
