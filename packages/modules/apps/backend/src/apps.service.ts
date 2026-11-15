import {
	appSchema,
	type CreateAppDto,
	type UpdateAppDto,
	type AppResponse,
	type AppListResponse,
	type ListAppsQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService, ProjectScopeService } from '@n8n/backend-services';
import { DbLock, DbLockService, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import type { AppActor } from './app-events';
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
		private readonly events: EventService,
	) {}

	async createApp(
		projectId: string,
		dto: CreateAppDto,
		options: { id?: string; actor?: AppActor } = {},
	): Promise<AppResponse> {
		if (options.id && !appSchema.shape.id.safeParse(options.id).success) {
			throw new BadRequestError('App IDs must be UUIDs.');
		}
		await this.assertProjectExists(projectId);
		this.assertValidNamespace(dto.namespace);
		const app = await this.appRepository.createApp(projectId, { ...dto, id: options.id });
		this.logger.debug('Created app.', { projectId, appId: app.id });
		this.events.emit('app-created', {
			...options.actor,
			appId: app.id,
			projectId,
			visibility: app.visibility,
		});
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

	async updateApp(
		projectId: string,
		appId: string,
		dto: UpdateAppDto,
		actor?: AppActor,
	): Promise<AppResponse> {
		if (Object.keys(dto).length === 0) {
			throw new BadRequestError('Select an app field to update.');
		}
		this.assertValidAppId(appId);
		if (dto.namespace !== undefined) this.assertValidNamespace(dto.namespace);
		const before =
			dto.visibility !== undefined
				? await this.appRepository.findInProject(projectId, appId)
				: null;
		const app = await this.appRepository.updateApp(projectId, appId, dto);
		if (!app) throw new NotFoundError('App not found');
		this.logger.debug('Updated app.', { projectId, appId });
		if (before && before.visibility !== app.visibility) {
			this.events.emit('app-visibility-changed', {
				...actor,
				appId,
				from: before.visibility,
				to: app.visibility,
			});
		}
		return toResponse(app, this.hosts);
	}

	async deleteApp(projectId: string, appId: string, actor?: AppActor) {
		this.assertValidAppId(appId);
		const deleted = await this.locks.withLockContext(
			DbLock.APPS_STORAGE,
			async (ctx) => {
				const app = await this.appRepository.findInProject(projectId, appId, ctx);
				if (!app) return null;
				if (await this.appVersions.hasRunningBuild(appId, ctx)) {
					throw new ConflictError(
						'The app has a running build. Wait for the build to finish before deleting it.',
					);
				}
				return (await this.appRepository.deleteInProject(projectId, appId, ctx)) ? app : null;
			},
			{ subKey: appStorageLockSubKey(appId) },
		);
		if (!deleted) {
			throw new NotFoundError('App not found');
		}
		this.logger.debug('Deleted app.', { projectId, appId });
		this.events.emit('app-deleted', {
			...actor,
			appId,
			wasPublished: deleted.publishedVersionId !== null,
		});
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
