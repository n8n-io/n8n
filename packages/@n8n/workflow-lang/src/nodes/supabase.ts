/**
 * Compiled library node: a hand port of `n8n-nodes-base.supabase` version 1,
 * operations `row.getAll`, `row.get` and `row.update`, with a secret key
 * (credential `supabaseApi`).
 *
 * The node sends PostgREST requests to `<host>/rest/v1/<table>`. The runtime
 * fills in the host from the credential. Filters: manual (any or all
 * conditions) and string, with `$1` parameters.
 *
 * `row.create` sends one request for all input items, as v1 does. The
 * converter passes the parameters of each item in `batch`.
 *
 * Not supported: `row.delete` and OAuth2. Difference
 * from v1: v1 removes one slash at the end of the host. This node does not,
 * so a host that ends with a slash gives a URL with two slashes.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface Condition {
	keyName?: unknown;
	condition?: unknown;
	keyValue?: unknown;
	searchFunction?: unknown;
}

interface SupabaseParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	useCustomSchema?: boolean;
	schema?: string;
	tableId?: unknown;
	filterType?: string;
	matchType?: string;
	filters?: { conditions?: Condition[] };
	filterString?: string;
	filterStringParameters?: { values?: Array<{ value?: unknown }> };
	returnAll?: boolean;
	limit?: number;
	orderBy?: string;
	dataToSend?: string;
	inputsToIgnore?: string;
	fieldsUi?: { fieldValues?: Array<{ fieldId?: unknown; fieldValue?: unknown }> };
	batch?: SupabaseParameters[];
}

const HEX = '0123456789ABCDEF';

/** The UTF-8 bytes of the code point at `i`, and the number of UTF-16 units it takes. */
function utf8At(text: string, i: number): { bytes: number[]; units: number } {
	let code = text.charCodeAt(i);
	let units = 1;
	if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
		code = 0x10000 + (code - 0xd800) * 0x400 + (text.charCodeAt(i + 1) - 0xdc00);
		units = 2;
	}
	const bytes: number[] = [];
	if (code < 0x80) bytes.push(code);
	else if (code < 0x800) bytes.push(0xc0 + Math.floor(code / 64), 0x80 + (code % 64));
	else if (code < 0x10000) {
		bytes.push(
			0xe0 + Math.floor(code / 4096),
			0x80 + (Math.floor(code / 64) % 64),
			0x80 + (code % 64),
		);
	} else {
		bytes.push(
			0xf0 + Math.floor(code / 262144),
			0x80 + (Math.floor(code / 4096) % 64),
			0x80 + (Math.floor(code / 64) % 64),
			0x80 + (code % 64),
		);
	}
	return { bytes, units };
}

/** Percent-encodes UTF-8 and keeps the characters in `keep` (encodeURI and encodeURIComponent). */
function percentEncode(text: string, keep: string): string {
	let out = '';
	let i = 0;
	while (i < text.length) {
		const ch = text.charAt(i);
		if (keep.includes(ch)) {
			out += ch;
			i++;
			continue;
		}
		const { bytes, units } = utf8At(text, i);
		for (const b of bytes) out += `%${HEX.charAt(Math.floor(b / 16))}${HEX.charAt(b % 16)}`;
		i += units;
	}
	return out;
}

const UNRESERVED = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()";

/** String(value) of JavaScript for JSON values. */
function asText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return `${value}`;
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (Array.isArray(value)) {
		return value.map((v) => (v === null || v === undefined ? '' : asText(v))).join(',');
	}
	return '[object Object]';
}

/** toPathSegment of n8n-workflow. */
function pathSegment(id: unknown): string {
	if (id === null || id === undefined) throw new Error('Invalid identifier: a value is required');
	const value = asText(id);
	if (value === '' || value === '.' || value === '..') {
		throw new Error(`Invalid identifier: "${value}" is not allowed`);
	}
	return percentEncode(value, UNRESERVED);
}

/** quotePostgrestComponent of the v1 node: quotes a value with a character that PostgREST reserves. */
function quote(value: unknown): string {
	const raw = asText(value);
	const reserved = ',.():"&?=\\';
	let found = false;
	for (let i = 0; i < raw.length; i++) {
		if (reserved.includes(raw.charAt(i))) {
			found = true;
			break;
		}
	}
	if (!found) return raw;
	return `"${raw.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

/** getPostgrestOperator of the v1 node. */
function operator(condition: Condition): string {
	const name = asText(condition.condition);
	if (name !== 'fullText') {
		if (!['eq', 'gt', 'gte', 'ilike', 'is', 'lt', 'lte', 'like', 'neq'].includes(name)) {
			throw new Error(`Unsupported filter condition: "${name}"`);
		}
		return name;
	}
	const search = asText(condition.searchFunction);
	if (!['fts', 'plfts', 'phfts', 'wfts'].includes(search)) {
		throw new Error(`Unsupported search function: "${search}"`);
	}
	return search;
}

/** buildOrQuery of the v1 node. */
function orTerm(condition: Condition): string {
	return `${quote(condition.keyName)}.${operator(condition)}.${quote(condition.keyValue)}`;
}

/** appendFilterStringToEndpoint of the v1 node: the string filter as the query of the URL. */
function withFilterString(
	endpoint: string,
	filterString: string,
	parameters: Array<{ value?: unknown }>,
): string {
	const template = percentEncode(filterString, `${UNRESERVED};/?:@&=+$,#`);
	if (parameters.length === 0) return `${endpoint}?${template}`;
	const digits = '0123456789';
	let out = '';
	let i = 0;
	while (i < template.length) {
		const ch = template.charAt(i);
		let j = i + 1;
		while (ch === '$' && j < template.length && digits.includes(template.charAt(j))) j++;
		if (j === i + 1) {
			out += ch;
			i++;
			continue;
		}
		const index = Number(template.slice(i + 1, j));
		const position = index - 1;
		if (position < 0 || position >= parameters.length) {
			throw new Error(
				`Filters (String) references parameter $${index}, but only ${parameters.length} parameter(s) were provided`,
			);
		}
		out += percentEncode(quote(parameters[position].value), UNRESERVED);
		i = j;
	}
	return `${endpoint}?${out}`;
}

/** The record of create and update: the input item or the fields that the node defines. */
function recordOf(parameters: SupabaseParameters, item: Item): Item {
	const record: Item = {};
	if ((parameters.dataToSend ?? 'defineBelow') === 'autoMapInputData') {
		const ignore = (parameters.inputsToIgnore ?? '').split(',').map((c) => c.trim());
		for (const key of Object.keys(item)) {
			if (!ignore.includes(key)) record[key] = item[key];
		}
		return record;
	}
	for (const field of parameters.fieldsUi?.fieldValues ?? []) {
		record[asText(field.fieldId)] = field.fieldValue;
	}
	return record;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The description of the NodeApiError of v1: the `message` of a JSON error
 * body, or its `error.message`. With "continue on fail", v1 puts it into the
 * error item of `getAll` and `update`.
 */
function errorText(body: unknown, status: number): string {
	if (isRecord(body)) {
		if (typeof body.message === 'string' && body.message) return body.message;
		const inner = body.error;
		if (isRecord(inner) && typeof inner.message === 'string' && inner.message) {
			return inner.message;
		}
	}
	return `Supabase: HTTP status ${status}`;
}

/** returnJsonArray of n8n: the items of an array, or one item. */
function itemsOf(value: unknown): Item[] {
	const list: unknown[] = Array.isArray(value) ? value : [value];
	const out: Item[] = [];
	for (const entry of list) {
		if (isRecord(entry)) {
			const item: Item = {};
			for (const key of Object.keys(entry)) item[key] = entry[key];
			out.push(item);
		}
	}
	return out;
}

export default defineNode<SupabaseParameters>({
	type: 'n8n-nodes-base.supabase',
	version: 1,
	supports: {
		resource: 'row',
		operation: { row: 'create' },
		operations: {
			'row.create': [
				'authentication="secretKey"',
				'useCustomSchema',
				'schema',
				'tableId',
				'dataToSend',
				'inputsToIgnore',
				'fieldsUi',
				'fieldsUi.fieldValues',
				'batch',
			],
			'row.getAll': [
				'authentication="secretKey"',
				'useCustomSchema',
				'schema',
				'tableId',
				'returnAll',
				'limit',
				'filterType',
				'matchType',
				'filters',
				'filters.conditions',
				'filterString',
				'filterStringParameters',
				'filterStringParameters.values',
				'orderBy',
			],
			'row.get': [
				'authentication="secretKey"',
				'useCustomSchema',
				'schema',
				'tableId',
				'filters',
				'filters.conditions',
			],
			'row.update': [
				'authentication="secretKey"',
				'useCustomSchema',
				'schema',
				'tableId',
				'filterType',
				'matchType',
				'filters',
				'filters.conditions',
				'filterString',
				'filterStringParameters',
				'filterStringParameters.values',
				'dataToSend',
				'inputsToIgnore',
				'fieldsUi',
				'fieldsUi.fieldValues',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'row';
		const operation = parameters.operation ?? 'create';
		if (operation === 'create' && resource === 'row') {
			// v1 reads the table, schema and data mode of item 0, and the fields of each item.
			const inputs = items ?? [{}];
			const each = parameters.batch ?? inputs.map(() => parameters);
			const first = each[0] ?? parameters;
			if ((first.authentication ?? 'secretKey') !== 'secretKey') {
				throw new Error('Supabase: only the secret key is in the compiled library');
			}
			const records = inputs.map((item, i) =>
				recordOf({ ...(each[i] ?? first), dataToSend: first.dataToSend }, item),
			);
			const headers: Record<string, string> = { Prefer: 'return=representation' };
			if (first.useCustomSchema === true) headers['Content-Profile'] = first.schema ?? 'public';
			const response = await ctx.http<unknown>({
				method: 'POST',
				url: `{{$credentials.host}}/rest/v1/${pathSegment(first.tableId)}`,
				headers,
				qs: {},
				body: records,
				credential,
			});
			if (response.status >= 400) throw new Error(errorText(response.body, response.status));
			return itemsOf(response.body);
		}
		if (resource !== 'row' || !['getAll', 'get', 'update'].includes(operation)) {
			throw new Error(`Supabase: ${resource}.${operation} is not in the compiled library`);
		}
		if ((parameters.authentication ?? 'secretKey') !== 'secretKey') {
			throw new Error('Supabase: only the secret key is in the compiled library');
		}
		const table = pathSegment(parameters.tableId);
		const method = operation === 'update' ? 'PATCH' : 'GET';
		// getSchemaHeader of the v1 node.
		const headers: Record<string, string> = { Prefer: 'return=representation' };
		if (parameters.useCustomSchema === true) {
			const schema = parameters.schema ?? 'public';
			if (method === 'PATCH') headers['Content-Profile'] = schema;
			else headers['Accept-Profile'] = schema;
		}
		const request = async (url: string, qs: Record<string, unknown>, body: unknown) => {
			const response = await ctx.http<unknown>({
				method,
				url: `{{$credentials.host}}/rest/v1${url}`,
				headers,
				qs,
				body,
				credential,
			});
			if (response.status >= 400) throw new Error(errorText(response.body, response.status));
			return response.body;
		};
		const conditions = parameters.filters?.conditions ?? [];
		const filterType = parameters.filterType ?? 'manual';
		const matchType = parameters.matchType ?? 'anyFilter';
		const stringParameters = parameters.filterStringParameters?.values ?? [];
		const out: Item[] = [];

		for (const item of items ?? [{}]) {
			let endpoint = `/${table}`;
			const qs: Record<string, unknown> = {};
			if (operation === 'get') {
				if (conditions.length === 0) {
					throw new Error('At least one select condition must be defined');
				}
				// buildGetQuery: the last condition of a key wins.
				for (const condition of conditions) {
					qs[quote(condition.keyName)] = `eq.${asText(condition.keyValue)}`;
				}
				for (const row of itemsOf(await request(endpoint, qs, undefined))) out.push(row);
				continue;
			}
			if (filterType === 'manual') {
				if (operation === 'update' && conditions.length === 0) {
					throw new Error('At least one select condition must be defined');
				}
				if (conditions.length > 0) {
					if (matchType === 'allFilters' && operation === 'getAll') {
						qs.and = `(${conditions.map(orTerm).join(',')})`;
					} else if (matchType === 'allFilters') {
						// buildQuery: one query parameter for each key.
						for (const condition of conditions) {
							qs[quote(condition.keyName)] = `${operator(condition)}.${asText(condition.keyValue)}`;
						}
					}
					if (matchType === 'anyFilter') qs.or = `(${conditions.map(orTerm).join(',')})`;
				}
			}
			if (filterType === 'string') {
				endpoint = withFilterString(endpoint, parameters.filterString ?? '', stringParameters);
			}
			if (operation === 'update') {
				const record = recordOf(parameters, item);
				const body = Object.keys(record).length === 0 ? undefined : record;
				for (const row of itemsOf(await request(endpoint, qs, body))) out.push(row);
				continue;
			}
			// getAll: pages of up to 1000 rows until the limit or a short page.
			const limit = parameters.returnAll === true ? undefined : (parameters.limit ?? 50);
			let rows: Item[] = [];
			let length = 0;
			do {
				if (limit !== undefined) qs.limit = Math.min(limit - rows.length, 1000);
				if (parameters.orderBy) qs.order = parameters.orderBy;
				const page = await request(endpoint, { ...qs }, undefined);
				const list = Array.isArray(page) ? page : [];
				length = list.length;
				rows = rows.concat(itemsOf(list));
				qs.offset = rows.length;
			} while (length >= 1000 && (limit === undefined || rows.length < limit));
			for (const row of rows) out.push(row);
		}
		return out;
	},
});
