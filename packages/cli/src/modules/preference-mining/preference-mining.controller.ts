import { RecallPreferenceMiningDto, StartPreferenceMiningDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PreferenceMiningDataService } from './preference-mining-data.service';
import { PreferenceMiningService } from './preference-mining.service';

type MiningRequest = AuthenticatedRequest<{ projectId: string; runId: string }>;

@RestController('/projects/:projectId/preference-mining')
export class PreferenceMiningController {
	constructor(
		private readonly mining: PreferenceMiningService,
		private readonly data: PreferenceMiningDataService,
	) {}

	@Get('/options')
	@ProjectScope('workflow:read')
	async options(req: MiningRequest) {
		return await this.data.options(req.user);
	}

	@Post('/runs')
	@ProjectScope('workflow:read')
	async start(req: MiningRequest, _res: Response, @Body dto: StartPreferenceMiningDto) {
		return await this.mining.start(req.user, req.params.projectId, dto);
	}

	@Get('/runs/:runId')
	@ProjectScope('workflow:read')
	get(req: MiningRequest) {
		return this.mining.get(req.user, req.params.projectId, req.params.runId);
	}

	@Post('/runs/:runId/cancel')
	@ProjectScope('workflow:read')
	cancel(req: MiningRequest) {
		return this.mining.cancel(req.user, req.params.projectId, req.params.runId);
	}

	@Post('/runs/:runId/recall')
	@ProjectScope('workflow:read')
	async recall(req: MiningRequest, _res: Response, @Body dto: RecallPreferenceMiningDto) {
		return await this.mining.recall(req.user, req.params.projectId, req.params.runId, dto);
	}
}
