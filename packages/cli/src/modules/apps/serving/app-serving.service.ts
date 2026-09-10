import { Service } from '@n8n/di';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import { AppVersionRepository } from '../app-version.repository';
import { AppVersionService } from '../app-version.service';
import { AppRepository } from '../app.repository';
import { PageRepository } from '../page.repository';
import { buildMenu, pageTitle, type MenuItem } from './page-menu';
import { resolveDistPath } from './resolve-dist-path';
import { resolvePagePath } from './resolve-page-path';

export type PageRenderContext = {
	appName: string;
	title: string;
	menu: MenuItem[];
};

export type ResolvedAppRequest =
	| { kind: 'static'; filePath: string }
	| { kind: 'page'; context: PageRenderContext };

const isFile = async (filePath: string) =>
	await stat(filePath).then(
		(stats) => stats.isFile(),
		() => false,
	);

@Service()
export class AppServingService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly pageRepository: PageRepository,
		private readonly appVersionRepository: AppVersionRepository,
		private readonly appVersionService: AppVersionService,
	) {}

	/**
	 * An App with an active version is a static site: a file of its dist, or
	 * `index.html` for any other path so client-side routing works. Without one
	 * the path resolves to a page. Undefined when no App owns the namespace, or
	 * no page of it owns the path.
	 */
	async resolve(namespace: string, segments: string[]): Promise<ResolvedAppRequest | undefined> {
		const app = await this.appRepository.findByNamespace(namespace);
		if (!app) return undefined;

		const version = app.activeVersionId
			? await this.appVersionRepository.findById(app.activeVersionId)
			: null;
		if (version) {
			const distDir = await this.appVersionService.distDir(version);
			const target = resolveDistPath(distDir, segments);
			const filePath = target && (await isFile(target)) ? target : path.join(distDir, 'index.html');
			return { kind: 'static', filePath };
		}

		const context = await this.resolvePage(app, segments);
		return context ? { kind: 'page', context } : undefined;
	}

	private async resolvePage(
		app: { id: string; name: string; namespace: string },
		segments: string[],
	): Promise<PageRenderContext | undefined> {
		const pages = await this.pageRepository.findManyByAppId(app.id);
		const resolved = resolvePagePath(pages, segments);
		if (!resolved) return undefined;

		const { page, params } = resolved;

		return {
			appName: app.name,
			// Named the same way the menu names it; a resolved page always has a value
			// for every param on its own path.
			title: pageTitle(page.route, params) ?? app.name,
			menu: buildMenu(app.namespace, pages, page.id, params),
		};
	}
}
