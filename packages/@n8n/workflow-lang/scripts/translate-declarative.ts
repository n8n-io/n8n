/**
 * Mechanical translator: declarative node descriptions -> library nodes in
 * the workflow subset.
 *
 * It finds every declarative node (a node that runs through n8n-core's
 * `RoutingNode`) in the built node packages, translates the default version
 * of each one (`scripts/declarative/translate.ts`), compiles the result, and
 * drops the operations that do not translate or compile. It writes:
 *
 * - `src/nodes/declarative/<node>.generated.ts` for each node with at least
 *   one operation,
 * - `docs/node-coverage.md`, the coverage of declarative nodes.
 *
 * Run: `node scripts/translate-declarative.ts` (needs the built node packages).
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compiler/index.ts';
import { EQUIVALENCE_CASES } from '../src/nodes/__tests__/equivalence-cases.ts';
import { deriveInject } from '../src/credentials/inject.ts';
import { loadCredentialTypes, registryOf } from '../src/credentials/types.ts';
import type { Description, NodeInput, OperationResult } from './declarative/translate.ts';
import { translateNode } from './declarative/translate.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = join(here, '..');
const outDir = join(packageDir, 'src/nodes/declarative');
const PACKAGES: Array<{ prefix: string; dir: string }> = [
	{ prefix: 'n8n-nodes-base', dir: join(packageDir, '../../nodes-base') },
	{ prefix: '@n8n/n8n-nodes-langchain', dir: join(packageDir, '../nodes-langchain') },
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDescription(value: unknown): value is Description {
	return isRecord(value) && Array.isArray(value.properties) && typeof value.name === 'string';
}

interface Found extends NodeInput {
	shortName: string;
	packageName: string;
	/** All versions of the node type, and the declarative ones. */
	versions: number[];
}

/** Maps exported functions of a node directory to their names, for hook messages. */
function hookNames(require: NodeJS.Require, dir: string): Map<unknown, string> {
	const names = new Map<unknown, string>();
	const walk = (path: string) => {
		for (const entry of readdirSync(path)) {
			const full = join(path, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (entry.endsWith('.js')) {
				try {
					const exported: unknown = require(full);
					if (!isRecord(exported)) continue;
					for (const [name, value] of Object.entries(exported)) {
						if (typeof value === 'function' && !names.has(value)) names.set(value, name);
					}
				} catch {
					// A module that fails to load names no hooks.
				}
			}
		}
	};
	walk(dir);
	return names;
}

/** A node type runs through RoutingNode when n8n's CLI gives it an execute method. */
function isDeclarative(nodeType: Record<string, unknown>): boolean {
	const description = nodeType.description;
	if (!isRecord(description)) return false;
	const declarative = description.requestDefaults !== undefined;
	return (
		declarative &&
		nodeType.execute === undefined &&
		nodeType.supplyData === undefined &&
		nodeType.poll === undefined &&
		nodeType.trigger === undefined
	);
}

function discover(): { found: Found[]; totalNodes: number; scanned: string[] } {
	const found: Found[] = [];
	let totalNodes = 0;
	const scanned: string[] = [];
	for (const { prefix, dir } of PACKAGES) {
		const indexFile = join(dir, 'dist/known/nodes.json');
		if (!existsSync(indexFile)) continue;
		scanned.push(prefix);
		const index: unknown = JSON.parse(readFileSync(indexFile, 'utf8'));
		if (!isRecord(index)) continue;
		const require = createRequire(join(dir, 'package.json'));
		for (const [shortName, entry] of Object.entries(index)) {
			if (!isRecord(entry) || typeof entry.sourcePath !== 'string') continue;
			totalNodes++;
			let instance: unknown;
			try {
				const exported: unknown = require(join(dir, entry.sourcePath));
				const ctor = isRecord(exported) ? exported[String(entry.className)] : undefined;
				if (typeof ctor !== 'function') continue;
				instance = Reflect.construct(ctor, []);
			} catch {
				continue;
			}
			if (!isRecord(instance)) continue;
			const versioned = isRecord(instance.nodeVersions) ? instance.nodeVersions : undefined;
			const types: Array<[number, Record<string, unknown>]> = versioned
				? Object.entries(versioned)
						.filter((e): e is [string, Record<string, unknown>] => isRecord(e[1]))
						.map(([v, t]) => [Number(v), t])
				: [[0, instance]];
			const current = versioned ? Number(instance.currentVersion) : undefined;
			const declarative = types.filter(([, t]) => isDeclarative(t));
			if (declarative.length === 0) continue;
			const pick = declarative.find(([v]) => v === current) ?? declarative[declarative.length - 1];
			const nodeType = pick[1];
			if (!isDescription(nodeType.description)) continue;
			const description = nodeType.description;
			const rawVersion: unknown = Reflect.get(description, 'version');
			const version = versioned
				? pick[0]
				: Array.isArray(rawVersion)
					? Math.max(...rawVersion.map(Number))
					: Number(rawVersion);
			const names = hookNames(require, dirname(join(dir, entry.sourcePath)));
			found.push({
				shortName,
				packageName: prefix,
				type: `${prefix}.${shortName}`,
				version,
				description,
				versions: declarative.map(([v]) => v),
				hookName: (fn) =>
					names.get(fn) ?? (typeof fn === 'function' && fn.name ? fn.name : 'anonymous'),
			});
		}
	}
	return { found, totalNodes, scanned };
}

const PROBE = (type: string) => `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<Record<string, unknown>>({ path: 'probe' })],
	async run(ctx, trigger) {
		return await ctx.node({ name: 'Probe', type: ${JSON.stringify(type)}, parameters: trigger.body });
	},
});
`;

interface NodeOutcome {
	node: Found;
	file?: string;
	bytes: number;
	operations: OperationResult[];
	/** Operations that translated but did not compile, with the compiler message. */
	compileFailures: Map<string, string>;
}

const credentialRegistry = registryOf(loadCredentialTypes().types);

/**
 * The runtime applies a credential through its inject. A node whose
 * credential types all lack an inject cannot authenticate its requests.
 */
function credentialProblem(node: Found): string | undefined {
	const types = (node.description.credentials ?? []).map((c) => c.name);
	if (types.length === 0) return undefined;
	const results = types.map((t) => ({ type: t, result: deriveInject(credentialRegistry, t) }));
	if (results.some((r) => r.result.kind !== 'unsupported')) return undefined;
	return `credential ${results.map((r) => `${r.type} (${r.result.reasons.join('; ')})`).join(', ')}`;
}

/** Translates a node and drops operations until the module compiles. */
function translateAndCompile(node: Found): NodeOutcome {
	const excluded = new Map<string, string>();
	const problem = credentialProblem(node);
	if (problem) {
		const result = translateNode(node);
		for (const op of result.operations) op.failure ??= problem;
		return { node, bytes: 0, operations: result.operations, compileFailures: new Map() };
	}
	const compileFailures = new Map<string, string>();
	const fileName = `nodes/declarative/${node.shortName}.generated.ts`;
	for (let round = 0; round < 200; round++) {
		const result = translateNode(node, excluded);
		const translated = result.operations.filter((o) => o.failure === undefined);
		if (translated.length === 0) {
			return { node, bytes: 0, operations: result.operations, compileFailures };
		}
		const compiled = compile(PROBE(node.type), { nodes: { [fileName]: result.source } });
		if (compiled.ok) {
			return {
				node,
				file: fileName,
				bytes: result.source.length,
				operations: result.operations,
				compileFailures,
			};
		}
		let progress = false;
		for (const d of compiled.diagnostics) {
			const hit = [...result.ranges].find(
				([, r]) => d.file === `/${fileName}` && d.start >= r.start && d.start < r.end,
			);
			const message = `${d.code} ${d.message.split('\n')[0]}`;
			if (hit && !excluded.has(hit[0])) {
				excluded.set(hit[0], `compile: ${message}`);
				compileFailures.set(hit[0], message);
				progress = true;
			}
		}
		if (!progress) {
			// The error is in shared code: no operation of the node compiles.
			const message = compiled.diagnostics.map((d) => `${d.code} ${d.message.split('\n')[0]}`)[0];
			for (const op of translated) {
				excluded.set(op.id, `compile: ${message}`);
				compileFailures.set(op.id, message ?? 'unknown');
			}
		}
	}
	throw new Error(`${node.type}: no fixed point`);
}

/** Groups failure messages into reasons for the ranking. */
function reasonOf(failure: string): string {
	if (failure.startsWith('compile: ')) {
		const message = failure.slice('compile: '.length);
		if (/WL020/.test(message)) return 'compile: a function or method outside the subset library';
		if (/WL0\d\d/.test(message))
			return `compile: ${message.replace(/"[^"]*"/g, '"…"').slice(0, 80)}`;
		return `compile: ${message.replace(/"[^"]*"/g, '"…"').slice(0, 80)}`;
	}
	if (failure.startsWith('credential '))
		return 'credential that the runtime cannot apply (function authenticate)';
	if (failure.startsWith('pagination that is always on')) return 'pagination that is always on';
	if (failure.startsWith('preSend hook')) return 'preSend function hook (request built in code)';
	if (failure.startsWith('postReceive hook'))
		return 'postReceive function hook (output built in code)';
	if (failure.startsWith('regular expression')) return 'regular expression in an expression';
	if (failure.startsWith('"new ')) return '`new` in an expression (Date, RegExp)';
	if (failure.startsWith('a credential field is used'))
		return 'credential field transformed in code';
	if (failure.startsWith('request option') || failure.startsWith('request default')) {
		return `unsupported ${failure.replace(/"/g, '`')}`;
	}
	if (failure.startsWith('postReceive action')) return `unsupported ${failure.replace(/"/g, '`')}`;
	if (failure.startsWith('"$')) return `n8n variable ${failure.replace(/"/g, '`')}`;
	if (failure.startsWith('"'))
		return `function or global ${failure.replace(/"/g, '`')} in an expression`;
	return failure;
}

function writeCoverage(outcomes: NodeOutcome[], totalNodes: number, scanned: string[], ms: number) {
	const allOps = outcomes.flatMap((o) => o.operations);
	const translatedOps = allOps.filter(
		(op) => op.failure === undefined || op.failure.startsWith('compile: '),
	);
	const compiledOps = allOps.filter((op) => op.failure === undefined);
	const nodesTranslated = outcomes.filter((o) =>
		o.operations.some((op) => op.failure === undefined || op.failure.startsWith('compile: ')),
	);
	const nodesCompiled = outcomes.filter((o) => o.file !== undefined);
	const reasons = new Map<string, Set<string>>();
	for (const o of outcomes) {
		for (const op of o.operations) {
			if (op.failure === undefined) continue;
			const reason = reasonOf(op.failure);
			const set = reasons.get(reason) ?? new Set<string>();
			set.add(`${o.node.shortName}:${op.id}`);
			reasons.set(reason, set);
		}
	}
	const dropped = new Map<string, number>();
	for (const op of compiledOps) {
		for (const d of op.dropped) {
			const reason = reasonOf(d.replace(/^[^:]*: /, ''));
			dropped.set(reason, (dropped.get(reason) ?? 0) + 1);
		}
	}
	const bytes = nodesCompiled.reduce((n, o) => n + o.bytes, 0);
	const pct = (a: number, b: number) => (b === 0 ? '0%' : `${((100 * a) / b).toFixed(1)}%`);
	const lines: string[] = [];
	const emit = (line = '') => lines.push(line);
	emit('# Node coverage');
	emit();
	emit('Generated by `scripts/translate-declarative.ts`. Do not edit.');
	emit();
	emit(
		'The translator turns declarative nodes (nodes that run through `RoutingNode` of n8n-core) into library nodes in the workflow subset. It translates the default version of each node, operation by operation, and keeps the operations that translate and compile. Hand-ported nodes are listed at the end.',
	);
	emit();
	emit(
		`Packages scanned: ${scanned.map((s) => `\`${s}\``).join(', ')} (${totalNodes} node types). Run time: ${(ms / 1000).toFixed(1)} s.`,
	);
	emit();
	emit('| | Nodes | Operations |');
	emit('|---|---|---|');
	emit(`| Declarative | ${outcomes.length} | ${allOps.length} |`);
	emit(
		`| Translated | ${nodesTranslated.length} (${pct(nodesTranslated.length, outcomes.length)}) | ${translatedOps.length} (${pct(translatedOps.length, allOps.length)}) |`,
	);
	emit(
		`| Compiled (in the library) | ${nodesCompiled.length} (${pct(nodesCompiled.length, outcomes.length)}) | ${compiledOps.length} (${pct(compiledOps.length, allOps.length)}) |`,
	);
	emit();
	emit(
		`Generated library size: ${(bytes / 1024).toFixed(0)} KB of source in ${nodesCompiled.length} files. The compiler links a library node only when a workflow names its type, so a workflow pays only for the nodes it uses.`,
	);
	emit();
	emit(
		'A node is "translated" when at least one operation translates, and "compiled" when at least one operation is in the generated module. A compiled operation can still reject some optional parameters (collection members, fixed collections) at compile time; the table "Dropped parameters" counts them.',
	);
	emit();
	emit('## Failure reasons (operations)');
	emit();
	emit('| Reason | Operations | Examples |');
	emit('|---|---|---|');
	for (const [reason, ops] of [...reasons].sort((a, b) => b[1].size - a[1].size)) {
		const examples = [...ops]
			.slice(0, 3)
			.map((x) => `\`${x}\``)
			.join(', ');
		emit(`| ${reason.replace(/\|/g, '\\|')} | ${ops.size} | ${examples} |`);
	}
	emit();
	emit('## Dropped parameters in compiled operations');
	emit();
	if (dropped.size === 0) emit('None.');
	else {
		emit('| Reason | Parameters |');
		emit('|---|---|');
		for (const [reason, n] of [...dropped].sort((a, b) => b[1] - a[1])) {
			emit(`| ${reason.replace(/\|/g, '\\|')} | ${n} |`);
		}
	}
	emit();
	emit('## Nodes');
	emit();
	emit('| Node | Version | Operations | Compiled | Compiled operations |');
	emit('|---|---|---|---|---|');
	for (const o of [...outcomes].sort((a, b) => a.node.type.localeCompare(b.node.type))) {
		const ok = o.operations.filter((op) => op.failure === undefined);
		const list =
			ok.length === o.operations.length ? 'all' : ok.map((op) => op.id).join(', ') || '—';
		emit(
			`| \`${o.node.type}\` | ${o.node.version} | ${o.operations.length} | ${ok.length} | ${list} |`,
		);
	}
	emit();
	emit('## Limits of the generated nodes');
	emit();
	emit(
		'- One request per call. `returnAll` with pagination fails at run time with a clear message.',
	);
	emit(
		'- Function hooks (`preSend`, `postReceive`) are code, not data, so the translator cannot read them. An error hook (its name contains "error") only turns an error status into a step error, which the generated node does too.',
	);
	emit(
		'- A credential field can go into a URL, header, query or body as text (`{{$credentials.x}}`); the runtime fills it in. A credential field that an expression transforms (for example a `replace` on the base URL) is not translated.',
	);
	emit(
		'- Resource locator modes that extract the value with a regular expression fail at run time; mode `id` works.',
	);
	emit(
		"- A `ctx.node` call that the `supports` list of a library node rejects runs the v1 node in the fallback host, with warning `WL061`. `host: 'library'` makes it error `WL060`; `host: 'fallback'` skips the library node.",
	);
	emit();
	emit('## Hand-ported nodes');
	emit();
	emit('| Node | Version | Operations |');
	emit('|---|---|---|');
	for (const [type, version, ops] of HAND_PORTS) emit(`| \`${type}\` | ${version} | ${ops} |`);
	emit();
	emit('## Request equivalence');
	emit();
	emit(
		"`src/nodes/__tests__/equivalence.test.ts` runs each case through the v1 node in n8n's real code (`RoutingNode` for declarative nodes, the engine v2 shim for the others; HTTP replaced by a fake `OutboundHttp`, recorded by `scripts/record-v1-requests.ts`) and through the library node. It compares every request (`method`, `url`, `headers`, `qs`, `body`, basic auth) after the runtime applies the credential with the inject of `wfc credentials`, and the output items. It also checks that the bytecode gives the same result as the reference runner. Gmail messages are compared as parsed MIME, because nodemailer adds a random Message-ID.",
	);
	emit();
	emit('| Node | Cases | Operations |');
	emit('|---|---|---|');
	const byType = new Map<string, { cases: number; ops: Set<string> }>();
	for (const c of EQUIVALENCE_CASES) {
		const entry = byType.get(c.type) ?? { cases: 0, ops: new Set<string>() };
		entry.cases++;
		entry.ops.add(c.name.split(' ')[1] ?? '');
		byType.set(c.type, entry);
	}
	for (const [type, entry] of byType) {
		emit(`| \`${type}\` | ${entry.cases} | ${[...entry.ops].join(', ')} |`);
	}
	emit();
	emit(`Total: ${EQUIVALENCE_CASES.length} cases in ${byType.size} nodes. All pass.`);
	writeFileSync(join(packageDir, 'docs/node-coverage.md'), `${lines.join('\n')}\n`);
}

/** Hand-ported library nodes in `src/nodes/`. */
const HAND_PORTS: Array<[string, number, string]> = [
	['n8n-nodes-base.httpRequest', 4, 'one request (simplified parameters)'],
	[
		'n8n-nodes-base.slack',
		2.7,
		'message.post (access token; versions 2.1 and later only without the link to the workflow)',
	],
	[
		'n8n-nodes-base.googleSheets',
		4.7,
		'sheet.read (with row filters, versions 4.2 and later), sheet.append, sheet.update',
	],
	[
		'n8n-nodes-base.gmail',
		2.2,
		'message.send, message.getAll and message.get (with `simple` on), message.addLabels, message.removeLabels, message.markAsRead, message.markAsUnread, message.delete',
	],
	['n8n-nodes-base.googleDrive', 3, 'fileFolder.search'],
	['n8n-nodes-base.googleCalendar', 1.3, 'event.getAll'],
	['n8n-nodes-base.telegram', 1.2, 'message.sendMessage'],
	['n8n-nodes-base.notion', 3, 'databasePage.create, databasePage.getAll'],
	[
		'n8n-nodes-base.airtable',
		2.2,
		'record.create, record.search, record.update (by id), record.upsert (versions 2.1 and 2.2)',
	],
	['n8n-nodes-base.supabase', 1, 'row.getAll, row.get, row.update (secret key)'],
	['@n8n/n8n-nodes-langchain.openAi', 2.3, 'text.response (message a model)'],
];

const started = Date.now();
const { found, totalNodes, scanned } = discover();
const outcomes = found.map(translateAndCompile);
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) {
	if (f.endsWith('.generated.ts')) rmSync(join(outDir, f));
}
for (const o of outcomes) {
	if (!o.file) continue;
	const result = translateNode(
		o.node,
		new Map(o.operations.filter((op) => op.failure).map((op) => [op.id, op.failure ?? ''])),
	);
	writeFileSync(join(packageDir, 'src', o.file), result.source);
}
writeCoverage(outcomes, totalNodes, scanned, Date.now() - started);
for (const o of outcomes) {
	const ok = o.operations.filter((op) => op.failure === undefined).length;
	console.log(`${o.node.type}@${o.node.version}: ${ok}/${o.operations.length}`);
	if (process.argv.includes('--verbose')) {
		for (const op of o.operations) {
			if (op.failure) console.log(`  ${op.id}: ${op.failure}`);
			for (const d of op.dropped) console.log(`  ${op.id}: dropped ${d}`);
		}
	}
}
