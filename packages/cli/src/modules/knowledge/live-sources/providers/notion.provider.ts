import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, INodeParameterResourceLocator, INodeParameters } from 'n8n-workflow';

import { LiveSourceInputError, LiveSourceUnavailableError } from '../live-source.errors';
import type {
	KnowledgeLiveSourceProvider,
	LiveDocument,
	LiveEntry,
	LiveListRequest,
	LiveListResult,
	LiveRunContext,
	LiveSearchMatch,
	LiveSourceCapabilities,
	LiveSourceItem,
} from '../live-source-provider';
import { NodeOperationAdapter, type NodeOperation } from '../node-operation-adapter';
import { tokenizeQuery } from '../strategies/text-search';

export const NOTION_PROVIDER_ID = 'notion';
const NODE_TYPE = 'n8n-nodes-base.notion';
const NODE_TYPE_VERSION = 3;

/** The container types of the Notion provider, as `containerType` in the agent config. */
export const NOTION_CONTAINER_TYPES = {
	page: 'page',
	database: 'database',
	dataSource: 'dataSource',
} as const;

const DEFAULT_LIST_LIMIT = 50;
/** The index build lists up to its own cap; the tools are capped by their schema. */
const MAX_LIST_LIMIT = 500;
/** Notion ranks the matches; the window must hold the matching pages of a large scope. */
const SEARCH_PAGE_SIZE = 100;
/** Terms of a query that the data source title filter takes. More terms give broad matches. */
const MAX_TITLE_FILTER_TERMS = 5;
const UNTITLED = 'Untitled';

// Same id shape as the Notion node locators: 32 hex digits, dashes optional.
const NOTION_ID = '[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}';
const NOTION_URL_REGEX = new RegExp(
	`^https?://(?:www\\.notion\\.(?:so|com)|app\\.notion\\.com)/(?:p/)?(?:[a-z0-9-]{2,}/)?(?:[a-zA-Z0-9_-]+-)?(${NOTION_ID})`,
);

interface NotionParent {
	type?: string;
	page_id?: string;
	data_source_id?: string;
	database_id?: string;
	block_id?: string;
}

interface NotionPage {
	id: string;
	url?: string;
	last_edited_time?: string;
	parent?: NotionParent;
	properties?: Record<string, unknown>;
}

interface NotionDataSourceSummary {
	id: string;
	name: string;
}

interface NotionBlock {
	id: string;
	type: string;
	has_children?: boolean;
	last_edited_time?: string;
	child_page?: { title?: string };
	child_database?: { title?: string };
}

function resourceLocator(id: string): INodeParameterResourceLocator {
	return { __rl: true, mode: 'id', value: id };
}

function notionUrl(id: string): string {
	return `https://www.notion.so/${id.replace(/-/g, '')}`;
}

/** Ids compare without dashes and case, because Notion returns them dashed and links hold them plain. */
function normalizeId(id: string): string {
	return id.replace(/-/g, '').toLowerCase();
}

/** Child page links in the markdown of a page: `<page url="https://…/<id>">`. */
const PAGE_LINK_REGEX = /<page url="/;

function plainText(value: unknown): string {
	if (!Array.isArray(value)) return '';
	return value
		.map((part) => (isRecord(part) && typeof part.plain_text === 'string' ? part.plain_text : ''))
		.join('')
		.trim();
}

function pageTitle(page: NotionPage): string {
	if (!isRecord(page.properties)) return UNTITLED;
	for (const property of Object.values(page.properties)) {
		if (isRecord(property) && property.type === 'title') {
			return plainText(property.title) || UNTITLED;
		}
	}
	return UNTITLED;
}

function parentId(page: NotionPage): string | undefined {
	const parent = page.parent;
	if (!parent) return undefined;
	return parent.page_id ?? parent.data_source_id ?? parent.database_id ?? parent.block_id;
}

function isNotionPage(value: IDataObject): value is IDataObject & NotionPage {
	return typeof value.id === 'string';
}

function isNotionBlock(value: IDataObject): value is IDataObject & NotionBlock {
	return typeof value.id === 'string' && typeof value.type === 'string';
}

function toPageEntry(page: NotionPage, knownParentId?: string): LiveEntry {
	return {
		id: page.id,
		kind: 'item',
		containerType: NOTION_CONTAINER_TYPES.page,
		title: pageTitle(page),
		url: page.url ?? notionUrl(page.id),
		parentId: knownParentId ?? parentId(page),
		updatedAt: page.last_edited_time,
	};
}

/**
 * Notion as a live source over the Notion node v3. Pages are items that can
 * hold child pages; databases and data sources are containers of pages.
 */
@Service()
export class NotionLiveSourceProvider implements KnowledgeLiveSourceProvider {
	readonly id = NOTION_PROVIDER_ID;

	readonly credentialTypes = ['notionOAuth2Api', 'notionApi'] as const;

	readonly capabilities: LiveSourceCapabilities = {
		nestedContainers: true,
		nativeContainerSearch: true,
		persistableContent: true,
	};

	readonly defaultRetrieval = 'native';

	constructor(private readonly adapter: NodeOperationAdapter) {}

	normalizeItemId(id: string): string {
		return normalizeId(id);
	}

	async resolveLink(ctx: LiveRunContext, url: string): Promise<LiveEntry | null> {
		const id = NOTION_URL_REGEX.exec(url.trim())?.[1];
		if (!id) return null;
		try {
			const page = await this.getPage(ctx, id);
			return toPageEntry(page);
		} catch (error) {
			if (!(error instanceof LiveSourceUnavailableError)) throw error;
		}
		const database = await this.getDatabase(ctx, id);
		return {
			id: database.id,
			kind: 'container',
			containerType: NOTION_CONTAINER_TYPES.database,
			title: database.title,
			url: database.url ?? notionUrl(database.id),
			updatedAt: database.updatedAt,
		};
	}

	async list(
		ctx: LiveRunContext,
		container: LiveSourceItem,
		req: LiveListRequest,
	): Promise<LiveListResult> {
		const limit = Math.min(req.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
		switch (container.containerType ?? NOTION_CONTAINER_TYPES.page) {
			case NOTION_CONTAINER_TYPES.page:
				return { entries: await this.listChildPages(ctx, container.id, limit) };
			case NOTION_CONTAINER_TYPES.database: {
				const database = await this.getDatabase(ctx, container.id);
				return {
					entries: database.dataSources.map((dataSource) => ({
						id: dataSource.id,
						kind: 'container',
						containerType: NOTION_CONTAINER_TYPES.dataSource,
						title: dataSource.name,
						url: container.url,
						parentId: container.id,
					})),
				};
			}
			case NOTION_CONTAINER_TYPES.dataSource: {
				const rows = await this.queryDataSource(ctx, container.id, undefined, limit);
				return { entries: rows.map((row) => toPageEntry(row, container.id)) };
			}
			default:
				throw new LiveSourceInputError(
					`A Notion container of type "${container.containerType}" cannot be listed`,
				);
		}
	}

	async search(
		ctx: LiveRunContext,
		scope: readonly LiveEntry[],
		query: string,
		limit: number,
	): Promise<LiveSearchMatch[]> {
		const scopeIds = new Set(scope.map((entry) => normalizeId(entry.id)));
		const containers = scope.filter((entry) => entry.kind === 'container' || entry.hasChildren);
		const containerIds = new Set(containers.map((entry) => normalizeId(entry.id)));
		const seen = new Set<string>();
		const matches: LiveSearchMatch[] = [];
		const add = (entry: LiveEntry) => {
			const key = normalizeId(entry.id);
			if (seen.has(key)) return;
			seen.add(key);
			matches.push({ entry, snippet: entry.title });
		};

		// Notion search matches titles across the whole integration access; keep the scope.
		for (const page of await this.searchPages(ctx, query)) {
			const parent = parentId(page);
			const inScope =
				scopeIds.has(normalizeId(page.id)) ||
				(parent !== undefined && containerIds.has(normalizeId(parent)));
			if (inScope) add(toPageEntry(page));
		}

		const terms = tokenizeQuery(query).slice(0, MAX_TITLE_FILTER_TERMS);
		const dataSources = containers.filter(
			(entry) => entry.containerType === NOTION_CONTAINER_TYPES.dataSource,
		);
		for (const dataSource of dataSources) {
			if (terms.length === 0) break;
			// The title property always has the id `title`, whatever its name.
			const filter = {
				or: terms.map((term) => ({ property: 'title', title: { contains: term } })),
			};
			const rows = await this.queryDataSource(ctx, dataSource.id, filter, limit);
			for (const row of rows) add(toPageEntry(row, dataSource.id));
		}
		return matches;
	}

	async read(ctx: LiveRunContext, entry: LiveEntry): Promise<LiveDocument> {
		if (
			entry.containerType === NOTION_CONTAINER_TYPES.database ||
			entry.containerType === NOTION_CONTAINER_TYPES.dataSource
		) {
			throw new LiveSourceInputError(
				'This ref is a Notion database. Use list_knowledge or search_knowledge with it, then read one of its pages.',
			);
		}
		const [result] = await this.run(ctx, {
			resource: 'page',
			operation: 'getMarkdown',
			pageId: resourceLocator(entry.id),
			includeTranscript: false,
		});
		const markdown = isRecord(result) && typeof result.markdown === 'string' ? result.markdown : '';
		const truncated = isRecord(result) && result.truncated === true;
		// The markdown links the child pages. They are direct children of the item, so they join the scope.
		const children =
			entry.kind === 'container' || entry.hasChildren || PAGE_LINK_REGEX.test(markdown)
				? await this.listChildPages(ctx, entry.id, MAX_LIST_LIMIT)
				: [];

		// The markdown call returns no title, url or edit time. Picked items carry
		// title and url from the config; one more call fills the edit time.
		let title = entry.title;
		let url = entry.url;
		let updatedAt = entry.updatedAt;
		if (!url || !updatedAt) {
			const page = await this.getPage(ctx, entry.id);
			title = entry.title || pageTitle(page);
			url = url ?? page.url ?? notionUrl(entry.id);
			updatedAt = updatedAt ?? page.last_edited_time;
		}
		return { id: entry.id, title, url, text: markdown, updatedAt, truncated, children };
	}

	private async listChildPages(
		ctx: LiveRunContext,
		pageId: string,
		limit: number,
	): Promise<LiveEntry[]> {
		// Child pages sit among the text blocks, so every block of the page is read.
		const blocks = await this.run(ctx, {
			resource: 'block',
			operation: 'getAll',
			blockId: resourceLocator(pageId),
			returnAll: true,
			fetchNestedBlocks: false,
			simplifyOutput: false,
		});
		const entries: LiveEntry[] = [];
		for (const block of blocks) {
			if (!isNotionBlock(block)) continue;
			if (block.type === 'child_page') {
				entries.push({
					id: block.id,
					kind: 'item',
					containerType: NOTION_CONTAINER_TYPES.page,
					title: block.child_page?.title || UNTITLED,
					url: notionUrl(block.id),
					parentId: pageId,
					hasChildren: block.has_children,
					updatedAt: block.last_edited_time,
				});
			} else if (block.type === 'child_database') {
				entries.push({
					id: block.id,
					kind: 'container',
					containerType: NOTION_CONTAINER_TYPES.database,
					title: block.child_database?.title || UNTITLED,
					url: notionUrl(block.id),
					parentId: pageId,
					updatedAt: block.last_edited_time,
				});
			}
			if (entries.length >= limit) break;
		}
		return entries;
	}

	private async searchPages(ctx: LiveRunContext, query: string): Promise<NotionPage[]> {
		const results = await this.run(ctx, {
			resource: 'page',
			operation: 'search',
			text: query,
			returnAll: false,
			limit: SEARCH_PAGE_SIZE,
			// Relevance order: sorted by edit time, a large data source fills the window.
			options: {},
			simple: false,
		});
		return results.filter(isNotionPage);
	}

	private async queryDataSource(
		ctx: LiveRunContext,
		dataSourceId: string,
		filter: IDataObject | undefined,
		limit: number,
	): Promise<NotionPage[]> {
		const rows = await this.run(ctx, {
			resource: 'databasePage',
			operation: 'getAll',
			dataSourceId: resourceLocator(dataSourceId),
			returnAll: false,
			limit,
			...(filter
				? { filterType: 'json', filterJson: JSON.stringify(filter) }
				: { filterType: 'none' }),
			options: {},
			simple: false,
		});
		return rows.filter(isNotionPage);
	}

	private async getPage(ctx: LiveRunContext, pageId: string): Promise<NotionPage> {
		const [page] = await this.run(ctx, {
			resource: 'databasePage',
			operation: 'get',
			pageId: resourceLocator(pageId),
			simple: false,
			options: {},
		});
		if (page === undefined || !isNotionPage(page)) {
			throw new LiveSourceUnavailableError(ctx.sourceId, 'Notion returned no page');
		}
		return page;
	}

	private async getDatabase(
		ctx: LiveRunContext,
		databaseId: string,
	): Promise<{
		id: string;
		title: string;
		url?: string;
		updatedAt?: string;
		dataSources: NotionDataSourceSummary[];
	}> {
		const [database] = await this.run(ctx, {
			resource: 'database',
			operation: 'get',
			databaseId: resourceLocator(databaseId),
			simple: false,
		});
		if (!isRecord(database) || typeof database.id !== 'string') {
			throw new LiveSourceUnavailableError(ctx.sourceId, 'Notion returned no database');
		}
		const dataSources = Array.isArray(database.data_sources)
			? database.data_sources.flatMap((dataSource) =>
					isRecord(dataSource) && typeof dataSource.id === 'string'
						? [
								{
									id: dataSource.id,
									name: typeof dataSource.name === 'string' ? dataSource.name : UNTITLED,
								},
							]
						: [],
				)
			: [];
		return {
			id: database.id,
			title: plainText(database.title) || UNTITLED,
			url: typeof database.url === 'string' ? database.url : undefined,
			updatedAt:
				typeof database.last_edited_time === 'string' ? database.last_edited_time : undefined,
			dataSources,
		};
	}

	private async run(ctx: LiveRunContext, parameters: INodeParameters): Promise<IDataObject[]> {
		const operation: NodeOperation = {
			nodeType: NODE_TYPE,
			nodeTypeVersion: NODE_TYPE_VERSION,
			parameters,
		};
		return await this.adapter.execute(ctx, operation);
	}
}
