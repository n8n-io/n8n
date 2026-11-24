#!/usr/bin/env node
// Shared workflow knowledge for derive_checks.mjs and run_scenarios.py: the workflow SDK of
// the repository, graph helpers, expression references, JSON Schema samples and pin data plans.
//
//   node sdk.mjs pin-plan <workflow.json> [scenarios.json]    print the pin data of each scenario
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const repo = resolve(here, '../../../..');
const require = createRequire(import.meta.url);
const SDK_DIST = join(repo, 'packages/@n8n/workflow-sdk/dist/index.js');
// The same directories that the n8n node catalog gives to setSchemaBaseDirs().
const NODE_DEFINITION_DIRS = [
	join(repo, 'packages/nodes-base/dist/node-definitions/'),
	join(repo, 'packages/@n8n/nodes-langchain/dist/node-definitions/'),
];

let loaded;
/** The workflow SDK with the node parameter schemas set, or null when the package is not built. */
export function loadSdk() {
	if (loaded !== undefined) return loaded;
	if (!existsSync(SDK_DIST)) return (loaded = null);
	const sdk = require(SDK_DIST);
	const schemaDirs = NODE_DEFINITION_DIRS.filter((dir) => existsSync(dir));
	// Without schema directories validateNodeConfig reports every node as valid.
	sdk.setSchemaBaseDirs(schemaDirs);
	return (loaded = { sdk, schemaDirs, missingDirs: NODE_DEFINITION_DIRS.filter((d) => !existsSync(d)) });
}

// --- Node kinds ----------------------------------------------------------------

const BASE = 'n8n-nodes-base.';
const LC = '@n8n/n8n-nodes-langchain.';

/** Nodes that run for real in a scenario. They need no credentials and call no service. */
export const LOGIC_TYPES = new Set(
	[
		'set', 'if', 'switch', 'filter', 'merge', 'aggregate', 'splitOut', 'code', 'function', 'functionItem',
		'noOp', 'splitInBatches', 'itemLists', 'sort', 'limit', 'removeDuplicates', 'summarize', 'dateTime',
		'renameKeys', 'compareDatasets', 'markdown', 'html', 'xml', 'crypto', 'executionData', 'stopAndError',
		'respondToWebhook', 'convertToFile', 'extractFromFile', 'debugHelper',
	].map((t) => BASE + t),
);

/** Nodes that end up with one item, so `.first()` on them reads all of their output. */
export const SINGLE_ITEM_TYPES = new Set(['aggregate', 'summarize'].map((t) => BASE + t));

const TRIGGER_TYPES = new Set(['webhook', 'cron', 'interval', 'emailReadImap', 'start'].map((t) => BASE + t));

export const isSticky = (type) => type === `${BASE}stickyNote`;
export const isTrigger = (type) => TRIGGER_TYPES.has(type) || type.toLowerCase().includes('trigger');
export const isManualTrigger = (type) => type === `${BASE}manualTrigger`;
export const shortType = (type) => type.slice(type.lastIndexOf('.') + 1);

/** True when type matches a full type name, or its part after the last dot (case-insensitive). */
export function typeMatches(type, pattern) {
	return type === pattern || shortType(type).toLowerCase() === pattern.toLowerCase();
}

const AI_ROOT_PLACEHOLDER = {
	[`${LC}agent`]: (v) => ({ output: v }),
	[`${LC}openAiAssistant`]: (v) => ({ output: v }),
	[`${LC}informationExtractor`]: (v) => ({ output: v }),
	[`${LC}chainLlm`]: (v) => ({ text: v }),
	[`${LC}chainRetrievalQa`]: (v) => ({ response: v }),
	[`${LC}chainSummarization`]: (v) => ({ output: { output_text: v } }),
	[`${LC}sentimentAnalysis`]: (v) => ({ sentimentAnalysis: { category: v } }),
	[`${LC}googleGemini`]: (v) => ({ content: { parts: [{ text: v }], role: 'model' }, finishReason: 'STOP', index: 0 }),
};

/** Vendor nodes that call a model themselves, without a model sub-node. */
const AI_VENDOR_TYPES = new Set(['googleGemini', 'openAi', 'anthropic'].map((t) => LC + t));

// --- Graph ---------------------------------------------------------------------

/** Nodes, edges and lookups of a workflow. Sticky notes and disabled nodes are left out. */
export function graph(workflow) {
	const nodes = (workflow.nodes ?? []).filter((n) => !isSticky(n.type) && !n.disabled);
	const byName = new Map(nodes.map((n) => [n.name, n]));
	const edges = [];
	for (const [from, outputs] of Object.entries(workflow.connections ?? {})) {
		for (const [type, branches] of Object.entries(outputs ?? {})) {
			(branches ?? []).forEach((targets, output) =>
				(targets ?? []).forEach((t) => {
					if (byName.has(from) && byName.has(t.node))
						edges.push({ from, to: t.node, type, output, input: t.index ?? 0 });
				}),
			);
		}
	}
	const subnodes = new Set(edges.filter((e) => e.type.startsWith('ai_')).map((e) => e.from));
	const mainParents = (name) => [...new Set(edges.filter((e) => e.type === 'main' && e.to === name).map((e) => e.from))];
	const mainChildren = (name) => edges.filter((e) => e.type === 'main' && e.from === name);
	const aiInputs = (name, type) => edges.filter((e) => e.to === name && e.type === type).map((e) => byName.get(e.from));
	const triggers = nodes.filter((n) => isTrigger(n.type) && !subnodes.has(n.name));
	return { nodes, byName, edges, subnodes, mainParents, mainChildren, aiInputs, triggers };
}

/** Names of the nodes that a trigger reaches. AI sub-nodes count when they serve a reached node. */
export function reachable(g) {
	const seen = new Set(g.triggers.map((t) => t.name));
	const queue = [...seen];
	while (queue.length) {
		const name = queue.shift();
		for (const e of g.edges) {
			if (e.type === 'main' && e.from === name && !seen.has(e.to)) {
				seen.add(e.to);
				queue.push(e.to);
			}
		}
	}
	// A sub-node can serve another sub-node, for example a model inside an auto-fixing parser.
	let grew = true;
	while (grew) {
		grew = false;
		for (const e of g.edges) {
			if (e.type.startsWith('ai_') && seen.has(e.to) && !seen.has(e.from)) {
				seen.add(e.from);
				grew = true;
			}
		}
	}
	return seen;
}

/** Names of the nodes downstream of name, through main connections. */
export function downstream(g, name) {
	const seen = new Set();
	const queue = [name];
	while (queue.length) {
		for (const e of g.mainChildren(queue.shift())) {
			if (!seen.has(e.to)) {
				seen.add(e.to);
				queue.push(e.to);
			}
		}
	}
	return seen;
}

// --- Parameters and expressions --------------------------------------------------

/** Every string in a parameter tree, with its dotted path. */
export function strings(value, path = '') {
	if (typeof value === 'string') return [{ path, value }];
	if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
	if (value && typeof value === 'object')
		return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
	return [];
}

const CODE_PARAMS = new Set(['jsCode', 'pythonCode', 'functionCode', 'code']);

/** The expression text of a parameter value, or null. Code fields count, because they use the same references. */
export function expressionText(path, value) {
	if (value.startsWith('=')) return value.slice(1);
	const key = path.split('.').pop().replace(/\[\d+\]$/, '');
	return CODE_PARAMS.has(key) ? value : null;
}

const IDENT = /^[A-Za-z_$][\w$]*/;

/** Read a property path such as `.a?.b['c'][0]` from text at index i. Returns { path, end, call }. */
function readPath(text, i) {
	const path = [];
	let dynamic = false;
	for (;;) {
		if (text.startsWith('?.', i)) i += 2;
		else if (text[i] === '.') i += 1;
		else if (text[i] !== '[') break;
		if (text[i] === '[') {
			const close = text.indexOf(']', i);
			if (close < 0) break;
			const inner = text.slice(i + 1, close).trim();
			if (/^\d+$/.test(inner)) path.push(Number(inner));
			else if (/^(['"`])(.*)\1$/.test(inner)) path.push(inner.slice(1, -1));
			else {
				dynamic = true;
				i = close + 1;
				break;
			}
			i = close + 1;
			continue;
		}
		const match = text.slice(i).match(IDENT);
		if (!match) break;
		path.push(match[0]);
		i += match[0].length;
	}
	const call = /^\s*\(/.test(text.slice(i));
	// A trailing method call, such as `.toUpperCase()`, is not a field.
	if (call && path.length) path.pop();
	return { path, end: i, call, dynamic };
}

const ACCESSORS = [
	{ re: /^\.item\b/, kind: 'item' },
	{ re: /^\.first\(\s*\)/, kind: 'first' },
	{ re: /^\.last\(\s*\)/, kind: 'last' },
	{ re: /^\.all\(\s*\)\[\s*\d+\s*\]/, kind: 'all-index' },
	{ re: /^\.all\(\s*\)/, kind: 'all' },
	{ re: /^\.itemMatching\([^)]*\)/, kind: 'item' },
	{ re: /^\.pairedItem\([^)]*\)/, kind: 'item' },
];

/**
 * References in expression text: { node, kind, accessor, path, raw }.
 * node is null for `$json` and `$input`, which read the main input of the node.
 * path is null when the reference does not read item JSON, for example `$('A').params`.
 */
export function references(text) {
	const refs = [];
	const named = /\$\(\s*(['"`])((?:\\.|(?!\1).)+)\1\s*\)|\$node\[\s*(['"`])((?:\\.|(?!\3).)+)\3\s*\]|\$items\(\s*(['"`])((?:\\.|(?!\5).)+)\5/g;
	for (const m of text.matchAll(named)) {
		const node = (m[2] ?? m[4] ?? m[6]).replace(/\\(.)/g, '$1');
		let i = m.index + m[0].length;
		let accessor = m[4] !== undefined ? 'node' : m[6] !== undefined ? 'items' : null;
		if (accessor === null) {
			const rest = text.slice(i);
			const hit = ACCESSORS.find((a) => a.re.test(rest));
			if (hit) {
				accessor = hit.kind;
				i += rest.match(hit.re)[0].length;
			}
		}
		let path = null;
		if (text.startsWith('.json', i) && accessor !== 'all' && accessor !== 'items') {
			const read = readPath(text, i + '.json'.length);
			path = read.dynamic ? null : read.path;
		}
		refs.push({ node, kind: 'named', accessor, path, raw: text.slice(m.index, i + 40).split(/[}\n]/)[0] });
	}
	for (const m of text.matchAll(/\$json\b/g)) {
		const read = readPath(text, m.index + '$json'.length);
		refs.push({ node: null, kind: 'json', accessor: 'item', path: read.dynamic ? null : read.path,
			raw: text.slice(m.index, read.end) });
	}
	for (const m of text.matchAll(/\$input\.(item|first\(\s*\)|last\(\s*\)|all\(\s*\)\[\s*\d+\s*\])\.json\b/g)) {
		const read = readPath(text, m.index + m[0].length);
		const accessor = m[1].startsWith('first') ? 'first' : m[1].startsWith('last') ? 'last' : m[1] === 'item' ? 'item' : 'all-index';
		refs.push({ node: null, kind: 'input', accessor, path: read.dynamic ? null : read.path,
			raw: text.slice(m.index, read.end) });
	}
	return refs;
}

/** Every reference in a workflow: { node (the node that holds it), param, ref, code }. */
export function workflowReferences(g) {
	const out = [];
	for (const node of g.nodes) {
		for (const { path, value } of strings(node.parameters ?? {})) {
			const text = expressionText(path, value);
			if (text === null) continue;
			const code = !value.startsWith('=');
			for (const ref of references(text)) out.push({ node: node.name, param: path, ref, code });
		}
	}
	return out;
}

/**
 * Look up a path in a value. Returns 'found', 'missing' or 'unknown'.
 * 'unknown' means that a null or an opaque value hides the rest of the path. With sample, the
 * value comes from a schema, which shows the shape of one array item and not the count, so an
 * index past the end of an array is 'unknown'. In real output, that index is 'missing'.
 */
export function lookup(value, path, { sample = false } = {}) {
	let current = value;
	for (const key of path) {
		if (current === null || current === undefined) return current === null ? 'unknown' : 'missing';
		if (Array.isArray(current)) {
			if (typeof key === 'number') {
				if (key >= current.length) return sample ? 'unknown' : 'missing';
				current = current[key];
			} else if (key === 'length') return 'found';
			else return 'missing';
			continue;
		}
		if (typeof current === 'string') return key === 'length' ? 'found' : 'missing';
		if (typeof current !== 'object') return 'missing';
		if (!(key in current)) return 'missing';
		current = current[key];
	}
	return current === undefined ? 'missing' : 'found';
}

export const showPath = (path) =>
	path.map((k, i) => (typeof k === 'number' ? `[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? (i ? `.${k}` : k) : `['${k}']`)).join('');

// --- JSON Schema samples ---------------------------------------------------------

/** A deterministic sample value for a JSON Schema. key names the field, for readable strings. */
export function sample(schema, key = 'value', depth = 0) {
	if (!schema || typeof schema !== 'object') return null;
	if (schema.example !== undefined) return schema.example;
	if (schema.const !== undefined) return schema.const;
	if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
	if (schema.default !== undefined) return schema.default;
	const variant = schema.anyOf ?? schema.oneOf;
	if (Array.isArray(variant) && variant.length) return sample(variant.find((v) => v.type !== 'null') ?? variant[0], key, depth);
	let type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
	if (!type) type = schema.properties ? 'object' : schema.items ? 'array' : 'string';
	switch (type) {
		case 'object': {
			if (depth > 6) return {};
			return Object.fromEntries(
				Object.entries(schema.properties ?? {}).map(([k, v]) => [k, sample(v, k, depth + 1)]),
			);
		}
		case 'array':
			return schema.items && depth <= 6 ? [sample(schema.items, key, depth + 1)] : [];
		case 'integer':
		case 'number':
			return 1;
		case 'boolean':
			return true;
		case 'null':
			return null;
		default: {
			const k = String(key);
			if (schema.format === 'date-time' || /(^|_)(date|time|at)$|At$/.test(k)) return '2026-01-01T09:00:00.000Z';
			if (schema.format === 'email' || /email/i.test(k)) return 'ada@example.com';
			if (schema.format === 'uri' || /url|link|href/i.test(k)) return `https://example.com/${k}`;
			if (/(^|_)id$|Id$/.test(k)) return `${k}-1`;
			return `sample ${k}`;
		}
	}
}

/** Set every boolean in a value to flag. */
function setBooleans(value, flag) {
	if (Array.isArray(value)) return value.map((v) => setBooleans(v, flag));
	if (value && typeof value === 'object')
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, setBooleans(v, flag)]));
	return typeof value === 'boolean' ? flag : value;
}

function deepMerge(base, extra) {
	if (!base || typeof base !== 'object' || Array.isArray(base) || !extra || typeof extra !== 'object') return extra;
	const out = { ...base };
	for (const [k, v] of Object.entries(extra)) out[k] = deepMerge(base[k], v);
	return out;
}

// --- Pin data ------------------------------------------------------------------

/**
 * Trigger output for a scenario, in the shape that the trigger code emits.
 * WhatsApp: WhatsAppTrigger.node.ts emits `{ ...change.value, field }` for each change,
 * and change.value is the Cloud API webhook payload of a text message.
 */
export const TRIGGER_FIXTURES = {
	[`${BASE}whatsAppTrigger`]: [{
		messaging_product: 'whatsapp',
		metadata: { display_phone_number: '15550001111', phone_number_id: '106540352242922' },
		contacts: [{ profile: { name: 'Ada Lovelace' }, wa_id: '4915112345678' }],
		messages: [{ from: '4915112345678', id: 'wamid.HBgLNDkxNTExMjM0NTY3OBUCABIYFjNFQjA', timestamp: '1767258000',
			text: { body: 'What are your opening hours?' }, type: 'text' }],
		field: 'messages',
	}],
	[`${BASE}webhook`]: [{ headers: { 'content-type': 'application/json' }, params: {}, query: {},
		body: { message: 'Hello' }, webhookUrl: 'http://localhost:5678/webhook/test', executionMode: 'test' }],
	[`${LC}chatTrigger`]: [{ sessionId: 'session-1', action: 'sendMessage', chatInput: 'Hello' }],
	[`${BASE}manualTrigger`]: [{}],
	[`${BASE}scheduleTrigger`]: [{ timestamp: '2026-01-01T09:00:00.000+00:00', 'Readable date': 'January 1st 2026, 9:00:00 am',
		'Day of week': 'Thursday', Year: '2026', Month: 'January', 'Day of month': '01', Hour: '09', Minute: '00',
		Second: '00', Timezone: 'UTC' }],
	[`${BASE}telegramTrigger`]: [{ update_id: 1, message: { message_id: 1, date: 1767258000, text: 'Hello',
		chat: { id: 1001, type: 'private', first_name: 'Ada' }, from: { id: 1001, is_bot: false, first_name: 'Ada' } } }],
	[`${BASE}formTrigger`]: [{ submittedAt: '2026-01-01T09:00:00.000Z', formMode: 'test' }],
};

const whatsAppMessage = (from, name, body, id) => ({
	messaging_product: 'whatsapp',
	metadata: { display_phone_number: '15550001111', phone_number_id: '106540352242922' },
	contacts: [{ profile: { name }, wa_id: from }],
	messages: [{ from, id, timestamp: '1767258000', text: { body }, type: 'text' }],
	field: 'messages',
});

/**
 * Per trigger type: identity is the path of the value that names the sender in one item,
 * withMessage puts a scenario text into the fixture, and edges are the edge cases that every
 * workflow with this trigger must survive. derive 'each-item' means that each trigger item
 * must get its own outgoing request that names its sender.
 */
export const TRIGGER_KITS = {
	[`${BASE}whatsAppTrigger`]: {
		identity: ['messages', 0, 'from'],
		withMessage: (items, text) => items.map((i) => ({ ...i, messages: (i.messages ?? []).map((m) => ({ ...m, text: { body: text } })) })),
		edges: [
			{
				name: 'Two messages arrive in one webhook call',
				why: 'WhatsAppTrigger.node.ts emits one item for each change, and Meta can batch several changes in one call',
				derive: 'each-item',
				ai: { booleans: true },
				trigger: [
					whatsAppMessage('4915112345678', 'Ada Lovelace', 'What are your opening hours?', 'wamid.A1'),
					whatsAppMessage('4917699887766', 'Alan Turing', 'Do you ship abroad?', 'wamid.B2'),
				],
			},
			{
				name: 'A delivery status update arrives, not a customer message',
				why: 'the messages update also delivers sent, delivered and read statuses, with no messages array',
				expect: { noWrites: true },
				trigger: [{
					messaging_product: 'whatsapp',
					metadata: { display_phone_number: '15550001111', phone_number_id: '106540352242922' },
					statuses: [{ id: 'wamid.HBgLNDkxNTExMjM0NTY3OBUCABEYEjQ', status: 'delivered', timestamp: '1767258060', recipient_id: '4915112345678' }],
					field: 'messages',
				}],
			},
		],
	},
};

/** The trigger items of a scenario: its own trigger, the case trigger, or the fixture with the scenario message. */
export function triggerItems(node, scenario = {}, scenarios = {}) {
	const explicit = scenario.trigger ?? scenarios.trigger;
	if (explicit) return { items: Array.isArray(explicit) ? explicit : [explicit], source: 'case' };
	const fixture = TRIGGER_FIXTURES[node.type];
	if (!fixture) return null;
	const kit = TRIGGER_KITS[node.type];
	if (scenario.message !== undefined && kit) return { items: kit.withMessage(fixture, scenario.message), source: 'case' };
	return { items: fixture, source: 'fixture' };
}

export const isAiRootNode = (g, node) => node.type.startsWith(LC) && !g.subnodes.has(node.name) && g.aiInputs(node.name, 'ai_languageModel').length > 0;

/** A node whose output comes from a model: an AI root node or a vendor node such as Google Gemini. */
export const isAiNode = (g, node) => Boolean(node) && (isAiRootNode(g, node) || (AI_VENDOR_TYPES.has(node.type) && !g.subnodes.has(node.name)));

function parserSchema(parser) {
	const p = parser?.parameters ?? {};
	const parse = (text) => {
		try {
			return typeof text === 'string' ? JSON.parse(text) : text && typeof text === 'object' ? text : null;
		} catch {
			return null;
		}
	};
	const schemaType = p.schemaType ?? 'fromJson';
	if (schemaType === 'manual' && parse(p.inputSchema)) return { kind: 'schema', value: parse(p.inputSchema) };
	if (schemaType !== 'manual' && parse(p.jsonSchemaExample)) return { kind: 'example', value: parse(p.jsonSchemaExample) };
	if (parse(p.jsonSchema)) return { kind: 'schema', value: parse(p.jsonSchema) };
	return null;
}

/** JSON objects that a prompt shows as examples, in order. Objects with a boolean come first. */
function promptExamples(node) {
	const found = [];
	for (const { value } of strings(node.parameters ?? {})) {
		for (let start = value.indexOf('{'); start >= 0; start = value.indexOf('{', start + 1)) {
			let depth = 0;
			for (let i = start; i < value.length; i++) {
				if (value[i] === '{') depth++;
				else if (value[i] === '}' && --depth === 0) {
					try {
						const parsed = JSON.parse(value.slice(start, i + 1));
						if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length)
							found.push(parsed);
					} catch {}
					break;
				}
			}
		}
	}
	return found.sort((a, b) => Number(hasBoolean(b)) - Number(hasBoolean(a)));
}

const hasBoolean = (value) => Object.values(value).some((v) => typeof v === 'boolean');

/** Apply the ai settings of a scenario to a model result: every boolean, then explicit fields. */
function applyAi(value, ai) {
	let out = typeof ai.booleans === 'boolean' ? setBooleans(value, ai.booleans) : value;
	if (ai.set && out && typeof out === 'object') out = deepMerge(out, ai.set);
	return out;
}

/**
 * The output of an AI root node for a scenario. Returns { json, provenance }.
 * With a structured output parser, the result follows the parser schema. Without one, the
 * model returns text: ai.text when the scenario sets it, else the first JSON example in the
 * prompt of the node (the contract that the builder declared), else a plain sentence.
 */
function aiRootOutput(g, node, ai = {}) {
	const parserNode = g.aiInputs(node.name, 'ai_outputParser')[0];
	const parser = parserNode ? parserSchema(parserNode) : null;
	if (parser) {
		const parsed = parser.kind === 'schema' ? sample(parser.value, 'output') : parser.value;
		return { json: { output: applyAi(parsed, ai) }, provenance: 'output-parser' };
	}
	const wrap = AI_ROOT_PLACEHOLDER[node.type] ?? ((v) => ({ output: v }));
	if (ai.text !== undefined) return { json: wrap(ai.text), provenance: 'case' };
	const example = promptExamples(node)[0];
	if (example) return { json: wrap(JSON.stringify(applyAi(example, ai))), provenance: 'prompt-example' };
	return { json: wrap('Sample answer from the model.'), provenance: AI_ROOT_PLACEHOLDER[node.type] ? 'ai-root' : 'placeholder' };
}

/**
 * The pin data of each scenario. Logic nodes run for real. Triggers, service nodes and AI root
 * nodes get pin data, with the provenance of each node, so a check knows how far to trust it:
 *   fixture, case       the shape of real data (trigger code, or the case file)
 *   node-schema         the __schema__ file of the node
 *   output-parser       the schema of the attached structured output parser
 *   prompt-example      a JSON example in the prompt of an AI root node without a parser
 *   ai-root             the known output envelope of the AI root node
 *   placeholder, empty  nothing describes the output, so the shape is a guess or one empty item
 */
export function pinPlan(workflow, scenarios = {}, only = null) {
	const g = graph(workflow);
	const sdk = loadSdk()?.sdk;
	const list = only ?? (scenarios.scenarios?.length ? scenarios.scenarios : defaultScenarios(g));
	const plan = { pinned: {}, executed: [], subnodes: [...g.subnodes], scenarios: [] };
	for (const node of g.nodes) {
		if (!g.subnodes.has(node.name) && LOGIC_TYPES.has(node.type)) plan.executed.push(node.name);
	}
	for (const scenario of list) {
		const pinData = {};
		const provenance = {};
		const byType = mergeByType(scenarios.pinByType, scenario.pinByType);
		for (const node of g.nodes) {
			if (g.subnodes.has(node.name) || LOGIC_TYPES.has(node.type)) continue;
			let items;
			let source;
			const caseItems = Object.entries(byType).find(([pattern]) => typeMatches(node.type, pattern))?.[1];
			const explicit = scenario.trigger ?? scenarios.trigger;
			const trigger = isTrigger(node.type) && (explicit || !caseItems) ? triggerItems(node, scenario, scenarios) : null;
			if (trigger) {
				items = trigger.items;
				source = trigger.source;
			} else if (caseItems) {
				items = caseItems;
				source = 'case';
			} else if (isAiRootNode(g, node) || (isAiNode(g, node) && AI_ROOT_PLACEHOLDER[node.type])) {
				const out = aiRootOutput(g, node, scenario.ai);
				items = [out.json];
				source = out.provenance;
			} else {
				const schema = sdk?.discoverOutputSchemaForNode(node.type, node.typeVersion, node.parameters ?? {});
				items = [schema ? sample(schema, 'item') : {}];
				source = schema ? 'node-schema' : 'empty';
			}
			pinData[node.name] = (Array.isArray(items) ? items : [items]).map((json) => ({ json }));
			provenance[node.name] = source;
		}
		plan.scenarios.push({ name: scenario.name, expect: scenario.expect ?? {}, pinData, provenance, byType, triggerNode: scenarioTrigger(g, scenario) });
		Object.assign(plan.pinned, provenance);
	}
	return plan;
}

/**
 * The trigger that a scenario starts from, or null when the workflow has one trigger. Without
 * scenario.triggerNode, it is the trigger whose downstream nodes match the most expect.reach types.
 */
function scenarioTrigger(g, scenario) {
	if (g.triggers.length < 2) return null;
	if (scenario.triggerNode && g.triggers.some((t) => t.name === scenario.triggerNode)) return scenario.triggerNode;
	const reach = scenario.expect?.reach ?? [];
	const score = (trigger) => {
		const types = [...downstream(g, trigger.name)].map((name) => g.byName.get(name)?.type ?? '');
		return reach.filter((pattern) => types.some((type) => typeMatches(type, pattern))).length;
	};
	return g.triggers.reduce((best, t) => (score(t) > score(best) ? t : best)).name;
}

/** Case pin data by node type. A scenario entry replaces a case entry for the same short type. */
function mergeByType(base = {}, extra = {}) {
	const out = { ...base };
	for (const [pattern, items] of Object.entries(extra ?? {})) {
		for (const key of Object.keys(out)) if (shortType(key).toLowerCase() === shortType(pattern).toLowerCase()) delete out[key];
		out[pattern] = items;
	}
	return out;
}

/** Without a case file: one scenario for each value of the booleans that an AI node returns. */
function defaultScenarios(g) {
	const hasAi = g.nodes.some((n) => g.aiInputs(n.name, 'ai_languageModel').length && !g.subnodes.has(n.name));
	return hasAi
		? [{ name: 'AI flags true', ai: { booleans: true } }, { name: 'AI flags false', ai: { booleans: false } }]
		: [{ name: 'Default run' }];
}

// --- CLI -----------------------------------------------------------------------

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [command, workflowFile, scenariosFile] = process.argv.slice(2);
	if (command !== 'pin-plan' || !workflowFile) {
		console.error('usage: node sdk.mjs pin-plan <workflow.json> [scenarios.json]');
		process.exit(2);
	}
	const workflow = JSON.parse(readFileSync(workflowFile, 'utf8'));
	const scenarios = scenariosFile && existsSync(scenariosFile) ? JSON.parse(readFileSync(scenariosFile, 'utf8')) : {};
	process.stdout.write(JSON.stringify(pinPlan(workflow, scenarios)));
}
