import { CreatePageDto, UpdatePageDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { PageService } from './page.service';

@RestController('/projects/:projectId/pages')
export class PageController {
	constructor(private readonly pageService: PageService) {}

	@Get('/')
	@ProjectScope('page:list')
	async listPages(req: AuthenticatedRequest<{ projectId: string }>) {
		return await this.pageService.listPages(req.params.projectId);
	}

	@Get('/overview')
	@ProjectScope('page:list')
	async getProjectOverview(req: AuthenticatedRequest<{ projectId: string }>) {
		return await this.pageService.getProjectOverview(req.user, req.params.projectId);
	}

	@Post('/')
	@ProjectScope('page:create')
	async createPage(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: CreatePageDto,
	) {
		return await this.pageService.createPage(req.params.projectId, req.user, dto);
	}

	@Post('/summary')
	@ProjectScope('page:create')
	async ensureProjectSummary(req: AuthenticatedRequest<{ projectId: string }>) {
		return await this.pageService.ensureProjectSummary(req.params.projectId, req.user);
	}

	@Get('/:pageId')
	@ProjectScope('page:read')
	async getPage(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('pageId') pageId: string,
	) {
		return await this.pageService.getPage(req.params.projectId, pageId);
	}

	@Patch('/:pageId')
	@ProjectScope('page:update')
	async updatePage(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('pageId') pageId: string,
		@Body dto: UpdatePageDto,
	) {
		return await this.pageService.updatePage(req.params.projectId, pageId, dto);
	}

	@Delete('/:pageId')
	@ProjectScope('page:delete')
	async deletePage(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('pageId') pageId: string,
	) {
		await this.pageService.deletePage(req.params.projectId, pageId);
		return true;
	}
}
