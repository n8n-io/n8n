import type { CommunityNodeType } from '@n8n/api-types';
import { Get, RestController } from '@n8n/decorators';
import { Request } from 'express';

import { CommunityNodesTypesService } from './community-nodes-types.service';

@RestController('/community-node-types')
export class CommunityNodesTypesController {
	constructor(private readonly typesService: CommunityNodesTypesService) {}

	@Get('/:name')
	async getCommunityNodeType(req: Request): Promise<CommunityNodeType | null> {
		return await this.typesService.getCommunityNodeType(req.params.name);
	}

	@Get('/')
	async getCommunityNodeTypes() {
		return await this.typesService.getCommunityNodeTypes();
	}
}
