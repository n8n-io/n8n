import { AddMcpServerToolsDto, UpdateMcpServerToolDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, ProjectScope, RestController } from '@n8n/decorators';

import { CustomMcpServersFlagGate } from './services/custom-mcp-servers-flag-gate';
import { McpServerToolsService } from './mcp-server-tools.service';

type ToolsRequest = AuthenticatedRequest<{ projectId: string; serverId: string }>;
type ToolRequest = AuthenticatedRequest<{ projectId: string; serverId: string; toolId: string }>;

/** The tools of a server. Every route changes the server, so every route needs `update`. */
@RestController('/projects/:projectId/mcp-servers/:serverId')
export class McpServerToolsController {
	constructor(
		private readonly flagGate: CustomMcpServersFlagGate,
		private readonly toolsService: McpServerToolsService,
	) {}

	@Get('/tool-candidates')
	@ProjectScope('mcpServer:update')
	async candidates(req: ToolsRequest) {
		await this.flagGate.assertEnabled(req.user);
		return await this.toolsService.listCandidates(req.params.projectId, req.params.serverId);
	}

	@Post('/tools')
	@ProjectScope('mcpServer:update')
	async add(req: ToolsRequest, _res: unknown, @Body dto: AddMcpServerToolsDto) {
		await this.flagGate.assertEnabled(req.user);
		return await this.toolsService.addWorkflowTools(
			req.params.projectId,
			req.params.serverId,
			dto.workflowIds,
			{ userId: req.user.id, source: 'ui' },
		);
	}

	@Patch('/tools/:toolId')
	@ProjectScope('mcpServer:update')
	async update(req: ToolRequest, _res: unknown, @Body dto: UpdateMcpServerToolDto) {
		await this.flagGate.assertEnabled(req.user);
		return await this.toolsService.updateTool(
			req.params.projectId,
			req.params.serverId,
			req.params.toolId,
			dto,
		);
	}

	@Delete('/tools/:toolId')
	@ProjectScope('mcpServer:update')
	async remove(req: ToolRequest) {
		await this.flagGate.assertEnabled(req.user);
		await this.toolsService.removeTool(
			req.params.projectId,
			req.params.serverId,
			req.params.toolId,
		);
	}
}
