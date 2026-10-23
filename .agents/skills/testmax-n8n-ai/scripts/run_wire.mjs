#!/usr/bin/env node
// Run each workflow of a run directory with the real node code, and record its service requests.
//
//   node run_wire.mjs <run-dir>
//
// wire.mjs runs the workflow in this process. Only the trigger is pinned, and the AI root
// nodes too, except in the real-AI scenarios. Every other node runs, and the HTTP requests of
// the service nodes get answers in the documented shape of each API. A node that runs must be on
// the allow-list (runsInProcess), else the scenarios that run it are skipped. Three kinds of scenario:
//   contract  the scenarios of scenarios.json, with the AI output pinned as in run_scenarios.py
//   edge      the edge cases of the trigger (TRIGGER_KITS in sdk.mjs) and scenarios.json "edge"
//   ai        scenarios.json "questions": the AI nodes call their real model with each question
// Writes <builder>/wire.json.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { LOGIC_TYPES, TRIGGER_KITS, graph, isAiNode, isTrigger, pinPlan, typeMatches } from './sdk.mjs';
import { MODEL_CREDENTIALS, fillSetup, isWrite, loadEngine, modelKey, nodeCredentialTypes, runWorkflow, startNode } from './wire.mjs';

const ITEMS_PER_NODE = 3;
const BODY_CHARS = 1500;
// This process holds the settings and has no sandbox. The eval hook answers only the requests that
// go through the n8n request helpers. Database, SSH, FTP and SMTP clients, files and a shell bypass
// it, so only the node types below run here.
// These nodes run code from the builder. The pinned-data runs run them in the n8n task runner.
const CODE_NODE_TYPES = new Set([
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	'n8n-nodes-base.aiTransform',
	'@n8n/n8n-nodes-langchain.code',
	'@n8n/n8n-nodes-langchain.toolCode',
]);
// Telegram is here because its credential has no authenticate block.
const IN_PROCESS_TYPES = new Set([
	...[...LOGIC_TYPES].filter((type) => !CODE_NODE_TYPES.has(type)),
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.wait',
	'n8n-nodes-base.telegram',
]);
// Each model node has a key in MODEL_CREDENTIALS. The other nodes call only the model or the helpers.
const IN_PROCESS_AI_TYPES = new Set(
	[
		'agent', 'chainLlm', 'chainSummarization', 'informationExtractor', 'textClassifier', 'sentimentAnalysis',
		'openAi', 'anthropic', 'googleGemini',
		'lmChatOpenAi', 'lmChatAnthropic', 'lmChatGoogleGemini', 'lmChatMistralCloud', 'lmChatGroq',
		'outputParserStructured', 'outputParserAutofixing', 'outputParserItemList',
		'memoryBufferWindow', 'toolCalculator', 'toolThink', 'toolHttpRequest',
	].map((type) => `@n8n/n8n-nodes-langchain.${type}`),
);
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

/** Read a path such as `messages[0].from` from a value. */
export function readPath(value, path) {
	const keys = Array.isArray(path) ? path : String(path).match(/[^.[\]]+/g) ?? [];
	return keys.reduce((v, k) => (v == null ? undefined : v[/^\d+$/.test(k) ? Number(k) : k]), value);
}

const requestText = (r) => JSON.stringify({ url: r.url, qs: r.qs ?? undefined, body: r.body ?? undefined });

function nodeSummary(runData, types) {
	const nodes = {};
	for (const [name, runs] of Object.entries(runData ?? {})) {
		const run = runs.at(-1) ?? {};
		const outputs = (run.data?.main ?? []).map((o) => o ?? []);
		const error = run.error;
		nodes[name] = {
			type: types[name],
			status: run.executionStatus,
			error: error ? error.message ?? error.description ?? String(error) : null,
			runs: runs.length,
			outputCounts: outputs.map((o) => o.length),
			items: outputs.flat().slice(0, ITEMS_PER_NODE).map((i) => i.json),
		};
	}
	return nodes;
}

const trim = (value) => {
	const text = value === undefined ? undefined : JSON.stringify(value);
	return text && text.length > BODY_CHARS ? `${text.slice(0, BODY_CHARS)}…` : value;
};
const trimRequest = (r) => ({ ...r, body: trim(r.body), response: trim(r.response) });

/**
 * Resolve a marker of an expectation:
 *   @trigger.<path>          a value of the first trigger item, such as @trigger.messages[0].from
 *   @response.<type>.<path>  a value of the response to the last write request of a node type,
 *                            such as @response.notion.id (the id of the page that Notion created)
 * Other strings stay as they are.
 */
function resolveMarker(value, triggerItem, requests) {
	if (typeof value !== 'string') return value;
	if (value.startsWith('@trigger.')) return readPath(triggerItem, value.slice('@trigger.'.length));
	const response = value.match(/^@response\.([^.]+)\.(.+)$/);
	if (response) {
		const last = requests.filter((r) => isWrite(r) && typeMatches(r.nodeType, response[1])).at(-1);
		return last ? readPath(last.response, response[2]) : undefined;
	}
	return value;
}

/** Check the expectations of a scenario against the nodes that ran and the requests that they sent. */
export function evaluate(scenario, nodes, requests, trigger, kit) {
	const checks = [];
	const expect = scenario.expect ?? {};
	const ran = Object.values(nodes).filter((n) => n.status === 'success' && !n.error);
	for (const pattern of expect.reach ?? []) {
		checks.push({ kind: 'reach', type: pattern, ok: ran.some((n) => typeMatches(n.type ?? '', pattern)) });
	}
	for (const pattern of expect.skip ?? []) {
		checks.push({ kind: 'skip', type: pattern, ok: !Object.values(nodes).some((n) => typeMatches(n.type ?? '', pattern)) });
	}
	for (const want of expect.requests ?? []) {
		// An array in contains means any one of its markers.
		const contains = (want.contains ?? []).map((c) => (Array.isArray(c) ? c : [c]).map((m) => ({ marker: m, value: resolveMarker(m, trigger[0], requests) })));
		const sent = requests.filter((r) => typeMatches(r.nodeType, want.type) && (!want.method || r.method === want.method.toUpperCase()));
		const has = (r, any) => any.some((c) => c.value !== undefined && c.value !== null && requestText(r).includes(String(c.value)));
		const matching = sent.filter((r) => contains.every((any) => has(r, any)));
		const ok = want.count === undefined ? matching.length > 0 : matching.length === want.count;
		const show = (c) => (c.marker === c.value ? `"${c.value}"` : `${c.marker} ("${c.value ?? 'not found'}")`);
		const details = sent.length
			? sent.map((r) => {
					const missing = contains.filter((any) => !has(r, any)).map((any) => any.map(show).join(' or '));
					if (missing.length) return `${r.node}: ${r.method} ${r.url} does not carry ${missing.join(', ')}`;
					const body = r.body === undefined ? '' : JSON.stringify(r.body);
					return `${r.node}: ${r.method} ${r.url}${body ? ` with \`${body.length > 300 ? `${body.slice(0, 300)}…` : body}\`` : ''}`;
				})
			: [`No ${want.method ?? ''} request from a ${want.type} node.`.replace('  ', ' ')];
		checks.push({ kind: 'request', type: want.type, contains: contains.map((any) => any.map((c) => c.marker).join(' or ')), count: want.count, ok, details });
	}
	if (expect.noWrites) {
		const writes = requests.filter(isWrite);
		checks.push({ kind: 'noWrites', ok: writes.length === 0, details: writes.map((r) => `${r.node}: ${r.method} ${r.url}`) });
	}
	if (scenario.derive === 'each-item' && kit) {
		const ids = trigger.map((item) => String(readPath(item, kit.identity)));
		const carriers = requests.filter((r) => isWrite(r) && ids.some((id) => requestText(r).includes(id)));
		const byNode = new Map();
		for (const r of carriers) byNode.set(r.node, [...(byNode.get(r.node) ?? []), r]);
		const details = [];
		let ok = byNode.size > 0;
		for (const [node, list] of byNode) {
			const reached = ids.filter((id) => list.some((r) => requestText(r).includes(id)));
			const missed = ids.filter((id) => !reached.includes(id));
			if (missed.length) ok = false;
			details.push(`${node}: ${list.length} request${list.length === 1 ? '' : 's'}, for ${reached.join(', ') || 'nobody'}${missed.length ? `, nothing for ${missed.join(', ')}` : ''}`);
		}
		if (!byNode.size) details.push(`No outgoing request names a sender (${ids.join(', ')}).`);
		checks.push({ kind: 'eachItem', ids, ok, details });
	}
	return checks;
}

/** The scenarios of one workflow: contract, edge and AI, with their pin data and case rows. */
function buildScenarios(workflow, cfg) {
	const g = graph(workflow);
	const triggerNode = g.triggers.find((t) => isTrigger(t.type));
	const kit = triggerNode ? TRIGGER_KITS[triggerNode.type] : undefined;
	const contract = cfg.scenarios?.length ? cfg.scenarios : null;
	const edges = [...(kit?.edges ?? []), ...(cfg.edge ?? [])];
	// The triggerNode of pinPlan stays: a name from scenarios.json can be missing in this workflow.
	const merge = (s, entry, kind) => ({ ...s, ...entry, triggerNode: s.triggerNode, kind });
	const list = [
		...(contract ? pinPlan(workflow, cfg, contract).scenarios.map((s, i) => merge(s, contract[i], 'contract')) : pinPlan(workflow, cfg).scenarios.map((s) => merge(s, {}, 'contract'))),
		...pinPlan(workflow, cfg, edges).scenarios.map((s, i) => merge(s, edges[i], 'edge')),
		...pinPlan(workflow, cfg, cfg.questions ?? []).scenarios.map((s, i) => merge(s, cfg.questions[i], 'ai')),
	];
	const keep = (name) => {
		const node = g.byName.get(name);
		return node && (isTrigger(node.type) || isAiNode(g, node));
	};
	return {
		g,
		scenarios: list.map((s) => {
			const pinData = Object.fromEntries(
				Object.entries(s.pinData).filter(([name]) => keep(name) && !(s.kind === 'ai' && isAiNode(g, g.byName.get(name)))),
			);
			return { ...s, pinData };
		}),
	};
}

/** Model sub-nodes and vendor model nodes, and whether a key exists for each, for the real-AI scenarios. */
function modelReadiness(g) {
	const subnodes = g.edges.filter((e) => e.type === 'ai_languageModel').map((e) => g.byName.get(e.from));
	const vendors = g.nodes.filter((n) => isAiNode(g, n) && !g.aiInputs(n.name, 'ai_languageModel').length);
	return [...new Set([...subnodes, ...vendors])].map((node) => {
		const types = nodeCredentialTypes(node).filter((t) => MODEL_CREDENTIALS[t]);
		const type = types.find((t) => modelKey(t)) ?? types[0];
		const p = node.parameters ?? {};
		return { node: node.name, credentialType: type ?? null, model: p.modelName ?? p.model?.value ?? p.model ?? p.modelId?.value ?? null, ready: Boolean(type && modelKey(type)) };
	});
}

const isHttpCredential = (name, { credentialType, parentTypes }) =>
	credentialType(name).authenticate !== undefined || [name, ...parentTypes(name)].some((p) => p === 'oAuth1Api' || p === 'oAuth2Api');

/**
 * True for a node on the allow-list: the types above, declarative nodes, and nodes whose credentials
 * all authenticate HTTP requests. A tool variant (slackTool) counts as its base node.
 */
export function runsInProcess(node) {
	const base = node.type.startsWith('n8n-nodes-base.') && node.type.endsWith('Tool') ? node.type.slice(0, -'Tool'.length) : node.type;
	if (IN_PROCESS_TYPES.has(base) || IN_PROCESS_AI_TYPES.has(base)) return true;
	if (!base.startsWith('n8n-nodes-base.')) return false;
	const engine = loadEngine();
	try {
		const { description } = engine.nodeTypes.getByNameAndVersion(base, node.typeVersion);
		if (description.requestDefaults !== undefined) return true;
		const credentials = (description.credentials ?? []).map((c) => c.name);
		return credentials.length > 0 && credentials.every((name) => isHttpCredential(name, engine));
	} catch {
		return false;
	}
}

/**
 * The names and types of the nodes that run from the start trigger and are not on the allow-list.
 * Pinned nodes do not run. A disabled node passes its input on, so the walk goes through it.
 */
function outsideAllowList(workflow, g, start, pinData) {
	const seen = new Set([start]);
	const running = new Set();
	// A Set visits the entries that the loop adds.
	for (const name of seen) {
		for (const targets of workflow.connections?.[name]?.main ?? []) {
			for (const { node } of targets ?? []) {
				if (seen.has(node)) continue;
				seen.add(node);
				if (g.byName.has(node) && !Object.hasOwn(pinData, node)) running.add(node);
			}
		}
	}
	for (const name of running) {
		for (const e of g.edges) if (e.to === name && e.type.startsWith('ai_')) running.add(e.from);
	}
	return [...running].map((name) => g.byName.get(name)).filter((n) => !runsInProcess(n)).map((n) => `${n.name} (${n.type})`);
}

async function runBuilder(dir, cfg) {
	const workflow = readJson(join(dir, 'workflow.json'));
	const { g, scenarios } = buildScenarios(workflow, cfg);
	const canvas = readJson(join(dir, 'canvas-issues.json'));
	const { workflow: filledWorkflow, filled } = fillSetup(workflow, canvas);
	const types = Object.fromEntries((workflow.nodes ?? []).map((n) => [n.name, n.type]));
	const models = modelReadiness(g);
	const out = { filled, models, scenarios: [] };
	for (const scenario of scenarios) {
		const entry = { name: scenario.name, kind: scenario.kind, why: scenario.why, expect: scenario.expect ?? {}, derive: scenario.derive, pinned: Object.keys(scenario.pinData) };
		if (scenario.kind === 'ai' && !models.length) {
			out.scenarios.push({ ...entry, status: 'skipped', error: 'The workflow has no model sub-node.' });
			continue;
		}
		const start = startNode(workflow, scenario.pinData, scenario.triggerNode);
		const outside = start ? outsideAllowList(workflow, g, start.name, scenario.pinData) : [];
		if (outside.length) {
			out.scenarios.push({ ...entry, status: 'skipped', error: `Nodes outside the in-process allow-list: ${outside.join(', ')}.` });
			continue;
		}
		if (scenario.kind === 'ai' && models.some((m) => !m.ready)) {
			const missing = models.filter((m) => !m.ready).map((m) => `${m.node} (${m.credentialType ?? 'unknown credential'}: set ${MODEL_CREDENTIALS[m.credentialType]?.keys[0] ?? 'a supported model'})`);
			out.scenarios.push({ ...entry, status: 'skipped', error: `No model key for ${missing.join(', ')}.` });
			continue;
		}
		const rows = (node) => Object.entries(scenario.byType ?? {}).find(([pattern]) => typeMatches(node.type, pattern))?.[1];
		const trigger = start ? scenario.pinData[start.name].map((i) => i.json) : [];
		const kit = start ? TRIGGER_KITS[start.type] : undefined;
		const result = await runWorkflow(filledWorkflow, { pinData: scenario.pinData, triggerNode: scenario.triggerNode, rows, realModels: scenario.kind === 'ai' });
		const nodes = nodeSummary(result.runData, types);
		const errors = Object.entries(nodes).filter(([, n]) => n.error).map(([name, n]) => `${name}: ${n.error}`);
		Object.assign(entry, {
			status: result.status,
			error: result.error,
			ms: result.ms,
			nodes,
			requests: result.requests.map(trimRequest),
			blocked: result.blocked,
			checks: evaluate(scenario, nodes, result.requests, trigger, kit),
		});
		if (scenario.kind === 'ai') {
			entry.aiOutputs = Object.fromEntries(Object.entries(nodes).filter(([name]) => isAiNode(g, g.byName.get(name))).map(([name, n]) => [name, n.items]));
		}
		console.log(`[wire] ${dir.split('/').pop()}: ${scenario.kind} "${scenario.name}" -> ${result.status}${errors.length ? ` (${errors[0]})` : result.error ? ` (${result.error})` : ''}`);
		out.scenarios.push(entry);
	}
	return out;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
	const runDir = resolve(process.argv[2] ?? '.');
	const loaded = loadEngine();
	const cfg = readJson(join(runDir, 'scenarios.json')) ?? {};
	for (const entry of readdirSync(runDir, { withFileTypes: true })) {
		const dir = join(runDir, entry.name);
		if (!entry.isDirectory() || !existsSync(join(dir, 'workflow.json'))) continue;
		let out;
		if (loaded.error) out = { skipped: loaded.error, scenarios: [] };
		else {
			try {
				out = await runBuilder(dir, cfg);
			} catch (error) {
				out = { skipped: `${error?.name ?? 'Error'}: ${error?.message ?? error}`, scenarios: [] };
			}
		}
		// A failed real model request can echo its URL, with the key, in the error message.
		const keys = Object.keys(MODEL_CREDENTIALS).map(modelKey).filter(Boolean);
		writeFileSync(join(dir, 'wire.json'), keys.reduce((text, key) => text.replaceAll(key, '[redacted]'), JSON.stringify(out, null, 1)));
		if (out.skipped) console.log(`[wire] ${entry.name}: skipped, ${out.skipped}`);
	}
	// Model SDKs can keep sockets open.
	process.exit(0);
}
