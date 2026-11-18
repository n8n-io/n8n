import {
	CheckDocPageDto,
	CreateDocChildPageDto,
	DocPageSearchQueryDto,
	EnsureDocPageDto,
	UpdateDocPageDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, Query, RestController } from '@n8n/decorators';

import { DocPageAiService } from './doc-page-ai.service';
import { DocPageService } from './doc-page.service';

/**
 * Access comes from the workflow or agent of the root page, so each service method checks it.
 * The static routes come first, so `/:id` does not catch them.
 */
@RestController('/doc-pages')
export class DocPageController {
	constructor(
		private readonly docPageService: DocPageService,
		private readonly docPageAiService: DocPageAiService,
	) {}

	@Get('/overview')
	async overview(req: AuthenticatedRequest) {
		return await this.docPageService.overview(req.user);
	}

	@Get('/search')
	async search(req: AuthenticatedRequest, _res: unknown, @Query query: DocPageSearchQueryDto) {
		return await this.docPageService.search(req.user, query.q);
	}

	@Get('/projects/:projectId')
	async listForProject(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
	) {
		return await this.docPageService.listForProject(req.user, projectId);
	}

	@Post('/projects/:projectId/page')
	async ensureProjectPage(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
	) {
		return await this.docPageService.ensureProjectPage(req.user, projectId);
	}

	@Post('/ensure')
	async ensure(req: AuthenticatedRequest, _res: unknown, @Body body: EnsureDocPageDto) {
		return await this.docPageService.ensure(req.user, body);
	}

	@Get('/:id')
	async get(req: AuthenticatedRequest, _res: unknown, @Param('id') id: string) {
		return await this.docPageService.get(req.user, id);
	}

	@Patch('/:id')
	async update(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('id') id: string,
		@Body body: UpdateDocPageDto,
	) {
		return await this.docPageService.update(req.user, id, body);
	}

	@Post('/:id/children')
	async createChild(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('id') id: string,
		@Body body: CreateDocChildPageDto,
	) {
		return await this.docPageService.createChild(req.user, id, body);
	}

	@Delete('/:id')
	async delete(req: AuthenticatedRequest, _res: unknown, @Param('id') id: string) {
		await this.docPageService.deleteChild(req.user, id);
		return { success: true };
	}

	@Post('/:id/generate')
	async generate(req: AuthenticatedRequest, _res: unknown, @Param('id') id: string) {
		return await this.docPageAiService.generate(req.user, id);
	}

	@Post('/:id/check')
	async check(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('id') id: string,
		@Body body: CheckDocPageDto,
	) {
		return await this.docPageAiService.check(req.user, id, body.markdown);
	}

	@Post('/:id/mark-current')
	async markCurrent(req: AuthenticatedRequest, _res: unknown, @Param('id') id: string) {
		return await this.docPageService.markCurrent(req.user, id);
	}
}
