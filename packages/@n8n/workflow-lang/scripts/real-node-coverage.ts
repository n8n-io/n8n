/**
 * Counts how the nodes of real workflows run when the node compiler is on: compiled, or in
 * the fallback host, and why. For each node that compiles and fails the check of the verified
 * list, it counts the conditions that the list entry of its operation does not have (the
 * converter names them in its note).
 *
 * The input is a folder of sets: `<sets>/chunk-*\/bundles/<id>/{workflow.json,credentials.json}`.
 * The output has counts only, by node type, operation, parameter name and error class. It never
 * prints a value, a name or an id from a workflow.
 *
 * Run: `node scripts/real-node-coverage.ts <sets> [--per-chunk 240] [--verified list.json]`
 * (needs the built node packages). `--verified` reads the list from a JSON file in place of
 * `src/node-compile/verified.generated.ts`.
 */
import { spawn } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { convertWorkflow } from '../src/convert/index.ts';
import type { NodeDescription } from '../src/convert/node-parameters.ts';
import type { ConvertResult } from '../src/convert/types.ts';
import { publicCredential } from '../src/credentials/public.ts';
import { loadCredentialTypes, registryOf } from '../src/credentials/types.ts';
import type { NodeSources } from '../src/node-compile/convert.ts';
import { evaluateInSandbox, unprovenFlagNodes } from '../src/node-compile/evaluate-node.ts';
import { VERIFIED } from '../src/node-compile/verified.generated.ts';
import { resolveCredentialData } from './gym/v1-credentials.ts';

type Json = Record<string, unknown>;
type Counts = Record<string, number>;
interface LoadedNode {
	description: NodeDescription;
	nodeVersions?: Record<string, LoadedNode>;
	constructor: { name: string };
}
interface Credential {
	key?: string;
	type: string;
	data: Json;
}
interface RealNode {
	name: string;
	type: string;
	typeVersion?: number;
	parameters?: Json;
	credentials?: Record<string, { id?: string | null } | undefined>;
	disabled?: boolean;
}
interface Tally {
	workflows: number;
	plainConversions: number;
	nodes: number;
	hostNodes: number;
	compiledNodes: number;
	hostByType: Counts;
	hostReason: Counts;
	hostReasonByType: Counts;
	noAttempt: Counts;
	compileErrorByType: Counts;
	missing: Counts;
	missingSets: Counts;
}

const here = dirname(fileURLToPath(import.meta.url));
const base = join(here, '../../../nodes-base');
const PREFIX = 'n8n-nodes-base.';
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const INSTANCE = { baseUrl: 'http://127.0.0.1:5678/', id: 'c0de'.repeat(16) };
const NOT_CHECKED = 'The node source compiles, and this operation or one of its parameters';
const NO_COMPILE = 'The node source does not compile:';
const CONDITIONS = 'Conditions without a check: ';
const isJson = (value: unknown): value is Json =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const bump = (counts: Counts, key: string) => {
	counts[key] = (counts[key] ?? 0) + 1;
};
/** A resource or operation name of the node description. Any other text is not printed. */
const plain = (value: unknown) =>
	value === undefined || value === ''
		? ''
		: typeof value === 'string' && /^[\w-]{1,40}$/.test(value)
			? value
			: '…';
/** The class of an error text: no quoted text and no numbers. */
const classOf = (text: string) =>
	text
		.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '"…"')
		.replace(/\S*\/\S*/g, '…')
		.replace(/\b\d+\b/g, 'N')
		.slice(0, 150);

const argv = process.argv.slice(2);
const valueOf = (flag: string) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
const verifiedFile = valueOf('--verified');
const list: Record<string, string[]> =
	verifiedFile === undefined ? VERIFIED : JSON.parse(readFileSync(verifiedFile, 'utf8'));

function analyse(chunk: string, perChunk: number): Tally {
	const load = createRequire(join(base, 'package.json'));
	const known: Record<string, { className: string; sourcePath: string }> = JSON.parse(
		readFileSync(join(base, 'dist/known/nodes.json'), 'utf8'),
	);
	const knownCredentials: Record<string, { sourcePath: string }> = JSON.parse(
		readFileSync(join(base, 'dist/known/credentials.json'), 'utf8'),
	);
	const registry = registryOf(loadCredentialTypes().types);
	const classFile = new Map<string, string>();
	const findClasses = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			const file = join(dir, entry);
			if (statSync(file).isDirectory()) {
				if (!/^(test|__tests__|__schema__)$/.test(entry)) findClasses(file);
			} else if (entry.endsWith('.node.ts')) {
				for (const m of readFileSync(file, 'utf8').matchAll(/^(?:export )?class (\w+)/gm))
					classFile.set(m[1], file);
			}
		}
	};
	findClasses(join(base, 'nodes'));
	const loaded = new Map<string, LoadedNode | undefined>();
	const nodeOf = (type: string, version: number): LoadedNode | undefined => {
		const key = `${type}@${version}`;
		if (loaded.has(key)) return loaded.get(key);
		let node: LoadedNode | undefined;
		try {
			const entry = type.startsWith(PREFIX) ? known[type.slice(PREFIX.length)] : undefined;
			if (entry) {
				const top: LoadedNode = new (load(join(base, entry.sourcePath))[entry.className])();
				node = top.nodeVersions ? top.nodeVersions[String(version)] : top;
			}
		} catch {
			node = undefined;
		}
		loaded.set(key, node);
		return node;
	};
	const credentialOf = (credentials: Credential[], type: string, id: string | null | undefined) =>
		credentials.find((c) => c.key === id) ?? credentials.find((c) => c.type === type);
	const dataOf = (c: Credential | undefined) => {
		try {
			return c ? resolveCredentialData(c.type, c.data) : undefined;
		} catch {
			return undefined;
		}
	};
	const sourcesFor = (credentials: Credential[], host: Set<string>): NodeSources => ({
		entry: (type, version) => {
			const node = nodeOf(type, version);
			return node ? classFile.get(node.constructor.name) : undefined;
		},
		readFile: (file) => {
			if (!existsSync(file)) return undefined;
			const stat = statSync(file);
			return stat.isFile() && stat.size <= MAX_FILE_BYTES ? readFileSync(file, 'utf8') : undefined;
		},
		description: (type, version) => nodeOf(type, version)?.description,
		aliases: { '@utils/': `${base}/utils/` },
		verified: list,
		evaluate: evaluateInSandbox,
		publicCredential: (type, id) => {
			const c = credentialOf(credentials, type, id);
			const info = c ? registry.get(c.type) : undefined;
			const data = dataOf(c);
			if (!info || !data) return undefined;
			try {
				return publicCredential(info, data);
			} catch {
				return undefined;
			}
		},
		runsInHost: (name) => host.has(name),
		credentialEntry: (type) => {
			const entry = knownCredentials[type];
			return entry ? join(base, entry.sourcePath) : undefined;
		},
	});
	/** Nodes that stay in the host: a credential needs a token that n8n makes, or gives unchecked conditions. */
	const hostNodesOf = (converted: ConvertResult, nodes: RealNode[], credentials: Credential[]) => {
		const host = new Set<string>();
		const slots = converted.credentials ?? {};
		const minted = Object.entries(converted.credentialMints ?? {})
			.filter(([slot, mints]) => mints.length > 0 && slots[slot] !== undefined)
			.map(([slot]) => slots[slot]);
		for (const node of minted.length > 0 ? nodes : []) {
			for (const [type, use] of Object.entries(node.credentials ?? {})) {
				if (minted.some((s) => s.type === type && (s.id === null || s.id === use?.id)))
					host.add(node.name);
			}
		}
		for (const [slot, derivations] of Object.entries(converted.credentialDerivations ?? {})) {
			const use = slots[slot];
			const data = dataOf(use ? credentialOf(credentials, use.type, use.id) : undefined);
			for (const name of unprovenFlagNodes(derivations, data)) host.add(name);
		}
		return host;
	};
	/** The conversion of the load kit: with the node compiler, and without it when that fails. */
	const convert = (workflow: Json, nodes: RealNode[], credentials: Credential[]) => {
		const without = () => ({
			result: convertWorkflow(workflow, {}),
			plain: true,
			host: new Set<string>(),
		});
		const withHost = (host: Set<string>) =>
			convertWorkflow(workflow, { instance: INSTANCE, nodeSources: sourcesFor(credentials, host) });
		let result: ConvertResult;
		try {
			result = withHost(new Set());
		} catch {
			return without();
		}
		if (!result.ok) return without();
		const host = hostNodesOf(result, nodes, credentials);
		if (host.size > 0) {
			result = withHost(host);
			if (!result.ok) return without();
			const still = hostNodesOf(result, nodes, credentials);
			if ([...still].some((name) => !host.has(name))) return without();
			if (Object.values(result.credentialMints ?? {}).some((mints) => mints.length > 0))
				return without();
		}
		return { result, plain: false, host };
	};

	const tally: Tally = {
		workflows: 0,
		plainConversions: 0,
		nodes: 0,
		hostNodes: 0,
		compiledNodes: 0,
		hostByType: {},
		hostReason: {},
		hostReasonByType: {},
		noAttempt: {},
		compileErrorByType: {},
		missing: {},
		missingSets: {},
	};
	const dir = join(chunk, 'bundles');
	const ids = readdirSync(dir).sort();
	const step = Math.max(1, Math.floor(ids.length / perChunk));
	for (const id of ids.filter((_, at) => at % step === 0).slice(0, perChunk)) {
		let workflow: Json;
		let credentials: Credential[];
		try {
			workflow = JSON.parse(readFileSync(join(dir, id, 'workflow.json'), 'utf8'));
			credentials = JSON.parse(readFileSync(join(dir, id, 'credentials.json'), 'utf8'));
		} catch {
			continue;
		}
		const all: RealNode[] = Array.isArray(workflow.nodes) ? workflow.nodes : [];
		const nodes = all.filter((n) => n.type !== `${PREFIX}stickyNote` && n.disabled !== true);
		const byName = new Map(nodes.map((n) => [n.name, n]));
		let run: ReturnType<typeof convert>;
		try {
			run = convert(workflow, nodes, credentials);
		} catch {
			continue;
		}
		tally.workflows++;
		tally.nodes += nodes.length;
		if (run.plain) tally.plainConversions++;
		const notes = new Map<string, string>();
		const otherCodes = new Map<string, string>();
		for (const d of run.result.diagnostics) {
			if (d.node === undefined) continue;
			if (d.code === 'node-compiled') notes.set(d.node, '');
			else if (d.code === 'node-compile') notes.set(d.node, d.message);
			else otherCodes.set(d.node, d.code);
		}
		const inHost = new Set(run.result.fallbackNodes);
		for (const [name, note] of notes)
			if (note === '' && !inHost.has(name) && byName.has(name)) tally.compiledNodes++;
		for (const name of inHost) {
			const node = byName.get(name);
			if (!node) continue;
			tally.hostNodes++;
			bump(tally.hostByType, node.type);
			const note = notes.get(name);
			let reason: string;
			if (!node.type.startsWith(PREFIX)) reason = 'not a nodes-base node';
			else if (run.plain) reason = 'the conversion with the node compiler failed';
			else if (note === undefined || note === '') {
				reason = 'no compile attempt';
				bump(tally.noAttempt, `${node.type} | ${otherCodes.get(name) ?? '(no diagnostic)'}`);
			} else if (note.startsWith(NOT_CHECKED)) {
				reason = 'verifier coverage';
				const at = note.indexOf(CONDITIONS);
				const missing =
					at < 0
						? []
						: note
								.slice(at + CONDITIONS.length)
								.split(', ')
								.sort();
				const parameters = node.parameters ?? {};
				const key = `${node.type}@${node.typeVersion}:${plain(parameters.resource)}.${plain(parameters.operation)}`;
				for (const condition of missing) bump(tally.missing, `${key} | ${condition}`);
				bump(tally.missingSets, `${key} | ${missing.join(' + ')}`);
			} else if (note.startsWith(NO_COMPILE)) {
				reason = 'compile failure';
				const first = classOf(note.slice(NO_COMPILE.length).split('; ')[0].trim());
				bump(tally.compileErrorByType, `${node.type} | ${first}`);
			} else reason = classOf(note);
			bump(tally.hostReason, reason);
			bump(tally.hostReasonByType, `${reason} | ${node.type}`);
		}
	}
	return tally;
}

function merge(into: Json, from: Json): Json {
	for (const [key, value] of Object.entries(from)) {
		const current = into[key];
		if (typeof value === 'number') into[key] = (typeof current === 'number' ? current : 0) + value;
		else if (isJson(value)) into[key] = merge(isJson(current) ? current : {}, value);
	}
	return into;
}

const top = (counts: unknown, limit: number) =>
	Object.entries(isJson(counts) ? counts : {})
		.sort((a, b) => Number(b[1]) - Number(a[1]))
		.slice(0, limit)
		.map(([key, count]) => `${String(count).padStart(6)}  ${key}`)
		.join('\n');

const child = valueOf('--chunk');
if (child !== undefined) {
	const tally = analyse(child, Number(valueOf('--per-chunk')));
	writeFileSync(valueOf('--out') ?? '', JSON.stringify(tally));
	process.exit(0);
}

const sets = argv[0];
if (sets === undefined || sets.startsWith('--')) {
	console.error(
		'usage: node scripts/real-node-coverage.ts <sets> [--per-chunk 240] [--verified list.json]',
	);
	process.exit(1);
}
const perChunk = Number(valueOf('--per-chunk') ?? 240);
const chunks = readdirSync(sets)
	.filter((name) => name.startsWith('chunk-'))
	.sort();
const work = mkdtempSync(join(tmpdir(), 'real-node-coverage-'));
const total: Json = {};
await Promise.all(
	chunks.map(
		async (name) =>
			await new Promise<void>((done) => {
				const out = join(work, `${name}.json`);
				const args = ['--chunk', join(sets, name), '--per-chunk', String(perChunk), '--out', out];
				if (verifiedFile !== undefined) args.push('--verified', verifiedFile);
				const run = spawn(
					process.execPath,
					['--max-old-space-size=6144', fileURLToPath(import.meta.url), ...args],
					{ stdio: ['ignore', 'ignore', 'inherit'] },
				);
				run.on('exit', (code) => {
					if (code === 0) merge(total, JSON.parse(readFileSync(out, 'utf8')));
					else console.error(`${name}: the analysis failed with exit code ${code}`);
					done();
				});
			}),
	),
);
console.log(
	`workflows ${total.workflows}; converted without the node compiler ${total.plainConversions}`,
);
console.log(
	`nodes ${total.nodes}; in the fallback host ${total.hostNodes}; compiled ${total.compiledNodes}`,
);
console.log(`\nNodes in the fallback host by reason\n${top(total.hostReason, 20)}`);
console.log(`\nNodes in the fallback host by node type\n${top(total.hostByType, 25)}`);
console.log(
	`\nVerifier coverage: operation | condition that the list does not have\n${top(total.missing, 60)}`,
);
console.log(
	`\nVerifier coverage: operation | all missing conditions of a node\n${top(total.missingSets, 40)}`,
);
console.log(`\nCompile failures: node type | first blocker\n${top(total.compileErrorByType, 40)}`);
console.log(`\nNo compile attempt: node type | diagnostic code\n${top(total.noAttempt, 30)}`);
console.log(`\nReason | node type\n${top(total.hostReasonByType, 40)}`);
