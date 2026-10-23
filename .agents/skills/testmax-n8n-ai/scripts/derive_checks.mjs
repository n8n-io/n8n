#!/usr/bin/env node
// Deterministic checks for each workflow that a run created. No LLM is involved.
//
//   node derive_checks.mjs <run-dir>
//
// Reads <builder>/workflow.json, canvas-issues.json and exec.json, and the optional wire.json,
// claims.json and binary-checks.json. Writes <builder>/auto-checks.json. A group with gating true
// changes the verdict. The other groups show a separate score.
//   correctness  node definitions, canvas issues, graph and expression references (gating)
//   execution    the pinned-data scenarios of run_scenarios.py (gating)
//   contract     service-call requests of run_wire.mjs (gating)
//   edge, ai     edge-case and real-AI scenarios of run_wire.mjs
//   claims       the final message against the trace, from claims.py
//   standards    rules from n8n-io/skills and the workflow-sdk best practices
//   binary       the deterministic eval binary checks, from binary_checks.mts
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	LOGIC_TYPES,
	SINGLE_ITEM_TYPES,
	TRIGGER_FIXTURES,
	downstream,
	graph,
	isManualTrigger,
	isTrigger,
	loadSdk,
	lookup,
	reachable,
	repo,
	sample,
	shortType,
	showPath,
	strings,
	typeMatches,
	workflowReferences,
} from './sdk.mjs';

const VERSION = 1;
const SKILLS = 'https://github.com/n8n-io/skills/blob/27b6b9f429ac0be90cae764512dbc579d7107e95/';
const GUIDES = 'packages/@n8n/workflow-sdk/src/prompts/best-practices/guides/';
const LC = '@n8n/n8n-nodes-langchain.';

const src = {
	validator: { label: '@n8n/workflow-sdk validateWorkflow with the node definitions' },
	canvas: { label: 'Node issues in the n8n editor (canvas status icons)' },
	graph: { label: 'Workflow connections' },
	expressions: { label: 'Expression references in node parameters' },
	execution: { label: 'Real output of the pinned-data runs (exec.json)' },
	wire: { label: 'In-process run with recorded API fixtures (wire.json)' },
	claims: { label: 'Final message, trace tool calls and workflow (claims.json)' },
	errorHandling: { label: 'n8n-error-handling-official', url: `${SKILLS}skills/n8n-error-handling-official/SKILL.md` },
	expressionsSkill: { label: 'n8n-expressions-official', url: `${SKILLS}skills/n8n-expressions-official/SKILL.md` },
	structured: {
		label: 'n8n-ai-nodes-official STRUCTURED_OUTPUT.md',
		url: `${SKILLS}skills/n8n-ai-nodes-official/references/STRUCTURED_OUTPUT.md`,
	},
	memory: { label: 'n8n-ai-nodes-official MEMORY.md', url: `${SKILLS}skills/n8n-ai-nodes-official/references/MEMORY.md` },
	comms: {
		label: 'n8n-node-configuration-official COMMS_NODES.md',
		url: `${SKILLS}skills/n8n-node-configuration-official/references/COMMS_NODES.md`,
	},
	triage: { label: 'workflow-sdk best practices: triage', path: `${GUIDES}triage.ts` },
	chatbot: { label: 'workflow-sdk best practices: chatbot', path: `${GUIDES}chatbot.ts` },
	multiItem: {
		label: 'WhatsAppTrigger.node.ts emits one item for each webhook change',
		path: 'packages/nodes-base/nodes/WhatsApp/WhatsAppTrigger.node.ts',
	},
};

const check = (id, ok, text, source, details = [], extra = {}) => ({ id, ok, text, source, details, ...extra });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

// --- Node kinds ----------------------------------------------------------------

const isAiRoot = (g, node) => node.type.startsWith(LC) && !g.subnodes.has(node.name) && g.aiInputs(node.name, 'ai_languageModel').length > 0;
const isBranch = (node) => typeMatches(node.type, 'if') || typeMatches(node.type, 'switch');
/** Nodes that call a service: not logic, not a trigger, not a sub-node. AI root nodes count. */
const isNetwork = (g, node) =>
	!g.subnodes.has(node.name) && !isTrigger(node.type) && !LOGIC_TYPES.has(node.type) && !typeMatches(node.type, 'stickyNote');

// Triggers that start one execution with one item. Other triggers can batch several events.
const SINGLE_ITEM_TRIGGERS = ['manualTrigger', 'scheduleTrigger', 'cron', 'interval', 'webhook', 'chatTrigger', 'formTrigger', 'telegramTrigger', 'slackTrigger'];
const MESSAGING_TRIGGERS = ['whatsAppTrigger', 'telegramTrigger', 'slackTrigger', 'chatTrigger', 'discordTrigger', 'microsoftTeamsTrigger', 'gmailTrigger'];
const ITEM_SOURCES = ['splitOut', 'code', 'itemLists'];

/** Names of the nodes that can output more than one item in one execution. */
function multiItemNodes(g) {
	const multi = new Set();
	const order = [...reachable(g)];
	let grew = true;
	while (grew) {
		grew = false;
		for (const name of order) {
			if (multi.has(name)) continue;
			const node = g.byName.get(name);
			if (!node || g.subnodes.has(name) || SINGLE_ITEM_TYPES.has(node.type) || node.executeOnce) continue;
			const fromTrigger = isTrigger(node.type) && !SINGLE_ITEM_TRIGGERS.some((t) => typeMatches(node.type, t));
			const source = ITEM_SOURCES.some((t) => typeMatches(node.type, t)) || (isNetwork(g, node) && !isAiRoot(g, node) && /^(read|getAll|search|list|getMany)$/.test(node.parameters?.operation ?? ''));
			if (fromTrigger || source || g.mainParents(name).some((p) => multi.has(p))) {
				multi.add(name);
				grew = true;
			}
		}
	}
	return multi;
}

/** Names of the nodes upstream of name. A sub-node uses the nodes upstream of the root that it serves. */
function upstream(g, name) {
	const roots = new Set([name]);
	for (let grew = true; grew; ) {
		grew = false;
		for (const e of g.edges) {
			if (e.type.startsWith('ai_') && roots.has(e.from) && !roots.has(e.to)) {
				roots.add(e.to);
				grew = true;
			}
		}
	}
	const seen = new Set();
	const queue = [...roots];
	while (queue.length) {
		for (const parent of g.mainParents(queue.shift())) {
			if (!seen.has(parent)) {
				seen.add(parent);
				queue.push(parent);
			}
		}
	}
	return seen;
}

// --- Correctness ---------------------------------------------------------------

function checkDefinitions(workflow) {
	const loaded = loadSdk();
	if (!loaded || loaded.missingDirs.length) {
		const missing = loaded ? loaded.missingDirs.map((d) => d.replace(repo + '/', '')) : ['packages/@n8n/workflow-sdk/dist'];
		return check('C1', null, 'Node parameters match the node definitions', src.validator, [
			`Not checked. Build these first: ${missing.join(', ')}.`,
		]);
	}
	const result = loaded.sdk.validateWorkflow(workflow, { allowDisconnectedNodes: true, allowNoTrigger: true });
	const problems = [...result.errors, ...result.warnings.filter((w) => w.severity !== 'informational')];
	const details = problems.map((p) =>
		p.nodeName && !p.message.includes(`"${p.nodeName}"`) ? `${p.nodeName}: ${p.message}` : p.message,
	);
	const info = result.warnings.filter((w) => w.severity === 'informational').map((w) => `Info: ${w.message}`);
	return check(
		'C1',
		problems.length === 0,
		problems.length ? `${plural(problems.length, 'node parameter problem')} against the node definitions` : 'Node parameters match the node definitions',
		src.validator,
		details.concat(info),
	);
}

const isEmpty = (value) =>
	value === undefined || value === null || value === '' || (typeof value === 'object' && value.__rl && (value.value === '' || value.value == null));

/** Sort the editor issues into setup work for the user and real problems. */
function classifyCanvas(workflow, canvas) {
	const byName = new Map((workflow.nodes ?? []).map((n) => [n.name, n]));
	const setup = [];
	const problems = [];
	for (const node of canvas.nodes) {
		if (node.marker === 'node-not-installed') problems.push(`${node.name}: the node type is not installed`);
		if (node.marker === 'node-restricted') problems.push(`${node.name}: the node type is restricted`);
		for (const [kind, issue] of Object.entries(node.issues ?? {})) {
			if (kind === 'credentials') {
				for (const type of Object.keys(issue)) setup.push(`${node.name}: connect ${type} credentials`);
			} else if (kind === 'parameters') {
				for (const [param, messages] of Object.entries(issue)) {
					const value = byName.get(node.name)?.parameters?.[param];
					for (const message of messages) {
						if (/is required/i.test(message) && isEmpty(value)) setup.push(`${node.name}: ${message.replace(/\.$/, '')} (left for the user)`);
						else problems.push(`${node.name}: ${message}`);
					}
				}
			} else if (issue === true || (issue && typeof issue === 'object' && Object.keys(issue).length)) {
				const text = typeof issue === 'object' ? Object.values(issue).flat().join(' ') : '';
				problems.push(`${node.name}: ${kind === 'typeUnknown' ? 'n8n does not know this node type' : `${kind} issue`}${text ? ` (${text})` : ''}`);
			}
		}
	}
	return { setup, problems };
}

function checkCanvas(workflow, canvas) {
	if (!canvas) return [check('C2', null, 'The n8n editor shows no node errors', src.canvas, ['Not checked. Run capture_canvas.mjs first.'])];
	if (!canvas.store && canvas.nodes.some((n) => n.marker === 'node-issues')) {
		return [check('C2', null, 'The n8n editor shows no node errors', src.canvas, [
			'The editor store was not readable, so the node issues are not known. Icons: ' +
				canvas.nodes.map((n) => `${n.name} (${n.marker})`).join(', '),
		])];
	}
	const { setup, problems } = classifyCanvas(workflow, canvas);
	return [
		check('C2', problems.length === 0, problems.length ? `The n8n editor shows ${plural(problems.length, 'node error')}` : 'The n8n editor shows no node errors', src.canvas, problems),
		check('C2s', true, setup.length ? `Setup left for the user: ${plural(setup.length, 'item')}` : 'No setup left for the user', src.canvas, setup, { level: 'info' }),
	];
}

function checkReachable(g) {
	if (g.triggers.length === 0) return check('C3', false, 'The workflow has a trigger', src.graph, ['No trigger node.']);
	const seen = reachable(g);
	const orphans = g.nodes.filter((n) => !seen.has(n.name)).map((n) => n.name);
	return check(
		'C3',
		orphans.length === 0,
		orphans.length ? `${plural(orphans.length, 'node')} cannot be reached from a trigger` : 'Every node can be reached from a trigger',
		src.graph,
		orphans.map((n) => `${n} is not connected to the flow`),
	);
}

function checkNamedRefs(workflow, g, refs) {
	const allNames = new Set((workflow.nodes ?? []).map((n) => n.name));
	const problems = [];
	for (const { node, param, ref } of refs) {
		if (ref.kind !== 'named') continue;
		if (!allNames.has(ref.node)) problems.push(`${node} › ${param}: no node is called "${ref.node}"`);
		else if (!g.byName.has(ref.node)) problems.push(`${node} › ${param}: "${ref.node}" is disabled`);
		else if (!/isExecuted/.test(ref.raw) && !upstream(g, node).has(ref.node))
			problems.push(`${node} › ${param}: "${ref.node}" does not run before this node, so the reference has no data`);
	}
	const named = refs.filter((r) => r.ref.kind === 'named').length;
	return check(
		'C4',
		problems.length === 0,
		problems.length ? `${plural(problems.length, 'node reference')} cannot resolve` : `All ${plural(named, 'node reference')} name a node that runs before them`,
		src.expressions,
		[...new Set(problems)],
	);
}

const DEFINITIVE = new Set(['executed', 'fixture', 'case', 'output-parser']);
const INDICATIVE = new Set(['node-schema', 'prompt-example', 'ai-root']);
// Outputs with the real number of array items. The other provenances are schema samples.
const REAL_OUTPUT = new Set(['executed', 'fixture', 'case']);

/** The output items of a node across all scenarios, with their provenance. */
function outputsOf(name, g, exec) {
	const items = [];
	for (const scenario of exec?.scenarios ?? []) {
		const out = scenario.nodes?.[name];
		if (out?.status === 'success' && Array.isArray(out.items)) items.push(...out.items.filter((i) => i && typeof i === 'object'));
	}
	const node = g.byName.get(name);
	let provenance = exec?.executed?.includes(name) ? 'executed' : exec?.pinned?.[name];
	if (items.length && provenance) return { items, provenance };
	if (TRIGGER_FIXTURES[node.type]) return { items: TRIGGER_FIXTURES[node.type], provenance: 'fixture' };
	const schema = loadSdk()?.sdk.discoverOutputSchemaForNode(node.type, node.typeVersion, node.parameters ?? {});
	if (schema) return { items: [sample(schema, 'item')], provenance: 'node-schema' };
	return { items: [], provenance: 'unknown' };
}

function checkFieldPaths(g, refs, exec) {
	const missing = [];
	const unconfirmed = [];
	let checked = 0;
	let unknown = 0;
	const seen = new Set();
	for (const { node, param, ref, code } of refs) {
		if (code || !ref.path?.length) continue;
		if (ref.kind !== 'named' && g.subnodes.has(node)) continue;
		const sources = ref.kind === 'named' ? [ref.node] : g.mainParents(node);
		if (!sources.length || sources.some((s) => !g.byName.has(s))) continue;
		const key = `${node}|${param}|${ref.raw}`;
		if (seen.has(key)) continue;
		seen.add(key);
		let found = false;
		let anyUnknown = false;
		const misses = [];
		for (const source of sources) {
			const { items, provenance } = outputsOf(source, g, exec);
			if (!items.length || provenance === 'unknown' || provenance === 'empty' || provenance === 'placeholder') {
				anyUnknown = true;
				continue;
			}
			const results = items.map((item) => lookup(item, ref.path, { sample: !REAL_OUTPUT.has(provenance) }));
			if (results.includes('found')) found = true;
			else if (results.includes('unknown')) anyUnknown = true;
			else misses.push({ source, provenance });
		}
		if (found) checked++;
		else if (anyUnknown || !misses.length) unknown++;
		else {
			checked++;
			const line = `${node} › ${param}: ${ref.raw.trim()} reads "${showPath(ref.path)}", which is not in the output of ${misses.map((m) => `${m.source} (${m.provenance})`).join(' or ')}`;
			if (misses.some((m) => DEFINITIVE.has(m.provenance))) missing.push(line);
			else if (misses.some((m) => INDICATIVE.has(m.provenance))) unconfirmed.push(`Unconfirmed: ${line}`);
		}
	}
	const note = exec?.scenarios?.length ? [] : ['No pinned-data run, so node outputs come from fixtures and node schemas only.'];
	return check(
		'C5',
		missing.length === 0,
		missing.length
			? `${plural(missing.length, 'expression')} read a field that the source node does not output`
			: `${plural(checked, 'expression field')} found in the source node output${unknown ? `, ${unknown} not checkable` : ''}`,
		src.execution,
		[...missing, ...unconfirmed, ...note],
	);
}

const SECRET_PATTERNS = [
	/sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/,
	/xox[abpr]-[A-Za-z0-9-]{10,}/,
	/AIza[0-9A-Za-z_-]{35}/,
	/gh[pousr]_[A-Za-z0-9]{36}/,
	/Bearer\s+(?!\{\{)[A-Za-z0-9._~+/-]{24,}/,
	/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function checkSecrets(g) {
	const hits = [];
	for (const node of g.nodes) {
		for (const { path, value } of strings(node.parameters ?? {})) {
			if (SECRET_PATTERNS.some((re) => re.test(value))) hits.push(`${node.name} › ${path}: a value looks like a key or token`);
		}
	}
	return check('C6', hits.length === 0, hits.length ? 'Secrets are written into node parameters' : 'No secrets in node parameters', src.expressions, hits);
}

// --- Execution -----------------------------------------------------------------

function executionChecks(exec) {
	if (!exec) return [check('E0', null, 'The workflow runs with pinned data', src.execution, ['Not run. Run run_scenarios.py first.'])];
	if (exec.skipped) return [check('E0', null, 'The workflow runs with pinned data', src.execution, [exec.skipped])];
	const pinned = Object.entries(exec.pinned ?? {}).map(([n, p]) => `${n} (${p})`);
	const intro = [`Pinned: ${pinned.join(', ') || 'nothing'}.`, `Ran for real: ${(exec.executed ?? []).join(', ') || 'nothing'}.`];
	const out = [];
	exec.scenarios.forEach((s, i) => {
		const errors = Object.entries(s.nodes ?? {}).filter(([, n]) => n.error).map(([name, n]) => `${name}: ${n.error}`);
		const ran = Object.keys(s.nodes ?? {});
		const ok = s.status === 'success' && errors.length === 0;
		out.push(check(`E${i + 1}`, ok, `"${s.name}" runs without an error`, src.execution, [
			...(i === 0 ? intro : []),
			`Status: ${s.status}${s.error ? ` (${s.error})` : ''}.`,
			...errors,
			`Nodes that ran: ${ran.join(', ')}.`,
		], { executionId: s.executionId }));
		(s.checks ?? []).forEach((c, j) => {
			const verb = c.kind === 'reach' ? 'reaches' : 'does not reach';
			out.push(check(`E${i + 1}.${j + 1}`, c.ok, `"${s.name}" ${verb} a ${c.type} node`, src.execution, []));
		});
	});
	return out;
}

// --- In-process runs, eval checks and claims -------------------------------------

const WIRE_KINDS = {
	contract: { id: 'W', title: 'Service calls', gating: true, note: 'The workflow runs in process. Service nodes run for real against recorded API fixtures, so the check sees each HTTP request that a node sends. The AI node is pinned. A failure here changes the verdict.' },
	edge: { id: 'X', title: 'Edge cases', gating: false, note: 'Inputs that the prompt does not describe but the trigger can send: several messages in one call, status updates, empty data. This score does not change the verdict.' },
	ai: { id: 'A', title: 'Real AI runs', gating: false, note: 'The AI node calls the real model on labeled questions. Service nodes use the recorded API fixtures. Model output can change between runs, so this score does not change the verdict.' },
};

function wireCheckText(name, c) {
	if (c.kind === 'reach') return `"${name}" reaches a ${c.type} node`;
	if (c.kind === 'skip') return `"${name}" does not reach a ${c.type} node`;
	if (c.kind === 'noWrites') return `"${name}" sends no write request`;
	if (c.kind === 'eachItem') return `"${name}" sends a request for each of the ${c.ids.length} items`;
	const what = c.contains?.length ? ` that carries ${c.contains.map((m) => m.split(' or ').map((x) => (x.startsWith('@') ? `\`${x}\`` : x)).join(' or ')).join(', ')}` : '';
	const count = c.count === undefined ? 'a request' : plural(c.count, 'request');
	return `"${name}" sends ${count} from a ${c.type} node${what}`;
}

function requestLines(s) {
	return (s.requests ?? []).map((r) => `Request: ${r.node} › ${r.method} ${r.url}${r.answeredBy && r.answeredBy !== 'fixture' ? ` (${r.answeredBy})` : ''}`);
}

function wireGroups(wire) {
	if (!wire) return [];
	const groups = [];
	for (const [kind, meta] of Object.entries(WIRE_KINDS)) {
		const scenarios = (wire.scenarios ?? []).filter((s) => s.kind === kind);
		if (!scenarios.length && !(kind === 'contract' && wire.skipped)) continue;
		const checks = [];
		if (wire.skipped) checks.push(check(`${meta.id}0`, null, 'The workflow runs in process', src.wire, [wire.skipped]));
		scenarios.forEach((s, i) => {
			const id = `${meta.id}${i + 1}`;
			if (s.status === 'skipped') {
				checks.push(check(id, null, `"${s.name}" runs`, src.wire, [s.error]));
				return;
			}
			const errors = Object.entries(s.nodes ?? {}).filter(([, n]) => n.error).map(([name, n]) => `${name}: ${n.error}`);
			const ai = Object.entries(s.aiOutputs ?? {}).map(([node, items]) => `AI output of ${node}: ${JSON.stringify(items?.[0]?.output ?? items?.[0] ?? null)}`);
			const ran = Object.entries(s.nodes ?? {}).map(([name, n]) => `${name} (${plural((n.outputCounts ?? []).reduce((a, b) => a + b, 0), 'item')})`);
			checks.push(check(id, s.status === 'success' && !errors.length, `"${s.name}" runs without an error`, src.wire, [
				...(s.why ? [s.why[0].toUpperCase() + s.why.slice(1)] : []),
				`Status: ${s.status}${s.error ? ` (${s.error})` : ''}.`,
				...errors,
				`Nodes that ran: ${ran.join(', ') || 'none'}.`,
				...ai,
				...requestLines(s),
				...(s.blocked?.length ? [`Blocked network calls: ${s.blocked.join(', ')}`] : []),
			]));
			(s.checks ?? []).forEach((c, j) => checks.push(check(`${id}.${j + 1}`, c.ok, wireCheckText(s.name, c), src.wire, c.details ?? [])));
		});
		const scored = checks.filter((c) => c.ok !== null);
		const filled = kind === 'contract' && wire.filled?.length ? [`Setup values filled for the run: ${wire.filled.join(', ')}.`] : [];
		groups.push({
			key: kind === 'contract' ? 'contract' : kind,
			title: meta.title,
			gating: meta.gating,
			note: [meta.note, ...filled].join(' '),
			...(meta.gating ? {} : { score: { passed: scored.filter((c) => c.ok).length, total: scored.length } }),
			checks,
		});
	}
	return groups;
}

function binaryGroup(binary) {
	if (!binary?.outcomes) return null;
	const measured = binary.outcomes.filter((o) => o.status !== 'n_a');
	const checks = measured.map((o, i) =>
		check(`B${i + 1}`, o.status === 'error' ? null : o.status === 'pass', `${o.name}: ${o.description}`, { label: `Instance AI eval binary checks (${o.dimension})`, path: binary.source }, o.comment ? [o.comment] : []),
	);
	const scored = checks.filter((c) => c.ok !== null);
	const na = binary.outcomes.length - measured.length;
	return {
		key: 'binary',
		title: 'Eval binary checks',
		gating: false,
		note: `The deterministic binary checks of the Instance AI eval suite.${na ? ` ${na} do not apply to this workflow.` : ''} This score does not change the verdict.`,
		score: { passed: scored.filter((c) => c.ok).length, total: scored.length },
		checks,
	};
}

function claimsGroup(claims) {
	if (!claims) return null;
	const checks = claims.checks.map((c) => check(c.id, c.ok, c.text, src.claims, c.details));
	if (claims.error) checks.unshift(check('M0', null, 'The final message and trace are readable', src.claims, [claims.error]));
	const scored = checks.filter((c) => c.ok !== null);
	return {
		key: 'claims',
		title: 'Final message claims',
		gating: false,
		note: 'What the final message says about the build, compared with the trace tool calls, the workflow and the service-call runs. This score does not change the verdict.',
		score: { passed: scored.filter((c) => c.ok).length, total: scored.length },
		checks,
	};
}

// --- Standards -----------------------------------------------------------------

function unattended(g) {
	return g.triggers.some((t) => !isManualTrigger(t.type) && !typeMatches(t.type, 'chatTrigger') && !typeMatches(t.type, 'formTrigger'));
}

function errorWorkflowRule(workflow, g) {
	if (!unattended(g)) return null;
	const set = Boolean(workflow.settings?.errorWorkflow);
	return check('S1', set, 'An unattended workflow has an error workflow', src.errorHandling, set ? [] : ['settings.errorWorkflow is not set, so a failure goes nowhere.']);
}

function errorOutputRule(g) {
	const problems = [];
	for (const node of g.nodes) {
		if (node.onError === 'continueRegularOutput') problems.push(`${node.name}: onError continueRegularOutput passes the error on as normal data`);
		// The error output comes after the normal outputs, so it is never output 0.
		if (node.onError === 'continueErrorOutput' && !g.mainChildren(node.name).some((e) => e.output > 0))
			problems.push(`${node.name}: onError continueErrorOutput has no node on its error output`);
	}
	if (!g.nodes.some((n) => n.onError)) return null;
	return check('S12', problems.length === 0, 'Failed nodes go to a wired error output, not on as data', src.errorHandling, problems);
}

function retryRule(g) {
	const nodes = g.nodes.filter((n) => isNetwork(g, n));
	if (!nodes.length) return null;
	const missing = nodes.filter((n) => !n.retryOnFail).map((n) => `${n.name}: no retryOnFail`);
	return check('S2', missing.length === 0, `Nodes that call a service retry on failure (${nodes.length - missing.length} of ${nodes.length})`, src.errorHandling, missing);
}

function namedRefRule(refs) {
	const uses = refs.filter((r) => !r.code && (r.ref.kind === 'json' || r.ref.kind === 'input'));
	if (!refs.some((r) => !r.code)) return null;
	const where = [...new Set(uses.map((r) => `${r.node} › ${r.param}`))];
	return check('S3', uses.length === 0, uses.length ? `${plural(where.length, 'parameter')} read $json instead of a node name` : 'Expressions read data by node name', src.expressionsSkill, where);
}

function parserParams(g, root) {
	const parser = g.aiInputs(root.name, 'ai_outputParser')[0];
	return parser ? { parser, p: parser.parameters ?? {} } : null;
}

function structuredRule(g) {
	const roots = g.nodes.filter((n) => isAiRoot(g, n) && g.mainChildren(n.name).length);
	if (!roots.length) return null;
	const problems = [];
	for (const root of roots) {
		const found = parserParams(g, root);
		if (!found) {
			const declared = strings(root.parameters ?? {}).some(({ value }) => /json/i.test(value));
			if (declared) problems.push(`${root.name}: the JSON format is only in the prompt, with no structured output parser`);
			continue;
		}
		if ((found.p.schemaType ?? 'fromJson') !== 'manual') problems.push(`${found.parser.name}: schemaType is not 'manual'`);
		if (!found.p.autoFix) problems.push(`${found.parser.name}: autoFix is off`);
	}
	return check('S4', problems.length === 0, 'Structured AI output uses a manual schema with autoFix', src.structured, problems);
}

const ATTRIBUTION_FIELDS = ['appendAttribution', 'includeLinkToWorkflow'];
const definitionCache = new Map();

/** The text of the node definition file for a node, or ''. */
function definitionText(node) {
	const [pkg, short] = node.type.startsWith(LC) ? ['@n8n/nodes-langchain', node.type.slice(LC.length)] : ['nodes-base', shortType(node.type)];
	const pkgDir = node.type.startsWith(LC) ? '@n8n/n8n-nodes-langchain' : 'n8n-nodes-base';
	const dir = join(repo, 'packages', pkg, 'dist/node-definitions/nodes', pkgDir, short, `v${String(node.typeVersion ?? 1).replace('.', '')}`);
	const snake = (s) => String(s ?? '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
	const p = node.parameters ?? {};
	const files = [join(dir, `resource_${snake(p.resource)}`, `operation_${snake(p.operation)}.ts`), `${dir}.ts`];
	if (!p.resource && p.operation && existsSync(dir)) {
		for (const entry of readdirSync(dir)) if (entry.startsWith('resource_')) files.push(join(dir, entry, `operation_${snake(p.operation)}.ts`));
	}
	const key = files.join('|');
	if (!definitionCache.has(key)) definitionCache.set(key, files.filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n'));
	return definitionCache.get(key);
}

function findKey(value, key) {
	if (!value || typeof value !== 'object') return undefined;
	if (key in value) return value[key];
	for (const v of Object.values(value)) {
		const hit = findKey(v, key);
		if (hit !== undefined) return hit;
	}
	return undefined;
}

function attributionRule(g) {
	const nodes = [];
	for (const node of g.nodes) {
		const text = definitionText(node);
		const field = ATTRIBUTION_FIELDS.find((f) => text.includes(`${f}?:`));
		if (field) nodes.push({ node, field });
	}
	if (!nodes.length) return null;
	const on = nodes.filter(({ node, field }) => findKey(node.parameters, field) !== false).map(({ node, field }) => `${node.name}: ${field} is not false (the default adds an n8n attribution)`);
	return check('S5', on.length === 0, 'Messages do not carry the n8n attribution', src.comms, on);
}

function multiItemRule(g, refs) {
	const multi = multiItemNodes(g);
	if (!multi.size) return null;
	const hits = refs.filter((r) => r.ref.kind === 'named' && ['first', 'last', 'all-index'].includes(r.ref.accessor) && multi.has(r.ref.node));
	const where = [...new Set(hits.map((r) => `${r.node} › ${r.param}: ${r.ref.raw.trim()}`))];
	const triggers = g.triggers.filter((t) => multi.has(t.name));
	const source = triggers.some((t) => typeMatches(t.type, 'whatsAppTrigger')) ? { ...src.multiItem, also: src.expressionsSkill } : src.expressionsSkill;
	return check(
		'S6',
		where.length === 0,
		where.length ? `${plural(where.length, 'reference')} read only the first item of a node that can output several` : 'References keep each item paired with its own data',
		source,
		where.length ? [...where, `Nodes that can output several items: ${[...multi].join(', ')}.`] : [],
	);
}

/** AI root nodes whose output decides a branch, with the IF or Switch nodes that they feed. */
function decidingRoots(g) {
	return g.nodes
		.filter((n) => isAiRoot(g, n))
		.map((root) => ({ root, branches: [...downstream(g, root.name)].map((n) => g.byName.get(n)).filter((n) => n && isBranch(n)) }))
		.filter((r) => r.branches.length);
}

function temperatureRule(g) {
	const roots = decidingRoots(g);
	if (!roots.length) return null;
	const problems = [];
	for (const { root } of roots) {
		for (const model of g.aiInputs(root.name, 'ai_languageModel')) {
			const t = findKey(model.parameters?.options, 'temperature') ?? findKey(model.parameters, 'temperature');
			if (t === undefined) problems.push(`${model.name}: temperature is not set, so the model default is used`);
			else if (typeof t === 'number' && t > 0.2) problems.push(`${model.name}: temperature is ${t}`);
		}
	}
	return check('S7', problems.length === 0, 'A model that decides a branch has a temperature of 0.2 or lower', src.triage, problems);
}

/** Field names of a JSON Schema, or of a JSON example when the value is not a schema. */
function schemaKeys(value, out = new Set()) {
	if (!value || typeof value !== 'object') return out;
	if (Array.isArray(value)) {
		value.forEach((v) => schemaKeys(v, out));
		return out;
	}
	const isSchema = value.properties || value.items || typeof value.type === 'string';
	if (isSchema) {
		for (const [k, v] of Object.entries(value.properties ?? {})) {
			out.add(k);
			schemaKeys(v, out);
		}
		if (value.items) schemaKeys(value.items, out);
		return out;
	}
	for (const [k, v] of Object.entries(value)) {
		out.add(k);
		schemaKeys(v, out);
	}
	return out;
}

function reasoningRule(g) {
	const roots = decidingRoots(g);
	if (!roots.length) return null;
	const problems = [];
	let judged = 0;
	for (const { root } of roots) {
		const found = parserParams(g, root);
		let text = '';
		if (found) text = String(found.p.inputSchema ?? found.p.jsonSchemaExample ?? found.p.jsonSchema ?? '');
		else text = strings(root.parameters ?? {}).map((s) => s.value).join('\n');
		if (!text.includes('{')) continue;
		judged++;
		let keys;
		try {
			keys = [...schemaKeys(JSON.parse(text))];
		} catch {
			keys = [...text.matchAll(/"([A-Za-z_]\w*)"\s*:/g)].map((m) => m[1]);
		}
		if (!keys.some((k) => /reason|rationale|explanation|why/i.test(k))) problems.push(`${root.name}: the output has no reasoning field (fields: ${keys.slice(0, 8).join(', ')})`);
	}
	if (!judged) return null;
	return check('S8', problems.length === 0, 'AI output that decides a branch includes a reasoning field', src.triage, problems);
}

function fallbackRule(g) {
	const roots = decidingRoots(g);
	if (!roots.length) return null;
	const problems = [];
	const branches = new Map(roots.flatMap((r) => r.branches.map((b) => [b.name, b])));
	for (const node of branches.values()) {
		const used = new Set(g.mainChildren(node.name).map((e) => e.output));
		if (typeMatches(node.type, 'if')) {
			for (const [i, label] of [[0, 'true'], [1, 'false']]) if (!used.has(i)) problems.push(`${node.name}: the ${label} output goes nowhere`);
		} else {
			const rules = node.parameters?.rules?.values ?? node.parameters?.rules?.rules ?? [];
			const fallback = node.parameters?.options?.fallbackOutput;
			if (fallback !== 'extra') problems.push(`${node.name}: options.fallbackOutput is not 'extra', so unmatched items are dropped`);
			else if (!used.has(rules.length)) problems.push(`${node.name}: the fallback output goes nowhere`);
			rules.forEach((_, i) => !used.has(i) && problems.push(`${node.name}: output ${i} goes nowhere`));
		}
	}
	return check('S9', problems.length === 0, 'Every branch after an AI decision, including the fallback, goes somewhere', src.triage, problems);
}

function memoryRule(g) {
	const chat = g.triggers.some((t) => MESSAGING_TRIGGERS.some((m) => typeMatches(t.type, m)));
	const agents = g.nodes.filter((n) => typeMatches(n.type, `${LC}agent`) && !g.subnodes.has(n.name));
	if (!chat || !agents.length) return null;
	const missing = agents.filter((a) => !g.aiInputs(a.name, 'ai_memory').length).map((a) => `${a.name}: no memory sub-node`);
	return check('S10', missing.length === 0, 'A chatbot agent has memory', src.chatbot, missing);
}

function sessionKeyRule(g) {
	const memories = g.nodes.filter((n) => g.subnodes.has(n.name) && /memory/i.test(shortType(n.type)) && n.parameters?.sessionIdType === 'customKey');
	if (!memories.length) return null;
	const problems = [];
	for (const m of memories) {
		const key = String(m.parameters?.sessionKey ?? '');
		if (!key.startsWith('=')) problems.push(`${m.name}: the session key is a fixed value, so every conversation shares one memory`);
		else if (/\$json\b/.test(key)) problems.push(`${m.name}: the session key reads $json, which a memory sub-node does not have`);
	}
	return check('S11', problems.length === 0, 'The memory session key names a node and identifies the conversation', { ...src.chatbot, also: src.memory }, problems);
}

// --- Main ----------------------------------------------------------------------

export function deriveChecks(workflow, canvas, exec, { wire, binary, claims } = {}) {
	const g = graph(workflow);
	const refs = workflowReferences(g);
	const correctness = [
		checkDefinitions(workflow),
		...checkCanvas(workflow, canvas),
		checkReachable(g),
		checkNamedRefs(workflow, g, refs),
		checkFieldPaths(g, refs, exec),
		checkSecrets(g),
	];
	const standards = [
		errorWorkflowRule(workflow, g),
		errorOutputRule(g),
		retryRule(g),
		namedRefRule(refs),
		structuredRule(g),
		attributionRule(g),
		multiItemRule(g, refs),
		temperatureRule(g),
		reasoningRule(g),
		fallbackRule(g),
		memoryRule(g),
		sessionKeyRule(g),
	].filter(Boolean);
	const scored = standards.filter((c) => c.ok !== null);
	return {
		version: VERSION,
		groups: [
			{ key: 'correctness', title: 'Correctness', gating: true, note: 'From the node definitions, the n8n editor and the workflow graph. A failure here changes the verdict.', checks: correctness },
			{ key: 'execution', title: 'Execution with pinned data', gating: true, note: 'Triggers, service nodes and AI nodes get pinned data. Logic nodes run for real. A failure here changes the verdict.', checks: executionChecks(exec) },
			...wireGroups(wire),
			claimsGroup(claims),
			{
				key: 'standards',
				title: 'n8n standards',
				gating: false,
				note: 'Rules from n8n-io/skills and the workflow-sdk best practices. The builders did not get these rules. This score does not change the verdict.',
				score: { passed: scored.filter((c) => c.ok).length, total: scored.length },
				checks: standards,
			},
			binaryGroup(binary),
		].filter(Boolean),
	};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const runDir = resolve(process.argv[2] ?? '.');
	for (const entry of readdirSync(runDir, { withFileTypes: true })) {
		const dir = join(runDir, entry.name);
		if (!entry.isDirectory() || !existsSync(join(dir, 'workflow.json'))) continue;
		const result = deriveChecks(readJson(join(dir, 'workflow.json')), readJson(join(dir, 'canvas-issues.json')), readJson(join(dir, 'exec.json')), {
			wire: readJson(join(dir, 'wire.json')),
			binary: readJson(join(dir, 'binary-checks.json')),
			claims: readJson(join(dir, 'claims.json')),
		});
		writeFileSync(join(dir, 'auto-checks.json'), JSON.stringify(result, null, 1));
		const line = result.groups.map((group) => {
			const judged = group.checks.filter((c) => c.ok !== null && c.level !== 'info');
			return `${group.key} ${judged.filter((c) => c.ok).length}/${judged.length}`;
		});
		console.log(`${entry.name}: auto-checks.json written (${line.join(', ')})`);
	}
}
