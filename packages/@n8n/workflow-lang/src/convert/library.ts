/**
 * Nodes of the compiled node library (`src/nodes/`). Every `ctx.node` call
 * with a library type links to the library at compile time, unless the call
 * has `host: 'fallback'`.
 *
 * HTTP Request has its own parameter mapping, because the library node takes
 * simplified parameters (`method`, `url`, `headers`, `qs`, `body`). The other
 * library nodes get their v1 parameters, with resource locators flattened to
 * their value.
 */
import { NOT_INJECTABLE } from '../credentials/not-injectable.generated.ts';
import ts from 'typescript';

import { findNodeDefinition, getProperty, stringLiteralValue } from '../compiler/analysis.ts';
import type { Support } from '../library/check.ts';
import { operationKey, readSupport, splitAccepts } from '../library/check.ts';
import { NODE_SOURCES } from '../generated/sources.generated.ts';
import type { Code } from './code.ts';
import { literal, raw, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import type { TranslatedValue, Usage } from './expression.ts';
import { constantText, emptyUsage, INDEX, ITEM, jsonLiteral } from './expression.ts';
import { nativeCluster, VENDOR_NODES } from './ai-cluster.ts';
import {
	clusterMembers,
	isClusterRoot,
	LANGCHAIN_PREFIX,
	lowerAiNode,
	lowerHostNode,
} from './host-node.ts';
import { googleMint } from '../node-compile/specialise.ts';
import type { Paging } from './http-pagination.ts';
import { emitPaging, readPaging } from './http-pagination.ts';
import { getNodeParameters, hideParameters, nodeDescription } from './node-parameters.ts';
import type { StepCall } from './steps.ts';
import {
	emitStep,
	emitWithHostForm,
	errorRetry,
	hostFormOf,
	nodeCall,
	tryCompiledNode,
} from './steps.ts';
import { isRecord, sourceNode, text } from './types.ts';

let libraryTypes: Set<string> | undefined;

/** The node types of the compiled library, read from its sources. */
export function libraryNodeTypes(): Set<string> {
	if (libraryTypes) return libraryTypes;
	libraryTypes = new Set();
	for (const [file, text] of Object.entries(NODE_SOURCES)) {
		const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
		const def = findNodeDefinition(sf);
		const type = def ? stringLiteralValue(getProperty(def.options, 'type')?.initializer) : null;
		if (type) libraryTypes.add(type);
	}
	return libraryTypes;
}

/** The `queryString` of a Drive search as the library node reads it (see the adapter). */
function driveQuery(p: Record<string, unknown>): Record<string, unknown> {
	if ((p.resource ?? 'file') !== 'fileFolder') return p;
	if (p.queryString === undefined) return { ...p, queryString: '' };
	const whole =
		typeof p.queryString === 'string' ? /^=\{\{([\s\S]*)\}\}\s*$/.exec(p.queryString) : null;
	if (whole && !whole[1].includes('}}')) {
		return { ...p, queryString: `={{ String(${whole[1].trim()}) }}` };
	}
	return p;
}

/**
 * Parameter adapters from v1 parameters to the parameters of a library node.
 * The second argument is the node version.
 */
type Adapter = (
	p: Record<string, unknown>,
	version: number,
	node?: { onError?: string },
) => Record<string, unknown>;

export const ADAPTERS: Record<string, Adapter> = {
	...Object.fromEntries(
		Object.entries(VENDOR_NODES).map(([type, vendor]): [string, Adapter] => [
			type,
			(p, version, node) => vendor.adapt(p, version, node?.onError),
		]),
	),
	// v1 reads `queryString` with `String(value)`: an expression that gives no value searches
	// for "undefined". The library node cannot tell that from a missing parameter, so the
	// converter writes the default of a missing one.
	// An expression that gives null searches for "null" in v1; the library node reads a null
	// value as the default of a missing parameter, so the expression gives the text itself.
	// A file in mode `url`: v1 reads its id with a regular expression, so the call runs in
	// the host (`fileUrl` is not in the `supports` list).
	'n8n-nodes-base.googleDrive': (p) => {
		const out = driveQuery(p);
		return isRecord(p.fileId) && p.fileId.mode === 'url' ? { ...out, fileUrl: true } : out;
	},
	// Versions 2 to 2.2 use the older database API (`apiV2`). The marker `notionHost` is not
	// in the `supports` list, so these calls run in the host: version 1, dates (v1 formats them
	// with moment-timezone), formatted rich text, formula filters, block builders, and
	// locators in mode `url`.
	'n8n-nodes-base.notion': (p, version) => {
		if (version >= 3) return p;
		const out: Record<string, unknown> = { ...p, apiV2: true };
		const host = () => {
			out.notionHost = true;
		};
		if (version < 2) host();
		const ui = isRecord(p.propertiesUi) ? p.propertiesUi.propertyValues : undefined;
		for (const value of Array.isArray(ui) ? ui.filter(isRecord) : []) {
			const key = typeof value.key === 'string' ? value.key : '';
			const type = key.slice(key.lastIndexOf('|') + 1);
			if (type === 'date' || (type === 'rich_text' && value.richText !== false)) host();
		}
		const conditions = isRecord(p.filters) ? p.filters.conditions : undefined;
		for (const c of Array.isArray(conditions) ? conditions.filter(isRecord) : []) {
			const key = typeof c.key === 'string' ? c.key : '';
			const type = key.slice(key.lastIndexOf('|') + 1);
			const empty = c.condition === 'is_empty' || c.condition === 'is_not_empty';
			if (c.type === 'formula' || (type === 'date' && !empty)) host();
		}
		const blocks = isRecord(p.blockUi) ? p.blockUi.blockValues : undefined;
		if (Array.isArray(blocks) && blocks.length > 0) host();
		for (const name of ['databaseId', 'pageId']) {
			const locator = p[name];
			if (isRecord(locator) && locator.mode === 'url') host();
			if (name === 'pageId' && isRecord(locator) && locator.mode !== 'id') host();
		}
		return out;
	},
	// Before version 2.2, search puts the fields of each record at the top level of the item.
	// The markers `schemaTypes` and `matchOnColumns` are not in the `supports` list, so these
	// calls run in the host: v1 converts dates, arrays and objects to the schema types without
	// `typecast`, and an update that matches on other columns than `id` reads the table first.
	'n8n-nodes-base.airtable': (p, version) => {
		const out: Record<string, unknown> =
			version < 2.2 ? { ...p, legacyFlattenOutput: true } : { ...p };
		const columns = isRecord(p.columns) ? p.columns : {};
		const options = isRecord(p.options) ? p.options : {};
		const value = isRecord(columns.value) ? columns.value : {};
		const schema = Array.isArray(columns.schema) ? columns.schema.filter(isRecord) : [];
		const plain = ['string', 'number', 'boolean', 'options'];
		const typed =
			options.typecast !== true &&
			(columns.mappingMode ?? 'defineBelow') === 'defineBelow' &&
			Object.keys(value).some((key) => {
				const type = schema.find((f) => f.id === key)?.type;
				return typeof type === 'string' && !plain.includes(type);
			});
		if (typed) out.schemaTypes = true;
		const match = Array.isArray(columns.matchingColumns) ? columns.matchingColumns : [];
		if (p.operation === 'update' && !match.includes('id')) out.matchOnColumns = true;
		return out;
	},
	// The row filters of `sheet.read` changed in versions 4.3, 4.5 and 4.6 (lookupValues of v1).
	// Before version 4.2, a read runs once for all items: `legacyRead` is not supported, so
	// that read runs in the host.
	// An update with automatic mapping, or without a value for the column to match on (v1
	// fails at once), runs in the host (`sheetsHost` is not in the `supports` list).
	'n8n-nodes-base.googleSheets': (p, version) => {
		if ((p.resource ?? 'sheet') === 'sheet' && p.operation === 'update') {
			const columns = isRecord(p.columns) ? p.columns : {};
			const value = isRecord(columns.value) ? columns.value : {};
			const match = Array.isArray(columns.matchingColumns) ? columns.matchingColumns : [];
			const auto = (columns.mappingMode ?? 'defineBelow') !== 'defineBelow';
			const key = match[0];
			const missing = typeof key === 'string' && key !== 'row_number' && !(key in value);
			return auto || missing ? { ...p, sheetsHost: true } : p;
		}
		// Append checks the columns of the sheet from version 4.4 (checkForSchemaChanges),
		// and sends the cells as RAW before version 4.1 (cellFormatDefault).
		if ((p.resource ?? 'sheet') === 'sheet' && p.operation === 'append') {
			const out: Record<string, unknown> = version >= 4.4 ? { ...p, schemaCheck: true } : { ...p };
			if (version < 4.1) out.legacyCellFormat = true;
			return out;
		}
		// Append or update: before version 4.1 the cell format default is RAW, and before
		// version 4 the parameters differ, so those versions run in the host.
		if ((p.resource ?? 'sheet') === 'sheet' && p.operation === 'appendOrUpdate') {
			if (version < 4.1) return { ...p, sheetsHost: true };
			return version >= 4.4 ? { ...p, schemaCheck: true } : p;
		}
		if ((p.resource ?? 'sheet') !== 'sheet' || (p.operation ?? 'read') !== 'read') return p;
		return version < 4.2 ? { ...p, legacyRead: true } : { ...p, readVersion: version };
	},
	// The message ends with a link to the workflow when `includeLinkToWorkflow` is true (the
	// default from version 2.1): the marker `needsWorkflowLink` asks `lowerLibrary` for the link
	// parts. The markers are not in the `supports` list, so a call keeps them and runs in the
	// host when the link parts are not known, the option is an expression, or v1 reads the id
	// of a channel URL with a regular expression (`channelUrl`).
	// A message ends with a link to the workflow unless `includeLinkToWorkflow` is false: the
	// marker `needsWorkflowLink` asks `lowerLibrary` for the link parts. The markers are not in
	// the `supports` list, so these calls run in the host: the link parts are not known, the
	// option is an expression, or v1 reads the id of a team URL with a regular expression. An
	// empty `mentions` value is the same as none.
	'n8n-nodes-base.microsoftTeams': (p, version) => {
		if (version < 2) return p;
		const out: Record<string, unknown> = { ...p };
		const options = isRecord(p.options) ? p.options : {};
		const message =
			(p.resource === 'chatMessage' || p.resource === 'channelMessage') &&
			(p.operation === undefined || p.operation === 'create' || p.operation === 'reply');
		const link = options.includeLinkToWorkflow ?? true;
		if (message && link !== true && link !== false) out.linkExpression = true;
		if (message && link === true) out.needsWorkflowLink = true;
		if (isRecord(p.teamId) && p.teamId.mode === 'url') out.teamUrl = true;
		const mentions = isRecord(p.mentions) ? p.mentions.mention : p.mentions;
		const none = mentions === undefined || (Array.isArray(mentions) && mentions.length === 0);
		if (isRecord(p.mentions) && none) delete out.mentions;
		return out;
	},
	// A message that the node writes gets the index of the item for v1's error messages. From
	// version 2.2 a reply goes to the `Reply-To` address of the message when it has one.
	'n8n-nodes-base.gmail': (p, version) => {
		const resource = p.resource ?? 'message';
		const operation = p.operation ?? 'send';
		const written =
			(resource === 'message' && (operation === 'send' || operation === 'reply')) ||
			(resource === 'thread' && operation === 'reply') ||
			(resource === 'draft' && operation === 'create');
		if (!written || version < 2) return p;
		if (operation !== 'reply') return { ...p, itemIndex: '={{ $itemIndex }}' };
		return {
			...p,
			itemIndex: '={{ $itemIndex }}',
			...(version >= 2.2 ? { replyToHeader: true } : {}),
		};
	},
	// v1 reads the id of a folder URL with a regular expression: such a call runs in the host
	// (the marker `folderUrl` is not in the `supports` list).
	'n8n-nodes-base.microsoftOutlook': (p) =>
		isRecord(p.folderId) && p.folderId.mode === 'url' ? { ...p, folderUrl: true } : p,
	'n8n-nodes-base.slack': (p, version) => {
		const out: Record<string, unknown> = { ...p };
		const other = isRecord(p.otherOptions) ? p.otherOptions : {};
		// Only a posted message has the link (`message.post` is the default operation).
		const post = (p.resource ?? 'message') === 'message' && (p.operation ?? 'post') === 'post';
		const link = other.includeLinkToWorkflow ?? version >= 2.1;
		if (post && link !== true && link !== false) out.linkExpression = true;
		if (post && link === true) out.needsWorkflowLink = true;
		if (isRecord(p.channelId) && p.channelId.mode === 'url') out.channelUrl = true;
		if (p.resource === 'channel' && p.operation === 'history' && version >= 2.4) {
			out.sortHistory = true;
		}
		return out;
	},
	// The library node gets the index of the item for v1's error messages (`itemIndex`). These
	// calls run in the host, with markers that are not in the `supports` list: the `table`
	// resource, and a `defineBelow` mapping without values (v1 fails on `Object.entries(null)`).
	// The converter parses a mapped `dateTime` field as v1 does (`datedColumns`).
	'n8n-nodes-base.dataTable': (p) => {
		const out: Record<string, unknown> = { ...p, itemIndex: '={{ $itemIndex }}' };
		const operation = p.operation ?? 'insert';
		if ((p.resource ?? 'row') !== 'row') out.dataTableHost = true;
		if (typeof operation === 'string' && ['insert', 'update', 'upsert'].includes(operation)) {
			const columns = isRecord(p.columns) ? p.columns : {};
			const auto = columns.mappingMode === 'autoMapInputData';
			if (!auto && !isRecord(columns.value)) out.dataTableHost = true;
		}
		return out;
	},
	// The library node gets the node version, and the parts of the raw text of the query
	// parameters of `executeQuery`: v1 reads that raw text and evaluates each `{{ }}` of it
	// (`executeQuery.operation.ts`). A raw value that the library node cannot read gets a
	// marker that is not in the `supports` list, so the node runs in the host.
	//
	// A query that is not an expression can hold `{{ }}` parts, which v1 evaluates for each
	// item: the library node gets their values in `queryParts`.
	//
	// `insert`, `update` and `upsert`: the library node gets the mapping with only the fields
	// of the resource mapper that v1 casts (`postgresColumns`).
	//
	// With `replaceEmptyStrings`, v1 writes null into the empty strings of the input items
	// before it evaluates the parameters of each item. So an expression of the node can give
	// another value than it gives on the input items, and the node runs in the host.
	'n8n-nodes-base.postgres': (p, version) => {
		const out: Record<string, unknown> = { ...p, nodeVersion: version };
		const options = isRecord(p.options) ? p.options : {};
		const replace = options.replaceEmptyStrings ?? false;
		if (replace !== false && (replace !== true || hasExpression(p))) {
			return { ...out, postgresHost: true };
		}
		const operation = p.operation ?? 'insert';
		if (operation === 'insert' || operation === 'update' || operation === 'upsert') {
			const columns = postgresColumns(p.columns);
			return columns ? { ...out, columns } : { ...out, postgresHost: true };
		}
		if (operation !== 'executeQuery') return out;
		// The query takes no expression (`noDataExpression`): n8n removes its `=` when it loads
		// the workflow, and the v1 node evaluates each `{{ }}` part of the text itself.
		const stored = p.query;
		let query = stored;
		if (typeof stored === 'string' && stored.startsWith('=')) {
			const stripped = stored.slice(1);
			// n8n keeps the `=` of a `$fromAI` call, and a second `=` makes an expression again.
			if (stripped.startsWith('=') || stripped.includes('$fromAI')) {
				return { ...out, postgresHost: true };
			}
			out.query = stripped;
			query = stripped;
		}
		if (typeof query === 'string') {
			const parts = query.match(/({{[\s\S]*?}})/g) ?? [];
			if (parts.length > 0) out.queryParts = parts.map((r) => `=${r}`);
		}
		const given = options.queryReplacement;
		const replacement: Record<string, unknown> = { present: 'queryReplacement' in options };
		out.replacement = replacement;
		if (given === undefined || given === '') return out;
		if (typeof given !== 'string') return { ...out, postgresHost: true };
		const rawValues = given.replace(/^=+/, '');
		const resolvables = rawValues.match(/({{[\s\S]*?}})/g) ?? [];
		replacement.raw = true;
		if (version < 2.5) {
			// Before version 2.5, v1 splits the raw text at each comma first. An entry is text,
			// or v1 evaluates each `{{ }}` of it.
			const entries = rawValues
				.split(',')
				.filter((entry) => entry)
				.map((entry) => entry.trim());
			const legacy = entries.map((entry) => {
				const found = entry.match(/({{[\s\S]*?}})/g) ?? [];
				return found.length > 0 ? { parts: found.map((r) => `=${r}`) } : { text: entry };
			});
			if (legacy.some((entry) => entry.text?.startsWith('='))) {
				return { ...out, postgresHost: true };
			}
			replacement.legacy = legacy;
			return out;
		}
		if (resolvables.length > 0) {
			replacement.parts = resolvables.map((r) => `=${r}`);
			return out;
		}
		const texts = rawValues
			.split(',')
			.filter((entry) => entry)
			.map((entry) => entry.trim());
		if (texts.some((entry) => entry.startsWith('='))) return { ...out, postgresHost: true };
		replacement.texts = texts;
		return out;
	},
	// The MySQL library node (spec 9.11) gets the node version, the values of the `{{ }}`
	// parts of the query text in `queryParts`, and the entries of the raw text of the query
	// parameters, as v1 reads them (`resolveQueryReplacementSegments`): the raw text of an
	// expression is split at each comma outside a `{{ }}`, and v1 evaluates each `{{ }}` of an
	// entry. A value that the library node cannot read gets a marker that is not in the
	// `supports` list, so the node runs in the host.
	//
	// With `replaceEmptyStrings`, v1 writes null into the empty strings of the input items
	// before it evaluates the parameters of each item, so a node with an expression runs in
	// the host.
	'n8n-nodes-base.mySql': (p, version) => {
		const out: Record<string, unknown> = { ...p, nodeVersion: version };
		const options = isRecord(p.options) ? p.options : {};
		const replace = options.replaceEmptyStrings ?? false;
		if (replace !== false && (replace !== true || hasExpression(p))) {
			return { ...out, mysqlHost: true };
		}
		if ((p.operation ?? 'insert') !== 'executeQuery') return out;
		// The query takes no expression (`noDataExpression`): n8n removes its `=` when it loads
		// the workflow, and the v1 node evaluates each `{{ }}` part of the text itself.
		const stored = p.query;
		let query = stored;
		if (typeof stored === 'string' && stored.startsWith('=')) {
			const stripped = stored.slice(1);
			// n8n keeps the `=` of a `$fromAI` call, and a second `=` makes an expression again.
			if (stripped.startsWith('=') || stripped.includes('$fromAI')) {
				return { ...out, mysqlHost: true };
			}
			out.query = stripped;
			query = stripped;
		}
		if (typeof query === 'string') {
			const parts = query.match(/({{[\s\S]*?}})/g) ?? [];
			if (parts.length > 0) out.queryParts = parts.map((r) => `=${r}`);
		}
		const given = options.queryReplacement;
		const replacement: Record<string, unknown> = { present: 'queryReplacement' in options };
		out.replacement = replacement;
		if (given === undefined || given === '') return out;
		if (typeof given !== 'string') return { ...out, mysqlHost: true };
		// A raw text that is not an expression: v1 splits the text at each comma.
		if (!given.startsWith('=')) return out;
		const segments = mysqlSegments(given);
		if (segments === null) return { ...out, mysqlHost: true };
		replacement.segments = segments;
		return out;
	},
};

/**
 * The entries of the raw text of the MySQL query parameters (`splitRawSqlQueryParameters` of
 * n8n): the text between the commas that are not in a `{{ }}`. An entry is text, one `{{ }}`
 * (`one`), or text with `{{ }}` parts (`sources` and their `values`). Null: an entry would
 * be read as an expression, so the node runs in the host.
 */
function mysqlSegments(raw: string): Array<Record<string, unknown>> | null {
	const text = raw.replace(/^=+/, '');
	if (text === '') return [];
	const spans: Array<[number, number]> = [];
	let from = 0;
	for (const resolvable of text.match(/({{[\s\S]*?}})/g) ?? []) {
		const start = text.indexOf(resolvable, from);
		if (start === -1) continue;
		spans.push([start, start + resolvable.length]);
		from = start + resolvable.length;
	}
	const inside = (index: number) => spans.some(([start, end]) => index >= start && index < end);
	const entries: string[] = [];
	let entryStart = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === ',' && !inside(i)) {
			entries.push(text.slice(entryStart, i));
			entryStart = i + 1;
		}
	}
	entries.push(text.slice(entryStart));
	const segments: Array<Record<string, unknown>> = [];
	for (const entry of entries.map((e) => e.trim())) {
		const sources = entry.match(/({{[\s\S]*?}})/g) ?? [];
		if (sources.length === 1 && sources[0] === entry) segments.push({ one: `=${entry}` });
		else if (entry.startsWith('=')) return null;
		else if (sources.length === 0) segments.push({ text: entry });
		else segments.push({ text: entry, sources, values: sources.map((r) => `=${r}`) });
	}
	return segments;
}

/** True when a parameter value holds an expression that n8n or the Postgres node evaluates. */
function hasExpression(value: unknown): boolean {
	if (typeof value === 'string') return value.startsWith('=') || /{{[\s\S]*?}}/.test(value);
	if (Array.isArray(value)) return value.some(hasExpression);
	return isRecord(value) && Object.values(value).some(hasExpression);
}

/**
 * The `columns` parameter of a Postgres write for the library node: the mapping mode, the
 * values, the columns to match on, and the fields of the resource mapper that n8n casts
 * (`validateResourceMapperValue`): for each field with a value, its type, `required` and
 * the values of its options. Without `schema`, n8n does not cast, and the result has no
 * `schema`. Null: v1 fails on the stored fields, so the node runs in the host.
 */
function postgresColumns(columns: unknown): Record<string, unknown> | null {
	if (!isRecord(columns)) return null;
	const out: Record<string, unknown> = { mappingMode: columns.mappingMode, value: columns.value };
	if ('matchingColumns' in columns) out.matchingColumns = columns.matchingColumns;
	const mapper = 'mappingMode' in columns && 'schema' in columns && 'value' in columns;
	if (!mapper || !Array.isArray(columns.schema)) return out;
	const value = columns.value;
	const fields: Array<Record<string, unknown>> = [];
	const seen = new Set<unknown>();
	for (const field of columns.schema) {
		if (!isRecord(field)) return null;
		if (seen.has(field.id)) continue;
		seen.add(field.id);
		if (typeof field.id !== 'string' || (isRecord(value) && !(field.id in value))) continue;
		if (field.type !== undefined && field.type !== null && typeof field.type !== 'string') {
			return null;
		}
		const kept: Record<string, unknown> = { id: field.id, type: field.type ?? '' };
		if (field.required === true) kept.required = true;
		if (typeof field.type === 'string' && field.type.toLowerCase() === 'options') {
			const options = Array.isArray(field.options) ? field.options : [];
			kept.options = options.filter(isRecord).map((option) => option.value ?? null);
		}
		fields.push(kept);
	}
	out.schema = fields;
	return out;
}

/**
 * Library nodes whose parameters here have the places of the v1 parameters, and whose v1 node
 * reads each collection as a whole: v1 gives the node the text of a Luxon DateTime that is a
 * member of a collection or of a list (`cleanupParameterData`), so an expression that gives a
 * DateTime there translates to its text. A DateTime that is a whole parameter stays one in
 * v1, and has no translation.
 */
const NESTED_DATES = new Set([
	'n8n-nodes-base.googleSheets',
	'n8n-nodes-base.googleCalendar',
	'n8n-nodes-base.supabase',
]);

/**
 * The mapped fields of a Data Table node that have the type `dateTime`: v1 parses each one
 * with Luxon in the time zone of the workflow (`tryToParseDateTime`) and gives the service
 * the date.
 */
function datedColumns(p: Record<string, unknown>): string[] {
	const operation = p.operation ?? 'insert';
	if (typeof operation !== 'string' || !['insert', 'update', 'upsert'].includes(operation)) {
		return [];
	}
	const columns = isRecord(p.columns) ? p.columns : {};
	if (columns.mappingMode === 'autoMapInputData' || !isRecord(columns.value)) return [];
	const value = columns.value;
	const schema = Array.isArray(columns.schema) ? columns.schema.filter(isRecord) : [];
	return schema
		.filter((f) => f.type === 'dateTime' && typeof f.id === 'string' && f.id in value)
		.map((f) => String(f.id));
}

/** Wraps the code of each dated field of `columns.value` in the helper `tableDate`. */
function parseDatedColumns(c: NodeContext, parameters: Code, fields: string[]): void {
	if (fields.length === 0 || parameters.kind !== 'object') return;
	const columns = parameters.entries.find(([k]) => k === 'columns')?.[1];
	const value =
		columns?.kind === 'object' ? columns.entries.find(([k]) => k === 'value')?.[1] : undefined;
	if (value?.kind !== 'object') return;
	const zone = c.scope.timezone ?? 'UTC';
	if (zone !== 'UTC') c.scope.useZone?.(zone);
	c.helper('tableDate');
	value.entries = value.entries.map(([k, code]): [string, Code] =>
		fields.includes(k) ? [k, raw(`tableDate(${flatCode(code)}, ${str(zone)})`)] : [k, code],
	);
}

/**
 * True when v1 inserts the rows of all items with one call: the table id is not an
 * expression (`hasComplexId` of the v1 router reads the raw parameter text).
 */
function dataTableBulk(p: Record<string, unknown>): boolean {
	const locator = p.dataTableId;
	const value = isRecord(locator) ? locator.value : locator;
	return !(typeof value === 'string' && value.includes('{'));
}

/**
 * Library nodes that read resource locators (`{ __rl, mode, value }`) themselves:
 * the mode matters (a Sheets tab by name or by id), so the converter keeps them.
 */
const LOCATOR_TYPES = new Set([
	'n8n-nodes-base.googleSheets',
	'n8n-nodes-base.airtable',
	'n8n-nodes-base.notion',
	'n8n-nodes-base.slack',
	'n8n-nodes-base.googleDrive',
	'n8n-nodes-base.dataTable',
	'n8n-nodes-base.microsoftTeams',
	'@n8n/n8n-nodes-langchain.openAi',
	'@n8n/n8n-nodes-langchain.anthropic',
	'@n8n/n8n-nodes-langchain.googleGemini',
]);

/**
 * Library nodes whose v1 node pairs each output item, and the error item, with the input item
 * of its run (`constructExecutionMetaData` with `itemData: { item: i }`).
 */
const PAIRS_BY_CALL = new Set(['n8n-nodes-base.microsoftTeams']);

/** The oldest version of a node type that its library node runs; older ones run in the host. */
export const MIN_VERSIONS: Record<string, number> = {
	// Version 2.0 searches once for all input items.
	'n8n-nodes-base.airtable': 2.1,
	// Version 1.3 changed the recurring events and the dates of `event.getAll`.
	'n8n-nodes-base.googleCalendar': 1.3,
	// Version 3 is the node with the `fileFolder` resource.
	'n8n-nodes-base.googleDrive': 3,
	// Version 2 is the node with Microsoft Graph operations in `actions/`.
	'n8n-nodes-base.microsoftOutlook': 2,
	// Version 2 is the node on the shared Microsoft Graph transport; the node compiler takes
	// versions 1 and 1.1.
	'n8n-nodes-base.microsoftTeams': 2,
	// Version 2 is the node with the operations in `actions/`; version 1 is another node.
	'n8n-nodes-base.mySql': 2,
	// Version 2.1 gave the node its own readers for time columns.
	'n8n-nodes-base.postgres': 2.1,
	// 1.2 has the relaxed Accept header; version 1 reads the feed once for all items.
	'n8n-nodes-base.rssFeedRead': 1.2,
};

/**
 * Operations that v1 runs once for all input items (one request for all
 * items). The library node runs once too, and gets the parameters of each
 * item in `batch` (`batch[i]` for input item `i`).
 */
const BATCH_OPERATIONS: Record<string, (key: string, p: Record<string, unknown>) => boolean> = {
	'n8n-nodes-base.supabase': (key) => key === 'row.create',
	// The router of a vendor node handles each item and "continue on fail" itself, and n8n
	// runs the whole node again for "retry on fail".
	...Object.fromEntries(Object.keys(VENDOR_NODES).map((type) => [type, () => true])),
	// Versions 2 to 2.2 read the database once, then create each page.
	'n8n-nodes-base.notion': (key, p) => key === 'databasePage.create' && p.apiV2 === true,
	'n8n-nodes-base.dataTable': (key, p) => key === 'row.insert' && dataTableBulk(p),
	// The v1 router makes the queries of all items, then runs them in one batching mode.
	'n8n-nodes-base.postgres': () => true,
	'n8n-nodes-base.mySql': () => true,
	// Append and append or update read the sheet once, then write the rows of all items.
	// A clear and a delete find the sheet once, then work through the items.
	'n8n-nodes-base.googleSheets': (key) =>
		['sheet.appendOrUpdate', 'sheet.append', 'sheet.clear', 'sheet.delete'].includes(key),
};

let supports: Map<string, Support> | undefined;

/** The `supports` list of each library node type. */
function supportOf(type: string): Support | undefined {
	if (!supports) {
		supports = new Map();
		for (const [file, text] of Object.entries(NODE_SOURCES)) {
			const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
			const read = readSupport(sf);
			if (read) supports.set(read.type, read.support);
		}
	}
	return supports.get(type);
}

/**
 * True when the library node accepts the call, by the rules of `checkParameters`
 * (`src/library/check.ts`) on the JSON parameters. A `resource` or `operation`
 * that is not a literal string is left to the compiler.
 */
export function librarySupports(support: Support, parameters: Record<string, unknown>): boolean {
	const resource = parameters.resource ?? support.resource;
	if (typeof resource !== 'string' || resource.startsWith('=')) return true;
	const operation = parameters.operation ?? support.operation[resource] ?? '';
	if (typeof operation !== 'string' || operation.startsWith('=')) return true;
	const listed = support.operations[operationKey(resource, operation)];
	if (!listed) return false;
	const { names: accepts, values } = splitAccepts(listed);
	for (const [name, value] of Object.entries(parameters)) {
		if (name === 'resource' || name === 'operation') continue;
		if (!accepts.includes(name)) return false;
		// A value-limited parameter must be one of its literal values.
		const only = values.get(name);
		if (only && !only.includes(JSON.stringify(value))) return false;
		const members = accepts
			.filter((a) => a.startsWith(`${name}.`))
			.map((a) => a.slice(name.length + 1));
		if (members.length === 0 || !isRecord(value) || value.__rl === true) continue;
		if (Object.keys(value).some((m) => !members.includes(m))) return false;
		// A value-limited member, such as `options.ignoreSSL=false`.
		for (const [m, v] of Object.entries(value)) {
			const memberOnly = values.get(`${name}.${m}`);
			if (memberOnly && !memberOnly.includes(JSON.stringify(v))) return false;
		}
	}
	return true;
}

/**
 * True when the library has a poll for the trigger type that takes these
 * parameters (spec 9.8). The converter adds `pollNode` and `pollVersion`.
 */
export function libraryPollSupports(type: string, parameters: Record<string, unknown>): boolean {
	const support = supportOf(type);
	return support !== undefined && librarySupports(support, parameters);
}

/**
 * A credential type that the runtime cannot apply (a request for a token first, a signing
 * function, OAuth1): the node runs in the fallback host, which applies it as v1 does.
 */
function requireInjectable(credentialType: string | undefined): void {
	if (credentialType === undefined || !NOT_INJECTABLE.has(credentialType)) return;
	throw new NodeFailure(
		'credential',
		`The runtime cannot apply the credential type "${credentialType}"; the node runs in the fallback host.`,
		'credentials',
	);
}

/** Root AI nodes that have a native library form for some shapes of their cluster. */
export const NATIVE_ROOTS = new Set([`${LANGCHAIN_PREFIX}chainLlm`, `${LANGCHAIN_PREFIX}agent`]);

/**
 * Lowers a root AI node with its sub-nodes to its library node, when `nativeCluster` accepts
 * the cluster. Every other cluster runs in the fallback host, as before.
 *
 * The library node runs once for all items and gives one object: `items`, `runs` (the runs
 * of the model sub-node) and `error`. The source traces the runs, then throws the error, so
 * the run data has the failed run of the model as v1 records it.
 */
/** True when the node is a trigger that streams the answer of the workflow to its caller. */
function streamsAnswer(node: {
	parameters?: Record<string, unknown>;
	disabled?: boolean;
}): boolean {
	const p = node.parameters ?? {};
	const options = isRecord(p.options) ? p.options : {};
	return !node.disabled && (p.responseMode === 'streaming' || options.responseMode === 'streaming');
}

export function lowerNativeCluster(c: NodeContext): void {
	const members = clusterMembers(c.workflow, c.node.name);
	const native = nativeCluster(
		{ name: c.node.name, type: c.node.type, typeVersion: c.version },
		c.parameters,
		members.map((m) => ({
			name: m.node.name,
			type: m.node.type,
			typeVersion: m.node.typeVersion,
			parameters: hideParameters(m.node.type, m.node.typeVersion ?? 1, m.node.parameters ?? {}),
			connection: m.connection,
			target: m.target === c.node.name ? undefined : m.target,
			targetIndex: m.targetIndex,
		})),
		{ streams: c.workflow.nodes.some(streamsAnswer) },
		{
			onError: c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow'),
			retryOnFail: c.node.retryOnFail === true,
		},
	);
	const model =
		typeof native === 'string'
			? undefined
			: members.find((m) => m.node.name === native.credentialOf)?.node;
	const credentialType = Object.keys(model?.credentials ?? {})[0];
	const credential = model ? c.credentialOf(model) : undefined;
	if (
		typeof native === 'string' ||
		credential === undefined ||
		credentialType === undefined ||
		NOT_INJECTABLE.has(credentialType) ||
		!c.addCredentialDerivations ||
		// The memory needs the service `chatMemory` (`ConvertOptions.chatMemory`).
		(native.memory !== undefined && (c.chatMemory !== true || c.services === false))
	) {
		lowerAiNode(c);
		return;
	}
	// n8n resolves an expression that throws a TypeError to no value (undefined).
	const code = (value: unknown): string => {
		const translated = c.compiled(value, '', { flattenResourceLocators: false, guardCalls: true });
		const text = c.print(translated.code);
		if (!text.includes('orNull(')) return text;
		c.helper('orUndefined');
		return text.replaceAll('orNull(', 'orUndefined(');
	};
	let item: string;
	let first: string;
	try {
		item = code(native.perItem);
		first = code(native.forFirstItem);
	} catch (error) {
		if (!(error instanceof NodeFailure)) throw error;
		lowerAiNode(c);
		return;
	}
	c.addCredentialDerivations(credential, native.derivations);
	const { w } = c;
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	const out = c.output(0);
	w.line(`const ${out}: Json[] = [];`);
	// The node gives the items that failed as `{ error }`; `splitErrorItems` moves them.
	if (onError === 'continueErrorOutput') w.line(`const ${c.output(1, 'Errors')}: Json[] = [];`);
	const entries: Array<[string, Code]> = Object.entries(native.shared).map(([k, v]) => [
		k,
		literal(v),
	]);
	// The parameters of the sub-nodes, with the first input item for their expressions.
	const subs = c.local('SubNodes');
	w.line(
		`const ${subs}: Json[] = ${c.input}.slice(0, 1).map((${ITEM}: Json, ${INDEX}: number) => (${first}));`,
	);
	for (const name of Object.keys(native.forFirstItem)) {
		entries.push([name, raw(`${subs}[0]?.${name}`)]);
	}
	if (onError !== 'stopWorkflow') entries.push(['continueOnFail', raw('true')]);
	entries.push(['batch', raw(`${c.input}.map((${ITEM}: Json, ${INDEX}: number) => (${item}))`)]);
	const call: Code = {
		kind: 'object',
		entries: [
			['name', raw(str(c.node.name))],
			['type', raw(str(native.libraryType))],
			['typeVersion', literal(c.version)],
			['parameters', { kind: 'object', entries }],
			['credential', raw(str(credential))],
			['items', raw(c.input)],
		],
	};
	const retry = errorRetry(c);
	w.open(`if (${c.input}.length > 0) {`);
	w.line('let run: Json = {};');
	if (retry) {
		// v1's retry loop: the node runs again while it fails, or while its first item has an error.
		c.helper('retryError');
		w.open(`for (let tryIndex = 0; tryIndex < ${retry.tries}; tryIndex++) {`);
		if (retry.delay > 0) {
			w.line(
				`if (tryIndex > 0) await ctx.wait({ name: ${str(`${c.node.name} (retry)`)}, duration: ${retry.delay} });`,
			);
		}
	}
	w.block(
		`const result: Json[] = await ctx.node(${c.print(call, 'const result: Json[] = await ctx.node(')});`,
	);
	w.line('run = result[0] ?? {};');
	if (c.traceAll) {
		// v1 records a run of the model for each request, also for a try that failed.
		w.line(
			`if ((run.runs ?? []).length > 0) ctx.trace(${str(native.model)}, { $subRuns: run.runs });`,
		);
		if (native.parser !== undefined) {
			w.line(
				`if ((run.parserRuns ?? []).length > 0) ctx.trace(${str(native.parser)}, { $subRuns: run.parserRuns });`,
			);
		}
		if (native.memory !== undefined) {
			w.line(
				`if ((run.memoryRuns ?? []).length > 0) ctx.trace(${str(native.memory)}, { $subRuns: run.memoryRuns });`,
			);
		}
	}
	if (retry) {
		w.line("if (typeof run.error !== 'string' && !retryError(run.items?.[0])) break;");
		w.close();
	}
	w.open("if (typeof run.error === 'string') {");
	if (c.traceAll) {
		w.line(
			`ctx.trace(${str(c.node.name)}, { $error: { message: run.error, description: run.description ?? '' } });`,
		);
	}
	// The error of v1 is a NodeOperationError: it carries the description of the sub-node.
	w.line('const failure: Json = new Error(run.error);');
	w.open("if (typeof run.description === 'string' && run.description !== '') {");
	w.line("failure.name = 'NodeOperationError';");
	w.line('failure.description = run.description;');
	w.close();
	w.line('throw failure;');
	w.close();
	w.line(`for (const r of run.items ?? []) ${out}.push(r);`);
	w.close();
}

/**
 * Library nodes that take a Google service account (`googleApi`): the service of the v1 node
 * and its scopes (`getGoogleAccessToken` in `nodes/Google/GenericFunctions.ts`). The runtime
 * cannot apply the credential, so n8n makes the token (a mint, as for a compiled node) and
 * the library node sends it.
 */
const SERVICE_ACCOUNT_SCOPES: Record<string, { service: string; scopes: string[] }> = {
	'n8n-nodes-base.googleSheets': {
		service: 'sheetV2',
		scopes: [
			'https://www.googleapis.com/auth/drive.file',
			'https://www.googleapis.com/auth/spreadsheets',
			'https://www.googleapis.com/auth/drive.metadata',
		],
	},
};

export function lowerLibrary(c: NodeContext): void {
	const type = c.node.type;
	if (NATIVE_ROOTS.has(type)) {
		lowerNativeCluster(c);
		return;
	}
	const credentialType = Object.keys(c.node.credentials ?? {})[0];
	const account =
		credentialType === 'googleApi' && c.parameters.authentication === 'serviceAccount'
			? SERVICE_ACCOUNT_SCOPES[type]
			: undefined;
	if (!account) requireInjectable(credentialType);
	// A LangChain node with sub-nodes (an OpenAI message with tools) runs as a cluster in the
	// host, so the host gives the node its sub-nodes and reports their runs.
	if (type.startsWith(LANGCHAIN_PREFIX) && isClusterRoot(c.workflow, c.node.name)) {
		lowerAiNode(c);
		return;
	}
	const adapt = ADAPTERS[type];
	const adapted = adapt ? adapt(c.parameters, c.version, c.node) : c.parameters;
	// The link to the workflow of a Slack message: the instance URL, the workflow id and the
	// instance id, as v1 builds it (getMessageContent).
	if (adapted.needsWorkflowLink === true && c.instance) {
		delete adapted.needsWorkflowLink;
		adapted.workflowLink = {
			baseUrl: c.instance.baseUrl,
			workflowId: c.scope.workflowId,
			instanceId: c.instance.id,
		};
	}
	// The compiler links the library node when its `supports` list accepts the
	// call, and else runs the v1 node in the fallback host (WL061). The v1 node
	// needs its own parameters (resource locators, no adapter changes), so a call
	// that the library does not support goes to the host here, as it is.
	const support = supportOf(type);
	// Library nodes port one version and the versions after it that behave the same. An
	// adapter can mark the parameters of an older version (Airtable `legacyFlattenOutput`).
	const older = c.version < (MIN_VERSIONS[type] ?? 0);
	// The attribution link of a Telegram message ends with the instance id
	// (`ConvertOptions.instance`); without it the message runs in the host, because the
	// link changes how Telegram parses the Markdown of the message.
	const fields = isRecord(c.parameters.additionalFields) ? c.parameters.additionalFields : {};
	const attribution =
		type === 'n8n-nodes-base.telegram' && c.version >= 1.1 && fields.appendAttribution !== false;
	if (attribution && c.instance) adapted.instanceId = c.instance.id;
	// The Data Table node handles "continue on fail" itself, as v1's router does. The gym
	// replays show it for version 1.1; version 1 gives the usual `{ error }` item.
	const regular =
		c.node.onError === 'continueRegularOutput' || (!c.node.onError && c.node.continueOnFail);
	if (type === 'n8n-nodes-base.dataTable' && regular && c.version >= 1.1) adapted.errorItems = true;
	// The attribution link of a Gmail message ends with the instance id when it is known.
	const gmailSend =
		type === 'n8n-nodes-base.gmail' &&
		(adapted.resource ?? 'message') === 'message' &&
		(adapted.operation ?? 'send') === 'send';
	if (gmailSend && c.instance) adapted.instanceId = c.instance.id;
	// A Data Table node calls n8n's data-table service (`ctx.service`, spec 9.9). With
	// `ConvertOptions.services: false` (a runtime without the admin client) it runs in the host.
	const service =
		(type === 'n8n-nodes-base.dataTable' && c.services === false) ||
		postgresInHost(c) ||
		mysqlInHost(c);
	// A caller that does not make tokens for a service account runs the node in the host.
	const noToken = account !== undefined && c.addCredentialMints === undefined;
	// A Gmail read without "simplify" parses the raw message. The library node parses the
	// messages that it reads exactly as mailparser. For each other message it ends with the
	// mark of `RUNS_IN_HOST` after its GET requests, and the v1 node in the host sends them
	// again. v1 sends them once, so the node runs in the host unless the caller accepts this.
	const gmailRaw =
		type === 'n8n-nodes-base.gmail' &&
		(adapted.resource ?? 'message') === 'message' &&
		(adapted.operation === 'get' || adapted.operation === 'getAll') &&
		adapted.simple === false;
	const repeats = gmailRaw && c.repeatRequestsInHost !== true;
	const unsupported =
		(support && !librarySupports(support, adapted)) || older || noToken || repeats;
	// The caller says that the node runs in the host (`NodeSources.runsInHost`): a limit of
	// the runtime, or a token for a service account that the caller does not make. Without
	// this, a workflow with such a library node had no conversion with the node compiler.
	const moved = c.nodeSources?.runsInHost?.(c.node.name) === true;
	// The library node comes first. An operation that it does not have is compiled from the
	// source of the v1 node when that compiles, and else runs in the host.
	if (unsupported && !service && !moved && !repeats && tryCompiledNode(c)) return;
	if (unsupported || (attribution && !c.instance) || service || moved) {
		lowerHostNode(c, 1, [['host', raw("'fallback'")]]);
		return;
	}
	if (account) {
		const slot = c.credential();
		if (slot === undefined) {
			lowerHostNode(c, 1, [['host', raw("'fallback'")]]);
			return;
		}
		c.addCredentialMints?.(slot, [googleMint(account.service, account.scopes)]);
	}
	// The values of a Data Table node are inside collection parameters (`columns`, `filters`):
	// v1 gives the text of a DateTime there.
	const parameters = c.compiled(adapted, '', {
		flattenResourceLocators: !LOCATOR_TYPES.has(type),
		...(type === 'n8n-nodes-base.dataTable'
			? { luxonValue: 'text' as const }
			: NESTED_DATES.has(type)
				? { luxonValue: 'nested' as const }
				: {}),
	});
	if (type === 'n8n-nodes-base.dataTable') {
		parseDatedColumns(c, parameters.code, datedColumns(adapted));
	}
	const resource = adapted.resource ?? support?.resource ?? '';
	const operation =
		adapted.operation ?? (typeof resource === 'string' ? support?.operation[resource] : '') ?? '';
	const batched =
		typeof resource === 'string' &&
		typeof operation === 'string' &&
		(BATCH_OPERATIONS[type]?.(operationKey(resource, operation), adapted) ?? false);
	if (batched) {
		const each = `${c.input}.map((${ITEM}: Json, ${INDEX}: number) => (${c.print(parameters.code)}))`;
		const batch: TranslatedValue = {
			code: {
				kind: 'object',
				entries: [
					['resource', literal(resource)],
					['operation', literal(operation)],
					['batch', raw(each)],
				],
			},
			usage: emptyUsage(),
			failures: [],
		};
		// A vendor node makes the error item of each item that fails itself, as the v1 router.
		const continues =
			(c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow')) !==
			'stopWorkflow';
		if (type in VENDOR_NODES && continues && batch.code.kind === 'object') {
			batch.code.entries.push(['continueOnFail', raw('true')]);
		}
		// A Postgres call that has no exact form with bind values, or that reaches a limit of
		// the runtime before a statement is committed, runs in the host in the same run.
		if (type === 'n8n-nodes-base.postgres' || type === 'n8n-nodes-base.mySql') {
			const inHost = (to: NodeContext) => lowerHostNode(to, 1, [['host', raw("'fallback'")]]);
			const hostForm = hostFormOf(c, inHost);
			// Without a host form, a limit could not send the node to the host.
			if (hostForm === null) return inHost(c);
			const onError =
				c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
			if (onError === 'stopWorkflow') {
				const call = nodeCall(c, type, batch, c.credential(), false);
				emitWithHostForm(
					c,
					false,
					(to, hostLimit) => emitStep(to, { ...call, hostLimit }),
					hostForm,
				);
				return;
			}
			// Under a continue setting, the library node makes the error items of v1 itself. They
			// hold a copy of the node, so the node gets one.
			const copy = postgresNodeCopy(c);
			if (copy === null || batch.code.kind !== 'object') return inHost(c);
			const errorOutput = onError === 'continueErrorOutput';
			batch.code.entries.push(
				['errorMode', literal(errorOutput ? 'errorOutput' : 'regular')],
				['node', copy],
			);
			const call = nodeCall(c, type, batch, c.credential(), false);
			emitWithHostForm(
				c,
				errorOutput,
				(to) => emitPostgresContinue(to, call, errorOutput),
				hostForm,
			);
			return;
		}
		// v1 runs the node once: a failure under "continue on fail" gives one error item.
		emitStep(c, {
			...nodeCall(c, type, batch, c.credential(), false),
			oneErrorItem: true,
			pairedErrorItem: true,
		});
		return;
	}
	// The host form of a Gmail read without "simplify" (`repeatRequestsInHost`).
	if (gmailRaw) {
		const inHost = (to: NodeContext) => lowerHostNode(to, 1, [['host', raw("'fallback'")]]);
		const hostForm = hostFormOf(c, inHost);
		if (hostForm === null) return inHost(c);
		const call = nodeCall(c, type, parameters, c.credential(), true);
		emitWithHostForm(c, false, (to, hostLimit) => emitStep(to, { ...call, hostLimit }), hostForm);
		return;
	}
	// v1 runs the node once for each item, so the library node runs once for each item too.
	emitStep(c, {
		...nodeCall(c, type, parameters, c.credential(), true),
		pairsByCall: PAIRS_BY_CALL.has(type),
	});
}

/**
 * The node as n8n holds it in a run, for the error items of the v1 Postgres node: the node of
 * the workflow, with the parameters that the `Workflow` constructor of n8n gives it (the
 * defaults of the node type, without the hidden parameters). Null: the converter cannot
 * make the copy, and the node runs in the host.
 */
function postgresNodeCopy(c: NodeContext): Code | null {
	const description = nodeDescription(c.node.type, c.version);
	const source = sourceNode(c.node);
	if (!description || !source) return null;
	const parameters = getNodeParameters(
		description.properties,
		c.node.parameters ?? {},
		true,
		false,
		c.version,
		description,
	);
	const shown = parameters ?? {};
	// n8n removes the `=` of a parameter that takes no expression (`noDataExpression`).
	for (const property of description.properties) {
		const value = shown[property.name];
		if (property.noDataExpression !== true || typeof value !== 'string') continue;
		if (!value.startsWith('=')) continue;
		// n8n keeps the `=` of a value that is only a `$fromAI` call.
		if (value.includes('$fromAI')) return null;
		shown[property.name] = value.slice(1);
	}
	return jsonLiteral(JSON.stringify({ ...source, parameters: shown }));
}

/**
 * The call of the Postgres library node under a continue setting. The node gives one item
 * `{ items, errors, nodeError? }`: the items of the usual output, the items of the error
 * output, and the message of the error when the v1 node fails as a whole (n8n then gives
 * the input items on and keeps the error on the run).
 */
function emitPostgresContinue(to: NodeContext, call: StepCall, errorOutput: boolean): void {
	const { w } = to;
	const out = to.output(0);
	const errors = errorOutput ? to.output(1, 'Errors') : null;
	const name = str(to.node.name);
	w.line(`let ${out}: Json[] = [];`);
	if (errors) w.line(`let ${errors}: Json[] = [];`);
	w.open(`if (${to.input}.length > 0) {`);
	const options: Code = {
		kind: 'object',
		entries: [
			['name', raw(name)],
			...call.fields.filter(([key]) => key !== 'retry'),
			['items', raw(to.input)],
		],
	};
	const retry = errorRetry(to);
	if (retry) {
		// "Retry on fail" of v1: the node runs again while its first item is an error, or
		// while it fails as a whole. Each run is a run of v1 too.
		w.line('let result: Json[] = [];');
		w.open(`for (let tryIndex = 0; tryIndex < ${retry.tries}; tryIndex++) {`);
		if (retry.delay > 0) {
			w.line(
				`if (tryIndex > 0) await ctx.wait({ name: ${str(`${to.node.name} (retry)`)}, duration: ${retry.delay} });`,
			);
		}
		const again = 'result = await ctx.node(';
		w.block(`${again}${to.print(options, again)});`);
		w.line('if (result[0]?.retry !== true) break;');
		w.close();
	} else {
		const head = 'const result: Json[] = await ctx.node(';
		w.block(`${head}${to.print(options, head)});`);
	}
	w.line(`${out} = result[0]?.items ?? [];`);
	if (errors) w.line(`${errors} = result[0]?.errors ?? [];`);
	w.line(
		`if (typeof result[0]?.nodeError === 'string') ctx.trace(${name}, { $error: { message: result[0].nodeError, description: '' } });`,
	);
	w.close();
}

/**
 * True when a Postgres node runs in the host whatever its parameters are: the runtime has no
 * `ctx.sql` effects (`ConvertOptions.sql`), or the caller says that the node runs in the
 * host.
 */
function postgresInHost(c: NodeContext): boolean {
	if (c.node.type !== 'n8n-nodes-base.postgres') return false;
	// n8n moved the node to the host after a limit of the `sql` effect (`NodeSources.runsInHost`).
	const moved = c.nodeSources?.runsInHost?.(c.node.name) === true;
	return c.sql !== true || moved;
}

/**
 * True when a MySQL node runs in the host whatever its parameters are: the `sql` effect of
 * the runtime has no MySQL client (`ConvertOptions.mysql`), or the caller says that the
 * node runs in the host.
 */
function mysqlInHost(c: NodeContext): boolean {
	if (c.node.type !== 'n8n-nodes-base.mySql') return false;
	const moved = c.nodeSources?.runsInHost?.(c.node.name) === true;
	if (c.mysql !== true || moved) return true;
	if (c.mysqlRecordFirst === true) return false;
	// An operation or an error setting that has no recording against the v1 node yet.
	const unproven = mysqlRecordFirst();
	const operation = c.parameters.operation ?? 'insert';
	const onError =
		c.node.onError ?? (c.node.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	// An operation that is an expression can be an unproven one.
	if (typeof operation !== 'string' || operation.startsWith('=')) return unproven.length > 0;
	return unproven.includes(operation) || unproven.includes(onError);
}

let mysqlUnproven: string[] | undefined;

/** The list `MYSQL_RECORD_FIRST` of the MySQL library node, read from its source. */
function mysqlRecordFirst(): string[] {
	if (mysqlUnproven) return mysqlUnproven;
	const source =
		Object.entries(NODE_SOURCES).find(([file]) => file.endsWith('mysql.ts'))?.[1] ?? '';
	const list = /const MYSQL_RECORD_FIRST: string\[\] = \[([^\]]*)\]/.exec(source);
	// Without the list, each call is unproven: only `executeQuery` without a continue setting runs.
	mysqlUnproven = list
		? [...list[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
		: [
				'select',
				'insert',
				'update',
				'upsert',
				'deleteTable',
				'continueRegularOutput',
				'continueErrorOutput',
			];
	return mysqlUnproven;
}

function keyValues(list: unknown): Array<{ name: unknown; value: unknown }> {
	if (!Array.isArray(list)) return [];
	return list.filter(isRecord).map((p) => ({ name: p.name, value: p.value }));
}

/**
 * HTTP Request (all versions) → the library node `n8n-nodes-base.httpRequest`.
 * When the library node does not have a feature of the call (a file response,
 * pagination, a multipart or binary body), the v1 node runs in the fallback
 * host (`host: 'fallback'`) with all its items, as in v1.
 */
export function lowerHttpRequest(c: NodeContext): void {
	// The caller says that the node runs in the host (`NodeSources.runsInHost`).
	if (c.nodeSources?.runsInHost?.(c.node.name) === true) {
		lowerHostNode(c, 1, [['host', raw("'fallback'")]]);
		return;
	}
	try {
		lowerHttpLibrary(c);
	} catch (error) {
		if (!(error instanceof NodeFailure) || !error.code.startsWith('http')) throw error;
		c.warn(
			'fallback-degrade',
			`${error.message} The node runs in the fallback host.`,
			error.parameter,
		);
		lowerHostNode(c, 1, [['host', raw("'fallback'")]]);
	}
}

function lowerHttpLibrary(c: NodeContext): void {
	let paging: Paging | null = null;
	const p = c.parameters;
	const v = c.version;
	const usage: Usage = emptyUsage();
	const entries: Array<[string, Code]> = [];
	const add = (key: string, value: TranslatedValue) => {
		usage.item ||= value.usage.item;
		usage.index ||= value.usage.index;
		entries.push([key, value.code]);
	};
	// The parameters of a key-value list, as v1 reads them: a row without a name has the
	// name '' (headers leave it out); `mode` is how v1 adds a pair (`keyValuePairs` helper).
	const pairs = (
		list: unknown,
		path: string,
		mode: 'assign' | 'append' | 'set' = 'assign',
		skipEmpty = false,
		arrays = false,
	): TranslatedValue => {
		const items = keyValues(list);
		const out: Array<[string, Code]> = [];
		const all: string[] = [];
		const u = emptyUsage();
		let computed = false;
		const seen = new Set<string>();
		let repeated = false;
		items.forEach((kv, k) => {
			const name = kv.name === undefined || kv.name === null ? '' : kv.name;
			if (typeof name !== 'string') {
				throw new NodeFailure('http', 'A parameter name is not text.', `${path}[${k}].name`);
			}
			if (skipEmpty && name === '') return;
			// The value is inside a collection parameter: v1 gives the text of a DateTime there.
			const t = c.compiled(kv.value ?? '', `${path}[${k}].value`, { luxonValue: 'text' });
			u.item ||= t.usage.item;
			u.index ||= t.usage.index;
			let nameCode = str(name);
			if (name.startsWith('=')) {
				const n = c.compiled(name, `${path}[${k}].name`);
				u.item ||= n.usage.item;
				u.index ||= n.usage.index;
				c.helper('toText');
				nameCode = `toText(${flatCode(n.code)})`;
				computed = true;
			} else {
				repeated ||= seen.has(name);
				seen.add(name);
			}
			out.push([name, t.code]);
			all.push(`[${nameCode}, ${flatCode(t.code)}]`);
		});
		const nested = mode === 'set' && out.some(([name]) => name.includes('.') || name.includes('['));
		// From version 4.3, v1 sends a repeated name as an array. The library node writes an
		// array in a body and in the query (`arrays`), and not in a header.
		if (mode === 'append' && repeated && !arrays) {
			throw new NodeFailure('http', 'A parameter name repeats.', path);
		}
		if (computed || nested || repeated) {
			c.helper('keyValuePairs');
			const code = raw(`keyValuePairs([${all.join(', ')}], ${str(mode)})`);
			return { code, usage: u, failures: [] };
		}
		return { code: { kind: 'object', entries: out }, usage: u, failures: [] };
	};
	const jsonParameter = (value: unknown, path: string): TranslatedValue => {
		if (typeof value === 'string' && !value.startsWith('=')) {
			try {
				return c.compiled(JSON.parse(value), path);
			} catch {
				throw new NodeFailure('http', 'The JSON parameter is not valid JSON.', path);
			}
		}
		const t = c.compiled(value, path);
		const constant = constantText(value);
		const folded = constant === null ? null : jsonLiteral(constant);
		if (folded !== null) return { ...t, code: folded };
		c.helper('jsonValue');
		return { ...t, code: raw(`jsonValue(${flatCode(t.code)})`) };
	};

	// A file body or a multipart body (spec 7.1): the library node reads the files of the
	// item (`$binary`) and gives the runtime `body: { $binary }` or `multipart`.
	const fileBody = (contentType: string) => {
		const m = p.method ?? 'GET';
		// v1 sends no body for GET and HEAD, and a method expression can be either.
		if (typeof m !== 'string' || m.startsWith('=') || m === 'GET' || m === 'HEAD') {
			throw new NodeFailure(
				'http-body',
				'A file or multipart body needs a fixed method.',
				'method',
			);
		}
		usage.item = true;
		usage.index = true;
		entries.push(['itemIndex', raw(INDEX)]);
		entries.push(['files', raw(`${ITEM}.$binary`)]);
		if (contentType === 'binaryData') {
			add('binaryField', c.compiled(p.inputDataFieldName ?? 'data', 'inputDataFieldName'));
			return;
		}
		const list = isRecord(p.bodyParameters) ? p.bodyParameters.parameters : [];
		const rows: string[] = [];
		(Array.isArray(list) ? list.filter(isRecord) : []).forEach((row, k) => {
			const path = `bodyParameters.parameters[${k}]`;
			const name = c.compiled(row.name ?? '', `${path}.name`);
			usage.item ||= name.usage.item;
			usage.index ||= name.usage.index;
			if (row.parameterType === 'formBinaryData') {
				const field = row.inputDataFieldName ?? '';
				// An empty field: before 4.2 v1 leaves the row out; from 4.2 it fails.
				if (field === '') {
					if (v >= 4.2) {
						throw new NodeFailure(
							'http-body',
							'A file part has no field.',
							`${path}.inputDataFieldName`,
						);
					}
					return;
				}
				const f = c.compiled(field, `${path}.inputDataFieldName`);
				usage.item ||= f.usage.item;
				usage.index ||= f.usage.index;
				rows.push(`{ name: ${flatCode(name.code)}, field: ${flatCode(f.code)}, file: true }`);
				return;
			}
			const value = c.compiled(row.value ?? '', `${path}.value`);
			usage.item ||= value.usage.item;
			usage.index ||= value.usage.index;
			rows.push(`{ name: ${flatCode(name.code)}, value: ${flatCode(value.code)} }`);
		});
		entries.push(['multipart', raw(`[${rows.join(', ')}]`)]);
		if (v < 4.2) entries.push(['multipartAssign', raw('true')]);
	};

	const method = v >= 3 ? (p.method ?? 'GET') : (p.requestMethod ?? 'GET');
	add('method', c.compiled(method, v >= 3 ? 'method' : 'requestMethod'));
	add('url', c.compiled(p.url ?? '', 'url'));

	let credentialType: string | undefined;
	/** The name and the code of the content type that the node sets for its body. */
	let contentTypeHeader: [string, string] | null = null;
	/** True when the node stores the body of the response as a file of the item. */
	let storesFile = false;
	const options = isRecord(p.options) ? p.options : {};
	if (v >= 3) {
		if (
			p.authentication === 'predefinedCredentialType' &&
			typeof p.nodeCredentialType === 'string'
		) {
			credentialType = p.nodeCredentialType;
		} else if (
			p.authentication === 'genericCredentialType' &&
			typeof p.genericAuthType === 'string'
		) {
			credentialType = p.genericAuthType;
		}
		if (p.sendQuery === true) {
			add(
				'qs',
				p.specifyQuery === 'json'
					? jsonParameter(p.jsonQuery, 'jsonQuery')
					: pairs(
							isRecord(p.queryParameters) ? p.queryParameters.parameters : [],
							'queryParameters.parameters',
							v >= 4.3 ? 'append' : 'assign',
							false,
							true,
						),
			);
			// v1 writes the query with the qs library: a list is `key[0]=…`, an object is
			// `key[name]=…`, and only `A-Z a-z 0-9 - . _ ~` stay as they are (spec 7.1, `brackets`).
			// The option `queryParameterArrays` has two other formats, which the runtime has not.
			const arrays = options.queryParameterArrays;
			if (arrays !== undefined && arrays !== 'indices') {
				throw new NodeFailure(
					'http',
					'The format of arrays in the query is not supported by the library node.',
					'options.queryParameterArrays',
				);
			}
			entries.push(['qsFormat', raw("'brackets'")]);
		}
		if (p.sendHeaders === true) {
			add(
				'headers',
				p.specifyHeaders === 'json'
					? jsonParameter(p.jsonHeaders, 'jsonHeaders')
					: pairs(
							isRecord(p.headerParameters) ? p.headerParameters.parameters : [],
							'headerParameters.parameters',
							v >= 4.3 ? 'append' : 'assign',
							true,
						),
			);
		}
		if (p.sendBody === true) {
			const contentType = p.contentType ?? 'json';
			// v1 sends a form body and a raw body only with a method that has a body.
			const sent = typeof method === 'string' && !method.startsWith('=');
			const bodyless = sent && ['GET', 'HEAD', 'OPTIONS'].includes(method);
			if (contentType === 'json' || contentType === 'form-urlencoded') {
				if (contentType === 'form-urlencoded') {
					if (!sent) {
						throw new NodeFailure('http-body', 'A form body needs a fixed method.', 'method');
					}
					// The text form of the body (`specifyBody: string`) is not in the library node.
					if (p.specifyBody !== undefined && p.specifyBody !== 'keypair') {
						throw new NodeFailure(
							'http-body',
							'A form body that is not a list of fields is not supported.',
							'specifyBody',
						);
					}
				}
				const fields =
					p.specifyBody === 'json'
						? jsonParameter(p.jsonBody, 'jsonBody')
						: pairs(
								isRecord(p.bodyParameters) ? p.bodyParameters.parameters : [],
								'bodyParameters.parameters',
								contentType === 'json' && v >= 4 ? 'set' : v >= 4.3 ? 'append' : 'assign',
								false,
								true,
							);
				// With GET, HEAD and OPTIONS v1 sends the fields of a form as a JSON body.
				if (contentType === 'form-urlencoded' && !bodyless) {
					// The form text of the fields, as n8n's request helper writes it (`qs.stringify`).
					c.helper('formBody');
					add('body', { ...fields, code: raw(`formBody(${flatCode(fields.code)})`) });
					contentTypeHeader = ['Content-Type', "'application/x-www-form-urlencoded'"];
				} else {
					add('body', fields);
				}
			} else if (contentType === 'raw') {
				if (!sent || bodyless) {
					throw new NodeFailure(
						'http-body',
						'A raw body needs a fixed method that has a body.',
						'method',
					);
				}
				add('body', c.compiled(p.body ?? '', 'body'));
				// v1 sets the header `content-type` of a raw body after the other headers.
				// Without a content type v1 sends the header with an empty value.
				const type = c.compiled(p.rawContentType ?? '', 'rawContentType');
				usage.item ||= type.usage.item;
				usage.index ||= type.usage.index;
				contentTypeHeader = ['content-type', flatCode(type.code)];
			} else if (contentType === 'binaryData' || contentType === 'multipart-form-data') {
				fileBody(contentType);
			} else {
				throw new NodeFailure(
					'http-body',
					`The body type "${text(contentType)}" is not supported by the library node.`,
					'contentType',
				);
			}
			entries.push(['sendBody', raw('true')]);
		}
		if (contentTypeHeader !== null) {
			// The content type of a form body or a raw body takes the place of a content type
			// among the headers of the node.
			c.helper('withContentType');
			const at = entries.findIndex(([key]) => key === 'headers');
			const headers = at < 0 ? '{}' : flatCode(entries[at][1]);
			const [name, value] = contentTypeHeader;
			const code = raw(`withContentType(${headers}, ${str(name)}, ${value})`);
			if (at < 0) entries.push(['headers', code]);
			else entries[at] = ['headers', code];
		}
		const response =
			isRecord(options.response) && isRecord(options.response.response)
				? options.response.response
				: {};
		if (response.responseFormat === 'file') {
			// The runtime stores the body of the response as binary data (`responseBinary`, spec
			// 7.1). The caller says when its runtime does. The runtime has a largest size of a
			// stored file and v1 has none, so the node has its fallback-host form too, and it
			// sends only GET requests: v1 can send a GET again.
			const reason =
				c.nodeSources?.storesResponses !== true
					? 'the runtime of the caller does not store a response as binary data'
					: method !== 'GET'
						? 'the method is not a fixed GET'
						: response.neverError === true
							? 'with "never error" v1 stores the body of a failed request too'
							: c.node.onError === 'continueErrorOutput'
								? 'the node has an error output'
								: readPaging(c, options) !== null
									? 'the node has pagination'
									: null;
			if (reason !== null) {
				throw new NodeFailure(
					'http-binary',
					`The response format "file" (binary data) is not supported here: ${reason}.`,
					'options.response',
				);
			}
			storesFile = true;
		}
		// The library node reads these response options (`src/nodes/http-request.ts`).
		const kept: Array<[string, Code]> = [];
		for (const key of ['fullResponse', 'neverError', 'responseFormat', 'outputPropertyName']) {
			const value = response[key];
			if (value === undefined) continue;
			if (typeof value === 'string' && value.startsWith('=')) {
				throw new NodeFailure(
					'http',
					`The response option "${key}" is an expression.`,
					'options.response',
				);
			}
			kept.push([key, literal(value)]);
		}
		if (kept.length > 0) entries.push(['response', { kind: 'object', entries: kept }]);
		const sendCredentials = options.sendCredentialsOnCrossOriginRedirect;
		if (typeof sendCredentials === 'boolean') {
			entries.push(['sendCredentialsOnCrossOriginRedirect', raw(String(sendCredentials))]);
		} else if (sendCredentials !== undefined) {
			throw new NodeFailure(
				'http',
				'The option "sendCredentialsOnCrossOriginRedirect" is an expression.',
				'options',
			);
		}
		paging = readPaging(c, options);
		const fileType = p.contentType === 'binaryData' || p.contentType === 'multipart-form-data';
		if (paging && p.sendBody === true && fileType) {
			throw new NodeFailure(
				'http-body',
				'Pagination with a file body is not supported.',
				'options',
			);
		}
		// A page request does not write a form body or the content type of a raw body.
		if (
			paging &&
			p.sendBody === true &&
			(p.contentType === 'form-urlencoded' || p.contentType === 'raw')
		) {
			throw new NodeFailure(
				'http-body',
				'Pagination with a form body or a raw body is not supported.',
				'options',
			);
		}
		// v1 follows redirects from version 4, or when the option says so. An option without
		// its own values has the defaults of the node: follow from version 4, at most 21
		// redirects. The library node gets the largest number of redirects (0: follow none).
		const redirect = options.redirect;
		const redirectOptions =
			isRecord(redirect) && isRecord(redirect.redirect) ? redirect.redirect : undefined;
		const follows =
			redirect === undefined
				? v >= 4
				: redirectOptions !== undefined && (redirectOptions.followRedirects ?? v >= 4) === true;
		const maxRedirects = redirectOptions?.maxRedirects;
		if (maxRedirects !== undefined && typeof maxRedirects !== 'number') {
			throw new NodeFailure(
				'http',
				'The limit of redirects is not a fixed number.',
				'options.redirect',
			);
		}
		// v1 reads a limit of 0 as no limit of its own.
		const redirects = !follows
			? 0
			: maxRedirects !== undefined && maxRedirects > 0
				? maxRedirects
				: 21;
		if (redirects !== 21) {
			// A page request follows redirects in the runtime, which has one limit.
			if (paging) {
				throw new NodeFailure(
					'http',
					'Pagination with its own redirect settings is not supported.',
					'options.redirect',
				);
			}
			entries.push(['redirects', literal(redirects)]);
		}
		// The runtime has no setting for these: the certificate check, a proxy and client
		// certificates.
		for (const key of ['allowUnauthorizedCerts', 'proxy']) {
			const value = options[key];
			if (value === undefined || value === false || value === '') continue;
			throw new NodeFailure(
				'http',
				`The option "${key}" is not supported by the library node.`,
				`options.${key}`,
			);
		}
		if (p.provideSslCertificates === true) {
			throw new NodeFailure(
				'http',
				'Client certificates are not supported by the library node.',
				'provideSslCertificates',
			);
		}
		// v1 stops a request after `options.timeout` ms. Without it the limit is 300,000 ms,
		// which is the default of the runtime too.
		const timeout = options.timeout;
		if (typeof timeout === 'number' && timeout > 0) {
			entries.push(['timeoutMs', literal(timeout)]);
		} else if (typeof timeout === 'string' && timeout.startsWith('=')) {
			const t = c.compiled(timeout, 'options.timeout');
			usage.item ||= t.usage.item;
			usage.index ||= t.usage.index;
			entries.push(['timeoutMs', raw(`(Number(${flatCode(t.code)}) || 300000)`)]);
		}
	} else {
		const auth = p.authentication;
		const authTypes: Record<string, string> = {
			basicAuth: 'httpBasicAuth',
			digestAuth: 'httpDigestAuth',
			headerAuth: 'httpHeaderAuth',
			queryAuth: 'httpQueryAuth',
			oAuth1: 'oAuth1Api',
			oAuth2: 'oAuth2Api',
		};
		if (typeof auth === 'string') credentialType = authTypes[auth];
		if (p.responseFormat === 'file') {
			throw new NodeFailure(
				'http-binary',
				'The response format "file" (binary data) is not supported.',
				'responseFormat',
			);
		}
		// Version 1 and 2: `responseFormat` json or string, `options.fullResponse`,
		// `options.ignoreResponseCode`.
		const opts1 = isRecord(p.options) ? p.options : {};
		const kept1: Array<[string, Code]> = [];
		if (p.responseFormat === 'string') {
			kept1.push(['responseFormat', literal('text')]);
			kept1.push(['outputPropertyName', literal(text(p.dataPropertyName, 'data'))]);
		}
		if (opts1.fullResponse === true) kept1.push(['fullResponse', raw('true')]);
		if (opts1.ignoreResponseCode === true) kept1.push(['neverError', raw('true')]);
		if (kept1.length > 0) entries.push(['response', { kind: 'object', entries: kept1 }]);
		if (p.jsonParameters === true) {
			if (p.queryParametersJson)
				add('qs', jsonParameter(p.queryParametersJson, 'queryParametersJson'));
			if (p.headerParametersJson)
				add('headers', jsonParameter(p.headerParametersJson, 'headerParametersJson'));
			if (p.bodyParametersJson) {
				add('body', jsonParameter(p.bodyParametersJson, 'bodyParametersJson'));
				entries.push(['sendBody', raw('true')]);
			}
		} else {
			const ui = (key: string) => {
				const value = p[key];
				return isRecord(value) ? value.parameter : [];
			};
			if (Array.isArray(ui('queryParametersUi')))
				add('qs', pairs(ui('queryParametersUi'), 'queryParametersUi.parameter'));
			if (Array.isArray(ui('headerParametersUi')))
				add('headers', pairs(ui('headerParametersUi'), 'headerParametersUi.parameter'));
			if (Array.isArray(ui('bodyParametersUi'))) {
				add('body', pairs(ui('bodyParametersUi'), 'bodyParametersUi.parameter'));
				entries.push(['sendBody', raw('true')]);
			}
		}
	}
	entries.push(['version', literal(v)]);
	// With "continue on fail", the node gives the error item of v1 for a failed status: on its
	// own output under `continueRegularOutput`, and on the error output under
	// `continueErrorOutput`, which the converter fills from that item.
	if (
		c.node.onError === 'continueRegularOutput' ||
		c.node.onError === 'continueErrorOutput' ||
		(!c.node.onError && c.node.continueOnFail)
	) {
		entries.push(['errorItems', raw('true')]);
	}
	requireInjectable(credentialType);
	// n8n refreshes an expired OAuth2 token for the library node: it needs the
	// n8n credential behind the slot. The id is not a secret.
	if (credentialType !== undefined) entries.push(['credentialType', literal(credentialType)]);
	const credentialId = credentialType ? c.node.credentials?.[credentialType]?.id : undefined;
	if (typeof credentialId === 'string' && credentialId !== '') {
		entries.push(['credentialId', literal(credentialId)]);
	}
	const parameters: TranslatedValue = { code: { kind: 'object', entries }, usage, failures: [] };
	const call = nodeCall(
		c,
		'n8n-nodes-base.httpRequest',
		parameters,
		c.credential(credentialType),
		true,
	);
	// v1 sends the pages of each item in a loop (n8n-core requestWithAuthenticationPaginated).
	if (paging) {
		emitPaging(c, paging, parameters.code, call.fields);
		return;
	}
	if (storesFile) {
		// A file over the largest size of the runtime: the fallback host runs the v1 node.
		const inHost = (to: NodeContext) => lowerHostNode(to, 1, [['host', raw("'fallback'")]]);
		const hostForm = hostFormOf(c, inHost);
		if (hostForm === null) {
			throw new NodeFailure(
				'http-binary',
				'The response format "file" has no fallback-host form here.',
				'options.response',
			);
		}
		emitWithHostForm(c, false, (to, hostLimit) => emitStep(to, { ...call, hostLimit }), hostForm);
		return;
	}
	// v1 sends one request for each item.
	emitStep(c, call);
}

function flatCode(code: Code): string {
	if (code.kind === 'raw') return code.text;
	if (code.kind === 'array') return `[${code.items.map(flatCode).join(', ')}]`;
	return `{ ${code.entries.map(([k, x]) => `${str(k)}: ${flatCode(x)}`).join(', ')} }`;
}
