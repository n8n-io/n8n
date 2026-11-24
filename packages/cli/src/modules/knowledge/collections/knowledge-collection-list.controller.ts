import type { KnowledgeCollectionListResponse } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { KnowledgeCollectionCatalogService } from './knowledge-collection-catalog.service';

/**
 * The list shows the collections of many projects, so it has no project in the
 * URL and no scope decorator, like `GET /credentials`. The service keeps only
 * the projects where the user can read agents.
 */
@RestController('/knowledge/collections')
export class KnowledgeCollectionListController {
	constructor(private readonly catalogService: KnowledgeCollectionCatalogService) {}

	@Get('/')
	async list(req: AuthenticatedRequest): Promise<KnowledgeCollectionListResponse> {
		return await this.catalogService.listForUser(req.user);
	}
}
