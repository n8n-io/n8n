import type { AquariumActivity, AquariumSecurity } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { AquariumActivityService } from './aquarium-activity.service';
import { AquariumSecurityService } from './aquarium-security.service';

@RestController('/aquarium')
export class AquariumController {
	constructor(
		private readonly activityService: AquariumActivityService,
		private readonly securityService: AquariumSecurityService,
	) {}

	@Get('/activity')
	async getActivity(req: AuthenticatedRequest): Promise<AquariumActivity> {
		return await this.activityService.getActivity(req.user);
	}

	// No scope decorator, like the workflows list: the data covers many projects, so the
	// service returns only the workflows that the user can read.
	@Get('/security')
	async getSecurity(req: AuthenticatedRequest): Promise<AquariumSecurity> {
		return await this.securityService.getSecurity(req.user);
	}
}
