import {
	CreateKnowledgeCollectionDto,
	type KnowledgeCollectionDto,
	UpdateKnowledgeCollectionDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
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

import { KnowledgeCollectionCatalogService } from './knowledge-collection-catalog.service';

/**
 * Collections have no scopes of their own yet, so the agent scopes of the
 * project in the URL decide. To be changed when collections have their own scopes.
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

	@Get('/:collectionId')
	@ProjectScope('agent:read')
	async get(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('collectionId') collectionId: string,
	): Promise<KnowledgeCollectionDto> {
		return await this.catalogService.get(req.user, { projectId, collectionId });
	}

	@Patch('/:collectionId')
	@ProjectScope('agent:update')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('collectionId') collectionId: string,
		@Body payload: UpdateKnowledgeCollectionDto,
	): Promise<KnowledgeCollectionDto> {
		return await this.catalogService.update(req.user, projectId, collectionId, payload);
	}

	@Delete('/:collectionId')
	@ProjectScope('agent:update')
	async delete(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('collectionId') collectionId: string,
	): Promise<{ success: true }> {
		return await this.catalogService.delete(req.user, projectId, collectionId);
	}
}
