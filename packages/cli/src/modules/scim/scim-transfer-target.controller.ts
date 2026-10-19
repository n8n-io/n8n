import { ScimTransferTargetsQueryDto, type ScimTransferTargetsResponse } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Middleware, Query, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ScimDeprovisioningService } from './scim-deprovisioning.service';
import { ScimOptInService } from './scim-opt-in.service';

/**
 * Search for the transfer target picker of the SCIM deprovisioning policy.
 * The routes require authentication and the `scim:manage` scope.
 */
@RestController('/scim')
export class ScimTransferTargetController {
	constructor(
		private readonly scimOptInService: ScimOptInService,
		private readonly scimDeprovisioningService: ScimDeprovisioningService,
	) {}

	/**
	 * Every route answers 404 while the SCIM opt-in is off. Controller
	 * middlewares run after authentication and the scope check, so a caller
	 * without `scim:manage` still gets 403.
	 */
	@Middleware()
	async requireOptIn(req: Request, res: Response, next: NextFunction) {
		await this.scimOptInService.gate(req, res, next);
	}

	/**
	 * GET /rest/scim/transfer-targets
	 * People and team projects that can get the work of a user that SCIM
	 * deletes. Every item is a valid transfer target, so a deactivated user is
	 * never in the results. The endpoint works while SCIM is off, because an
	 * admin can set the policy before SCIM is on.
	 */
	@Get('/transfer-targets')
	@GlobalScope('scim:manage')
	async getTransferTargets(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ScimTransferTargetsQueryDto,
	): Promise<ScimTransferTargetsResponse> {
		return await this.scimDeprovisioningService.findTransferTargets(query);
	}
}
