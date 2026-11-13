/**
 * Compiled library node: a hand port of `n8n-nodes-base.notion` version 3,
 * operations `databasePage.create` (create a database page) and
 * `databasePage.getAll` (query a database).
 *
 * Supported property types on create: title, rich_text (plain text), number,
 * checkbox, select, status, multi_select, url, email, phone_number. Content:
 * none, markdown or JSON blocks. Filters: none or JSON. Other property types,
 * block builders, manual filters and file downloads are not supported.
 *
 * Versions 2 to 2.2 (the converter sets `apiV2`): `databasePage.getAll` with
 * no, JSON or manual filters, `databasePage.update` by page id, and
 * `databasePage.create`, which v1 runs once for all items (one database read,
 * then one page for each item; the converter passes the parameters of each
 * item in `batch`). Property types: all of version 2 except dates and
 * formatted rich text. The converter sends dates, formula filters, block
 * builders, file downloads and locators in mode `url` to the host.
 *
 * Difference from v1: the simplified output builds `property_<name>` keys with
 * a snake case function that splits words like change-case for ASCII names.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

const API = 'https://api.notion.com/v1';
const VERSION_HEADERS = { 'Notion-Version': '2026-03-11' };

interface Locator {
	__rl?: boolean;
	mode?: string;
	value?: string;
}

interface PropertyValue {
	key?: string;
	title?: string;
	textContent?: string;
	richText?: boolean;
	numberValue?: number;
	checkboxValue?: boolean;
	selectValue?: string;
	statusValue?: string;
	multiSelectValue?: string | string[];
	urlValue?: string;
	ignoreIfEmpty?: boolean;
	emailValue?: string;
	phoneValue?: string;
}

interface SortValue {
	timestamp?: boolean;
	key?: string;
	direction?: string;
}

interface NotionParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	dataSourceId?: string | Locator;
	title?: string;
	propertiesUi?: { propertyValues?: Array<PropertyValue & Record<string, unknown>> };
	contentType?: string;
	markdown?: string;
	blocksJson?: string;
	options?: NotionOptions;
	simple?: boolean;
	returnAll?: boolean;
	limit?: number;
	filterType?: string;
	filterJson?: string;
	apiV2?: boolean;
	databaseId?: string | Locator;
	pageId?: string | Locator;
	matchType?: string;
	filters?: { conditions?: unknown[] };
	batch?: NotionParameters[];
}

interface NotionOptions {
	icon?: string;
	iconType?: string;
	sort?: { sortValue?: SortValue[] };
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The data source id of a resource locator. Mode `id` extracts a UUID prefix
 * (with or without dashes), as the regular expression of the v1 node does.
 */
function locatorValue(value: string | Locator | undefined): string {
	if (typeof value === 'string') return value;
	const text = value?.value ?? '';
	if (value?.mode !== 'id') return text;
	const groups = [8, 4, 4, 4, 12];
	let at = 0;
	for (let g = 0; g < groups.length; g++) {
		for (let n = 0; n < groups[g]; n++) {
			if (!'0123456789abcdef'.includes(text.charAt(at)) || at >= text.length) {
				throw new Error(
					"ERROR: Data Source parameter's value is invalid. This is likely because the URL entered is incorrect",
				);
			}
			at++;
		}
		if (g < groups.length - 1 && text.charAt(at) === '-') at++;
	}
	return text.slice(0, at);
}

/** encodeURIComponent, through toPathSegment of n8n-workflow. */
function toPathSegment(text: string): string {
	if (text === '' || text === '.' || text === '..') {
		throw new Error(`Invalid identifier: "${text}" is not allowed`);
	}
	if (!Ascii.is(text)) {
		throw new Error('Notion: a data source id with non-ASCII characters is not supported');
	}
	return encodeURIComponent(text);
}

function splitKey(key: string): { name: string; type: string } {
	let at = -1;
	for (let i = key.indexOf('|'); i >= 0; i = key.indexOf('|', i + 1)) at = i;
	return at < 0 ? { name: key, type: '' } : { name: key.slice(0, at), type: key.slice(at + 1) };
}

/** `validate` of the uuid package. */
function isUuid(text: string): boolean {
	const lower = text.toLowerCase();
	if (lower === '00000000-0000-0000-0000-000000000000') return true;
	if (lower === 'ffffffff-ffff-ffff-ffff-ffffffffffff') return true;
	if (lower.length !== 36) return false;
	for (let i = 0; i < 36; i++) {
		const ch = lower.charAt(i);
		if (i === 8 || i === 13 || i === 18 || i === 23) {
			if (ch !== '-') return false;
		} else if (!'0123456789abcdef'.includes(ch)) {
			return false;
		}
	}
	return '12345678'.includes(lower.charAt(14)) && '89ab'.includes(lower.charAt(19));
}

/** getPropertyKeyValue of the v1 node, version 3, for the supported types. */
function propertyValue(value: PropertyValue, type: string): unknown {
	if (type === 'title') return { title: [{ text: { content: value.title ?? '' } }] };
	if (type === 'rich_text') {
		if (value.richText === true) {
			throw new Error('Notion: rich text with formatting is not in the compiled library');
		}
		return { rich_text: [{ text: { content: value.textContent ?? '' } }] };
	}
	if (type === 'number') {
		// eslint-disable-next-line id-denylist -- a Notion API field name
		return { type: 'number', number: value.numberValue ?? 0 };
	}
	if (type === 'checkbox') return { type: 'checkbox', checkbox: value.checkboxValue ?? false };
	if (type === 'url') {
		const url = value.urlValue ?? '';
		return !url && value.ignoreIfEmpty ? undefined : { type: 'url', url };
	}
	if (type === 'email') return { type: 'email', email: value.emailValue ?? '' };
	if (type === 'phone_number')
		return { type: 'phone_number', phone_number: value.phoneValue ?? '' };
	if (type === 'select') {
		const name = value.selectValue ?? '';
		return name === '' ? { type: 'select', select: null } : { type: 'select', select: { name } };
	}
	if (type === 'status') return { type: 'status', status: { name: value.statusValue ?? '' } };
	if (type === 'multi_select') {
		const raw = value.multiSelectValue ?? '';
		if (raw === '' || (Array.isArray(raw) && raw.length === 0)) {
			return { type: 'multi_select', multi_select: [] };
		}
		const options = Array.isArray(raw) ? raw : raw.split(',').map((v) => v.trim());
		return {
			type: 'multi_select',
			multi_select: options
				.filter((o) => o !== null)
				.map((o) => (isUuid(o) ? { id: o } : { name: o })),
		};
	}
	throw new Error(`Notion: the property type "${type}" is not in the compiled library`);
}

function setSafe(target: Record<string, unknown>, key: string, value: unknown): void {
	if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
	target[key] = value;
}

function isLower(ch: string): boolean {
	return ch !== ch.toUpperCase() && ch === ch.toLowerCase();
}

function isUpper(ch: string): boolean {
	return ch !== ch.toLowerCase();
}

/**
 * For snakeCase, the class of the character at `i`: 0 not a word character
 * (or past the end), 1 lower case, 2 upper case, 3 digit, 4 other.
 */
function charClass(text: string, i: number): number {
	const code = text.charCodeAt(i);
	if (code >= 0x61 && code <= 0x7a) return 1;
	if (code >= 0x41 && code <= 0x5a) return 2;
	if (code >= 0x30 && code <= 0x39) return 3;
	// Past the end, code is NaN.
	if (!(code >= 0x80)) return 0;
	const ch = text.charAt(i);
	if (isLower(ch)) return 1;
	return isUpper(ch) ? 2 : 4;
}

/** snakeCase of change-case: splits at non-word characters and case changes. */
function snakeCase(text: string): string {
	const words: string[] = [];
	// The start of the current word, or -1 between words.
	let start = -1;
	let prev = 0;
	for (let i = 0; i < text.length; i++) {
		const now = charClass(text, i);
		if (now === 0) {
			if (start >= 0) words.push(text.slice(start, i).toLowerCase());
			start = -1;
			continue;
		}
		const split =
			start >= 0 &&
			now === 2 &&
			(prev === 1 || prev === 3 || (prev === 2 && charClass(text, i + 1) === 1));
		if (split) words.push(text.slice(start, i).toLowerCase());
		if (split || start < 0) start = i;
		prev = now;
	}
	if (start >= 0) words.push(text.slice(start).toLowerCase());
	return words.join('_');
}

/** simplifyProperty of the v1 node. */
function simplifyProperty(property: Record<string, unknown>): unknown {
	const type = String(property.type);
	const value = property[type];
	if (type === 'text') return property.plain_text;
	if (type === 'rich_text' || type === 'title') {
		if (Array.isArray(value) && value.length !== 0) {
			return value.map((t) => simplifyProperty(isObject(t) ? t : {})).join('');
		}
		return '';
	}
	const plain = [
		'url',
		'created_time',
		'checkbox',
		'number',
		'last_edited_time',
		'email',
		'phone_number',
		'date',
	];
	if (plain.includes(type)) return value;
	if (type === 'created_by' || type === 'last_edited_by' || type === 'select') {
		return isObject(value) ? value.name : null;
	}
	if (type === 'people') {
		if (!Array.isArray(value)) return value;
		return value.map((p) => {
			const email = isObject(p) && isObject(p.person) ? p.person.email : undefined;
			return email || {};
		});
	}
	if (type === 'multi_select') {
		const list = Array.isArray(value)
			? value
			: isObject(value) && Array.isArray(value.options)
				? value.options
				: [];
		return list.map((e) => (isObject(e) && e.name) || {});
	}
	if (type === 'relation') {
		if (Array.isArray(value)) return value.map((e) => (isObject(e) && e.id) || {});
		return isObject(value) ? value.database_id : undefined;
	}
	if (type === 'formula') return isObject(value) ? value[String(value.type)] : undefined;
	if (type === 'files') {
		const files = Array.isArray(value) ? value : [];
		return files.map((f) => {
			const file = isObject(f) ? f[String(f.type)] : undefined;
			return isObject(file) ? file.url : undefined;
		});
	}
	if (type === 'status') return isObject(value) ? value.name : undefined;
	return undefined;
}

/** simplifyObjects of the v1 node, version 3, for pages. */
function simplifyPage(page: Item, fold = false): Item | undefined {
	if (page.object !== 'page') return undefined;
	const properties = isObject(page.properties) ? page.properties : {};
	const parent = isObject(page.parent) ? page.parent : {};
	if (parent.type === 'page_id' || parent.type === 'workspace') {
		const title =
			isObject(properties.title) && Array.isArray(properties.title.title)
				? properties.title.title
				: [];
		return {
			id: page.id,
			name: isObject(title[0]) ? title[0].plain_text : undefined,
			url: page.url,
		};
	}
	let name = '';
	for (const property of Object.values(properties)) {
		if (isObject(property) && property.type === 'title') {
			const title = Array.isArray(property.title) ? property.title : [];
			const text = isObject(title[0]) ? title[0].plain_text : undefined;
			name = typeof text === 'string' ? text : '';
			break;
		}
	}
	const simple: Item = {};
	for (const [key, property] of Object.entries(properties)) {
		simple[key] = simplifyProperty(isObject(property) ? property : {});
	}
	// v1 (`prepend`) renames the keys in place, in the order of the properties. A
	// new key can overwrite a property that has the same name and is not renamed yet.
	for (const key of Object.keys(simple)) {
		simple[`property_${snakeCase(fold ? foldAscii(key) : key)}`] = simple[key];
		delete simple[key];
	}
	const out: Item = { id: page.id, name, url: page.url };
	for (const key of Object.keys(simple)) out[key] = simple[key];
	return out;
}

function simplifyAll(pages: Item[], fold = false): Item[] {
	const out: Item[] = [];
	for (const page of pages) {
		const simple = simplifyPage(page, fold);
		if (simple !== undefined) out.push(simple);
	}
	return out;
}

/** camelCase of change-case for the snake case names of Notion property types. */
function camelOf(type: string): string {
	const words = type.split('_').filter((w) => w !== '');
	return words
		.map((w, i) =>
			i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
		)
		.join('');
}

/** uuidValidateWithoutDashes of the v1 node: a UUID with or without dashes, or an error. */
function relationId(value: string): string {
	if (isUuid(value)) return value;
	if (value.length === 32) {
		const dashed = `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
		if (isUuid(dashed)) return value;
	}
	throw new Error(`The relation id "${value}" is not a valid uuid with optional dashes.`);
}

/** getPropertyKeyValue of the v1 node, version 2. The converter sends dates and formatted text to the host. */
function propertyValueV2(value: Record<string, unknown>, type: string): unknown {
	const empty = (v: unknown) => v === undefined || v === null || v === '';
	switch (type) {
		case 'rich_text':
			if (value.richText !== false) {
				throw new Error('Notion: rich text with formatting is not in the compiled library');
			}
			return { rich_text: [{ text: { content: value.textContent } }] };
		case 'title':
			return { title: [{ text: { content: value.title } }] };
		case 'number':
			// eslint-disable-next-line id-denylist -- a Notion API field name
			return { type: 'number', number: value.numberValue };
		case 'url':
			return !value.urlValue && value.ignoreIfEmpty
				? undefined
				: { type: 'url', url: value.urlValue };
		case 'checkbox':
			return { type: 'checkbox', checkbox: value.checkboxValue };
		case 'relation': {
			const list = Array.isArray(value.relationValue) ? value.relationValue : [];
			const ids: Array<{ id: string }> = [];
			for (const entry of list) {
				if (!entry || typeof entry !== 'string') continue;
				for (const part of entry.split(',')) ids.push({ id: relationId(part.trim()) });
			}
			return { type: 'relation', relation: ids };
		}
		case 'multi_select': {
			const raw = value.multiSelectValue;
			if (empty(raw)) return { type: 'multi_select', multi_select: [] };
			const options: unknown[] = Array.isArray(raw)
				? raw
				: typeof raw === 'string'
					? raw.split(',').map((v) => v.trim())
					: [];
			return {
				type: 'multi_select',
				multi_select: options
					.filter((o) => o !== null)
					.map((o) => (typeof o === 'string' && isUuid(o) ? { id: o } : { name: o })),
			};
		}
		case 'email':
			return { type: 'email', email: value.emailValue };
		case 'people': {
			const people = Array.isArray(value.peopleValue) ? value.peopleValue : [value.peopleValue];
			return { type: 'people', people: people.map((id) => ({ id })) };
		}
		case 'phone_number':
			return { type: 'phone_number', phone_number: value.phoneValue };
		case 'select':
			return empty(value.selectValue)
				? { type: 'select', select: null }
				: { type: 'select', select: { name: value.selectValue } };
		case 'status':
			return { type: 'status', status: { name: value.statusValue } };
		case 'files': {
			const urls =
				isObject(value.fileUrls) && Array.isArray(value.fileUrls.fileUrl)
					? value.fileUrls.fileUrl
					: [];
			return {
				type: 'files',
				files: urls.map((f) => ({
					name: isObject(f) ? f.name : undefined,
					type: 'external',
					external: { url: isObject(f) ? f.url : undefined },
				})),
			};
		}
		case 'date':
			throw new Error('Notion: date properties are not in the compiled library');
		default:
			return {};
	}
}

/** mapProperties of the v1 node, version 2. */
function propertiesV2(list: unknown[]): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const property of list) {
		if (!isObject(property) || typeof property.key !== 'string') continue;
		const { name, type } = splitKey(property.key);
		const value = propertyValueV2(property, type);
		if (value) setSafe(out, name, value);
	}
	return out;
}

/** mapFilters of the v1 node for one condition. The converter sends dates and formulas to the host. */
function filterV2(condition: Record<string, unknown>): Record<string, unknown> {
	const { name, type } = splitKey(typeof condition.key === 'string' ? condition.key : '');
	const operation = typeof condition.condition === 'string' ? condition.condition : '';
	let key = type;
	let value: unknown =
		key === 'last_edited_time' ? condition[camelOf(key)] : condition[`${camelOf(key)}Value`];
	if (operation === 'is_empty' || operation === 'is_not_empty') {
		value = true;
	} else if (
		['past_week', 'past_month', 'past_year', 'next_week', 'next_month', 'next_year'].includes(
			operation,
		)
	) {
		value = {};
	}
	if (key === 'rich_text' || key === 'text') key = 'text';
	else if (key === 'phone_number') key = 'phone';
	else if (key === 'date' && operation !== 'is_empty' && operation !== 'is_not_empty') {
		throw new Error('Notion: date filters are not in the compiled library');
	} else if (key === 'boolean') key = 'checkbox';
	if (condition.type === 'formula') {
		throw new Error('Notion: formula filters are not in the compiled library');
	}
	const out: Record<string, unknown> = { property: name };
	const inner: Record<string, unknown> = {};
	setSafe(inner, operation, value);
	setSafe(out, key, inner);
	return out;
}

/** Non-ASCII characters as spaces (foldedSnakeCase of the v1 node, before version 3). */
function foldAscii(text: string): string {
	if (Ascii.isPrintable(text)) return text;
	let out = '';
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		out += code >= 0x20 && code <= 0x7e ? text.charAt(i) : ' ';
	}
	return out;
}

export default defineNode<NotionParameters>({
	type: 'n8n-nodes-base.notion',
	version: 3,
	supports: {
		resource: 'page',
		operation: { databasePage: 'create', page: 'create' },
		operations: {
			'databasePage.create': [
				'authentication',
				'dataSourceId',
				'title',
				'propertiesUi',
				'contentType',
				'markdown',
				'blocksJson',
				'options',
				'options.icon',
				'options.iconType',
				'simple',
				'blockUi',
				'apiV2',
				'databaseId',
				'batch',
			],
			'databasePage.update': [
				'authentication',
				'apiV2',
				'pageId',
				'propertiesUi',
				'options',
				'options.icon',
				'options.iconType',
				'simple',
			],
			'databasePage.getAll': [
				'authentication',
				'dataSourceId',
				'returnAll',
				'limit',
				'filterType',
				'filterJson',
				'options',
				'options.sort',
				'simple',
				'apiV2',
				'databaseId',
				'matchType',
				'filters',
				'filters.conditions',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'page';
		const operation = parameters.operation ?? (resource === 'databasePage' ? 'create' : '');
		const dataSourceId = locatorValue(parameters.dataSourceId);
		const simple = parameters.simple ?? true;
		const out: Item[] = [];
		// Versions 2 to 2.2: the database API of Notion-Version 2021-08-16.
		if (parameters.apiV2 === true || parameters.batch?.[0]?.apiV2 === true) {
			const headers = { 'Notion-Version': '2021-08-16' };
			const request = async (method: string, path: string, body: unknown) => {
				const response = await ctx.http<Item>({
					method,
					url: `${API}${path}`,
					headers,
					qs: {},
					body,
					credential,
				});
				if (response.status >= 400) throw new Error(`Notion: HTTP status ${response.status}`);
				return response.body;
			};
			const icon = (o: NotionOptions, typed: boolean): Record<string, unknown> | undefined => {
				if (!o.icon) return undefined;
				if (o.iconType === 'file') {
					return typed
						? { type: 'external', external: { url: o.icon } }
						: { external: { url: o.icon } };
				}
				return typed ? { type: 'emoji', emoji: o.icon } : { emoji: o.icon };
			};
			const v2Out: Item[] = [];
			if (resource === 'databasePage' && operation === 'create') {
				// v1 reads the title property of the database of item 0 once, then creates each page.
				const inputs = items ?? [{}];
				const each = parameters.batch ?? inputs.map(() => parameters);
				const first = each[0] ?? parameters;
				const database = await request(
					'GET',
					`/databases/${toPathSegment(locatorValue(first.databaseId))}`,
					undefined,
				);
				let titleKey = '';
				const properties = isObject(database.properties) ? database.properties : {};
				for (const key of Object.keys(properties)) {
					const p = properties[key];
					if (isObject(p) && p.type === 'title') titleKey = key;
				}
				for (let i = 0; i < inputs.length; i++) {
					const p = each[i] ?? first;
					const title = p.title ?? '';
					const body: Record<string, unknown> = { parent: {}, properties: {} };
					const pageProperties: Record<string, unknown> = {};
					if (title !== '')
						setSafe(pageProperties, titleKey, { title: [{ text: { content: title } }] });
					body.parent = { database_id: locatorValue(p.databaseId) };
					const values = p.propertiesUi?.propertyValues ?? [];
					if (values.length !== 0) {
						const mapped = propertiesV2(values);
						for (const key of Object.keys(mapped)) setSafe(pageProperties, key, mapped[key]);
					}
					body.properties = pageProperties;
					body.children = [];
					const pageIcon = icon(p.options ?? {}, false);
					if (pageIcon) body.icon = pageIcon;
					const page = await request('POST', '/pages', body);
					for (const result of (p.simple ?? true) ? simplifyAll([page], true) : [page]) {
						v2Out.push(result);
					}
				}
				return v2Out;
			}
			for (const _item of items ?? [{}]) {
				if (resource === 'databasePage' && operation === 'update') {
					const pageId =
						typeof parameters.pageId === 'string'
							? parameters.pageId
							: (parameters.pageId?.value ?? '');
					if (!pageId) throw new Error(`Could not extract page ID from URL: ${pageId}`);
					const body: Record<string, unknown> = { properties: {} };
					const values = parameters.propertiesUi?.propertyValues ?? [];
					if (values.length !== 0) body.properties = propertiesV2(values);
					const pageIcon = icon(parameters.options ?? {}, true);
					if (pageIcon) body.icon = pageIcon;
					const page = await request('PATCH', `/pages/${toPathSegment(pageId)}`, body);
					for (const result of simple ? simplifyAll([page], true) : [page]) v2Out.push(result);
					continue;
				}
				if (resource === 'databasePage' && operation === 'getAll') {
					const databaseId = locatorValue(parameters.databaseId);
					const body: Record<string, unknown> = { filter: {} };
					const filterType = parameters.filterType ?? 'none';
					if (filterType === 'manual') {
						const conditions = (parameters.filters?.conditions ?? []).map((c) =>
							filterV2(isObject(c) ? c : {}),
						);
						const matchType = parameters.matchType ?? 'anyFilter';
						if (matchType === 'anyFilter') body.filter = { or: conditions };
						else if (matchType === 'allFilters') body.filter = { and: conditions };
					} else if (filterType === 'json') {
						let parsed: unknown;
						try {
							parsed = JSON.parse(parameters.filterJson ?? '');
						} catch {
							throw new Error('Filters (JSON) must be a valid json');
						}
						body.filter = parsed;
					}
					if (isObject(body.filter) && Object.keys(body.filter).length === 0) delete body.filter;
					const sort = parameters.options?.sort?.sortValue ?? [];
					body.sorts = sort.map((s) => {
						const rule: Record<string, unknown> = { direction: s.direction };
						rule[s.timestamp ? 'timestamp' : 'property'] = splitKey(s.key ?? '').name;
						return rule;
					});
					const limit = parameters.returnAll === true ? undefined : (parameters.limit ?? 50);
					if (limit !== undefined) body.page_size = Math.min(limit, 100);
					// notionApiRequestAllItems of the v1 node: pages until has_more is false.
					const pages: Item[] = [];
					for (;;) {
						const response = await request(
							'POST',
							`/databases/${toPathSegment(databaseId)}/query`,
							{ ...body },
						);
						body.start_cursor = response.next_cursor;
						const results = response.results;
						if (Array.isArray(results)) {
							for (const r of results) if (isObject(r)) pages.push(r);
						}
						if (limit && limit <= pages.length) break;
						if (response.has_more === false) break;
					}
					const found = limit ? pages.slice(0, limit) : pages;
					for (const page of simple ? simplifyAll(found, true) : found) v2Out.push(page);
					continue;
				}
				throw new Error(`Notion: ${resource}.${operation} is not in the compiled library`);
			}
			return v2Out;
		}

		if (resource === 'databasePage' && operation === 'create') {
			if (!dataSourceId) throw new Error('DataSource ID is required to create a database page');
			const title = parameters.title ?? '';
			if (!title.trim()) throw new Error('Title is required to create a database page');
			const contentType = parameters.contentType ?? 'blockUi';
			for (const _item of items ?? [{}]) {
				// getTitleKey of the v1 node: the name of the title property of the data source.
				const source = await ctx.http<Item>({
					method: 'GET',
					url: `${API}/data_sources/${toPathSegment(dataSourceId)}`,
					headers: { ...VERSION_HEADERS },
					qs: {},
					body: undefined,
					credential,
				});
				if (source.status >= 400) throw new Error(`Notion: HTTP status ${source.status}`);
				if (!isObject(source.body.properties)) {
					throw new Error('Notion did not return data source properties');
				}
				let titleKey = '';
				for (const [key, property] of Object.entries(source.body.properties)) {
					if (isObject(property) && property.type === 'title') {
						titleKey = key;
						break;
					}
				}
				const properties: Record<string, unknown> = {};
				if (titleKey) setSafe(properties, titleKey, { title: [{ text: { content: title } }] });
				for (const value of parameters.propertiesUi?.propertyValues ?? []) {
					if (typeof value.key !== 'string') continue;
					const { name, type } = splitKey(value.key);
					const mapped = propertyValue(value, type);
					if (mapped) setSafe(properties, name, mapped);
				}
				const body: Record<string, unknown> = {
					parent: { type: 'data_source_id', data_source_id: dataSourceId },
					properties,
				};
				if (contentType === 'json') {
					const parsed: unknown = parameters.blocksJson ? JSON.parse(parameters.blocksJson) : [];
					if (!Array.isArray(parsed)) {
						throw new Error('Blocks (JSON) must be an array of Notion block objects');
					}
					body.children = parsed.filter((b) => isObject(b));
				} else if (contentType === 'markdown') {
					body.markdown = parameters.markdown ?? '';
				} else {
					body.children = [];
				}
				const icon = parameters.options?.icon;
				if (typeof icon === 'string' && icon !== '') {
					const isUrl = icon.startsWith('http://') || icon.startsWith('https://');
					body.icon = isUrl
						? { type: 'external', external: { url: icon } }
						: { type: 'emoji', emoji: icon };
				}
				const response = await ctx.http<Item>({
					method: 'POST',
					url: `${API}/pages`,
					headers: { ...VERSION_HEADERS },
					qs: {},
					body,
					credential,
				});
				if (response.status >= 400) throw new Error(`Notion: HTTP status ${response.status}`);
				for (const page of simple ? simplifyAll([response.body]) : [response.body]) out.push(page);
			}
			return out;
		}

		if (resource === 'databasePage' && operation === 'getAll') {
			const filterType = parameters.filterType ?? 'none';
			const limit = parameters.returnAll ? undefined : (parameters.limit ?? 50);
			for (const _item of items ?? [{}]) {
				const body: Record<string, unknown> = {};
				if (filterType === 'json') {
					const parsed: unknown = JSON.parse(parameters.filterJson ?? '{}');
					if (isObject(parsed) && Object.keys(parsed).length > 0) body.filter = parsed;
				} else if (filterType !== 'none') {
					throw new Error(`Notion: filter type "${filterType}" is not in the compiled library`);
				}
				const sort = parameters.options?.sort?.sortValue ?? [];
				if (sort.length > 0) {
					body.sorts = sort.map((s) => {
						const rule: Record<string, unknown> = { direction: s.direction ?? '' };
						rule[s.timestamp ? 'timestamp' : 'property'] = splitKey(s.key ?? '').name;
						return rule;
					});
				}
				if (limit) body.page_size = Math.min(limit, 100);
				// notionApiRequestAllItemsV3 of the v1 node: pages until has_more is false.
				const pages: Item[] = [];
				for (;;) {
					const response = await ctx.http<Item>({
						method: 'POST',
						url: `${API}/data_sources/${toPathSegment(dataSourceId)}/query`,
						headers: { ...VERSION_HEADERS },
						qs: {},
						body: { ...body },
						credential,
					});
					if (response.status >= 400) throw new Error(`Notion: HTTP status ${response.status}`);
					body.start_cursor = response.body.next_cursor;
					const results = response.body.results;
					if (Array.isArray(results)) {
						for (const r of results) if (isObject(r)) pages.push(r);
					}
					if (limit && limit <= pages.length) break;
					if (response.body.has_more === false) break;
				}
				const found = limit ? pages.slice(0, limit) : pages;
				for (const page of simple ? simplifyAll(found) : found) out.push(page);
			}
			return out;
		}

		throw new Error(`Notion: ${resource}.${operation} is not in the compiled library`);
	},
});
