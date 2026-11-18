import type { AuthenticatedRequest } from '@n8n/db';
import { GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';

import { WorkflowTestReviewService } from './workflow-test-review.service';

@RestController('/workflow-tests/reviews')
export class WorkflowTestReviewsController {
	constructor(private readonly workflowTestReviewService: WorkflowTestReviewService) {}

	/** Runs the tests again on the versions that the review pins. The service checks read access. */
	@Post('/:workflowReviewRequestId/run')
	@Licensed('feat:workflowReviews')
	// The runner runs the test code on the n8n host, so only owners and admins can run it.
	@GlobalScope('workflow:execute')
	async rerun(req: AuthenticatedRequest<{ workflowReviewRequestId: string }>) {
		return await this.workflowTestReviewService.rerun(req.user, req.params.workflowReviewRequestId);
	}
}
