import type { AquariumActivity } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { AquariumActivityService } from './aquarium-activity.service';

@RestController('/aquarium')
export class AquariumController {
	constructor(private readonly activityService: AquariumActivityService) {}

	@Get('/activity')
	async getActivity(req: AuthenticatedRequest): Promise<AquariumActivity> {
		return await this.activityService.getActivity(req.user);
	}
}
