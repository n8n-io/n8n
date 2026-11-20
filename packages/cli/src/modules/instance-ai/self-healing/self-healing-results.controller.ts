import { SelfHealingResultActionDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { SelfHealingResultService } from './self-healing-result.service';

type ResultRequest = AuthenticatedRequest<{
	projectId: string;
	workflowId: string;
	resultId: string;
}>;

@RestController('/projects/:projectId/workflows/:workflowId/self-healing-results')
export class SelfHealingResultsController {
	constructor(private readonly results: SelfHealingResultService) {}

	@Get('/:resultId')
	@ProjectScope('workflow:update')
	async getDetail(req: ResultRequest) {
		const { projectId, workflowId, resultId } = req.params;
		return await this.results.getDetail(req.user, projectId, workflowId, resultId);
	}

	@Post('/:resultId/approve-and-publish')
	@ProjectScope('workflow:publish')
	async approveAndPublish(
		req: ResultRequest,
		_res: Response,
		@Body body: SelfHealingResultActionDto,
	) {
		const { projectId, workflowId, resultId } = req.params;
		return await this.results.act(
			req.user,
			projectId,
			workflowId,
			resultId,
			'approve-and-publish',
			req.headers['push-ref'],
			body.originalAction,
		);
	}

	@Post('/:resultId/apply')
	@ProjectScope('workflow:update')
	async apply(req: ResultRequest, _res: Response, @Body body: SelfHealingResultActionDto) {
		const { projectId, workflowId, resultId } = req.params;
		return await this.results.act(
			req.user,
			projectId,
			workflowId,
			resultId,
			'apply',
			req.headers['push-ref'],
			body.originalAction,
		);
	}

	@Post('/:resultId/dismiss')
	@ProjectScope('workflow:update')
	async dismiss(req: ResultRequest, _res: Response, @Body body: SelfHealingResultActionDto) {
		const { projectId, workflowId, resultId } = req.params;
		return await this.results.dismiss(
			req.user,
			projectId,
			workflowId,
			resultId,
			body.originalAction,
		);
	}
}
