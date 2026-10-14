import { ListAppsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AppsService } from './apps.service';

@RestController('/apps')
export class AppsListController {
	constructor(private readonly appsService: AppsService) {}

	@Get('/')
	// The service checks app:list per project because this route has no project ID.
	async list(req: AuthenticatedRequest, res: Response, @Query query: ListAppsQueryDto) {
		res.json(await this.appsService.listAppsForUser(req.user, query));
	}
}
