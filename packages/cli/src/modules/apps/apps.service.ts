import type {
	AppVersionSnapshot,
	CreateAppDto,
	CreatePageDto,
	UpdateAppDto,
	UpdatePageDto,
} from '@n8n/api-types';
import { APP_LAYOUT_PRESETS, appContentSchema, appLayoutSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { z } from 'zod';

import {
	renderLayout,
	renderPage,
	type PageToRender,
	type RenderErrors,
} from './rendering/page-renderer';
import { sanitizeLayoutPreviewHtml } from './rendering/sanitize-html';
import type { InvalidPageContent } from './errors/app-content-invalid.error';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UrlService } from '@/services/url.service';

import { AppRepository } from './app.repository';
import { AppVersionRepository } from './app-version.repository';
import { AppComponentsInvalidError } from './errors/app-components-invalid.error';
import { AppContentInvalidError } from './errors/app-content-invalid.error';
import { AppNotFoundError } from './errors/app-not-found.error';
import { AppVersionNotFoundError } from './errors/app-version-not-found.error';
import { IndexPageCannotHaveChildrenError } from './errors/index-page-cannot-have-children.error';
import { IndexPageMustBeTopLevelError } from './errors/index-page-must-be-top-level.error';
import { PageNotFoundError } from './errors/page-not-found.error';
import { PageRouteConflictError } from './errors/page-route-conflict.error';
import { PageRepository } from './page.repository';
import { AppCodeRuntime } from './runtime/app-code-runtime';
import { toDraftPages, type SnapshotPages } from './serving/draft-pages';
import { appBasePath, pagePath } from './serving/page-menu';
import { resolveLayout } from './serving/resolve-layout';
import { isDynamicRoute, resolvePagePath, type PageNode } from './serving/resolve-page-path';

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

function findLayoutPreset(id: string) {
	const preset = APP_LAYOUT_PRESETS.find((candidate) => candidate.id === id);
	if (!preset) throw new BadRequestError(`Unknown layout preset: ${id}`);
	return preset;
}

@Service()
export class AppsService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly pageRepository: PageRepository,
		private readonly appVersionRepository: AppVersionRepository,
		private readonly urlService: UrlService,
		private readonly codeRuntime: AppCodeRuntime,
	) {}

	private async assertComponentsCompile(components: string) {
		try {
			await this.codeRuntime.compile(components);
		} catch (error) {
			throw new AppComponentsInvalidError(ensureError(error).message);
		}
	}

	/** With a `layoutPreset`, the App starts with the preset's theme and an index page carrying its layout. */
	async createApp(projectId: string, dto: CreateAppDto) {
		const preset = dto.layoutPreset === undefined ? null : findLayoutPreset(dto.layoutPreset);
		const app = await this.appRepository.createApp(
			projectId,
			dto.name,
			dto.namespace,
			preset?.theme ?? null,
		);
		if (preset) await this.pageRepository.createPage(app.id, null, '', null, preset.blocks);
		return app;
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
			dto.title ?? null,
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
				title: page.title,
				parentPageId: page.parentPageId,
				content: content.data,
				layout: layout.data,
			});
		}
		if (invalidPages.length > 0) throw new AppContentInvalidError({ pages: invalidPages });
		if (app.components !== null) await this.assertComponentsCompile(app.components);

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

	/**
	 * Renders a draft page for the editor/AI preview; never touches the active
	 * version. `path` is the public path below the app root (`clients/42`); its
	 * `:param` values fill in where `params` has none.
	 */
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
		const pages = toDraftPages(await this.pageRepository.findManyByAppId(appId));
		const page = pages.find((p) => p.id === pageId);
		if (!page) throw new PageNotFoundError(pageId);

		const fromPath = path ? resolvePagePath(pages, path.split('/').filter(Boolean)) : undefined;
		const allParams = { ...(fromPath?.page.id === pageId ? fromPath.params : {}), ...params };

		return {
			app: {
				id: app.id,
				name: app.name,
				namespace: app.namespace,
				projectId: app.projectId,
				theme: app.theme,
				components: app.components,
			},
			page: {
				id: page.id,
				route: page.route,
				title: page.title,
				content: page.content,
				path: this.draftPagePath(app.namespace, page, pages, allParams),
			},
			pages,
			layout: resolveLayout(pages, page.id),
			params: allParams,
			query: {},
			viewer: null,
			baseUrl: this.urlService.getInstanceBaseUrl(),
			preview: true,
		};
	}

	/** The public path this draft page would have, filling `:param` segments from `params` where given. */
	private draftPagePath(
		namespace: string,
		page: PageNode,
		pages: SnapshotPages,
		params: Record<string, string>,
	): string {
		const byId = new Map(pages.map((p) => [p.id, p]));
		const segments: string[] = [];

		let current: PageNode | undefined = page;
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
