import { CreateAppDto, ListAppsQueryDto, SendAppFeedbackDto, UpdateAppDto } from '@n8n/api-types';
import { isPerson, type AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	createUserKeyedRateLimiter,
	Delete,
	Get,
	Patch,
	Post,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';

import { AppsService } from './apps.service';
import { AppFeedbackService } from './feedback/app-feedback.service';

type AppRequest = AuthenticatedRequest<{ projectId: string; appId: string }>;

@RestController('/projects/:projectId/apps')
export class AppsController {
	constructor(
		private readonly appsService: AppsService,
		private readonly feedbackService: AppFeedbackService,
	) {}

	// TODO: remove direct endpoint for app creation once it's implemented via AIA
	@Post('/')
	@ProjectScope('app:create')
	async create(req: AppRequest, _res: Response, @Body dto: CreateAppDto) {
		return await this.appsService.createApp(req.params.projectId, dto, {
			actor: { userId: req.user.id },
		});
	}

	@Get('/')
	@ProjectScope('app:list')
	async list(req: AppRequest, res: Response, @Query query: ListAppsQueryDto) {
		res.json(await this.appsService.listApps(req.params.projectId, query));
	}

	@Get('/:appId')
	@ProjectScope('app:read')
	async get(req: AppRequest) {
		return await this.appsService.getApp(req.params.projectId, req.params.appId);
	}

	@Patch('/:appId')
	@ProjectScope('app:update')
	async update(req: AppRequest, _res: Response, @Body dto: UpdateAppDto) {
		return await this.appsService.updateApp(req.params.projectId, req.params.appId, dto, {
			userId: req.user.id,
		});
	}

	@Delete('/:appId')
	@ProjectScope('app:delete')
	async delete(req: AppRequest) {
		await this.appsService.deleteApp(req.params.projectId, req.params.appId, {
			userId: req.user.id,
		});
	}

	@Post('/:appId/feedback', {
		keyedRateLimit: createUserKeyedRateLimiter({ limit: 5, windowMs: 60_000 }),
	})
	@ProjectScope('app:read')
	async sendFeedback(req: AppRequest, _res: Response, @Body dto: SendAppFeedbackDto) {
		if (!isPerson(req.user)) throw new ForbiddenError('Only people can send app feedback.');
		return await this.feedbackService.send(req.user, req.params.projectId, req.params.appId, dto);
	}
}
