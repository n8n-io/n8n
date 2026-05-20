import type {
	AgentEvaluationSuiteRunRequest,
	AgentEvaluationSuiteSetupRequest,
} from '@n8n/api-types';
import { Body, Get, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';

import { AgentEvaluationsService } from './agent-evaluations.service';

@RestController('/projects/:projectId/agents/v2/:agentId/evaluations')
export class AgentEvaluationsController {
	constructor(private readonly agentEvaluationsService: AgentEvaluationsService) {}

	@Get('/dataset')
	@ProjectScope('agent:read')
	async getDataset(
		req: AuthenticatedRequest<
			{ projectId: string; agentId: string },
			{},
			{},
			{ agentVersionId?: string }
		>,
	) {
		return await this.agentEvaluationsService.getDataset(
			req.params.projectId,
			req.params.agentId,
			req.query.agentVersionId,
		);
	}

	@Post('/suite')
	@ProjectScope('agent:read')
	async setupSuite(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		_res: unknown,
		@Body payload?: AgentEvaluationSuiteSetupRequest,
	) {
		return await this.agentEvaluationsService.setupSuite(
			req.params.projectId,
			req.params.agentId,
			payload?.agentVersionId,
		);
	}

	@Post('/suite/run')
	@ProjectScope('agent:execute')
	async runSuite(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		@Body payload?: AgentEvaluationSuiteRunRequest,
	) {
		return await this.agentEvaluationsService.runSuite(
			req.params.projectId,
			req.params.agentId,
			req.user.id,
			payload,
		);
	}
}
