// Run a workflow in this process with the real node code, and answer its HTTP requests here.
//
// The n8n execution engine and the nodes load from the compiled dist folders of the repository,
// as in the execution evaluator of ai-workflow-builder.ee. n8n-core calls additionalData
// .evalLlmMockHandler before it authenticates or sends a request (the Instance AI eval hook),
// so every service request reaches respond() below and no request leaves the machine.
// Credentials come from buildEvalMockCredentials, the same placeholders that the eval uses.
// AI root nodes either get pinned data, or call their real model with a key from the settings.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { repo } from './sdk.mjs';

const coreRequire = createRequire(join(repo, 'packages/core/package.json'));
const PACKAGES = [
	['n8n-nodes-base', join(repo, 'packages/nodes-base')],
	['@n8n/n8n-nodes-langchain', join(repo, 'packages/@n8n/nodes-langchain')],
];
const REQUIRED_DIST = [
	'packages/core/dist/execution-engine/index.js',
	'packages/nodes-base/dist/known/nodes.json',
	'packages/@n8n/nodes-langchain/dist/known/nodes.json',
];

// --- Settings ------------------------------------------------------------------

// Same order as n8n_api.config(): .env.local, then .env.ai-surfaces, then the environment.
const fileSettings = {};
for (const file of [join(repo, '.env.local'), process.env.AI_SURFACES_ENV ?? join(repo, '.env.ai-surfaces')]) {
	if (!existsSync(file)) continue;
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
		const value = match?.[2].trim().replace(/^(['"])(.*)\1$/, '$2');
		if (value) fileSettings[match[1]] = value;
	}
}
export const setting = (name) => process.env[name] || fileSettings[name] || '';

/** Model credential types, the settings that can hold their key, and the hosts of their API. */
export const MODEL_CREDENTIALS = {
	googlePalmApi: { keys: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY'], field: 'apiKey', hosts: ['generativelanguage.googleapis.com'] },
	openAiApi: { keys: ['OPENAI_API_KEY'], field: 'apiKey', hosts: ['api.openai.com'] },
	anthropicApi: { keys: ['ANTHROPIC_API_KEY'], field: 'apiKey', hosts: ['api.anthropic.com'] },
	mistralCloudApi: { keys: ['MISTRAL_API_KEY'], field: 'apiKey', hosts: ['api.mistral.ai'] },
	groqApi: { keys: ['GROQ_API_KEY'], field: 'apiKey', hosts: ['api.groq.com'] },
};
export const modelKey = (type) => MODEL_CREDENTIALS[type]?.keys.map(setting).find(Boolean) ?? '';

// --- Engine --------------------------------------------------------------------

let engine;

/** The execution engine, node types and credential types. Returns { error } when a dist folder is missing. */
export function loadEngine() {
	if (engine) return engine;
	const missing = REQUIRED_DIST.filter((p) => !existsSync(join(repo, p)));
	if (missing.length) return { error: `Build these first: ${missing.join(', ')}.` };
	coreRequire('reflect-metadata');
	const workflowLib = coreRequire('n8n-workflow');
	const core = coreRequire(join(repo, 'packages/core/dist/execution-engine/index.js'));
	const nodes = new Map();
	const credentials = new Map();
	for (const [prefix, dir] of PACKAGES) {
		const read = (file) => JSON.parse(readFileSync(join(dir, 'dist/known', file), 'utf8'));
		for (const [name, info] of Object.entries(read('nodes.json'))) nodes.set(`${prefix}.${name}`, { ...info, dir });
		for (const [name, info] of Object.entries(read('credentials.json'))) credentials.set(name, { ...info, dir });
	}
	const instances = new Map();
	const instance = (index, name) => {
		const key = `${index === nodes ? 'n' : 'c'}:${name}`;
		if (!instances.has(key)) {
			const info = index.get(name);
			if (!info) throw new Error(`Unknown type ${name}`);
			const mod = createRequire(join(info.dir, 'package.json'))(join(info.dir, info.sourcePath));
			instances.set(key, new mod[info.className]());
		}
		return instances.get(key);
	};
	const nodeTypes = {
		getByName: (type) => instance(nodes, type),
		getByNameAndVersion: (type, version) => {
			const loaded = instance(nodes, type);
			const versioned = 'nodeVersions' in loaded ? workflowLib.NodeHelpers.getVersionedNodeType(loaded, version) : loaded;
			// The same rule as shouldAssignExecuteMethod in packages/cli/src/utils.ts. Without it a
			// declarative node with a webhook (WhatsApp send and wait) gets no input data for $json.
			const declarative = versioned.description?.requestDefaults !== undefined;
			if (!versioned.execute && !versioned.supplyData && !versioned.poll && !versioned.trigger && (!versioned.webhook || declarative) && (!versioned.methods || declarative)) {
				versioned.execute = async function () {
					return (await new core.RoutingNode(this, versioned).runNode()) ?? [];
				};
			}
			return versioned;
		},
		getKnownTypes: () => ({}),
	};
	const credentialType = (name) => instance(credentials, name);
	const parentTypes = (name) => {
		try {
			return (credentialType(name).extends ?? []).flatMap((p) => [p, ...parentTypes(p)]);
		} catch {
			return [];
		}
	};
	const credentialProperties = (name) => [...(credentialType(name).extends ?? []).flatMap(credentialProperties), ...(credentialType(name).properties ?? [])];
	engine = { workflowLib, core, nodeTypes, nodes, credentialType, parentTypes, credentialProperties };
	return engine;
}

/** Credential types that a node can use, from its node type description. */
export function nodeCredentialTypes(node) {
	try {
		return (loadEngine().nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description.credentials ?? []).map((c) => c.name);
	} catch {
		return [];
	}
}

/** Apply the generic authenticate rule of a credential type, such as `qs.key` of Google Gemini. */
function applyGenericAuth(credentialType, credentials, request) {
	const auth = credentialType.authenticate;
	if (!auth || typeof auth !== 'object' || auth.type !== 'generic') return request;
	const fill = (v) => (typeof v === 'string' ? v.replace(/^=/, '').replace(/\{\{\s*\$credentials\.(\w+)\s*\}\}/g, (_m, k) => credentials[k] ?? '') : v);
	for (const part of ['headers', 'qs', 'body']) {
		const props = auth.properties?.[part];
		if (props) request[part] = { ...(request[part] ?? {}), ...Object.fromEntries(Object.entries(props).map(([k, v]) => [k, fill(v)])) };
	}
	return request;
}

function credentialsHelper(realModels) {
	const { core, parentTypes, credentialProperties, credentialType } = loadEngine();
	return {
		getParentTypes: parentTypes,
		getDecrypted: async (_data, _details, type) => {
			const mocked = core.buildEvalMockCredentials(credentialProperties(type));
			const model = MODEL_CREDENTIALS[type];
			if (realModels && model) mocked[model.field] = modelKey(type);
			return mocked;
		},
		// Vendor model nodes send their request through the n8n helpers, so the real key must be applied here.
		authenticate: async (credentials, type, request) => (realModels && MODEL_CREDENTIALS[type] ? applyGenericAuth(credentialType(type), credentials, request) : request),
		preAuthentication: async () => undefined,
		runPreAuthentication: async () => undefined,
		getCredentials: async () => ({}),
		getCredentialsProperties: (type) => credentialProperties(type),
		updateCredentials: async () => {},
		updateCredentialsOauthTokenData: async () => {},
		isCredentialUsableByNode: () => true,
	};
}

// --- Setup values ----------------------------------------------------------------

/** Values that a node accepts for a parameter that the builder left for setup. */
const SETUP_VALUES = {
	'googleSheets.sheetName': 'gid=0',
};

const isEmptyValue = (v) => v === undefined || v === null || v === '';

/**
 * A copy of the workflow with placeholder values in the parameters that the builder left for
 * the user: empty resource locators, and empty parameters that the editor reports as required.
 * Returns { workflow, filled }.
 */
export function fillSetup(workflow, canvas) {
	const copy = structuredClone(workflow);
	const filled = [];
	const required = new Map();
	for (const node of canvas?.nodes ?? []) {
		for (const [param, messages] of Object.entries(node.issues?.parameters ?? {})) {
			if (messages.some((m) => /is required/i.test(m))) required.set(`${node.name}|${param}`, true);
		}
	}
	for (const node of copy.nodes ?? []) {
		const short = node.type.slice(node.type.lastIndexOf('.') + 1);
		for (const [param, value] of Object.entries(node.parameters ?? {})) {
			const placeholder = SETUP_VALUES[`${short}.${param}`] ?? `mock-${param}`;
			if (value && typeof value === 'object' && value.__rl && isEmptyValue(value.value)) {
				node.parameters[param] = { ...value, value: placeholder };
				filled.push(`${node.name} › ${param}`);
			} else if (isEmptyValue(value) && required.has(`${node.name}|${param}`)) {
				node.parameters[param] = placeholder;
				filled.push(`${node.name} › ${param}`);
			}
		}
	}
	return { workflow: copy, filled };
}

// --- Wire responses --------------------------------------------------------------

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export const isWrite = (request) => WRITE_METHODS.has(request.method);

/** Rows for a read node: [{ Question, Answer }, ...] become the header row and the value rows. */
function sheetValues(rows) {
	const headers = [...new Set(rows.flatMap((r) => Object.keys(r ?? {})))];
	if (!headers.length) return [['Question', 'Answer']];
	return [headers, ...rows.map((r) => headers.map((h) => (r?.[h] === undefined ? '' : String(r[h]))))];
}

/** Page properties as Notion returns them: each with an id, a type, and plain_text in rich text. */
function notionProperties(sent = {}) {
	const out = {};
	for (const [name, value] of Object.entries(sent ?? {})) {
		const type = value?.type ?? Object.keys(value ?? {}).find((k) => k !== 'id' && k !== 'type') ?? 'rich_text';
		let content = value?.[type];
		if (Array.isArray(content)) content = content.map((t) => ({ type: 'text', ...t, plain_text: t?.plain_text ?? t?.text?.content ?? '' }));
		out[name] = { id: `prop-${Object.keys(out).length}`, type, [type]: content ?? null };
	}
	if (!Object.values(out).some((p) => p.type === 'title')) out.Name = { id: 'title', type: 'title', title: [] };
	return out;
}

const bodyOf = (request) => {
	if (typeof request.body !== 'string') return request.body ?? {};
	try {
		return JSON.parse(request.body);
	} catch {
		return {};
	}
};

/**
 * Responses in the shape that each API documents. A fixture matches on host, method and path.
 * rows(node) gives the case rows for a read node (scenarios.json pinByType).
 */
const FIXTURES = [
	{
		service: 'Google Sheets',
		host: /(^|\.)sheets\.googleapis\.com$/,
		method: 'GET',
		path: /^\/v4\/spreadsheets\/[^/]+$/,
		respond: () => ({ spreadsheetId: 'mock-sheet', properties: { title: 'FAQ' }, sheets: [{ properties: { sheetId: 0, title: 'Sheet1', index: 0, gridProperties: { rowCount: 100, columnCount: 26 } } }] }),
	},
	{
		service: 'Google Sheets',
		host: /(^|\.)sheets\.googleapis\.com$/,
		method: 'GET',
		path: /^\/v4\/spreadsheets\/[^/]+\/values\//,
		respond: (_r, ctx, node) => ({ range: 'Sheet1!A1:Z100', majorDimension: 'ROWS', values: sheetValues(ctx.rows(node) ?? []) }),
	},
	{
		service: 'Google Sheets',
		host: /(^|\.)sheets\.googleapis\.com$/,
		method: 'POST',
		path: /:append$|values:batchUpdate$|:batchUpdate$/,
		respond: () => ({ spreadsheetId: 'mock-sheet', updates: { updatedRange: 'Sheet1!A2:B2', updatedRows: 1 }, replies: [] }),
	},
	{
		service: 'Notion',
		host: /(^|\.)api\.notion\.com$/,
		method: 'GET',
		path: /^\/v1\/(databases|data_sources)\/[^/]+$/,
		respond: (r) => ({
			object: r.url.includes('data_sources') ? 'data_source' : 'database',
			id: 'mock-database',
			title: [{ type: 'text', plain_text: 'Support tickets', text: { content: 'Support tickets' } }],
			properties: { Name: { id: 'title', name: 'Name', type: 'title', title: {} } },
			data_sources: [{ id: 'mock-data-source', name: 'Support tickets' }],
		}),
	},
	{
		service: 'Notion',
		host: /(^|\.)api\.notion\.com$/,
		method: 'POST',
		path: /^\/v1\/pages$/,
		respond: (r) => {
			const body = bodyOf(r);
			return { object: 'page', id: '59833787-2cf9-4fdf-8782-e53db20768a5', created_time: '2026-01-01T09:00:00.000Z', last_edited_time: '2026-01-01T09:00:00.000Z', archived: false, in_trash: false, parent: body.parent ?? {}, properties: notionProperties(body.properties), url: 'https://www.notion.so/Ticket-598337872cf94fdf8782e53db20768a5', public_url: null };
		},
	},
	{
		service: 'Notion',
		host: /(^|\.)api\.notion\.com$/,
		method: 'PATCH',
		path: /^\/v1\/blocks\/[^/]+\/children$/,
		respond: (r) => ({ object: 'list', results: (bodyOf(r).children ?? []).map((c, i) => ({ object: 'block', id: `mock-block-${i}`, ...c })), next_cursor: null, has_more: false }),
	},
	{
		service: 'Slack',
		host: /(^|\.)slack\.com$/,
		method: 'POST',
		path: /^\/api\/chat\.postMessage$/,
		respond: (r) => {
			const body = bodyOf(r);
			return { ok: true, channel: body.channel ?? 'C0000000000', ts: '1767258000.000100', message: { type: 'message', text: body.text ?? '', ts: '1767258000.000100', bot_id: 'B0000000000' } };
		},
	},
	{
		service: 'WhatsApp Cloud API',
		host: /(^|\.)graph\.facebook\.com$/,
		method: 'POST',
		path: /^\/v\d+(\.\d+)?\/[^/]+\/messages$/,
		respond: (r) => {
			const to = bodyOf(r).to ?? '';
			return { messaging_product: 'whatsapp', contacts: [{ input: to, wa_id: to }], messages: [{ id: 'wamid.HBgLMTU1NTAwMDExMTEVAgARGBI5QTNDQTVCM0Q0Q0Q2RTY3RTcA' }] };
		},
	},
	{
		service: 'Telegram Bot API',
		host: /(^|\.)api\.telegram\.org$/,
		method: 'POST',
		path: /\/sendMessage$/,
		respond: (r) => ({ ok: true, result: { message_id: 2, date: 1767258000, chat: { id: bodyOf(r).chat_id ?? 1001, type: 'private' }, text: bodyOf(r).text ?? '' } }),
	},
	{
		service: 'Gmail',
		host: /(^|\.)gmail\.googleapis\.com$|(^|\.)www\.googleapis\.com$/,
		method: 'POST',
		path: /\/messages\/send$/,
		respond: () => ({ id: 'mock-message', threadId: 'mock-thread', labelIds: ['SENT'] }),
	},
];

/**
 * A request handler for evalLlmMockHandler. Every request is recorded in ctx.requests with the
 * fixture that answered it. A request with no fixture gets a generic answer: a read gets an
 * empty object, a write gets its own body back with an id. A request to a host in passHosts
 * goes to the network: these are the model APIs of the real-AI scenarios.
 */
export function wireHandler(ctx, passHosts = new Set()) {
	return async (request, node) => {
		const url = new URL(request.url ?? '', 'https://unknown.invalid');
		if (request.baseURL && !/^https?:/.test(request.url ?? '')) {
			const base = new URL(request.baseURL);
			url.host = base.host;
			url.pathname = `${base.pathname.replace(/\/$/, '')}/${(request.url ?? '').replace(/^\//, '')}`;
		}
		const method = String(request.method ?? 'GET').toUpperCase();
		if (passHosts.has(url.hostname)) {
			ctx.requests.push({ node: node.name, nodeType: node.type, method, url: url.toString(), body: request.body, answeredBy: 'real model' });
			return undefined;
		}
		const fixture = FIXTURES.find((f) => f.host.test(url.hostname) && f.method === method && f.path.test(url.pathname));
		const record = { node: node.name, nodeType: node.type, method, url: url.toString(), qs: request.qs, body: request.body, answeredBy: fixture?.service ?? 'generic' };
		let body;
		try {
			body = fixture ? fixture.respond({ ...request, url: url.toString() }, ctx, node) : method === 'GET' ? {} : { id: 'mock-1', ...(bodyOf(request) ?? {}) };
		} catch (error) {
			body = { error: String(error) };
		}
		ctx.requests.push({ ...record, response: body });
		return { statusCode: 200, headers: { 'content-type': 'application/json' }, body };
	};
}

// --- Network guard ---------------------------------------------------------------

/**
 * Replace global fetch while a run is active. Model SDKs use fetch directly, so this is the
 * only path that could reach the network. Only the hosts in allow pass, the rest is blocked.
 */
function guardFetch(allow, blocked) {
	const original = globalThis.fetch;
	globalThis.fetch = async (input, init) => {
		const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
		if (allow.has(url.hostname)) return await original(input, init);
		blocked.push(`${init?.method ?? 'GET'} ${url.origin}${url.pathname}`);
		throw new Error(`Blocked network request to ${url.hostname} during a test run.`);
	};
	return () => {
		globalThis.fetch = original;
	};
}

// --- Code nodes ------------------------------------------------------------------

/**
 * additionalData.startRunnerTask. The n8n server sends Code node jobs to a sandboxed task runner.
 * This process has no sandbox, so it never runs builder code. run_wire.mjs skips workflows with a
 * Code node. This refusal catches a node type that it does not know.
 */
async function startRunnerTask(_data, jobType) {
	return { ok: false, error: { message: `${jobType} code does not run in the in-process run.` } };
}

// --- Run -------------------------------------------------------------------------

const CANCEL_GRACE_MS = 15_000;

/** The value of promise, or null after ms. */
async function within(promise, ms) {
	let timer;
	try {
		return await Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(null), ms)))]);
	} finally {
		clearTimeout(timer);
	}
}

/** The pinned trigger that a run starts from: triggerNode, or else the first pinned trigger. */
export const startNode = (workflow, pinData, triggerNode) =>
	workflow.nodes.find((n) => (!triggerNode || n.name === triggerNode) && Object.hasOwn(pinData, n.name) && !n.disabled && Object.keys(workflow.connections ?? {}).includes(n.name) && /trigger|webhook/i.test(n.type));

/**
 * Run a workflow once. pinData holds the trigger and any pinned nodes. triggerNode names the
 * trigger to start from. With realModels, model sub-nodes get the real key and fetch can reach
 * their API hosts. Returns { status, error, runData, requests, blocked, ms }.
 */
export async function runWorkflow(workflow, { pinData, triggerNode, rows = () => undefined, realModels = false, timeoutMs = 90_000 }) {
	const { workflowLib, core, nodeTypes } = loadEngine();
	const started = Date.now();
	const ctx = { requests: [], rows };
	const blocked = [];
	const allow = new Set(realModels ? Object.values(MODEL_CREDENTIALS).flatMap((m) => m.hosts) : []);
	const restore = guardFetch(allow, blocked);
	let stillRunning = false;
	try {
		const instance = new workflowLib.Workflow({ id: 'wire-run', name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, nodeTypes, active: false, settings: workflow.settings ?? {} });
		const start = startNode(workflow, pinData, triggerNode);
		if (!start) return { status: 'error', error: 'No pinned trigger to start from.', runData: {}, requests: [], blocked, ms: 0 };
		const hooks = new core.ExecutionLifecycleHooks('manual', 'wire-run', workflow);
		const finished = new Promise((resolve) => hooks.addHandler('workflowExecuteAfter', (run) => resolve(run)));
		const values = {
			executionId: 'wire-run',
			hooks,
			credentialsHelper: credentialsHelper(realModels),
			evalLlmMockHandler: wireHandler(ctx, allow),
			startRunnerTask,
			getRunnerStatus: () => ({ available: false }),
			variables: {},
			restApiUrl: 'http://localhost:5678/rest',
			instanceBaseUrl: 'http://localhost:5678',
			webhookBaseUrl: 'http://localhost:5678/webhook',
			webhookTestBaseUrl: 'http://localhost:5678/webhook-test',
			webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
			formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
			userId: 'wire-run-user',
		};
		// Unset fields stay undefined. Methods that n8n calls for logs and UI updates do nothing.
		const additionalData = new Proxy({}, {
			get: (_t, prop) => (prop in values ? values[prop] : typeof prop === 'string' && /^(log|send|set|on|emit|track)/.test(prop) ? () => undefined : undefined),
		});
		const runExecutionData = workflowLib.createRunExecutionData({
			executionData: { nodeExecutionStack: [{ node: start, data: { main: [pinData[start.name]] }, source: null }] },
			resultData: { pinData },
		});
		const execute = new core.WorkflowExecute(additionalData, 'manual', runExecutionData);
		const execution = execute.processRunExecutionData(instance);
		const run = await within(execution.then(() => finished), timeoutMs);
		if (!run) {
			// Cancel aborts the running node. Wait for the engine to stop, so no request runs after the guard is gone.
			execution.cancel();
			stillRunning = !(await within(execution.then(() => true, () => true), CANCEL_GRACE_MS));
			const error = `No result after ${timeoutMs / 1000} s.${stillRunning ? ' The run did not stop after the cancel.' : ''}`;
			return { status: 'timeout', error, runData: {}, requests: ctx.requests, blocked, ms: Date.now() - started };
		}
		const error = run.data?.resultData?.error;
		return { status: run.status, error: error ? error.message ?? String(error) : null, runData: run.data?.resultData?.runData ?? {}, requests: ctx.requests, blocked, ms: Date.now() - started };
	} catch (error) {
		return { status: 'error', error: `${error?.name ?? 'Error'}: ${error?.message ?? error}`, runData: {}, requests: ctx.requests, blocked, ms: Date.now() - started };
	} finally {
		// A run that did not stop keeps the guard. The process exits when all runs are done.
		if (!stillRunning) restore();
	}
}
