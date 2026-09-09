import type { AgentEmailProvisionResponse } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentEmailManagedSetupService } from './integrations/platforms/email/agent-email-managed-setup.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentEmailIntegrationsController {
	constructor(private readonly managedSetup: AgentEmailManagedSetupService) {}

	@Post('/:agentId/integrations/email/provision')
	@ProjectScope('agent:update')
	async provision(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentEmailProvisionResponse> {
		return await this.managedSetup.provision({
			projectId: req.params.projectId,
			agentId,
			user: req.user,
		});
	}
}
