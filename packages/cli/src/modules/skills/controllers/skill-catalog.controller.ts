import {
	BrowseSkillCatalogQueryDto,
	GetSkillCatalogQueryDto,
	SearchSkillCatalogQueryDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Middleware, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { NextFunction, Response } from 'express';

import { SkillCatalogService } from '../services/skill-catalog.service';
import { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';

@RestController('/skill-catalog')
export class SkillCatalogController {
	constructor(
		private readonly catalog: SkillCatalogService,
		private readonly flagGate: SkillSyncFlagGate,
	) {}

	@Middleware()
	async requireSkillSyncEnabled(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		if (!(await this.flagGate.isEnabled(req.user))) {
			res.status(404).send('Not found');
			return;
		}
		next();
	}

	@Get('/', { keyedRateLimit: { source: 'user', limit: 30, windowMs: 60_000 } })
	@GlobalScope('skill:list')
	async search(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: SearchSkillCatalogQueryDto,
	) {
		return await this.catalog.search(req.user, query.query);
	}

	@Get('/projects/:projectId', { keyedRateLimit: { source: 'user', limit: 30, windowMs: 60_000 } })
	@ProjectScope('projectSkill:list')
	async searchProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: SearchSkillCatalogQueryDto,
	) {
		return await this.catalog.search(req.user, query.query);
	}

	@Get('/browse', { keyedRateLimit: { source: 'user', limit: 30, windowMs: 60_000 } })
	@GlobalScope('skill:list')
	async browse(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: BrowseSkillCatalogQueryDto,
	) {
		return await this.catalog.browse(req.user, query.view);
	}

	@Get('/projects/:projectId/browse', {
		keyedRateLimit: { source: 'user', limit: 30, windowMs: 60_000 },
	})
	@ProjectScope('projectSkill:list')
	async browseProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: BrowseSkillCatalogQueryDto,
	) {
		return await this.catalog.browse(req.user, query.view);
	}

	@Get('/metadata', { keyedRateLimit: { source: 'user', limit: 60, windowMs: 60_000 } })
	@GlobalScope('skill:list')
	async metadata(req: AuthenticatedRequest, _res: Response, @Query query: GetSkillCatalogQueryDto) {
		return await this.catalog.metadata(req.user, query.id);
	}

	@Get('/projects/:projectId/metadata', {
		keyedRateLimit: { source: 'user', limit: 60, windowMs: 60_000 },
	})
	@ProjectScope('projectSkill:list')
	async metadataProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: GetSkillCatalogQueryDto,
	) {
		return await this.catalog.metadata(req.user, query.id);
	}

	@Get('/detail', { keyedRateLimit: { source: 'user', limit: 30, windowMs: 60_000 } })
	@GlobalScope('skill:list')
	async detail(req: AuthenticatedRequest, _res: Response, @Query query: GetSkillCatalogQueryDto) {
		return await this.catalog.detail(req.user, query.id);
	}

	@Get('/projects/:projectId/detail', {
		keyedRateLimit: { source: 'user', limit: 30, windowMs: 60_000 },
	})
	@ProjectScope('projectSkill:list')
	async detailProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: GetSkillCatalogQueryDto,
	) {
		return await this.catalog.detail(req.user, query.id);
	}
}
