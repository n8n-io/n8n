import type { AppTheme } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { AppVersionRepository } from '../app-version.repository';
import type { App } from '../app.entity';
import { PageRepository } from '../page.repository';
import { renderPage } from '../rendering/page-renderer';
import type { PageResolution } from '../rendering/types';
import { toDraftPages, type SnapshotPages } from './draft-pages';
import { pagePath } from './page-menu';
import { resolveLayout } from './resolve-layout';
import { resolvePagePath } from './resolve-page-path';
import type { Viewer } from './viewer.service';

@Service()
export class AppServingService {
	constructor(
		private readonly appVersionRepository: AppVersionRepository,
		private readonly pageRepository: PageRepository,
	) {}

	/**
	 * The page of the active (published) snapshot that owns a public path, or
	 * undefined when there is no active version or no such page.
	 */
	async resolvePublished(app: App, segments: string[]): Promise<PageResolution | undefined> {
		if (!app.activeVersionId) return undefined;

		const version = await this.appVersionRepository.findSnapshot(app.activeVersionId);
		if (!version) return undefined;

		const { pages, theme, components } = version.snapshot;
		return this.resolve(app, pages, { theme, components }, segments, false);
	}

	/** The current draft page that owns a public path, for a `draft` access token (editor preview). */
	async resolveDraft(app: App, segments: string[]): Promise<PageResolution | undefined> {
		const pages = toDraftPages(await this.pageRepository.findManyByAppId(app.id));
		return this.resolve(
			app,
			pages,
			{ theme: app.theme, components: app.components ?? null },
			segments,
			true,
		);
	}

	private resolve(
		app: App,
		pages: SnapshotPages,
		source: { theme: AppTheme | null; components: string | null },
		segments: string[],
		preview: boolean,
	): PageResolution | undefined {
		const resolved = resolvePagePath(pages, segments);
		if (!resolved) return undefined;

		const { page, params } = resolved;
		return {
			app: {
				id: app.id,
				name: app.name,
				namespace: app.namespace,
				projectId: app.projectId,
				theme: source.theme,
				components: source.components,
			},
			page,
			pages,
			params,
			layout: resolveLayout(pages, page.id),
			preview,
		};
	}

	/** Renders a resolved public page: blocks, menu, shell. */
	async render(
		resolution: PageResolution,
		segments: string[],
		query: Record<string, string>,
		baseUrl: string,
		viewer: Viewer | null,
	): Promise<string> {
		const { app, page, pages, params, layout, preview } = resolution;

		const { html } = await renderPage({
			app,
			page: {
				id: page.id,
				route: page.route,
				title: page.title,
				content: page.content,
				path: pagePath(app.namespace, segments),
			},
			pages,
			layout,
			params,
			query,
			viewer,
			baseUrl,
			preview,
		});
		return html;
	}
}
