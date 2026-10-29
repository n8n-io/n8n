import { ConnectSkillSourceDto, DiscoverSkillSourceDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Middleware, Post, RestController } from '@n8n/decorators';
import type { NextFunction, Response } from 'express';

import { SkillSourceService } from '../services/skill-source.service';
import { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';

/**
 * Skill Sync: connect a source and import its skills. `SkillSourceService` checks the per-user
 * Skill Sync flag again, for callers other than this controller. No route scope: the scope of
 * the source decides who may connect it.
 */
@RestController('/skill-sources')
export class SkillSourceController {
	constructor(
		private readonly skillSourceService: SkillSourceService,
		private readonly flagGate: SkillSyncFlagGate,
	) {}

	/**
	 * Runs before the request is validated, so every request answers 404 while skills or the
	 * Skill Sync flag of the user are off.
	 */
	@Middleware()
	async requireSkillSyncEnabled(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		if (!(await this.flagGate.isEnabled(req.user))) {
			res.status(404).send('Not found');
			return;
		}
		next();
	}

	/** Reads a link and lists its skills for the picker. Writes nothing. */
	@Post('/discover')
	async discover(req: AuthenticatedRequest, _res: Response, @Body payload: DiscoverSkillSourceDto) {
		return await this.skillSourceService.discover(req.user, payload);
	}

	/** Connects the source in the chosen scope and imports the picked skills. */
	@Post('/')
	async connect(req: AuthenticatedRequest, _res: Response, @Body payload: ConnectSkillSourceDto) {
		return await this.skillSourceService.connect(req.user, payload);
	}
}
