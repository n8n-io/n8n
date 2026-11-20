import { CreateKnowledgeCollectionDto, type KnowledgeCollectionDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { KnowledgeCollectionCatalogService } from './knowledge-collection-catalog.service';

/**
 * Collections have no scopes of their own yet, so the agent scopes of the
 * project in the URL decide.
 */
@RestController('/projects/:projectId/knowledge/collections')
export class KnowledgeCollectionsController {
	constructor(private readonly catalogService: KnowledgeCollectionCatalogService) {}

	@Post('/')
	@ProjectScope('agent:update')
	async create(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body payload: CreateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		return await this.catalogService.create(req.user, projectId, payload);
	}
}
