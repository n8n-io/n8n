import { AuthenticatedRequest } from '@n8n/db';
import { Get, ProjectScope, RestController } from '@n8n/decorators';

import { SelfHealingInvestigationService } from './self-healing-investigation.service';

type InvestigationRequest = AuthenticatedRequest<{
	projectId: string;
	workflowId: string;
	investigationId: string;
}>;

@RestController('/projects/:projectId/workflows/:workflowId/self-healing-investigations')
export class SelfHealingInvestigationsController {
	constructor(private readonly investigations: SelfHealingInvestigationService) {}

	@Get('/:investigationId')
	@ProjectScope('workflow:update')
	async getStatus(req: InvestigationRequest) {
		const { projectId, workflowId, investigationId } = req.params;
		return await this.investigations.getStatus(req.user, projectId, workflowId, investigationId);
	}
}
