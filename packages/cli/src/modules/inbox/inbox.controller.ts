import { ListInboxQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { InboxService } from './inbox.service';

@RestController('/inbox')
export class InboxController {
	constructor(private readonly inboxService: InboxService) {}

	// Each source enforces access. A global workflow scope would exclude project members.
	@Get('/')
	async list(req: AuthenticatedRequest, _res: Response, @Query query: ListInboxQueryDto) {
		return await this.inboxService.list(req.user, query);
	}

	@Get('/summary')
	async getSummary(req: AuthenticatedRequest) {
		return await this.inboxService.getSummary(req.user);
	}
}
