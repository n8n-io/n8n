import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { isRecord, type GymAdmin } from './gym-admin';
import type { McpCaller } from './mcp-upstream';
import type { Hydrator } from './router';

type Obj = Record<string, unknown>;

const HEX32 = /([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})/i;
const MAX_TARGETS = 10;
// Property types copied into the gym. They hold plain values. People, relations, formulas, rollups and files
// refer to other objects of the real workspace or are computed, so they are not copied.
const SIMPLE_TYPES = new Set([
	'title',
	'rich_text',
	'date',
	'number',
	'select',
	'multi_select',
	'status',
	'checkbox',
	'url',
	'email',
	'phone_number',
]);

// The last UUID in a string (a Notion url ends with the page id), dashed and lowercase.
function lastId(s: string): string | undefined {
	const all = [...s.matchAll(new RegExp(HEX32, 'gi'))];
	const m = all.at(-1);
	return m ? m.slice(1, 6).join('-').toLowerCase() : undefined;
}

const textOf = (res: CallToolResult): string =>
	res.content.flatMap((c) => (c.type === 'text' ? [c.text] : [])).join('\n');

function tryJson(s: string): unknown {
	try {
		return JSON.parse(s);
	} catch {
		return undefined;
	}
}

const tag = (text: string, name: string): string | undefined =>
	new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(text)?.[1]?.trim();

// Real Notion calls a text column `text`. The gym calls it `rich_text`.
const gymType = (type: string): string => (type === 'text' ? 'rich_text' : type);

// Cell values from a real row or page properties object. Dates come as `date:<name>:start` and `:end` keys.
// A multi-select comes as a JSON array in a string.
function cellsOf(row: Obj, kept: Map<string, string>): Obj {
	const cells: Obj = {};
	for (const [name, type] of kept) {
		const v = row[name];
		if (type === 'date') {
			const start = row[`date:${name}:start`];
			const end = row[`date:${name}:end`];
			if (typeof start === 'string' && start) {
				cells[name] = typeof end === 'string' && end ? { start, end } : { start };
			}
		} else if (type === 'checkbox') {
			cells[name] = v === '__YES__' || v === true;
		} else if (type === 'multi_select') {
			const list = typeof v === 'string' ? tryJson(v) : v;
			if (Array.isArray(list)) cells[name] = list.filter((x): x is string => typeof x === 'string');
		} else if (typeof v === 'string' || typeof v === 'number') {
			cells[name] = v;
		}
	}
	return cells;
}

interface Target {
	// A page id, or a `collection://` url of a data source.
	id: string;
	// Pre-read text of the target. Missing means read it from real Notion.
	text?: string;
	// Rows read by a query. Seeded into the data source.
	rows?: Obj[];
}

// Seeds the objects a real Notion read returned into the gym, as pages and databases with real ids.
export class NotionHydrator implements Hydrator {
	private readonly seeded = new Set<string>();
	// Data source id -> kept property names and types, for rows added later.
	private readonly dbKept = new Map<string, Map<string, string>>();

	constructor(private readonly deps: { admin: GymAdmin; tenant: string; upstream: McpCaller }) {}

	async hydrate(
		tool: string,
		args: Record<string, unknown>,
		result: CallToolResult,
	): Promise<void> {
		for (const target of this.targets(tool, args, result).slice(0, MAX_TARGETS)) {
			// One page that fails to seed must not fail the whole read.
			try {
				const overlay = await this.overlay(target);
				if (overlay) await this.deps.admin.seed(this.deps.tenant, overlay);
			} catch (e) {
				const msg = e instanceof Error ? e.message.slice(0, 700) : 'unknown error';
				Container.get(Logger).warn(`mcp-guard notion hydrate skipped a target: ${msg}`);
			}
		}
	}

	async hydrateWrite(tool: string, args: Record<string, unknown>): Promise<void> {
		for (const target of this.writeTargets(tool, args).slice(0, MAX_TARGETS)) {
			const overlay = await this.overlay(target);
			if (overlay) await this.deps.admin.seed(this.deps.tenant, overlay);
		}
	}

	// The parent or the page a write refers to. The gym needs it under its real id.
	private writeTargets(tool: string, args: Obj): Target[] {
		const ids: string[] = [];
		const add = (v: unknown, collection = false) => {
			const id = typeof v === 'string' ? lastId(v) : undefined;
			if (id) ids.push(collection ? `collection://${id}` : id);
		};
		if (tool === 'notion-create-pages') {
			const parent = isRecord(args.parent) ? args.parent : {};
			add(parent.page_id);
			add(parent.data_source_id, true);
			add(parent.database_id, true);
		} else if (tool === 'notion-update-page' || tool === 'notion-create-comment') {
			add(args.page_id);
		}
		return ids.map((id) => ({ id }));
	}

	private targets(tool: string, args: Obj, result: CallToolResult): Target[] {
		const text = textOf(result);
		if (tool === 'notion-fetch') {
			const id = typeof args.id === 'string' ? args.id : undefined;
			return id ? [{ id: id.startsWith('collection://') ? id : (lastId(id) ?? id), text }] : [];
		}
		if (tool === 'notion-search') {
			const list = isRecord(tryJson(text)) ? (tryJson(text) as Obj).results : undefined;
			if (!Array.isArray(list)) return [];
			return list.filter(isRecord).flatMap((r) => {
				const url = typeof r.url === 'string' ? r.url : '';
				const id = url.startsWith('collection://') ? url : lastId(String(r.id ?? url));
				return id ? [{ id }] : [];
			});
		}
		if (tool === 'notion-query-data-sources') {
			const ds = /collection:\/\/[0-9a-f-]{32,36}/i.exec(JSON.stringify(args))?.[0];
			const rows = (tryJson(text) as Obj | undefined)?.results;
			return ds ? [{ id: ds, rows: Array.isArray(rows) ? rows.filter(isRecord) : [] }] : [];
		}
		return [];
	}

	private async overlay(target: Target): Promise<Obj | undefined> {
		const rows = target.rows ?? [];
		const dsId = target.id.startsWith('collection://') ? lastId(target.id) : undefined;
		// Nothing new to seed for a known data source without rows.
		if (dsId && this.seeded.has(`db:${dsId}`) && rows.length === 0) return undefined;
		const raw = target.text ?? (await this.read(target.id));
		if (!raw) return undefined;
		// Real Notion wraps a fetch result as JSON: `{metadata, title, url, text}`. The markup is in `text`.
		const envelope = tryJson(raw);
		const text = isRecord(envelope) && typeof envelope.text === 'string' ? envelope.text : raw;
		const envUrl =
			isRecord(envelope) && typeof envelope.url === 'string' ? envelope.url : undefined;
		const envTitle =
			isRecord(envelope) && typeof envelope.title === 'string' ? envelope.title : undefined;
		// The ancestor path of a row page names its data source. Only the page's own markup counts here.
		const own = text.replace(/<ancestor-path>[\s\S]*?<\/ancestor-path>/, '');
		const ds = /<data-source url="(?:\{\{)?collection:\/\/([^"}]+)/.exec(own);
		// A database page URL names the database itself. The gym must serve it under that id.
		const dbTag = /<database url="(?:\{\{)?([^"}]+)/.exec(own);
		if (ds) return this.databaseOverlay(ds[1], text, rows, dbTag ? lastId(dbTag[1]) : undefined);
		const page = /<page url="([^"]+)"/.exec(text);
		const id = lastId(page?.[1] ?? envUrl ?? '');
		// A page whose ancestor is a data source is a row of that database.
		const parentDs = /url="(?:\{\{)?collection:\/\/([^"}]+)/.exec(tag(text, 'ancestor-path') ?? '');
		const parentDsId = parentDs ? lastId(parentDs[1]) : undefined;
		if (id && parentDsId) return await this.rowOverlay(id, parentDsId, text, envTitle);
		if (!id) {
			// Tag names only. Never log page content.
			const tags = [...text.matchAll(/<([a-z-]+)[ >]/g)].map((m) => m[1]);
			Container.get(Logger).warn(
				`mcp-guard notion hydrate: no page or data source found, tags: ${[...new Set(tags)].join(',')}, head: ${text.slice(0, 80).replace(/[^<>a-z =":/.-]/gi, '?')}`,
			);
		}
		if (!id || this.seeded.has(`page:${id}`)) return undefined;
		this.seeded.add(`page:${id}`);
		const props = tryJson(tag(text, 'properties') ?? '');
		const title =
			isRecord(props) && typeof props.title === 'string' ? props.title : (envTitle ?? 'Untitled');
		return {
			world_version: 1,
			native: {
				notion: { pages: [{ ref: `page:${id}`, id, title, body: tag(text, 'content') ?? '' }] },
			},
		};
	}

	// A fetched row page. A row seen first in a query has its cells already. It gets its body here.
	private async rowOverlay(
		rowId: string,
		dsId: string,
		text: string,
		title: string | undefined,
	): Promise<Obj | undefined> {
		const body = tag(text, 'content') ?? '';
		if (this.seeded.has(`row:${rowId}`)) {
			if (body && !this.seeded.has(`body:${rowId}`)) {
				this.seeded.add(`body:${rowId}`);
				await this.deps.admin.event(this.deps.tenant, {
					type: 'append_blocks',
					page: rowId,
					markdown: body,
				});
			}
			return undefined;
		}
		if (!this.dbKept.has(dsId)) {
			const dbOverlay = await this.overlay({ id: `collection://${dsId}` });
			if (dbOverlay) await this.deps.admin.seed(this.deps.tenant, dbOverlay);
		}
		const kept = this.dbKept.get(dsId);
		if (!kept) return undefined;
		this.seeded.add(`row:${rowId}`);
		this.seeded.add(`body:${rowId}`);
		const props = tryJson(tag(text, 'properties') ?? '');
		const cells = isRecord(props) ? cellsOf(props, kept) : {};
		const titleName = [...kept].find(([, type]) => type === 'title')?.[0];
		if (titleName && cells[titleName] === undefined) {
			cells[titleName] =
				(isRecord(props) && typeof props.title === 'string' ? props.title : title) ?? 'Untitled';
		}
		return {
			world_version: 1,
			native: {
				notion: {
					databases: [{ ref: `db:${dsId}`, rows: [{ id: rowId, properties: cells, body }] }],
				},
			},
		};
	}

	private databaseOverlay(
		rawId: string,
		text: string,
		rows: Obj[],
		databaseId?: string,
	): Obj | undefined {
		const dsId = lastId(rawId);
		if (!dsId) return undefined;
		const state = tryJson(tag(text, 'data-source-state') ?? '');
		const schema = isRecord(state) && isRecord(state.schema) ? state.schema : {};
		const kept = new Map<string, string>();
		const properties: Obj = {};
		for (const [name, def] of Object.entries(schema)) {
			const type = gymType(isRecord(def) && typeof def.type === 'string' ? def.type : '');
			if (!SIMPLE_TYPES.has(type)) continue;
			const options =
				isRecord(def) && Array.isArray(def.options)
					? def.options.flatMap((o) => (isRecord(o) && typeof o.name === 'string' ? [o.name] : []))
					: undefined;
			kept.set(name, type);
			properties[name] = options && options.length > 0 ? { type, options } : type;
		}
		if (![...kept.values()].includes('title')) {
			kept.set('Name', 'title');
			properties.Name = 'title';
		}
		this.dbKept.set(dsId, kept);
		const ref = `db:${dsId}`;
		const seededRows = rows.flatMap((row) => {
			const rowId = typeof row.url === 'string' ? lastId(row.url) : undefined;
			if (!rowId || this.seeded.has(`row:${rowId}`)) return [];
			this.seeded.add(`row:${rowId}`);
			const cells = cellsOf(row, kept);
			return [{ id: rowId, properties: cells }];
		});
		if (this.seeded.has(ref)) {
			// An existing database takes extra rows when the overlay has no properties.
			return seededRows.length > 0
				? { world_version: 1, native: { notion: { databases: [{ ref, rows: seededRows }] } } }
				: undefined;
		}
		this.seeded.add(ref);
		const title = isRecord(state) && typeof state.name === 'string' ? state.name : 'Database';
		return {
			world_version: 1,
			native: {
				notion: {
					databases: [
						{ ref, id: databaseId, data_source_id: dsId, title, properties, rows: seededRows },
					],
				},
			},
		};
	}

	// Read-only upstream call. A failure gives undefined, so the target is skipped.
	private async read(id: string): Promise<string | undefined> {
		try {
			const res = await this.deps.upstream.callTool('notion-fetch', { id });
			return res.isError ? undefined : textOf(res);
		} catch {
			return undefined;
		}
	}
}
