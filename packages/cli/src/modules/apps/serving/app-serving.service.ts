import { Service } from '@n8n/di';

import { AppVersionRepository } from '../app-version.repository';
import type { App } from '../app.entity';
import { renderPage } from '../rendering/page-renderer';
import type { PublishedPageResolution } from '../rendering/types';
import { pagePath } from './page-menu';
import { resolveLayout } from './resolve-layout';
import { resolvePagePath } from './resolve-page-path';
import type { Viewer } from './viewer.service';

@Service()
export class AppServingService {
	constructor(private readonly appVersionRepository: AppVersionRepository) {}

	/**
	 * The page of the active (published) snapshot that owns a public path, or
	 * undefined when there is no active version or no such page.
	 */
	async resolvePublished(
		app: App,
		segments: string[],
	): Promise<PublishedPageResolution | undefined> {
		if (!app.activeVersionId) return undefined;

		const version = await this.appVersionRepository.findSnapshot(app.activeVersionId);
		if (!version) return undefined;

		const resolved = resolvePagePath(version.snapshot.pages, segments);
		if (!resolved) return undefined;

		const { page, params } = resolved;

		return {
			app: {
				id: app.id,
				name: app.name,
				namespace: app.namespace,
				projectId: app.projectId,
				theme: version.snapshot.theme,
				activeVersionId: app.activeVersionId,
			},
			page,
			pages: version.snapshot.pages,
			params,
			layout: resolveLayout(version.snapshot.pages, page.id),
		};
	}

	/** Renders a resolved public page: blocks, menu, shell. */
	async render(
		resolution: PublishedPageResolution,
		segments: string[],
		query: Record<string, string>,
		baseUrl: string,
		viewer: Viewer | null,
	): Promise<string> {
		const { app, page, pages, params, layout } = resolution;

		const { html } = await renderPage({
			app,
			page: {
				id: page.id,
				route: page.route,
				content: page.content,
				path: pagePath(app.namespace, segments),
			},
			pages,
			layout,
			params,
			query,
			viewer,
			baseUrl,
			preview: false,
		});
		return html;
	}
}
