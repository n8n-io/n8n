import {
	ListAllPagesQueryDto,
	ListPageNodeReferencesQueryDto,
	ListReferencingPagesQueryDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PageService } from './page.service';

/**
 * Routes that find pages without a project id in the path.
 * They carry no scope decorator, because the project is not known before the lookup.
 * The service applies `page:read` to the project of each page.
 */
@RestController('/pages')
export class PageLookupController {
	constructor(private readonly pageService: PageService) {}

	// Keep the static routes before `/:pageId`. The router takes the first match.
	@Get('/')
	async listAllPages(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListAllPagesQueryDto,
	) {
		return await this.pageService.listAllPages(req.user, query);
	}

	@Get('/referencing')
	async listReferencingPages(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListReferencingPagesQueryDto,
	) {
		return await this.pageService.listReferencingPages(req.user, query);
	}

	@Get('/node-references')
	async listNodeReferences(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListPageNodeReferencesQueryDto,
	) {
		return await this.pageService.listNodeReferences(req.user, query.workflowId);
	}

	@Get('/:pageId/backlinks')
	async getBacklinks(req: AuthenticatedRequest, _res: Response, @Param('pageId') pageId: string) {
		return await this.pageService.getBacklinks(req.user, pageId);
	}

	@Get('/:pageId')
	async getPage(req: AuthenticatedRequest, _res: Response, @Param('pageId') pageId: string) {
		return await this.pageService.getReadablePage(req.user, pageId);
	}
}
