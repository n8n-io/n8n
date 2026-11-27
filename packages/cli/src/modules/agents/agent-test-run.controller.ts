import type { AgentTestRunToolsResponse } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { SafeTestingFlagGate } from './simulation/safe-testing-flag-gate';
import { SimulationSessionService } from './simulation/simulation-session.service';

/** Safe testing routes. Each route returns 404 while the safe testing flag is off. */
@RestController('/projects/:projectId/agents/v2')
export class AgentTestRunController {
	constructor(
		private readonly flagGate: SafeTestingFlagGate,
		private readonly simulationSessions: SimulationSessionService,
	) {}

	/** Which of the agent's tools can run in a test run, before the run starts. */
	@Get('/:agentId/test-run/tools')
	@ProjectScope('agent:read')
	async listTestRunTools(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	): Promise<AgentTestRunToolsResponse> {
		await this.flagGate.assertEnabled(req.user);
		return { tools: await this.simulationSessions.describeTools(agentId, projectId) };
	}
}
