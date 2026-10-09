import { selfHealingContinueRequestSchema } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';

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
	async approveAndPublish(req: ResultRequest) {
		const { projectId, workflowId, resultId } = req.params;
		return await this.results.act(
			req.user,
			projectId,
			workflowId,
			resultId,
			'approve-and-publish',
			req.headers['push-ref'],
		);
	}

	@Post('/:resultId/apply')
	@ProjectScope('workflow:update')
	async apply(req: ResultRequest) {
		const { projectId, workflowId, resultId } = req.params;
		return await this.results.act(
			req.user,
			projectId,
			workflowId,
			resultId,
			'apply',
			req.headers['push-ref'],
		);
	}

	@Post('/:resultId/dismiss')
	@ProjectScope('workflow:update')
	async dismiss(req: ResultRequest) {
		const { projectId, workflowId, resultId } = req.params;
		return await this.results.dismiss(req.user, projectId, workflowId, resultId);
	}

	@Post('/:resultId/continue')
	@ProjectScope('workflow:update')
	async continueResult(req: ResultRequest) {
		const parsed = selfHealingContinueRequestSchema.safeParse(req.body);
		if (!parsed.success) throw new BadRequestError('Choose the editor or chat to continue.');
		const { projectId, workflowId, resultId } = req.params;
		return await this.results.continueResult(
			req.user,
			projectId,
			workflowId,
			resultId,
			parsed.data.destination,
			req.headers['push-ref'],
		);
	}
}
