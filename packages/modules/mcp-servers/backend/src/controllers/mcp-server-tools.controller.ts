import {
	AddMcpServerToolsDto,
	DraftMcpServerToolDto,
	MCP_SERVER_ACTION_SCOPES,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, ProjectScope, RestController } from '@n8n/decorators';

import { CustomMcpServersFlagGate } from '../services/custom-mcp-servers-flag-gate';
import { McpServerToolsService } from '../services/mcp-server-tools.service';

type ToolsRequest = AuthenticatedRequest<{ projectId: string; serverId: string }>;
type ToolRequest = AuthenticatedRequest<{ projectId: string; serverId: string; toolId: string }>;

/**
 * The tools of a server. The write routes change the server, so they need `update`. The read
 * route `tool-candidates` also needs `update`, because only the editor of the server uses it.
 */
@RestController('/projects/:projectId/mcp-servers/:serverId')
export class McpServerToolsController {
	constructor(
		private readonly flagGate: CustomMcpServersFlagGate,
		private readonly toolsService: McpServerToolsService,
	) {}

	@Get('/tool-candidates')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.toolCandidates)
	async candidates(req: ToolsRequest) {
		await this.flagGate.assertEnabled();
		return await this.toolsService.listCandidates(req.params.projectId, req.params.serverId);
	}

	@Post('/tools')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.addTools)
	async add(req: ToolsRequest, _res: unknown, @Body dto: AddMcpServerToolsDto) {
		await this.flagGate.assertEnabled();
		return await this.toolsService.addWorkflowTools(
			req.params.projectId,
			req.params.serverId,
			dto.workflowIds,
			{ userId: req.user.id, source: 'ui' },
		);
	}

	@Patch('/tools/:toolId')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.updateTool)
	async update(req: ToolRequest, _res: unknown, @Body dto: UpdateMcpServerToolDto) {
		await this.flagGate.assertEnabled();
		return await this.toolsService.updateTool(
			req.params.projectId,
			req.params.serverId,
			req.params.toolId,
			dto,
		);
	}

	/** One model call. Without `field`, the draft writes both fields, as after an add. */
	@Post('/tools/:toolId/draft')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.draftTool)
	async draft(req: ToolRequest, _res: unknown, @Body dto: DraftMcpServerToolDto) {
		await this.flagGate.assertEnabled();
		return await this.toolsService.draftTool(
			req.user,
			req.params.projectId,
			req.params.serverId,
			req.params.toolId,
			{ userId: req.user.id, source: 'ui' },
			dto.field,
		);
	}

	@Delete('/tools/:toolId')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.removeTool)
	async remove(req: ToolRequest) {
		await this.flagGate.assertEnabled();
		await this.toolsService.removeTool(
			req.params.projectId,
			req.params.serverId,
			req.params.toolId,
		);
	}
}
