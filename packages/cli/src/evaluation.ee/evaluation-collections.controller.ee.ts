import {
	AddRunToCollectionDto,
	CreateEvaluationCollectionDto,
	EVAL_COLLECTIONS_FLAG,
	UpdateEvaluationCollectionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, ProjectScope, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { PostHogClient } from '@/posthog';

import { EvaluationCollectionService } from './evaluation-collection.service';

type WorkflowParam = { workflowId: string };
type CollectionParam = { workflowId: string; collectionId: string };
type CollectionRunParam = { workflowId: string; collectionId: string; runId: string };
type EvalVersionsQuery = { evaluationConfigId?: string };

/**
 * Scope choice notes:
 *  - List / get / versions → `workflow:read`. Collection metadata is workflow-
 *    adjacent and the body never includes execution state.
 *  - Create → `workflow:execute`. Creating a collection schedules new test
 *    runs for any version without a reusable existing run, so it's not just
 *    a metadata operation — it kicks off workflow executions.
 *  - Update / delete / curate runs → `workflow:update`. Renaming a collection,
 *    deleting it (which broadcasts cancel-collection for active runs but
 *    does not start new ones), and adding/removing run membership are all
 *    metadata mutations on a workflow-owned resource.
 *
 * Workflow → project resolution is done by `@ProjectScope` itself via the
 * `:workflowId` URL param (see `check-access.ts:93`), so we don't need a
 * separate `findWorkflowForUser` call: the middleware throws 404 before the
 * handler runs if the user lacks the scope on the workflow's project. The
 * service layer still filters by `workflowId` for defense-in-depth.
 */
@RestController('/workflows')
export class EvaluationCollectionsController {
	constructor(
		private readonly service: EvaluationCollectionService,
		private readonly postHogClient: PostHogClient,
		private readonly logger: Logger,
	) {}

	/**
	 * PostHog rollout gate for the eval-collections feature surface. Returns
	 * 404 when off so the route looks exactly like an unknown endpoint — no
	 * flag id leaks into responses, no 403 → 200 transition visible to a
	 * stale tab when the rollout flips. Fail-open semantics mirror
	 * {@link TestRunsController.isParallelExecutionFlagEnabled}: PostHog
	 * outage degrades to flag-off rather than 500ing.
	 *
	 * Runs *inside* the handler (after the `@ProjectScope` middleware) so a
	 * user without workflow access still gets the standard 404 from the
	 * scope check, not a flag-off 404 that might leak rollout state.
	 */
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

	@Get('/:workflowId/eval-collections')
	@ProjectScope('workflow:read')
	async list(req: AuthenticatedRequest<WorkflowParam>) {
		await this.assertFlagEnabled(req.user);
		return await this.service.listCollections(req.params.workflowId);
	}

	@Get('/:workflowId/eval-collections/:collectionId')
	@ProjectScope('workflow:read')
	async get(req: AuthenticatedRequest<CollectionParam>) {
		await this.assertFlagEnabled(req.user);
		return await this.service.getCollectionDetail(req.params.workflowId, req.params.collectionId);
	}

	@Post('/:workflowId/eval-collections')
	@ProjectScope('workflow:execute')
	async create(
		req: AuthenticatedRequest<WorkflowParam>,
		_res: unknown,
		@Body payload: CreateEvaluationCollectionDto,
	) {
		await this.assertFlagEnabled(req.user);
		const { record, runsStartedIds } = await this.service.createCollection(
			req.user,
			req.params.workflowId,
			payload,
		);
		return { ...record, runsStartedIds };
	}

	@Patch('/:workflowId/eval-collections/:collectionId')
	@ProjectScope('workflow:update')
	async update(
		req: AuthenticatedRequest<CollectionParam>,
		_res: unknown,
		@Body payload: UpdateEvaluationCollectionDto,
	) {
		await this.assertFlagEnabled(req.user);
		return await this.service.updateCollectionMeta(
			req.params.workflowId,
			req.params.collectionId,
			payload,
		);
	}

	@Delete('/:workflowId/eval-collections/:collectionId')
	@ProjectScope('workflow:update')
	async delete(req: AuthenticatedRequest<CollectionParam>) {
		await this.assertFlagEnabled(req.user);
		const { runsUnlinked } = await this.service.deleteCollection(
			req.user,
			req.params.workflowId,
			req.params.collectionId,
		);
		return { success: true, runsUnlinked };
	}

	@Post('/:workflowId/eval-collections/:collectionId/runs')
	@ProjectScope('workflow:update')
	async addRun(
		req: AuthenticatedRequest<CollectionParam>,
		_res: unknown,
		@Body payload: AddRunToCollectionDto,
	) {
		await this.assertFlagEnabled(req.user);
		return await this.service.addRunToCollection(
			req.params.workflowId,
			req.params.collectionId,
			payload.testRunId,
		);
	}

	@Delete('/:workflowId/eval-collections/:collectionId/runs/:runId')
	@ProjectScope('workflow:update')
	async removeRun(req: AuthenticatedRequest<CollectionRunParam>) {
		await this.assertFlagEnabled(req.user);
		return await this.service.removeRunFromCollection(
			req.params.workflowId,
			req.params.collectionId,
			req.params.runId,
		);
	}

	@Get('/:workflowId/eval-versions')
	@ProjectScope('workflow:read')
	async listVersions(
		req: AuthenticatedRequest<WorkflowParam, unknown, unknown, EvalVersionsQuery>,
	) {
		await this.assertFlagEnabled(req.user);
		const { evaluationConfigId } = req.query;
		if (!evaluationConfigId) {
			throw new BadRequestError('Missing required query parameter: evaluationConfigId');
		}
		return await this.service.getEvalVersions(req.params.workflowId, evaluationConfigId);
	}
}
