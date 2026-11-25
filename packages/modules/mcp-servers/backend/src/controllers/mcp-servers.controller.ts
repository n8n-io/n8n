import {
	CreateMcpServerDto,
	MCP_SERVER_ACTION_SCOPES,
	McpServerSlugQueryDto,
	UpdateMcpServerDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Patch,
	Post,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';

import { McpServerToolsService } from '../services/mcp-server-tools.service';
import { CustomMcpServersFlagGate } from '../services/custom-mcp-servers-flag-gate';
import { McpServersService } from '../services/mcp-servers.service';

type ServerRequest = AuthenticatedRequest<{ projectId: string; serverId: string }>;

/**
 * The builder API of the servers of one project. Each route checks its scope with
 * `@ProjectScope` and then the flag, so a route without both is an open one.
 */
@RestController('/projects/:projectId/mcp-servers')
export class McpServersController {
	constructor(
		private readonly service: McpServersService,
		private readonly toolsService: McpServerToolsService,
		private readonly flagGate: CustomMcpServersFlagGate,
	) {}

	@Get('/')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.list)
	async list(req: ServerRequest) {
		await this.flagGate.assertEnabled();
		return await this.service.list(req.params.projectId);
	}

	@Post('/')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.create)
	async create(req: ServerRequest, _res: unknown, @Body dto: CreateMcpServerDto) {
		await this.flagGate.assertEnabled();
		return await this.service.create(req.params.projectId, dto, {
			userId: req.user.id,
			source: 'ui',
		});
	}

	// Before `/:serverId`, which would match this path too.
	@Get('/slug-available')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.create)
	async slugAvailable(_req: ServerRequest, _res: unknown, @Query query: McpServerSlugQueryDto) {
		await this.flagGate.assertEnabled();
		return await this.service.slugAvailability(query.slug);
	}

	/** One server with its tools. Each tool says if it is broken, and why. */
	@Get('/:serverId')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.read)
	async get(req: ServerRequest) {
		await this.flagGate.assertEnabled();
		const { projectId, serverId } = req.params;
		const server = await this.service.get(projectId, serverId);
		const [tools, toolDraftsAvailable] = await Promise.all([
			this.toolsService.listTools(projectId, server.id),
			this.toolsService.draftsAvailable(req.user),
		]);
		return { ...server, tools, toolDraftsAvailable };
	}

	@Patch('/:serverId')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.update)
	async update(req: ServerRequest, _res: unknown, @Body dto: UpdateMcpServerDto) {
		await this.flagGate.assertEnabled();
		return await this.service.update(req.params.projectId, req.params.serverId, dto);
	}

	@Delete('/:serverId')
	@ProjectScope(MCP_SERVER_ACTION_SCOPES.delete)
	async delete(req: ServerRequest) {
		await this.flagGate.assertEnabled();
		await this.service.delete(req.params.projectId, req.params.serverId, {
			userId: req.user.id,
			source: 'ui',
		});
	}
}
