import { BlockMcpServerUserDto, MCP_SERVER_ACTION_SCOPES } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Post, ProjectScope, RestController } from '@n8n/decorators';

import { CustomMcpServersFlagGate } from '../services/custom-mcp-servers-flag-gate';
import { McpServerAccessService } from './mcp-server-access.service';

type ServerRequest = AuthenticatedRequest<{ projectId: string; serverId: string }>;
type PersonRequest = AuthenticatedRequest<{ projectId: string; serverId: string; userId: string }>;

/** The connections of a server, and block, restore access, and remove for a person. */
@RestController('/projects/:projectId/mcp-servers/:serverId')
export class McpServerAccessController {
	constructor(
		private readonly flagGate: CustomMcpServersFlagGate,
		private readonly access: McpServerAccessService,
	) {}

	@Get('/connections')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.listConnections)
	async list(req: ServerRequest) {
		await this.flagGate.assertEnabled();
		return await this.access.list(req.params.projectId, req.params.serverId);
	}

	@Post('/blocks')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.blockPerson)
	async block(req: ServerRequest, _res: unknown, @Body dto: BlockMcpServerUserDto) {
		await this.flagGate.assertEnabled();
		return await this.access.block(req.params.projectId, req.params.serverId, dto.userId, {
			userId: req.user.id,
			source: 'ui',
		});
	}

	@Delete('/blocks/:userId')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.restoreAccess)
	async restore(req: PersonRequest) {
		await this.flagGate.assertEnabled();
		await this.access.restore(req.params.projectId, req.params.serverId, req.params.userId, {
			userId: req.user.id,
			source: 'ui',
		});
	}

	/** Works only for a blocked person. */
	@Delete('/connections/:userId')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.removePerson)
	async remove(req: PersonRequest) {
		await this.flagGate.assertEnabled();
		await this.access.remove(req.params.projectId, req.params.serverId, req.params.userId);
	}
}
