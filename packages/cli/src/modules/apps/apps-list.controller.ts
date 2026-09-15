import { ListAppsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AppsService } from './apps.service';

/** Cross-project list for the overview page, where there is no `:projectId`. */
@RestController('/apps')
export class AppsListController {
	constructor(private readonly appsService: AppsService) {}

	@Get('/')
	@GlobalScope('app:list')
	async list(req: AuthenticatedRequest, _res: Response, @Query query: ListAppsQueryDto) {
		return await this.appsService.listAppsForUser(req.user.id, query);
	}
}
