import type { CreateAppDto, CreatePageDto, UpdateAppDto, UpdatePageDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AppRepository } from './app.repository';
import { AppNotFoundError } from './errors/app-not-found.error';
import { DataWorkflowNotFoundError } from './errors/data-workflow-not-found.error';
import { IndexPageCannotHaveChildrenError } from './errors/index-page-cannot-have-children.error';
import { PageNotFoundError } from './errors/page-not-found.error';
import { PageRouteConflictError } from './errors/page-route-conflict.error';
import { PageRepository } from './page.repository';

@Service()
export class AppsService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly pageRepository: PageRepository,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	async createApp(projectId: string, dto: CreateAppDto) {
		return await this.appRepository.createApp(projectId, dto.name, dto.namespace);
	}

	async listApps(projectId: string) {
		return await this.appRepository.findManyByProjectId(projectId);
	}

	async getApp(appId: string) {
		const app = await this.appRepository.findOneBy({ id: appId });
		if (!app) throw new AppNotFoundError(appId);
		return app;
	}

	async updateApp(appId: string, dto: UpdateAppDto) {
		const app = await this.getApp(appId);
		return await this.appRepository.updateApp(app, dto);
	}

	async deleteApp(appId: string) {
		await this.getApp(appId);
		await this.appRepository.deleteApp(appId);
	}

	async createPage(appId: string, dto: CreatePageDto) {
		await this.getApp(appId);
		const parentPageId = dto.parentPageId ?? null;
		if (parentPageId) {
			// getPage scopes the lookup to this app, so a parentPageId belonging to
			// another app/project is rejected the same as one that doesn't exist.
			const parent = await this.getPage(appId, parentPageId);
			if (!parent.route) throw new IndexPageCannotHaveChildrenError(parent.id);
		}
		if (await this.pageRepository.hasSiblingWithRoute(appId, parentPageId, dto.route)) {
			throw new PageRouteConflictError(dto.route);
		}
		return await this.pageRepository.createPage(appId, parentPageId, dto.route);
	}

	/** Flat list; callers build the tree from each page's `parentPageId`. */
	async listPages(appId: string) {
		await this.getApp(appId);
		return await this.pageRepository.findManyByAppId(appId);
	}

	/** Scoped to `appId` so a pageId from a different app is treated as not found, not just unauthorized. */
	async getPage(appId: string, pageId: string) {
		const page = await this.pageRepository.findOneBy({ id: pageId });
		if (!page || page.appId !== appId) throw new PageNotFoundError(pageId);
		return page;
	}

	async updatePage(appId: string, pageId: string, dto: UpdatePageDto, user: User) {
		const page = await this.getPage(appId, pageId);
		if (dto.route !== undefined && dto.route !== page.route) {
			if (dto.route === '' && (await this.pageRepository.hasChildren(pageId))) {
				throw new IndexPageCannotHaveChildrenError(pageId);
			}
			if (
				await this.pageRepository.hasSiblingWithRoute(
					page.appId,
					page.parentPageId,
					dto.route,
					pageId,
				)
			) {
				throw new PageRouteConflictError(dto.route);
			}
		}
		if (dto.dataWorkflowId) {
			// Scoped to the user's own `workflow:read` access, same as any other
			// workflow lookup — not just existence, so a page can't be wired up to
			// read data from a workflow the caller isn't allowed to see.
			const workflow = await this.workflowFinderService.findWorkflowForUser(
				dto.dataWorkflowId,
				user,
				['workflow:read'],
			);
			if (!workflow) throw new DataWorkflowNotFoundError(dto.dataWorkflowId);
		}
		return await this.pageRepository.updatePage(page, dto);
	}

	async deletePage(appId: string, pageId: string) {
		await this.getPage(appId, pageId);
		await this.pageRepository.deletePage(pageId);
	}
}
