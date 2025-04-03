import { Get, RestController } from '@/decorators';
import { CommunityNodeTypesService } from '@/services/community-node-types.service';

@RestController('/community-node-types')
export class CommunityNodeTypesController {
	constructor(private readonly communityNodeTypesService: CommunityNodeTypesService) {}

	@Get('/')
	async getCommunityNodeTypes() {
		return await this.communityNodeTypesService.getDescriptions();
	}
}
