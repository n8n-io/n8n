import { CreateMcpServerDto, McpServerSlugQueryDto, UpdateMcpServerDto } from '@n8n/api-types';
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

import { CustomMcpServersFlagGate } from './custom-mcp-servers-flag-gate';
import { McpServerToolsService } from './mcp-server-tools.service';
import { McpServersService } from './mcp-servers.service';

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
	@ProjectScope('mcpServer:list')
	async list(req: ServerRequest) {
		await this.flagGate.assertEnabled(req.user);
		return await this.service.list(req.params.projectId);
	}

	@Post('/')
	@ProjectScope('mcpServer:create')
	async create(req: ServerRequest, _res: unknown, @Body dto: CreateMcpServerDto) {
		await this.flagGate.assertEnabled(req.user);
		return await this.service.create(req.params.projectId, dto, {
			userId: req.user.id,
			source: 'ui',
		});
	}

	// Before `/:serverId`, which would match this path too.
	@Get('/slug-available')
	@ProjectScope('mcpServer:create')
	async slugAvailable(req: ServerRequest, _res: unknown, @Query query: McpServerSlugQueryDto) {
		await this.flagGate.assertEnabled(req.user);
		return await this.service.slugAvailability(query.slug);
	}

	/** One server with its tools. Each tool says if it is broken, and why. */
	@Get('/:serverId')
	@ProjectScope('mcpServer:read')
	async get(req: ServerRequest) {
		await this.flagGate.assertEnabled(req.user);
		const { projectId, serverId } = req.params;
		const server = await this.service.get(projectId, serverId);
		return { ...server, tools: await this.toolsService.listTools(projectId, server.id) };
	}

	@Patch('/:serverId')
	@ProjectScope('mcpServer:update')
	async update(req: ServerRequest, _res: unknown, @Body dto: UpdateMcpServerDto) {
		await this.flagGate.assertEnabled(req.user);
		return await this.service.update(req.params.projectId, req.params.serverId, dto);
	}

	@Delete('/:serverId')
	@ProjectScope('mcpServer:delete')
	async delete(req: ServerRequest) {
		await this.flagGate.assertEnabled(req.user);
		await this.service.delete(req.params.projectId, req.params.serverId, {
			userId: req.user.id,
			source: 'ui',
		});
	}
}
