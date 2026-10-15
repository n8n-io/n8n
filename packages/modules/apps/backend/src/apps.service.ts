import {
	appSchema,
	type CreateAppDto,
	type UpdateAppDto,
	type AppResponse,
	type AppListResponse,
	type ListAppsQueryDto,
} from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import type { App } from './app.entity';
import { AppRepository } from './app.repository';

function toResponse(app: App): AppResponse {
	return {
		id: app.id,
		projectId: app.projectId,
		name: app.name,
		namespace: app.namespace,
		visibility: app.visibility,
		draftVersionId: app.draftVersionId,
		publishedVersionId: app.publishedVersionId,
		createdAt: app.createdAt.toISOString(),
		updatedAt: app.updatedAt.toISOString(),
	};
}

@Service()
export class AppsService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly projectScopeService: ProjectScopeService,
	) {}

	async createApp(projectId: string, dto: CreateAppDto): Promise<AppResponse> {
		await this.assertProjectExists(projectId);
		return toResponse(await this.appRepository.createApp(projectId, dto));
	}

	async getApp(projectId: string, appId: string): Promise<AppResponse> {
		this.assertValidAppId(appId);
		const app = await this.appRepository.findOneBy({ id: appId, projectId });
		if (!app) throw new NotFoundError('App not found');
		return toResponse(app);
	}

	async listApps(projectId: string, query: ListAppsQueryDto): Promise<AppListResponse> {
		await this.assertProjectExists(projectId);
		const { data, count } = await this.appRepository.list([projectId], query);
		return { data: data.map(toResponse), count };
	}

	async listAppsForUser(user: User, query: ListAppsQueryDto): Promise<AppListResponse> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['app:list']);
		const { data, count } = await this.appRepository.list(projectIds, query);
		return { data: data.map(toResponse), count };
	}

	async updateApp(projectId: string, appId: string, dto: UpdateAppDto): Promise<AppResponse> {
		if (Object.keys(dto).length === 0) {
			throw new BadRequestError('Select an app field to update.');
		}
		this.assertValidAppId(appId);
		const app = await this.appRepository.updateApp(projectId, appId, dto);
		if (!app) throw new NotFoundError('App not found');
		return toResponse(app);
	}

	async deleteApp(projectId: string, appId: string) {
		this.assertValidAppId(appId);
		// TODO: need to clean up resources related to app versions here, once it's added
		const result = await this.appRepository.delete({ id: appId, projectId });
		if (!result.affected) {
			throw new NotFoundError('App not found');
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
