import { Service } from '@n8n/di';
import { DataSource, IsNull, Not, Repository } from '@n8n/typeorm';

import { Page } from './page.entity';

@Service()
export class PageRepository extends Repository<Page> {
	constructor(dataSource: DataSource) {
		super(Page, dataSource.manager);
	}

	async createPage(
		appId: string,
		parentPageId: string | null,
		route: string,
		content: Page['content'] = null,
		layout: Page['layout'] = null,
		title: Page['title'] = null,
	) {
		const page = this.create({ appId, parentPageId, route, content, layout, title });
		return await this.save(page);
	}

	/** Flat list of every page under an App; callers build the tree from `parentPageId`. */
	async findManyByAppId(appId: string) {
		return await this.findBy({ appId });
	}

	async hasChildren(pageId: string) {
		return await this.existsBy({ parentPageId: pageId });
	}

	/** Whether another page under the same parent already has this route. */
	async hasSiblingWithRoute(
		appId: string,
		parentPageId: string | null,
		route: string,
		excludePageId?: string,
	) {
		return await this.existsBy({
			appId,
			parentPageId: parentPageId ?? IsNull(),
			route,
			...(excludePageId ? { id: Not(excludePageId) } : {}),
		});
	}

	async updatePage(
		page: Page,
		updates: Partial<Pick<Page, 'route' | 'title' | 'content' | 'layout'>>,
	) {
		return await this.save(Object.assign(page, updates));
	}

	async deletePage(id: string) {
		await this.delete({ id });
	}
}
