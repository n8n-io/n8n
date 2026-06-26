import { AuthenticatedRequest } from '@n8n/db';
import { GlobalScope, Post, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { RaiseReviewService } from './raise-review.service';

/**
 * Dev-side endpoint: export workflow(s) → commit → push → open a PR for review.
 *
 * Gated by `sourceControl:push` (an owner/admin global scope): this force-pushes to
 * the production-workflows repo with the instance PAT and opens a release PR, so only
 * release operators may drive it — not every authenticated member.
 */
@RestController('/instance-pull')
export class RaiseReviewController {
	constructor(private readonly raiseReviewService: RaiseReviewService) {}

	@Post('/raise-review')
	@GlobalScope('sourceControl:push')
	async raiseReview(req: AuthenticatedRequest<{}, {}, { workflowIds?: string[] }>) {
		const workflowIds = Array.isArray(req.body?.workflowIds) ? req.body.workflowIds : [];
		if (workflowIds.length === 0) {
			throw new BadRequestError('workflowIds is required');
		}
		return await this.raiseReviewService.raiseReview(req.user, workflowIds);
	}
}
