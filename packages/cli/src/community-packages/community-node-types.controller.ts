import type { CommunityNodeType } from '@n8n/api-types';
import { Get, RestController } from '@n8n/decorators';
import { Request } from 'express';

import { CommunityNodeTypesService } from '@/community-packages/community-node-types.service';

@RestController('/community-node-types')
export class CommunityNodeTypesController {
	constructor(private readonly communityNodeTypesService: CommunityNodeTypesService) {}

	@Get('/:name')
	async getCommunityNodeType(req: Request): Promise<CommunityNodeType | null> {
		return await this.communityNodeTypesService.getCommunityNodeType(req.params.name);
	}

	@Get('/')
	async getCommunityNodeTypes() {
		return await this.communityNodeTypesService.getCommunityNodeTypes();
	}
}
