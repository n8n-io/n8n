import { EVAL_COLLECTIONS_FLAG } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Post, ProjectScope, RestController } from '@n8n/decorators';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { PostHogClient } from '@/posthog';

import { EvalInsightsService } from './eval-insights.service';

type CollectionParam = { workflowId: string; collectionId: string };

/**
 * Single-route controller for the AI insights endpoint. Mounted as a child
 * of `/workflows` so the `@ProjectScope` middleware resolves the workflow's
 * project from the `:workflowId` URL param (`check-access.ts:93`).
 *
 * Auth flow per request:
 *  1. `@ProjectScope('workflow:read')` middleware verifies the user has
 *     `workflow:read` on the workflow's project. Reads-only — generating
 *     insights doesn't mutate workflow state. Throws 404 on missing/
 *     denied workflow before the handler runs.
 *  2. Handler asserts the `084_eval_collections` PostHog flag is enabled
 *     for this user. Throws 404 (not 403) to match the rest of the
 *     eval-collections feature surface — the flag id never leaks into
 *     responses (see `EvaluationCollectionsController.assertFlagEnabled`).
 *  3. Service checks the AI Assistant license. Throws 403 if off, which is
 *     visible to the FE so it can hide the insights card entirely.
 */
@RestController('/workflows')
export class EvalInsightsController {
	constructor(
		private readonly service: EvalInsightsService,
		private readonly postHogClient: PostHogClient,
		private readonly logger: Logger,
	) {}

	private async assertFlagEnabled(user: User): Promise<void> {
		let enabled = false;
		try {
			const flags = await this.postHogClient.getFeatureFlags(user);
			enabled = flags?.[EVAL_COLLECTIONS_FLAG] === true;
		} catch (error) {
			this.logger.warn('Failed to resolve eval-collections flag', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
		if (!enabled) throw new NotFoundError('Not found');
	}

	@Post('/:workflowId/eval-collections/:collectionId/insights')
	@ProjectScope('workflow:read')
	async generate(req: AuthenticatedRequest<CollectionParam>) {
		await this.assertFlagEnabled(req.user);
		return await this.service.generateInsights(
			req.user,
			req.params.workflowId,
			req.params.collectionId,
		);
	}
}
