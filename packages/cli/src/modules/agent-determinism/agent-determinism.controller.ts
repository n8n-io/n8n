import type { DeterminismSummaryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, ProjectScope, RestController } from '@n8n/decorators';

import { DeterminismService } from './determinism.service';

type SourceParams = { projectId: string; sourceId: string };

@RestController('/projects/:projectId/determinism')
export class AgentDeterminismController {
	constructor(private readonly service: DeterminismService) {}

	@Get('/agent/:sourceId')
	@ProjectScope('agent:read')
	async getAgentSummary(req: AuthenticatedRequest<SourceParams>): Promise<DeterminismSummaryDto> {
		return await this.service.getSummary(req.params.projectId, 'agent', req.params.sourceId);
	}

	@Get('/workflow/:sourceId')
	@ProjectScope('workflow:read')
	async getWorkflowSummary(
		req: AuthenticatedRequest<SourceParams>,
	): Promise<DeterminismSummaryDto> {
		return await this.service.getSummary(req.params.projectId, 'workflow', req.params.sourceId);
	}

	@Post('/agent/:sourceId/dismiss')
	@ProjectScope('agent:update')
	async dismissAgent(req: AuthenticatedRequest<SourceParams>) {
		await this.service.dismiss(req.params.projectId, 'agent', req.params.sourceId);
	}

	@Post('/workflow/:sourceId/dismiss')
	@ProjectScope('workflow:update')
	async dismissWorkflow(req: AuthenticatedRequest<SourceParams>) {
		await this.service.dismiss(req.params.projectId, 'workflow', req.params.sourceId);
	}
}
