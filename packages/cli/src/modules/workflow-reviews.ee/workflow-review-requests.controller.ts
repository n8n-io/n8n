import { CreateWorkflowReviewRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Licensed, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { WorkflowReviewInvalidVersionError } from './errors/workflow-review-invalid-version.error';
import { WorkflowReviewRequestConflictError } from './errors/workflow-review-request-conflict.error';
import { WorkflowReviewWorkflowArchivedError } from './errors/workflow-review-workflow-archived.error';
import { WorkflowReviewWorkflowNotFoundError } from './errors/workflow-review-workflow-not-found.error';
import { WorkflowReviewsDisabledError } from './errors/workflow-reviews-disabled.error';
import { WorkflowReviewRequestService } from './workflow-review-request.service';

@RestController('/workflow-review-requests')
export class WorkflowReviewRequestsController {
	constructor(private readonly workflowReviewRequestService: WorkflowReviewRequestService) {}

	/**
	 * Authorized in the service via `WorkflowFinderService` (`workflow:publish`),
	 * not `@ProjectScope`: the workflow id is in the body (a review may bundle
	 * several workflows), which the URL-param-based scope middleware can't
	 * resolve — same pattern as the workflow-history controller.
	 */
	@Post('/')
	@Licensed('feat:workflowReviews')
	async create(
		req: AuthenticatedRequest,
		res: Response,
		@Body dto: CreateWorkflowReviewRequestDto,
	) {
		try {
			const request = await this.workflowReviewRequestService.create(req.user, dto);
			res.status(201);
			return request;
		} catch (e) {
			if (e instanceof WorkflowReviewsDisabledError) {
				throw new ForbiddenError(e.message);
			}
			if (e instanceof WorkflowReviewWorkflowNotFoundError) {
				throw new NotFoundError('Could not find workflow');
			}
			if (
				e instanceof WorkflowReviewWorkflowArchivedError ||
				e instanceof WorkflowReviewInvalidVersionError
			) {
				throw new BadRequestError(e.message);
			}
			if (e instanceof WorkflowReviewRequestConflictError) {
				throw new ConflictError(
					'An open review request already exists for this workflow',
					'Sync the existing review request instead of creating a new one',
					{ workflowReviewRequestId: e.conflictingRequestId },
				);
			}
			throw e;
		}
	}
}
