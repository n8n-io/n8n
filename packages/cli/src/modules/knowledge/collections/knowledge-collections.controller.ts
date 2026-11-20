import { CreateKnowledgeCollectionDto, type KnowledgeCollectionDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { KnowledgeCollectionCatalogService } from './knowledge-collection-catalog.service';

/**
 * The routes carry no scope decorator: the service checks the scope of the
 * user on the home project.
 */
@RestController('/knowledge/collections')
export class KnowledgeCollectionsController {
	constructor(private readonly catalogService: KnowledgeCollectionCatalogService) {}

	@Post('/')
	async create(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		return await this.catalogService.create(req.user, payload);
	}
}
