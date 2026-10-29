import { SetAppBindingsDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AppBindingsService } from './app-bindings.service';

type AppBindingsRequest = AuthenticatedRequest<{ projectId: string; appId: string }>;

@RestController('/projects/:projectId/apps/:appId/bindings')
export class AppBindingsController {
	constructor(private readonly bindings: AppBindingsService) {}

	@Get('/')
	@ProjectScope('app:read')
	async get(req: AppBindingsRequest) {
		return await this.bindings.getBindings(req.params.projectId, req.params.appId);
	}

	@Put('/')
	@ProjectScope('app:update')
	async set(req: AppBindingsRequest, _res: Response, @Body dto: SetAppBindingsDto) {
		return await this.bindings.setBindings(
			req.user,
			req.params.projectId,
			req.params.appId,
			dto.bindings,
		);
	}

	@Get('/types')
	@ProjectScope('app:read')
	async types(req: AppBindingsRequest) {
		return { types: await this.bindings.getTypes(req.params.projectId, req.params.appId) };
	}
}
