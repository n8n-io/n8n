/**
 * Compiled library node: a hand port of `n8n-nodes-base.airtable` versions 2.1
 * and 2.2, operations `record.create`, `record.search`, `record.update` (by
 * `id`) and `record.upsert`.
 *
 * Version 2.1 puts the fields of each found record at the top level of the
 * item. The converter sets `legacyFlattenOutput` for it.
 *
 * Without `typecast`, v1 converts the mapped values to the column schema
 * types: numbers, booleans, and null to no value. With `typecast`, it only
 * parses JSON text of array columns. The converter sends other schema types
 * (dates, arrays and objects without `typecast`) and an update that matches
 * on other columns than `id` (v1 reads the whole table first) to the host.
 *
 * Limits: resource locators in mode `url` (the v1 node extracts the id with a
 * regular expression) and attachment download are not supported.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface Locator {
	__rl?: boolean;
	mode?: string;
	value?: string;
}

interface AirtableParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	base?: string | Locator;
	table?: string | Locator;
	columns?: {
		mappingMode?: string;
		value?: Record<string, unknown> | null;
		matchingColumns?: string[];
		schema?: SchemaField[];
	};
	filterByFormula?: string;
	returnAll?: boolean;
	limit?: number;
	sort?: { property?: Array<{ field?: string; direction?: string }> };
	legacyFlattenOutput?: boolean;
	options?: {
		typecast?: boolean;
		updateAllMatches?: boolean;
		ignoreFields?: string | string[];
		fields?: string | string[];
		view?: Locator;
	};
}

interface SchemaField {
	id?: string;
	type?: string;
	required?: boolean;
}

interface AirtableList {
	records?: Item[];
	offset?: string;
}

/** The value of a resource locator. Mode `url` needs a regular expression. */
function locatorValue(value: string | Locator | undefined, name: string): string {
	if (typeof value === 'string') return value;
	if (value?.mode === 'url') {
		throw new Error(
			`Airtable: "${name}" in mode "url" is not in the compiled library. Use mode "id".`,
		);
	}
	return value?.value ?? '';
}

/** encodeURI: percent-encodes UTF-8, but keeps the reserved URI characters. */
function encodeUri(text: string): string {
	return encodeURI(text);
}

function isItem(value: unknown): value is Item {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** legacyFlattenOutput of the v1 node: the fields next to `id` and `createdTime`. */
function flatten(record: Item): Item {
	const out: Item = {};
	for (const key of Object.keys(record)) {
		if (key !== 'fields') out[key] = record[key];
	}
	const fields = record.fields;
	if (isItem(fields)) {
		for (const key of Object.keys(fields)) out[key] = fields[key];
	}
	return out;
}

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

/** tryToParseBoolean of n8n-workflow. */
function parseBoolean(value: unknown, key: string): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
		return value.toLowerCase() === 'true';
	}
	if (!(typeof value === 'string' && value.trim() === '')) {
		const n = Number(value);
		if (n === 0) return false;
		if (n === 1) return true;
	}
	throw new Error(`'${key}' expects a boolean but we got '${JSON.stringify(value)}'`);
}

/**
 * The mapped fields of `columns.value`, as getNodeParameter gives them: with
 * `typecast`, array columns parse JSON text (coerceArrayTypeFields); without
 * it, values convert to the schema types (validateResourceMapperValue).
 * `add` is true for create, where v1 also checks required columns.
 */
function mappedFields(parameters: AirtableParameters, typecast: boolean, add: boolean): Item {
	const value = parameters.columns?.value;
	const fields: Item = {};
	if (!isItem(value)) return fields;
	for (const key of Object.keys(value)) fields[key] = value[key];
	const schema = parameters.columns?.schema ?? [];
	if (typecast) {
		for (const column of schema) {
			if (column.type !== 'array' || column.id === undefined) continue;
			const text = fields[column.id];
			if (typeof text !== 'string') continue;
			let parsed: unknown;
			try {
				parsed = JSON.parse(text);
			} catch {
				continue;
			}
			if (Array.isArray(parsed)) fields[column.id] = parsed;
		}
		return fields;
	}
	for (const key of Object.keys(fields)) {
		const column = schema.find((c) => c.id === key);
		if (!column?.type) continue;
		const raw = fields[key];
		if (add && column.required === true && column.type !== 'boolean' && (raw ?? null) === null) {
			throw new Error(`The value "${key}" is required but not set`);
		}
		// validateFieldType gives no value for null and undefined.
		if (raw === null || raw === undefined) {
			fields[key] = undefined;
			continue;
		}
		if (column.type === 'number') {
			const n = Number(raw);
			if (isNaN(n))
				throw new Error(`'${key}' expects a number but we got '${JSON.stringify(raw)}'`);
			fields[key] = n;
		} else if (column.type === 'boolean') {
			fields[key] = parseBoolean(raw, key);
		}
	}
	return fields;
}

/** The description of an Airtable error body (NodeApiError of v1). */
function errorText(body: unknown): string {
	if (isItem(body)) {
		if (typeof body.message === 'string') return body.message;
		const inner = body.error;
		if (isItem(inner) && typeof inner.message === 'string') return inner.message;
	}
	return '';
}

/** removeIgnored of the v1 node. */
function removeIgnored(data: Item, ignore: string | string[] | undefined): Item {
	if (!ignore) return data;
	const fields = typeof ignore === 'string' ? ignore.split(',').map((f) => f.trim()) : ignore;
	const out: Item = {};
	for (const key of Object.keys(data)) {
		if (!fields.includes(key)) out[key] = data[key];
	}
	return out;
}

export default defineNode<AirtableParameters>({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	supports: {
		resource: 'record',
		operation: { record: 'get' },
		operations: {
			'record.create': [
				'authentication',
				'base',
				'table',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'options',
				'options.typecast',
				'options.ignoreFields',
				'columns.schema',
				'columns.matchingColumns',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'legacyFlattenOutput',
			],
			'record.update': [
				'authentication',
				'base',
				'table',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.schema',
				'columns.matchingColumns',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'options',
				'options.typecast',
				'options.ignoreFields',
				'legacyFlattenOutput',
			],
			'record.upsert': [
				'authentication',
				'base',
				'table',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.schema',
				'columns.matchingColumns',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'options',
				'options.typecast',
				'options.ignoreFields',
				'options.updateAllMatches',
				'legacyFlattenOutput',
			],
			'record.search': [
				'authentication',
				'base',
				'table',
				'filterByFormula',
				'returnAll',
				'limit',
				'sort',
				'options',
				'options.fields',
				'options.view',
				'legacyFlattenOutput',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'record';
		const operation = parameters.operation ?? 'get';
		const base = locatorValue(parameters.base, 'base');
		const table = encodeUri(locatorValue(parameters.table, 'table'));
		const url = `https://api.airtable.com/v0/${base}/${table}`;
		const options = parameters.options ?? {};
		const out: Item[] = [];

		if (resource === 'record' && operation === 'create') {
			const mode = parameters.columns?.mappingMode ?? 'defineBelow';
			// One request for each input item, as the v1 node does.
			for (const item of items ?? [{}]) {
				const body: Record<string, unknown> = { typecast: Boolean(options.typecast) };
				if (mode === 'autoMapInputData') body.fields = removeIgnored(item, options.ignoreFields);
				if (mode === 'defineBelow') {
					body.fields = mappedFields(parameters, Boolean(options.typecast), true);
				}
				const response = await ctx.http<Item>({
					method: 'POST',
					url,
					headers: {},
					qs: {},
					body,
					credential,
					// v1's apiRequest: request helpers without `useQuerystring`.
					qsFormat: 'brackets',
				});
				if (response.status >= 400) throw new Error(`Airtable: HTTP status ${response.status}`);
				out.push(response.body);
			}
			return out;
		}

		if (resource === 'record' && (operation === 'update' || operation === 'upsert')) {
			const mode = parameters.columns?.mappingMode ?? 'defineBelow';
			const matchOn = parameters.columns?.matchingColumns ?? [];
			const byId = matchOn.includes('id');
			if (operation === 'update' && !byId) {
				throw new Error(
					'Airtable: update by other columns than "id" is not in the compiled library',
				);
			}
			const typecast = Boolean(options.typecast);
			const patch = async (body: Record<string, unknown>) =>
				await ctx.http<AirtableList>({
					method: 'PATCH',
					url,
					headers: {},
					qs: {},
					body,
					credential,
					// v1's apiRequest: request helpers without `useQuerystring`.
					qsFormat: 'brackets',
				});
			for (const item of items ?? [{}]) {
				let id: unknown;
				let fields: Item = {};
				if (mode === 'autoMapInputData') {
					const data: Item = {};
					for (const key of Object.keys(item)) {
						if (byId && key === 'id') id = item[key];
						else data[key] = item[key];
					}
					fields = removeIgnored(data, options.ignoreFields);
				} else if (mode === 'defineBelow') {
					const mapped = mappedFields(parameters, typecast, false);
					for (const key of Object.keys(mapped)) {
						if (byId && key === 'id') id = mapped[key];
						else fields[key] = mapped[key];
					}
				}
				const records: Item[] = [];
				if (mode === 'autoMapInputData' || mode === 'defineBelow') {
					records.push(byId ? { id, fields } : { fields });
				}
				const body: Record<string, unknown> = { typecast };
				if (!byId) body.performUpsert = { fieldsToMergeOn: matchOn };
				// batchUpdate of the v1 node: no request without records.
				let found: Item[] = [];
				if (records.length > 0) {
					const response = await patch({ ...body, records });
					const text = errorText(response.body);
					if (response.status === 422 && byId && operation === 'upsert') {
						// The record id does not exist: v1 creates the record.
						const created = await ctx.http<AirtableList>({
							method: 'POST',
							url,
							headers: {},
							qs: {},
							body: { ...body, records: records.map((r) => ({ fields: r.fields })) },
							credential,
							// v1's apiRequest: request helpers without `useQuerystring`.
							qsFormat: 'brackets',
						});
						if (created.status >= 400) {
							throw new Error(`Airtable: HTTP status ${created.status}`);
						}
						found = created.body.records ?? [];
					} else if (
						response.status >= 400 &&
						operation === 'upsert' &&
						text.includes('Cannot update more than one record')
					) {
						// Several records match: v1 finds them and updates the first one or all.
						const conditions = matchOn
							.map((column) => `{${column}} = '${asText(fields[column])}'`)
							.join(',');
						const matches: Item[] = [];
						const query: Record<string, unknown> = {
							fields: matchOn,
							filterByFormula: `AND(${conditions})`,
							pageSize: 100,
						};
						for (;;) {
							const page = await ctx.http<AirtableList>({
								method: 'GET',
								url,
								headers: {},
								qs: { ...query },
								body: undefined,
								credential,
								// v1's apiRequest: request helpers without `useQuerystring`.
								qsFormat: 'brackets',
							});
							if (page.status >= 400) throw new Error(`Airtable: HTTP status ${page.status}`);
							for (const record of page.body.records ?? []) matches.push(record);
							if (page.body.offset === undefined) break;
							query.offset = page.body.offset;
						}
						const targets = options.updateAllMatches === true ? matches : matches.slice(0, 1);
						const update = targets.map((m) => ({ id: m.id, fields }));
						for (let k = 0; k < update.length; k += 10) {
							const batch = await patch({ ...body, records: update.slice(k, k + 10) });
							if (batch.status >= 400) throw new Error(`Airtable: HTTP status ${batch.status}`);
							for (const record of batch.body.records ?? []) found.push(record);
						}
					} else if (response.status >= 400) {
						throw new Error(text || `Airtable: HTTP status ${response.status}`);
					} else {
						found = response.body.records ?? [];
					}
				}
				for (const record of found) out.push(record);
			}
			return out;
		}

		if (resource === 'record' && operation === 'search') {
			const qs: Record<string, unknown> = {};
			if (parameters.filterByFormula) qs.filterByFormula = parameters.filterByFormula;
			if (options.fields) {
				qs.fields =
					typeof options.fields === 'string'
						? options.fields.split(',').map((f) => f.trim())
						: options.fields;
			}
			const sort = parameters.sort?.property;
			if (sort) {
				qs.sort = sort.map((rule) => ({
					field: rule.field ?? '',
					direction: rule.direction ?? 'asc',
				}));
			}
			if (options.view) qs.view = options.view.value;
			const returnAll = parameters.returnAll ?? true;
			if (returnAll) qs.pageSize = 100;
			else qs.maxRecords = parameters.limit ?? 100;
			// Version 2.1 and later search once for each input item.
			for (const _item of items ?? [{}]) {
				const query: Record<string, unknown> = { ...qs };
				// apiRequestAllItems of the v1 node: pages of 100 until there is no offset.
				for (;;) {
					const response = await ctx.http<AirtableList>({
						method: 'GET',
						url,
						headers: {},
						qs: { ...query },
						body: undefined,
						credential,
						// v1's apiRequest: request helpers without `useQuerystring`.
						qsFormat: 'brackets',
					});
					if (response.status >= 400) throw new Error(`Airtable: HTTP status ${response.status}`);
					for (const record of response.body.records ?? []) {
						out.push(parameters.legacyFlattenOutput === true ? flatten(record) : record);
					}
					if (!returnAll || response.body.offset === undefined) break;
					query.offset = response.body.offset;
				}
			}
			return out;
		}

		throw new Error(`Airtable: ${resource}.${operation} is not in the compiled library`);
	},
});
