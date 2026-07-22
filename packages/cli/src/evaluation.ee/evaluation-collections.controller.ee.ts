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
 * Scope choices: read for list/get/versions, execute for create/rerun (both
 * schedule test runs), update for metadata mutations (rename/delete/curate).
 *
 * `@ProjectScope` resolves workflow → project via the `:workflowId` param and
 * throws 404 before the handler if the user lacks the scope, so no separate
 * access check is needed; the service still filters by `workflowId` in depth.
 */
@RestController('/workflows')
export class EvaluationCollectionsController {
	constructor(
		private readonly service: EvaluationCollectionService,
		private readonly postHogClient: PostHogClient,
		private readonly logger: Logger,
	) {}

	/**
	 * PostHog rollout gate. Returns 404 when off so the route looks like an
	 * unknown endpoint and leaks no flag state; a PostHog outage degrades to
	 * flag-off rather than 500ing. Runs after `@ProjectScope` so a user without
	 * access gets the scope check's 404, not this one.
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

	@Post('/:workflowId/eval-collections/:collectionId/rerun')
	@ProjectScope('workflow:execute')
	async rerun(req: AuthenticatedRequest<CollectionParam>) {
		await this.assertFlagEnabled(req.user);
		const { record, runsStartedIds } = await this.service.rerunCollection(
			req.user,
			req.params.workflowId,
			req.params.collectionId,
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
