import type { CommunityNodeAttributes } from '@n8n/api-types';
import { Get, RestController } from '@n8n/decorators';
import { Request } from 'express';

import { CommunityNodeTypesService } from '@/services/community-node-types.service';

@RestController('/community-node-types')
export class CommunityNodeTypesController {
	constructor(private readonly communityNodeTypesService: CommunityNodeTypesService) {}

	@Get('/:name')
	async getCommunityNodeAttributes(req: Request): Promise<CommunityNodeAttributes | null> {
		return this.communityNodeTypesService.getCommunityNodeAttributes(req.params.name);
	}

	@Get('/')
	async getCommunityNodeTypes() {
		return await this.communityNodeTypesService.getDescriptions();
	}
}
