import {
	AddMcpServerResourceDto,
	AddMcpServerToolDto,
	CreateMcpServerApiKeyDto,
	CreateMcpServerDto,
	McpServerAnalyticsQueryDto,
	McpServerCallsQueryDto,
	McpServerPlaygroundRequestDto,
	UpdateMcpServerDto,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, Query, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Request, Response } from 'express';

import { McpServerPlaygroundService } from './mcp-server-playground.service';
import { McpServerStoreService } from './mcp-server-store.service';
import { McpServerTargetsService } from './mcp-server-targets.service';

type SearchRequest = AuthenticatedRequest<{}, {}, {}, { search?: string }>;

/**
 * Management API of MCP Servers. Hack scope: every signed-in user can manage every
 * server. No project, role or scope checks.
 */
@RestController('/mcp-servers')
export class McpServersController {
	constructor(
		private readonly store: McpServerStoreService,
		private readonly targets: McpServerTargetsService,
		private readonly playground: McpServerPlaygroundService,
	) {}

	@Get('/')
	async list() {
		return await this.store.list();
	}

	@Post('/')
	async create(req: AuthenticatedRequest, _res: Response, @Body body: CreateMcpServerDto) {
		return await this.store.create(req.user, body);
	}

	/** Workflows and agents that can become tools. Registered before `/:serverId`. */
	@Get('/targets')
	async listTargets(req: SearchRequest) {
		const search = typeof req.query.search === 'string' ? req.query.search : '';
		return await this.targets.listTargets(req.user, search);
	}

	@Get('/skills')
	async listSkills(req: SearchRequest) {
		const search = typeof req.query.search === 'string' ? req.query.search : '';
		return await this.targets.listSkills(req.user, search);
	}

	/** The share page for instance users. The public variant is `/mcp-servers-public/:slug`. */
	@Get('/share/:slug')
	async share(_req: AuthenticatedRequest, _res: Response, @Param('slug') slug: string) {
		const share = await this.store.share(slug);
		if (!share) throw new NotFoundError('MCP server not found');
		return share;
	}

	@Get('/:serverId')
	async get(_req: AuthenticatedRequest, _res: Response, @Param('serverId') serverId: string) {
		return await this.store.get(serverId);
	}

	@Patch('/:serverId')
	async update(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Body body: UpdateMcpServerDto,
	) {
		return await this.store.update(serverId, body);
	}

	@Delete('/:serverId')
	async delete(_req: AuthenticatedRequest, _res: Response, @Param('serverId') serverId: string) {
		await this.store.delete(serverId);
		return { success: true };
	}

	@Post('/:serverId/tools')
	async addTool(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Body body: AddMcpServerToolDto,
	) {
		await this.store.addTool(serverId, body);
		return await this.store.get(serverId);
	}

	@Patch('/:serverId/tools/:toolId')
	async updateTool(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Param('toolId') toolId: string,
		@Body body: UpdateMcpServerToolDto,
	) {
		return await this.store.updateTool(serverId, toolId, body);
	}

	@Delete('/:serverId/tools/:toolId')
	async removeTool(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Param('toolId') toolId: string,
	) {
		await this.store.removeTool(serverId, toolId);
		return await this.store.get(serverId);
	}

	@Post('/:serverId/resources')
	async addResource(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Body body: AddMcpServerResourceDto,
	) {
		return await this.store.addResource(serverId, body);
	}

	@Delete('/:serverId/resources/:resourceId')
	async removeResource(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Param('resourceId') resourceId: string,
	) {
		await this.store.removeResource(serverId, resourceId);
		return await this.store.get(serverId);
	}

	@Post('/:serverId/api-keys')
	async createApiKey(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Body body: CreateMcpServerApiKeyDto,
	) {
		return await this.store.createApiKey(serverId, body.label);
	}

	@Delete('/:serverId/api-keys/:keyId')
	async revokeApiKey(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Param('keyId') keyId: string,
	) {
		await this.store.revokeApiKey(serverId, keyId);
		return await this.store.get(serverId);
	}

	@Post('/:serverId/oauth-users/:userId/revoke')
	async revokeOAuthUser(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Param('userId') userId: string,
	) {
		await this.store.setOAuthUserRevoked(serverId, userId, true);
		return await this.store.get(serverId);
	}

	@Post('/:serverId/oauth-users/:userId/restore')
	async restoreOAuthUser(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Param('userId') userId: string,
	) {
		await this.store.setOAuthUserRevoked(serverId, userId, false);
		return await this.store.get(serverId);
	}

	@Get('/:serverId/calls')
	async listCalls(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Query query: McpServerCallsQueryDto,
	) {
		return await this.store.listCalls(serverId, query);
	}

	@Get('/:serverId/analytics')
	async analytics(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Query query: McpServerAnalyticsQueryDto,
	) {
		return await this.store.analytics(serverId, query.days ?? 7);
	}

	@Post('/:serverId/playground')
	async playgroundChat(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('serverId') serverId: string,
		@Body body: McpServerPlaygroundRequestDto,
	) {
		return await this.playground.chat(req.user, serverId, body);
	}
}

/** The share page with no login. Answers 401 unless the owner made the page public. */
@RestController('/mcp-servers-public')
export class McpServersPublicController {
	constructor(private readonly store: McpServerStoreService) {}

	@Get('/:slug', { skipAuth: true })
	async share(_req: Request, res: Response) {
		const slug = typeof _req.params.slug === 'string' ? _req.params.slug : '';
		const server = await this.store.findBySlug(slug);
		if (!server) throw new NotFoundError('MCP server not found');
		if (server.shareVisibility !== 'public') {
			res.status(401);
			return { needsLogin: true };
		}
		return await this.store.share(slug);
	}
}
