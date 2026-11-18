import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, ProjectScope, RestController } from '@n8n/decorators';

import { SelfHealingAgentResultService } from './self-healing-agent-result.service';

type ResultRequest = AuthenticatedRequest<{ projectId: string; resultId: string }>;

@RestController('/projects/:projectId/self-healing-agent-results')
export class SelfHealingAgentResultsController {
	constructor(private readonly results: SelfHealingAgentResultService) {}

	@Get('/:resultId')
	@ProjectScope('agent:read')
	async getDetail(req: ResultRequest) {
		const { projectId, resultId } = req.params;
		return await this.results.getDetail(req.user, projectId, resultId);
	}

	@Post('/:resultId/apply')
	@ProjectScope('agent:update')
	async apply(req: ResultRequest) {
		const { projectId, resultId } = req.params;
		return await this.results.apply(req.user, projectId, resultId);
	}

	@Post('/:resultId/dismiss')
	@ProjectScope('agent:update')
	async dismiss(req: ResultRequest) {
		const { projectId, resultId } = req.params;
		return await this.results.dismiss(req.user, projectId, resultId);
	}
}
