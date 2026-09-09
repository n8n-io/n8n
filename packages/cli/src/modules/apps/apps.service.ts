import type {
	AppVersionSnapshot,
	CreateAppDto,
	CreatePageDto,
	UpdateAppDto,
	UpdatePageDto,
} from '@n8n/api-types';
import { appContentSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { renderPage } from './rendering/page-renderer';
import type { InvalidPageContent } from './errors/app-content-invalid.error';

import { UrlService } from '@/services/url.service';

import { AppRepository } from './app.repository';
import { AppVersionRepository } from './app-version.repository';
import { AppContentInvalidError } from './errors/app-content-invalid.error';
import { AppNotFoundError } from './errors/app-not-found.error';
import { AppVersionNotFoundError } from './errors/app-version-not-found.error';
import { IndexPageCannotHaveChildrenError } from './errors/index-page-cannot-have-children.error';
import { IndexPageMustBeTopLevelError } from './errors/index-page-must-be-top-level.error';
import { PageNotFoundError } from './errors/page-not-found.error';
import { PageRouteConflictError } from './errors/page-route-conflict.error';
import { PageRepository } from './page.repository';
import type { Page } from './page.entity';
import { appBasePath, pagePath } from './serving/page-menu';
import { isDynamicRoute } from './serving/resolve-page-path';

@Service()
export class AppsService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly pageRepository: PageRepository,
		private readonly appVersionRepository: AppVersionRepository,
		private readonly urlService: UrlService,
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

	/** `getApp` plus the "unpublished changes" fields the editor shows. */
	async getAppForResponse(appId: string) {
		const app = await this.getApp(appId);
		const activeVersion = app.activeVersionId
			? await this.appVersionRepository.findSnapshot(app.activeVersionId)
			: null;
		return { ...app, publishedAt: activeVersion?.createdAt ?? null };
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
			if (dto.route === '') throw new IndexPageMustBeTopLevelError();
			// getPage scopes the lookup to this app, so a parentPageId belonging to
			// another app/project is rejected the same as one that doesn't exist.
			const parent = await this.getPage(appId, parentPageId);
			if (!parent.route) throw new IndexPageCannotHaveChildrenError(parent.id);
		}
		if (await this.pageRepository.hasSiblingWithRoute(appId, parentPageId, dto.route)) {
			throw new PageRouteConflictError(dto.route);
		}
		return await this.pageRepository.createPage(
			appId,
			parentPageId,
			dto.route,
			dto.content ?? null,
		);
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

	async updatePage(appId: string, pageId: string, dto: UpdatePageDto) {
		const page = await this.getPage(appId, pageId);
		if (dto.route !== undefined && dto.route !== page.route) {
			if (dto.route === '') {
				if (page.parentPageId) throw new IndexPageMustBeTopLevelError();
				if (await this.pageRepository.hasChildren(pageId)) {
					throw new IndexPageCannotHaveChildrenError(pageId);
				}
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
		return await this.pageRepository.updatePage(page, dto);
	}

	async deletePage(appId: string, pageId: string) {
		await this.getPage(appId, pageId);
		await this.pageRepository.deletePage(pageId);
	}

	/** Validates every draft page's content, freezes it as a version, and activates it. */
	async publish(appId: string, userId: string) {
		const app = await this.getApp(appId);
		const pages = await this.pageRepository.findManyByAppId(appId);

		const invalidPages: InvalidPageContent[] = [];
		const validatedContent = new Map<string, AppVersionSnapshot['pages'][number]['content']>();
		for (const page of pages) {
			if (page.content === null) {
				validatedContent.set(page.id, null);
				continue;
			}
			const parsed = appContentSchema.safeParse(page.content);
			if (parsed.success) validatedContent.set(page.id, parsed.data);
			else invalidPages.push({ pageId: page.id, issues: parsed.error.issues });
		}
		if (invalidPages.length > 0) throw new AppContentInvalidError({ pages: invalidPages });

		const snapshot: AppVersionSnapshot = {
			pages: pages.map((page) => ({
				id: page.id,
				route: page.route,
				parentPageId: page.parentPageId,
				content: validatedContent.get(page.id) ?? null,
			})),
			theme: app.theme ?? null,
		};

		const version = await this.appVersionRepository.createFromSnapshot(appId, snapshot, userId);
		await this.appRepository.setActiveVersionId(app, version.id);
		return { versionId: version.id, url: appBasePath(app.namespace) };
	}

	async listVersions(appId: string) {
		const app = await this.getApp(appId);
		const versions = await this.appVersionRepository.findManyByAppId(appId, 50);
		return versions.map((version) => ({
			id: version.id,
			createdAt: version.createdAt,
			createdById: version.createdById,
			active: version.id === app.activeVersionId,
		}));
	}

	async activateVersion(appId: string, versionId: string) {
		const app = await this.getApp(appId);
		const version = await this.appVersionRepository.findSnapshot(versionId);
		if (!version || version.appId !== appId) throw new AppVersionNotFoundError(versionId);
		await this.appRepository.setActiveVersionId(app, version.id);
	}

	/** Renders a draft page for the editor/AI preview; never touches the active version. */
	async preview(
		appId: string,
		pageId: string,
		path: string | undefined,
		params: Record<string, string>,
	) {
		const app = await this.getApp(appId);
		const page = await this.getPage(appId, pageId);
		const pages = await this.pageRepository.findManyByAppId(appId);

		return await renderPage({
			app: {
				id: app.id,
				name: app.name,
				namespace: app.namespace,
				projectId: app.projectId,
				theme: app.theme,
			},
			page: {
				id: page.id,
				route: page.route,
				content: appContentSchema.safeParse(page.content).data ?? null,
				path: path ?? this.draftPagePath(app.namespace, page, pages, params),
			},
			pages,
			params,
			query: {},
			viewer: null,
			baseUrl: this.urlService.getInstanceBaseUrl(),
			preview: true,
		});
	}

	/** The public path this draft page would have, filling `:param` segments from `params` where given. */
	private draftPagePath(
		namespace: string,
		page: Page,
		pages: Page[],
		params: Record<string, string>,
	): string {
		const byId = new Map(pages.map((p) => [p.id, p]));
		const segments: string[] = [];

		let current: Page | undefined = page;
		while (current) {
			const segment = isDynamicRoute(current.route)
				? (params[current.route.slice(1)] ?? current.route)
				: current.route;
			if (segment !== '') segments.unshift(segment);
			current = current.parentPageId ? byId.get(current.parentPageId) : undefined;
		}

		return pagePath(namespace, segments);
	}
}
