import { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { InstancePullService } from './instance-pull.service';

@RestController('/instance-pull')
export class InstancePullController {
	constructor(private readonly service: InstancePullService) {}

	/** (dev) Raise a review for a workflow: export, push a branch, and open a PR. */
	@Post('/raise-review/:workflowId')
	async raiseReview(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	) {
		return await this.service.raiseReview(workflowId);
	}

	/** (dev) List the PRs raised from this instance. */
	@Get('/my-reviews')
	async myReviews() {
		return await this.service.myReviews();
	}

	/** (prd) List incoming PRs with validation status. */
	@Get('/requests')
	async requests() {
		return await this.service.requests();
	}

	/** (prd) Publish diff for a PR: current workflow vs the incoming version. */
	@Get('/diff/:prNumber')
	async workflowDiff(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('prNumber') prNumber: string,
	) {
		return await this.service.workflowDiff(Number(prNumber));
	}
}
