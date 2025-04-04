import { Request } from 'express';
import { type CommunityNodeAttributes } from 'n8n-workflow';

import { Get, RestController } from '@/decorators';
import { CommunityNodeTypesService } from '@/services/community-node-types.service';

@RestController('/community-node-types')
export class CommunityNodeTypesController {
	constructor(private readonly communityNodeTypesService: CommunityNodeTypesService) {}

	@Get('/vetted')
	async getVettedNodes() {
		return this.communityNodeTypesService.getVettedNodes();
	}

	@Get('/:name')
	async getCommunityNodeAttributes(req: Request): Promise<CommunityNodeAttributes | null> {
		return this.communityNodeTypesService.getCommunityNodeAttributes(req.params.name) ?? null;
	}

	@Get('/')
	async getCommunityNodeTypes() {
		return await this.communityNodeTypesService.getDescriptions();
	}
}
