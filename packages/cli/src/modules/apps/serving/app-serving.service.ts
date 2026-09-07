import { Service } from '@n8n/di';

import { AppRepository } from '../app.repository';
import { PageRepository } from '../page.repository';
import { buildMenu, pageTitle, type MenuItem } from './page-menu';
import { resolvePagePath } from './resolve-page-path';

export type PageRenderContext = {
	appName: string;
	title: string;
	menu: MenuItem[];
};

@Service()
export class AppServingService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly pageRepository: PageRepository,
	) {}

	/** Undefined when no App owns the namespace, or no page of it owns the path. */
	async resolvePage(namespace: string, segments: string[]): Promise<PageRenderContext | undefined> {
		const app = await this.appRepository.findByNamespace(namespace);
		if (!app) return undefined;

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
