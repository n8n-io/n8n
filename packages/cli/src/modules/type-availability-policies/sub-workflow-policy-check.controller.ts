import type { SubWorkflowPolicyCheckResponse } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Licensed, Param, ProjectScope, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { SubWorkflowPolicyCheckService } from './sub-workflow-policy-check.service';

/**
 * Gated on the parent, with the scope that lets a builder pick a sub-workflow. The caller may
 * lack access to the sub-workflow itself: the service discloses only what a run would.
 */
@RestController('/workflows')
export class SubWorkflowPolicyCheckController {
	constructor(private readonly service: SubWorkflowPolicyCheckService) {}

	@Get('/:workflowId/sub-workflows/:subWorkflowId/policy-check')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('workflow:update')
	async check(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Param('subWorkflowId') subWorkflowId: string,
	): Promise<SubWorkflowPolicyCheckResponse> {
		const result = await this.service.check(req.user, workflowId, subWorkflowId);

		// One answer for "does not exist" and "may not be called", so neither can be probed.
		if (!result) throw new NotFoundError('Sub-workflow not found');

		return result;
	}
}
