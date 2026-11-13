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
import { emptyUsage, INDEX, ITEM } from './expression.ts';
import { isClusterRoot, LANGCHAIN_PREFIX, lowerAiNode, lowerHostNode } from './host-node.ts';
import type { Paging } from './http-pagination.ts';
import { emitPaging, readPaging } from './http-pagination.ts';
import { emitStep, nodeCall } from './steps.ts';
import { isRecord, text } from './types.ts';

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
const ADAPTERS: Record<
	string,
	(p: Record<string, unknown>, version: number) => Record<string, unknown>
> = {
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
	// resource, a `defineBelow` mapping without values (v1 fails on `Object.entries(null)`),
	// and a mapped `dateTime` field (v1 parses it with Luxon in the workflow zone).
	'n8n-nodes-base.dataTable': (p) => {
		const out: Record<string, unknown> = { ...p, itemIndex: '={{ $itemIndex }}' };
		const operation = p.operation ?? 'insert';
		if ((p.resource ?? 'row') !== 'row') out.dataTableHost = true;
		if (typeof operation === 'string' && ['insert', 'update', 'upsert'].includes(operation)) {
			const columns = isRecord(p.columns) ? p.columns : {};
			const auto = columns.mappingMode === 'autoMapInputData';
			if (!auto && !isRecord(columns.value)) out.dataTableHost = true;
			const value = isRecord(columns.value) ? columns.value : {};
			const schema = Array.isArray(columns.schema) ? columns.schema.filter(isRecord) : [];
			const dated = schema.some((f) => f.type === 'dateTime' && String(f.id) in value);
			if (!auto && dated) out.dataTableHost = true;
		}
		return out;
	},
};

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
	'@n8n/n8n-nodes-langchain.openAi',
]);

/** The oldest version of a node type that its library node runs; older ones run in the host. */
const MIN_VERSIONS: Record<string, number> = {
	// Version 2.0 searches once for all input items.
	'n8n-nodes-base.airtable': 2.1,
	// Version 1.3 changed the recurring events and the dates of `event.getAll`.
	'n8n-nodes-base.googleCalendar': 1.3,
	// Version 3 is the node with the `fileFolder` resource.
	'n8n-nodes-base.googleDrive': 3,
	// Version 2 is the node with Microsoft Graph operations in `actions/`.
	'n8n-nodes-base.microsoftOutlook': 2,
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
	// Versions 2 to 2.2 read the database once, then create each page.
	'n8n-nodes-base.notion': (key, p) => key === 'databasePage.create' && p.apiV2 === true,
	'n8n-nodes-base.dataTable': (key, p) => key === 'row.insert' && dataTableBulk(p),
	// Append and append or update read the sheet once, then write the rows of all items.
	'n8n-nodes-base.googleSheets': (key) => key === 'sheet.appendOrUpdate' || key === 'sheet.append',
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
function requireInjectable(c: NodeContext, credentialType: string | undefined): void {
	if (credentialType === undefined || !NOT_INJECTABLE.has(credentialType)) return;
	throw new NodeFailure(
		'credential',
		`The runtime cannot apply the credential type "${credentialType}"; the node runs in the fallback host.`,
		'credentials',
	);
}

export function lowerLibrary(c: NodeContext): void {
	const type = c.node.type;
	requireInjectable(c, Object.keys(c.node.credentials ?? {})[0]);
	// A LangChain node with sub-nodes (an OpenAI message with tools) runs as a cluster in the
	// host, so the host gives the node its sub-nodes and reports their runs.
	if (type.startsWith(LANGCHAIN_PREFIX) && isClusterRoot(c.workflow, c.node.name)) {
		lowerAiNode(c);
		return;
	}
	const adapt = ADAPTERS[type];
	const adapted = adapt ? adapt(c.parameters, c.version) : c.parameters;
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
	const service = type === 'n8n-nodes-base.dataTable' && c.services === false;
	if (
		(support && !librarySupports(support, adapted)) ||
		older ||
		(attribution && !c.instance) ||
		service
	) {
		lowerHostNode(c, 1, [['host', raw("'fallback'")]]);
		return;
	}
	const parameters = c.compiled(adapted, '', {
		flattenResourceLocators: !LOCATOR_TYPES.has(type),
	});
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
		// v1 runs the node once: a failure under "continue on fail" gives one error item.
		emitStep(c, {
			...nodeCall(c, type, batch, c.credential(), false),
			oneErrorItem: true,
			pairedErrorItem: true,
		});
		return;
	}
	// v1 runs the node once for each item, so the library node runs once for each item too.
	emitStep(c, nodeCall(c, type, parameters, c.credential(), true));
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
			const t = c.compiled(kv.value ?? '', `${path}[${k}].value`);
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
		// From version 4.3, v1 sends a repeated name as an array (`tag[0]=a&tag[1]=b`), which
		// the library node does not write.
		if (mode === 'append' && repeated) {
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
						),
			);
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
			if (contentType === 'json' || contentType === 'form-urlencoded') {
				if (contentType === 'form-urlencoded') {
					c.warn('http', 'The library node sends a form body as JSON.', 'contentType');
				}
				add(
					'body',
					p.specifyBody === 'json'
						? jsonParameter(p.jsonBody, 'jsonBody')
						: pairs(
								isRecord(p.bodyParameters) ? p.bodyParameters.parameters : [],
								'bodyParameters.parameters',
								contentType === 'json' && v >= 4 ? 'set' : v >= 4.3 ? 'append' : 'assign',
							),
				);
			} else if (contentType === 'raw') {
				add('body', c.compiled(p.body ?? '', 'body'));
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
		const response =
			isRecord(options.response) && isRecord(options.response.response)
				? options.response.response
				: {};
		if (response.responseFormat === 'file') {
			throw new NodeFailure(
				'http-binary',
				'The response format "file" (binary data) is not supported.',
				'options.response',
			);
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
		paging = readPaging(c, options);
		const fileType = p.contentType === 'binaryData' || p.contentType === 'multipart-form-data';
		if (paging && p.sendBody === true && fileType) {
			throw new NodeFailure(
				'http-body',
				'Pagination with a file body is not supported.',
				'options',
			);
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
	// With "continue on fail", the node gives the error item of v1 for a failed status.
	if (c.node.onError === 'continueRegularOutput' || (!c.node.onError && c.node.continueOnFail)) {
		entries.push(['errorItems', raw('true')]);
	}
	requireInjectable(c, credentialType);
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
	// v1 sends one request for each item.
	emitStep(c, call);
}

function flatCode(code: Code): string {
	if (code.kind === 'raw') return code.text;
	if (code.kind === 'array') return `[${code.items.map(flatCode).join(', ')}]`;
	return `{ ${code.entries.map(([k, x]) => `${str(k)}: ${flatCode(x)}`).join(', ')} }`;
}
