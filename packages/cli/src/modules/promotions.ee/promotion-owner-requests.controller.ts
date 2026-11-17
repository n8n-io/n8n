import type { InboxPromotionOwnerRequestItem } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Licensed, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionOwnerRequestService } from './promotion-owner-request.service';

/**
 * The Inbox actions on a request to the owner. No global scope: a project admin is a recipient,
 * so the service decides who may act.
 */
@RestController('/promotions/owner-requests')
export class PromotionOwnerRequestsController {
	constructor(private readonly requests: PromotionOwnerRequestService) {}

	@Post('/:requestId/dismiss')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	async dismiss(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('requestId') requestId: string,
	): Promise<InboxPromotionOwnerRequestItem> {
		return await this.requests.dismiss(req.user, requestId);
	}
}
