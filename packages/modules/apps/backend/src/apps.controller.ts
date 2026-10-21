import { CreateAppDto, ListAppsQueryDto, UpdateAppDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Patch,
	Post,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { AppsService } from './apps.service';

type AppRequest = AuthenticatedRequest<{ projectId: string; appId: string }>;

@RestController('/projects/:projectId/apps')
export class AppsController {
	constructor(private readonly appsService: AppsService) {}

	// TODO: remove direct endpoint for app creation once it's implemented via AIA
	@Post('/')
	@ProjectScope('app:create')
	async create(req: AppRequest, _res: Response, @Body dto: CreateAppDto) {
		return await this.appsService.createApp(req.params.projectId, dto);
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
		return await this.appsService.updateApp(req.params.projectId, req.params.appId, dto);
	}

	@Delete('/:appId')
	@ProjectScope('app:delete')
	async delete(req: AppRequest) {
		await this.appsService.deleteApp(req.params.projectId, req.params.appId);
	}
}
