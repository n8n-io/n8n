import { PrepareSkillTrialQueryDto, RunSkillTrialDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentSkillTrialService } from './agent-skill-trial.service';

@RestController('/projects/:projectId/agent-skill-trials')
export class AgentSkillTrialController {
	constructor(private readonly trials: AgentSkillTrialService) {}

	@Get('/', { keyedRateLimit: { source: 'user', limit: 10, windowMs: 60_000 } })
	@ProjectScope('agent:execute')
	async prepare(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Query query: PrepareSkillTrialQueryDto,
	) {
		return await this.trials.prepare(req.user, req.params.projectId, query.catalogId);
	}

	@Post('/', { keyedRateLimit: { source: 'user', limit: 20, windowMs: 60_000 } })
	@ProjectScope('agent:execute')
	async run(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Body payload: RunSkillTrialDto,
	) {
		const controller = new AbortController();
		const cancel = () => controller.abort();
		res.on('close', cancel);
		try {
			return await this.trials.run(req.user, req.params.projectId, payload, controller.signal);
		} finally {
			res.off('close', cancel);
		}
	}
}
