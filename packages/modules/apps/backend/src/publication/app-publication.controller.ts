import { PublishAppDto, appVersionSchema } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AppPublicationService } from './app-publication.service';
import { AppsService } from '../apps.service';
import { AppVersionService } from '../versions/app-version.service';

type AppRequest = AuthenticatedRequest<{ projectId: string; appId: string }>;

@RestController('/projects/:projectId/apps/:appId')
export class AppPublicationController {
	constructor(
		private readonly publication: AppPublicationService,
		private readonly apps: AppsService,
		private readonly versions: AppVersionService,
	) {}

	@Get('/versions')
	@ProjectScope('app:read')
	async listVersions(req: AppRequest) {
		const versions = await this.versions.listVersions(req.params.projectId, req.params.appId);
		return versions.map((version) =>
			appVersionSchema.parse({
				...version,
				createdAt: version.createdAt.toISOString(),
				updatedAt: version.updatedAt.toISOString(),
			}),
		);
	}

	@Post('/publish')
	@ProjectScope('app:update')
	async publish(req: AppRequest, _res: Response, @Body dto: PublishAppDto) {
		const { projectId, appId } = req.params;
		await this.publication.publish(projectId, appId, dto.versionId);
		return await this.apps.getApp(projectId, appId);
	}

	@Post('/unpublish')
	@ProjectScope('app:update')
	async unpublish(req: AppRequest) {
		const { projectId, appId } = req.params;
		await this.publication.publish(projectId, appId, null);
		return await this.apps.getApp(projectId, appId);
	}
}
