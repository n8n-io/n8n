import type {
	AppVersionSnapshot,
	CreateAppDto,
	CreatePageDto,
	UpdateAppDto,
	UpdatePageDto,
} from '@n8n/api-types';
import { appContentSchema, appLayoutSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { z } from 'zod';

import {
	renderLayout,
	renderPage,
	type PageToRender,
	type RenderErrors,
} from './rendering/page-renderer';
import { sanitizeLayoutPreviewHtml } from './rendering/sanitize-html';
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
import { resolveLayout } from './serving/resolve-layout';
import { isDynamicRoute } from './serving/resolve-page-path';

/** A draft JSON column against its schema: `null` stays `null`, issues are prefixed with the field. */
function parseDraftField<T>(
	field: 'content' | 'layout',
	schema: z.ZodType<T, z.ZodTypeDef, unknown>,
	value: unknown,
): { data: T | null; issues: z.ZodIssue[] } {
	if (value === null) return { data: null, issues: [] };
	const parsed = schema.safeParse(value);
	if (parsed.success) return { data: parsed.data, issues: [] };
	return {
		data: null,
		issues: parsed.error.issues.map((issue) => ({ ...issue, path: [field, ...issue.path] })),
	};
}

/** A draft page's layout as the renderer needs it; an invalid draft layout counts as none. */
const draftLayout = (page: Page) => appLayoutSchema.safeParse(page.layout).data ?? null;

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
			dto.layout ?? null,
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

	/** Validates every draft page's content and layout, freezes them as a version, and activates it. */
	async publish(appId: string, userId: string) {
		const app = await this.getApp(appId);
		const pages = await this.pageRepository.findManyByAppId(appId);

		const invalidPages: InvalidPageContent[] = [];
		const snapshotPages: AppVersionSnapshot['pages'] = [];
		for (const page of pages) {
			const content = parseDraftField('content', appContentSchema, page.content);
			const layout = parseDraftField('layout', appLayoutSchema, page.layout);
			const issues = [...content.issues, ...layout.issues];
			if (issues.length > 0) {
				invalidPages.push({ pageId: page.id, issues });
				continue;
			}
			snapshotPages.push({
				id: page.id,
				route: page.route,
				parentPageId: page.parentPageId,
				content: content.data,
				layout: layout.data,
			});
		}
		if (invalidPages.length > 0) throw new AppContentInvalidError({ pages: invalidPages });

		const snapshot: AppVersionSnapshot = {
			pages: snapshotPages,
			theme: app.theme ?? null,
			components: app.components ?? null,
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
		return await renderPage(await this.draftPageToRender(appId, pageId, path, params));
	}

	/**
	 * The effective draft layout of a page, rendered around an empty slot and
	 * sanitized, so the editor can show it on its own origin around the content
	 * editor. `ownerPageId` and `html` are null when the page falls back to the built-in shell.
	 */
	async previewLayout(
		appId: string,
		pageId: string,
	): Promise<{ ownerPageId: string | null; html: string | null; errors: RenderErrors }> {
		const input = await this.draftPageToRender(appId, pageId, undefined, {});
		if (!input.layout) return { ownerPageId: null, html: null, errors: {} };
		const { html, errors } = await renderLayout({ ...input, layout: input.layout });
		return {
			ownerPageId: input.layout.ownerPageId,
			html: sanitizeLayoutPreviewHtml(html),
			errors,
		};
	}

	private async draftPageToRender(
		appId: string,
		pageId: string,
		path: string | undefined,
		params: Record<string, string>,
	): Promise<PageToRender> {
		const app = await this.getApp(appId);
		const page = await this.getPage(appId, pageId);
		const pages = await this.pageRepository.findManyByAppId(appId);

		return {
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
			layout: resolveLayout(
				pages.map((p) => ({
					id: p.id,
					route: p.route,
					parentPageId: p.parentPageId,
					layout: draftLayout(p),
				})),
				page.id,
			),
			params,
			query: {},
			viewer: null,
			baseUrl: this.urlService.getInstanceBaseUrl(),
			preview: true,
		};
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
