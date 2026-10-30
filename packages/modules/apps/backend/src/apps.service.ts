import {
	appSchema,
	type CreateAppDto,
	type UpdateAppDto,
	type AppResponse,
	type AppListResponse,
	type ListAppsQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectScopeService } from '@n8n/backend-services';
import { DbLock, DbLockService, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import { appStorageLockSubKey } from './storage/app-storage-lock';
import { AppVersionRepository } from './versions/app-version.repository';
import { AppWorkspaceService } from './build/app-workspace.service';
import type { App } from './app.entity';
import { AppRepository } from './app.repository';
import { AppHostService } from './serving/app-host.service';

function toResponse(app: App, hosts: AppHostService): AppResponse {
	return {
		id: app.id,
		projectId: app.projectId,
		name: app.name,
		namespace: app.namespace,
		visibility: app.visibility,
		draftVersionId: app.draftVersionId,
		publishedVersionId: app.publishedVersionId,
		publishedUrl: app.publishedVersionId ? hosts.origin(app.namespace) : null,
		createdAt: app.createdAt.toISOString(),
		updatedAt: app.updatedAt.toISOString(),
	};
}

@Service()
export class AppsService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly appVersions: AppVersionRepository,
		private readonly projectScopeService: ProjectScopeService,
		private readonly locks: DbLockService,
		private readonly workspaces: AppWorkspaceService,
		private readonly logger: Logger,
		private readonly hosts: AppHostService,
	) {}

	async createApp(projectId: string, dto: CreateAppDto): Promise<AppResponse> {
		await this.assertProjectExists(projectId);
		this.assertValidNamespace(dto.namespace);
		const app = await this.appRepository.createApp(projectId, dto);
		this.logger.debug('Created app.', { projectId, appId: app.id });
		return toResponse(app, this.hosts);
	}

	async getApp(projectId: string, appId: string): Promise<AppResponse> {
		this.assertValidAppId(appId);
		const app = await this.appRepository.findInProject(projectId, appId);
		if (!app) throw new NotFoundError('App not found');
		return toResponse(app, this.hosts);
	}

	async listApps(projectId: string, query: ListAppsQueryDto): Promise<AppListResponse> {
		await this.assertProjectExists(projectId);
		const { data, count } = await this.appRepository.list([projectId], query);
		return { data: data.map((app) => toResponse(app, this.hosts)), count };
	}

	async listAppsForUser(user: User, query: ListAppsQueryDto): Promise<AppListResponse> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['app:list']);
		const { data, count } = await this.appRepository.list(projectIds, query);
		return { data: data.map((app) => toResponse(app, this.hosts)), count };
	}

	async updateApp(projectId: string, appId: string, dto: UpdateAppDto): Promise<AppResponse> {
		if (Object.keys(dto).length === 0) {
			throw new BadRequestError('Select an app field to update.');
		}
		this.assertValidAppId(appId);
		if (dto.namespace !== undefined) this.assertValidNamespace(dto.namespace);
		const app = await this.appRepository.updateApp(projectId, appId, dto);
		if (!app) throw new NotFoundError('App not found');
		this.logger.debug('Updated app.', { projectId, appId });
		return toResponse(app, this.hosts);
	}

	async deleteApp(projectId: string, appId: string) {
		this.assertValidAppId(appId);
		const deleted = await this.locks.withLockContext(
			DbLock.APPS_STORAGE,
			async (ctx) => {
				if (!(await this.appRepository.findInProject(projectId, appId, ctx))) return false;
				if (await this.appVersions.hasRunningBuild(appId, ctx)) {
					throw new ConflictError(
						'The app has a running build. Wait for the build to finish before deleting it.',
					);
				}
				return await this.appRepository.deleteInProject(projectId, appId, ctx);
			},
			{ subKey: appStorageLockSubKey(appId) },
		);
		if (!deleted) {
			throw new NotFoundError('App not found');
		}
		this.logger.debug('Deleted app.', { projectId, appId });
		try {
			await this.workspaces.delete(projectId, appId);
		} catch (error) {
			this.logger.warn('Could not delete app sandbox.', { appId, error });
		}
	}

	private assertValidNamespace(namespace: string) {
		if (!this.hosts.origin(namespace) || !this.hosts.previewOrigin(namespace)) {
			throw new BadRequestError(
				'This namespace produces an invalid app URL for this instance. Choose another namespace.',
			);
		}
	}

	private assertValidAppId(appId: string) {
		if (!appSchema.shape.id.safeParse(appId).success) {
			throw new NotFoundError('App not found');
		}
	}

	private async assertProjectExists(projectId: string) {
		if (!(await this.appRepository.projectExists(projectId))) {
			throw new NotFoundError('Project not found');
		}
	}
}
