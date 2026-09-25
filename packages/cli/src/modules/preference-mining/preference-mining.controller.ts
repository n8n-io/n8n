import {
	ListPreferenceMiningRunsDto,
	RecallPreferenceMiningDto,
	StartPreferenceMiningDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, ProjectScope, Query, RestController } from '@n8n/decorators';
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
	async get(req: MiningRequest) {
		return await this.mining.get(req.user, req.params.projectId, req.params.runId);
	}

	@Get('/runs')
	@ProjectScope('workflow:read')
	async list(req: MiningRequest, _res: Response, @Query dto: ListPreferenceMiningRunsDto) {
		return await this.mining.list(req.user, req.params.projectId, dto.skip, dto.take);
	}

	@Post('/runs/:runId/cancel')
	@ProjectScope('workflow:read')
	async cancel(req: MiningRequest) {
		return await this.mining.cancel(req.user, req.params.projectId, req.params.runId);
	}

	@Post('/runs/:runId/recall')
	@ProjectScope('workflow:read')
	async recall(req: MiningRequest, _res: Response, @Body dto: RecallPreferenceMiningDto) {
		return await this.mining.recall(req.user, req.params.projectId, req.params.runId, dto);
	}
}
