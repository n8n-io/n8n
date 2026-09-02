import type {
	ListWorkflowReviewRequestsQueryDto,
	WorkflowReviewEligibleReviewer,
	WorkflowReviewRequestForWorkflow,
	WorkflowReviewRequestList,
} from '@n8n/api-types';
import {
	UserRepository,
	WorkflowReviewRequestRepository,
	type User,
	type WorkflowReviewRequestForWorkflowRow,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowReviewAuthorizationService } from './workflow-review-authorization.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toEligibleReviewer } from './workflow-review.mapper';

@Service()
export class WorkflowReviewRequestStatusService {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly userRepository: UserRepository,
		private readonly authorizationService: WorkflowReviewAuthorizationService,
	) {}

	async list(
		user: User,
		query: ListWorkflowReviewRequestsQueryDto,
	): Promise<WorkflowReviewRequestList> {
		await this.featureGate.assertAvailable();

		const workflow = await this.workflowFinderService.findWorkflowForUser(query.workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		const [[requests, count], canPublish] = await Promise.all([
			this.workflowReviewRequestRepository.findRequestsForWorkflow(query.workflowId, {
				state: query.state,
				skip: query.skip,
				take: query.take,
			}),
			this.workflowFinderService
				.findWorkflowForUser(query.workflowId, user, ['workflow:publish'])
				.then((found) => found !== null),
		]);

		return {
			count,
			data: await this.toWorkflowScopedItems(requests, canPublish, user),
		};
	}

	private async toWorkflowScopedItems(
		requests: WorkflowReviewRequestForWorkflowRow[],
		canPublish: boolean,
		user: User,
	): Promise<WorkflowReviewRequestForWorkflow[]> {
		const [decisionActors, openableIds] = await Promise.all([
			this.resolveDecisionActors(requests),
			this.authorizationService.resolveOpenableRequestIds(user, requests),
		]);

		return requests.map((request) => ({
			id: request.id,
			state: request.state,
			decision: request.decision,
			description: canPublish ? request.description : null,
			workflowVersionId: request.workflowVersionId,
			workflowVersionName: request.workflowVersionName,
			createdAt: request.createdAt.toISOString(),
			updatedAt: request.updatedAt.toISOString(),
			decisionBy: this.pickDecisionActor(request, decisionActors),
			viewerCanOpen: openableIds.has(request.id),
		}));
	}

	private async resolveDecisionActors(
		requests: WorkflowReviewRequestForWorkflowRow[],
	): Promise<Map<string, WorkflowReviewEligibleReviewer>> {
		const actorIds = [
			...new Set(
				requests.flatMap((request) =>
					request.decision === 'changes_requested' && request.updatedById
						? [request.updatedById]
						: [],
				),
			),
		];
		if (actorIds.length === 0) {
			return new Map();
		}

		const actors = await this.userRepository.findManyByIds(actorIds);
		return new Map(actors.map((actor) => [actor.id, toEligibleReviewer(actor)]));
	}

	private pickDecisionActor(
		request: WorkflowReviewRequestForWorkflowRow,
		actors: Map<string, WorkflowReviewEligibleReviewer>,
	): WorkflowReviewEligibleReviewer | null {
		if (request.decision !== 'changes_requested' || !request.updatedById) {
			return null;
		}

		return actors.get(request.updatedById) ?? null;
	}
}
