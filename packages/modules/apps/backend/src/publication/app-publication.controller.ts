import { PublishAppDto, RestoreAppVersionDto, appVersionSchema } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AppPublicationService } from './app-publication.service';
import { AppsService } from '../apps.service';
import { AppBindingsService } from '../bindings/app-bindings.service';
import type { AppVersion } from '../versions/app-version.entity';
import { AppVersionService } from '../versions/app-version.service';

type AppRequest = AuthenticatedRequest<{ projectId: string; appId: string }>;
type VersionRequest = AuthenticatedRequest<{ projectId: string; appId: string; versionId: string }>;

function toVersionResponse(version: AppVersion) {
	return appVersionSchema.parse({
		...version,
		createdAt: version.createdAt.toISOString(),
		updatedAt: version.updatedAt.toISOString(),
	});
}

@RestController('/projects/:projectId/apps/:appId')
export class AppPublicationController {
	constructor(
		private readonly publication: AppPublicationService,
		private readonly apps: AppsService,
		private readonly versions: AppVersionService,
		private readonly bindings: AppBindingsService,
	) {}

	@Get('/versions')
	@ProjectScope('app:read')
	async listVersions(req: AppRequest) {
		const versions = await this.versions.listVersions(req.params.projectId, req.params.appId);
		return versions.map(toVersionResponse);
	}

	@Get('/versions/:versionId/publish-preview')
	@ProjectScope('app:read')
	async getPublishPreview(req: VersionRequest) {
		const { projectId, appId, versionId } = req.params;
		return await this.bindings.getPublishPreview(req.user, projectId, appId, versionId);
	}

	@Post('/versions/:versionId/restore')
	@ProjectScope('app:update')
	async restoreVersion(req: VersionRequest, _res: Response, @Body dto: RestoreAppVersionDto) {
		const { projectId, appId, versionId } = req.params;
		const version = await this.bindings.restoreVersion(
			req.user,
			projectId,
			appId,
			versionId,
			dto.baseVersionId,
		);
		return toVersionResponse(version);
	}

	@Post('/publish')
	@ProjectScope('app:update')
	async publish(req: AppRequest, _res: Response, @Body dto: PublishAppDto) {
		const { projectId, appId } = req.params;
		const { versionId, publishResources, ...details } = dto;
		if (publishResources) {
			await this.publication.assertCanPublish(projectId, appId, versionId);
			await this.bindings.publishResources(req.user, projectId, appId, versionId);
		}
		await this.publication.publish(projectId, appId, versionId, details, { userId: req.user.id });
		return await this.apps.getApp(projectId, appId);
	}

	@Post('/unpublish')
	@ProjectScope('app:update')
	async unpublish(req: AppRequest) {
		const { projectId, appId } = req.params;
		await this.publication.publish(projectId, appId, null, {}, { userId: req.user.id });
		return await this.apps.getApp(projectId, appId);
	}
}
