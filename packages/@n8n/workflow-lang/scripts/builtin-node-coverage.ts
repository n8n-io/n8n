/**
 * Census of n8n's built-in nodes: for each node type, version and operation, the way that runs
 * it without the fallback host, or the reason why none does. Writes
 * `docs/builtin-node-coverage.md`.
 *
 *   node scripts/builtin-node-coverage.ts
 *       Writes the document from the repository and the two committed data files.
 *   node scripts/builtin-node-coverage.ts --compile [--only <regex>]
 *       Compiles each operation that has no way, and stores its blockers in
 *       `docs/builtin-node-blockers.json`. It does not run v1. A run without `--only` takes
 *       some minutes; a run with `--only` replaces the blockers of the matching node types.
 *   node scripts/builtin-node-coverage.ts --bundles <dir> [--fallback <results.jsonl>]
 *       Counts the real workflows that use each operation, and stores the counts in
 *       `docs/builtin-node-usage.json`. Only counts by node type, version, resource and
 *       operation leave the workflows.
 *
 * Format the two data files after a run that writes them: `biome format --write docs`.
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { MIN_VERSIONS } from '../src/convert/library.ts';
import type { NodeDescription } from '../src/convert/node-parameters.ts';
import { getNodeParameters } from '../src/convert/node-parameters.ts';
import { NATIVE } from '../src/convert/registry.ts';
import { isTriggerType } from '../src/convert/triggers.ts';
import { publicCredential } from '../src/credentials/public.ts';
import { loadCredentialTypes, registryOf } from '../src/credentials/types.ts';
import { NODE_SOURCES } from '../src/generated/sources.generated.ts';
import type { Support } from '../src/library/check.ts';
import { operationKey, readSupport } from '../src/library/check.ts';
import { compileForCheck } from '../src/node-compile/__tests__/verify.ts';
import type { NodeSources } from '../src/node-compile/convert.ts';
import { evaluateInSandbox } from '../src/node-compile/evaluate-node.ts';
import { VERIFIED } from '../src/node-compile/verified.generated.ts';

type Json = Record<string, unknown>;
interface Property {
	name: string;
	type: string;
	options?: Array<{ value?: unknown }>;
	displayOptions?: { show?: Record<string, unknown[]> };
}
interface LoadedNode {
	description: NodeDescription & {
		version: number | number[];
		group?: string[];
		credentials?: Array<{ name: string; displayOptions?: { show?: Record<string, unknown[]> } }>;
	};
	nodeVersions?: Record<string, LoadedNode>;
	constructor: { name: string };
	execute?: unknown;
	trigger?: unknown;
	poll?: unknown;
	webhook?: unknown;
	supplyData?: unknown;
}
interface Known {
	className: string;
	sourcePath: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const docs = join(here, '../docs');
const USAGE_FILE = join(docs, 'builtin-node-usage.json');
const BLOCKERS_FILE = join(docs, 'builtin-node-blockers.json');
const OUT_FILE = join(docs, 'builtin-node-coverage.md');
const BASE = 'n8n-nodes-base';
const LANGCHAIN = '@n8n/n8n-nodes-langchain';
const PACKAGES = [
	{ prefix: BASE, dir: join(here, '../../../nodes-base') },
	{ prefix: LANGCHAIN, dir: join(here, '../../nodes-langchain') },
];
const MAX_BLOCKERS = 20;

const args = process.argv.slice(2);
const valueOf = (flag: string) => {
	const at = args.indexOf(flag);
	return at >= 0 ? args[at + 1] : undefined;
};
const COMPILE = args.includes('--compile');
const only = new RegExp(valueOf('--only') ?? '.', 'i');
const bundlesDir = valueOf('--bundles');
const fallbackFile = valueOf('--fallback');

function isRecord(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------------------------
// The node types of the two packages.
// ---------------------------------------------------------------------------------------------

interface Version {
	version: number;
	node: LoadedNode;
}
interface NodeType {
	type: string;
	pack: string;
	name: string;
	versions: Version[];
	trigger: boolean;
}

const known = new Map<string, { dir: string; entry: Known }>();
const nodeTypes: NodeType[] = [];
const classFile = new Map<string, string>();

function findClasses(dir: string): void {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (!/^(test|__tests__|__schema__)$/.test(entry)) findClasses(path);
		} else if (entry.endsWith('.node.ts')) {
			for (const m of readFileSync(path, 'utf8').matchAll(/^(?:export )?class (\w+)/gm))
				classFile.set(m[1], path);
		}
	}
}

for (const { prefix, dir } of PACKAGES) {
	const file = join(dir, 'dist/known/nodes.json');
	if (!existsSync(file)) {
		console.error(`Build ${prefix} first: ${file} is not there.`);
		process.exit(1);
	}
	if (prefix === BASE) findClasses(join(dir, 'nodes'));
	const load = createRequire(join(dir, 'package.json'));
	const list: Record<string, Known> = JSON.parse(readFileSync(file, 'utf8'));
	for (const name of Object.keys(list).sort()) {
		const type = `${prefix}.${name}`;
		known.set(type, { dir, entry: list[name] });
		let top: LoadedNode;
		try {
			top = new (load(join(dir, list[name].sourcePath))[list[name].className])();
		} catch {
			continue;
		}
		const versions: Version[] = top.nodeVersions
			? Object.keys(top.nodeVersions).map((v) => ({
					version: Number(v),
					node: top.nodeVersions?.[v] ?? top,
				}))
			: [top.description.version].flat().map((version) => ({ version, node: top }));
		const last = versions[versions.length - 1]?.node ?? top;
		const trigger =
			isTriggerType(type) ||
			(last.description.group ?? []).includes('trigger') ||
			(last.execute === undefined &&
				last.supplyData === undefined &&
				(last.trigger !== undefined || last.poll !== undefined || last.webhook !== undefined));
		nodeTypes.push({ type, pack: prefix, name, versions, trigger });
	}
}

const byType = new Map(nodeTypes.map((n) => [n.type, n]));

/** The operations of a node version, as `scripts/verify-compiled-nodes.ts` lists them. */
function operations(node: LoadedNode): Array<{ resource: string; operation: string }> {
	const properties = node.description.properties as unknown as Property[];
	const values = (p: Property) =>
		(p.options ?? []).map((o) => o.value).filter((v): v is string => typeof v === 'string');
	const resources = properties.filter((p) => p.name === 'resource').flatMap(values);
	const out: Array<{ resource: string; operation: string }> = [];
	for (const resource of resources.length > 0 ? [...new Set(resources)] : [undefined]) {
		const shown = properties.filter(
			(p) =>
				p.name === 'operation' &&
				(resource === undefined ||
					!p.displayOptions?.show?.resource ||
					p.displayOptions.show.resource.includes(resource)),
		);
		const names = [...new Set(shown.flatMap(values))];
		for (const operation of names.length > 0 ? names : [undefined])
			out.push({ resource: resource ?? '', operation: operation ?? '' });
	}
	return out;
}

const keyOf = (type: string, version: number, resource: string, operation: string) =>
	`${type}@${version}:${resource}.${operation}`;

// ---------------------------------------------------------------------------------------------
// The four ways.
// ---------------------------------------------------------------------------------------------

type Way = 'native' | 'library' | 'declarative' | 'compiled' | 'trigger' | 'none';

const supports = new Map<string, { support: Support; declarative: boolean }>();
for (const [file, text] of Object.entries(NODE_SOURCES)) {
	const read = readSupport(ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true));
	if (read)
		supports.set(read.type, { support: read.support, declarative: file.includes('declarative/') });
}

function wayOf(n: NodeType, version: number, resource: string, operation: string): Way {
	if (NATIVE[n.type]) return 'native';
	if (operation === 'sendAndWait') return 'native';
	const library = supports.get(n.type);
	if (library && version >= (MIN_VERSIONS[n.type] ?? 0)) {
		const r = resource === '' ? library.support.resource : resource;
		const o = operation === '' ? (library.support.operation[r] ?? '') : operation;
		if (library.support.operations[operationKey(r, o)])
			return library.declarative ? 'declarative' : 'library';
	}
	if (VERIFIED[keyOf(n.type, version, resource, operation)]) return 'compiled';
	if (n.trigger) return 'trigger';
	return 'none';
}

// ---------------------------------------------------------------------------------------------
// The reason class of an operation with no way.
// ---------------------------------------------------------------------------------------------

type ReasonClass =
	| 'ai'
	| 'local'
	| 'protocol'
	| 'file'
	| 'excluded'
	| 'declarative'
	| 'compiler'
	| 'verifier'
	| 'unmeasured';

const CLASS_TITLE: Record<ReasonClass, string> = {
	ai: 'AI node of the LangChain package (runs as a cluster in the host)',
	local: 'Local system access (commands, files on disk)',
	protocol: 'Needs a protocol client that is not HTTP',
	file: 'Binary or file processing, or another runtime primitive',
	excluded:
		'Excluded TypeScript feature (closure factory, class, `this` as a value, npm driver or parser)',
	declarative: 'Declarative node that the translator does not take',
	compiler: 'Compiler blocker',
	verifier: 'Compiles; not proven equal to v1',
	unmeasured: 'Not measured (run with `--compile`)',
};
const CLASS_ROUTE: Record<ReasonClass, string> = {
	ai: 'c',
	local: 'd',
	protocol: 'c',
	file: 'c',
	excluded: 'b',
	declarative: 'a',
	compiler: 'a',
	verifier: 'a',
	unmeasured: '?',
};

const LOCAL_TYPES = new Set(
	[
		'executeCommand',
		'readWriteFile',
		'readBinaryFile',
		'readBinaryFiles',
		'writeBinaryFile',
		'git',
		'localFileTrigger',
	].map((t) => `${BASE}.${t}`),
);
const LOCAL_PACKAGES =
	/^(node:)?(child_process|fs|fs\/promises)$|^(simple-git|chokidar|tmp-promise|fast-glob)$/;
const PROTOCOLS: Array<[RegExp, string]> = [
	[/^(pg|pg-promise|pg-cursor)$/, 'Postgres'],
	[/^(mysql2|mysql2\/promise)$/, 'MySQL'],
	[/^mongodb$/, 'MongoDB'],
	[/^(ioredis|redis)$/, 'Redis'],
	[/^amqplib$/, 'AMQP'],
	[/^rhea$/, 'AMQP 1.0'],
	[/^(kafkajs|@kafkajs\/.*)$/, 'Kafka'],
	[/^mqtt$/, 'MQTT'],
	[/^(promise-ftp|ssh2-sftp-client|basic-ftp)$/, 'FTP/SFTP'],
	[/^nodemailer$/, 'SMTP'],
	[/^(imap|@n8n\/imap|imap-simple)$/, 'IMAP'],
	[/^ldapts$/, 'LDAP'],
	[/^(node-ssh|ssh2)$/, 'SSH'],
	[/^snowflake-sdk$/, 'Snowflake driver'],
	[/^(mssql|tedious)$/, 'Microsoft SQL (TDS)'],
	[/^oracledb$/, 'Oracle driver'],
	[/^(node:)?(net|tls|dgram)$/, 'TCP socket'],
	[/^(ws|eventsource)$/, 'WebSocket or event stream'],
];
const FILES: Array<[RegExp, string]> = [
	[/^(xlsx|@e965\/xlsx)$/, 'spreadsheet'],
	[/^(node:)?(stream|stream\/promises)$/, 'binary stream'],
	[/^(node:)?crypto$/, 'hash, HMAC and signature'],
	[/^(pdfjs-dist|pdfjs-dist\/.*|pdf-parse)$/, 'PDF'],
	[/^(fflate|node:zlib|zlib)$/, 'compression'],
	[/^(gm|sharp)$/, 'image editing'],
	[/^(csv-parse|csv-parse\/.*)$/, 'CSV'],
	[/^(iconv-lite|chardet)$/, 'text encoding'],
	[/^(ics|ical|node-ical)$/, 'calendar file'],
	[/^(file-type|mime-types)$/, 'file type'],
];
const BINARY_HELPER =
	/this\.helpers\.(getBinaryStream|binaryToBuffer|binaryToString|detectBinaryEncoding|createReadStream)/;
const CORE_PACKAGES = /^(n8n-workflow|n8n-core|@n8n\/|@utils\/)/;
/** Packages of small pure functions: a compiled form is a compiler fix, not a port. */
const UTILITY_PACKAGES =
	/^(lodash|lodash\/.*|moment|moment-timezone|luxon|uuid|change-case|qs|(node:)?(util|url|path|querystring|http|https|os))$/;
const EXCLUDED_FEATURE: Array<[RegExp, string]> = [
	[/an object of the class/, 'class instance'],
	[/class .* (extends|inherit)|extends the class/, 'class inheritance'],
	[/`this` as a value/, '`this` as a value (`const self = this`)'],
];

interface Reason {
	cls: ReasonClass;
	detail: string;
}

function packagesOf(blockers: string[]): string[] {
	const out = new Set<string>();
	for (const b of blockers) {
		const m = /comes from the package '([^']+)'/.exec(b);
		if (m) out.add(m[1]);
	}
	return [...out];
}

/** Names that a module-level destructuring of a call result declares: a closure factory. */
const factoryNames = new Map<string, Set<string>>();
function closureFactoryNames(type: string, version: number): Set<string> {
	const id = `${type}@${version}`;
	const found = factoryNames.get(id);
	if (found) return found;
	const names = new Set<string>();
	const node = byType.get(type)?.versions.find((v) => v.version === version)?.node;
	const entry = node ? classFile.get(node.constructor.name) : undefined;
	const seen = new Set<string>();
	const visit = (file: string) => {
		if (seen.has(file) || seen.size > 400) return;
		seen.add(file);
		const text = readFileSync(file, 'utf8');
		for (const m of text.matchAll(/^(?:export )?const \{([^}]*)\}\s*=\s*\w+\(/gm))
			for (const part of m[1].split(','))
				names.add(
					part
						.split(':')
						.pop()
						?.trim()
						.replace(/^type /, '') ?? '',
				);
		for (const m of text.matchAll(/(?:from|import\()\s*'(\.[^']*|@utils\/[^']*)'/g)) {
			const target = m[1].startsWith('@utils/')
				? join(PACKAGES[0].dir, 'utils', m[1].slice('@utils/'.length))
				: join(dirname(file), m[1]);
			for (const candidate of [`${target}.ts`, join(target, 'index.ts')])
				if (existsSync(candidate) && statSync(candidate).isFile()) visit(candidate);
		}
	};
	if (entry) visit(entry);
	names.delete('');
	factoryNames.set(id, names);
	return names;
}

function classify(n: NodeType, version: number, blockers: string[] | undefined): Reason {
	if (n.pack === LANGCHAIN) return { cls: 'ai', detail: '' };
	if (LOCAL_TYPES.has(n.type)) return { cls: 'local', detail: '' };
	if (blockers === undefined) return { cls: 'unmeasured', detail: '' };
	if (blockers.length === 0) return { cls: 'verifier', detail: '' };
	const packages = packagesOf(blockers);
	const protocol = PROTOCOLS.find(([p]) => packages.some((name) => p.test(name)));
	if (protocol) return { cls: 'protocol', detail: protocol[1] };
	const file = FILES.find(([p]) => packages.some((name) => p.test(name)));
	if (file) return { cls: 'file', detail: file[1] };
	// A node that calls an API and also imports a file module (an upload from a path): the
	// operations that do not open a file can have a library node.
	if (packages.some((name) => LOCAL_PACKAGES.test(name)))
		return {
			cls: 'excluded',
			detail: `file module ${packages.filter((name) => LOCAL_PACKAGES.test(name)).join(', ')} in the source`,
		};
	if (blockers.some((b) => BINARY_HELPER.test(b))) return { cls: 'file', detail: 'binary stream' };
	const feature = EXCLUDED_FEATURE.find(([p]) => blockers.some((b) => p.test(b)));
	if (feature) return { cls: 'excluded', detail: feature[1] };
	const factory = closureFactoryNames(n.type, version);
	const undeclared = blockers
		.map((b) => /the name '([^']+)' has no declaration/.exec(b)?.[1])
		.filter((name): name is string => name !== undefined);
	if (undeclared.some((name) => factory.has(name)))
		return { cls: 'excluded', detail: 'closure factory' };
	const foreign = packages.filter(
		(name) => !CORE_PACKAGES.test(name) && !UTILITY_PACKAGES.test(name),
	);
	if (foreign.length > 0)
		return { cls: 'excluded', detail: `npm package ${foreign.slice(0, 3).join(', ')}` };
	if (blockers.some((b) => b.includes('no class with an execute method')))
		return { cls: 'declarative', detail: '' };
	const utility = packages.filter((name) => UTILITY_PACKAGES.test(name));
	if (utility.length > 0)
		return { cls: 'compiler', detail: `utility package ${utility.slice(0, 3).join(', ')}` };
	return { cls: 'compiler', detail: blockers[0].slice(0, 100) };
}

// ---------------------------------------------------------------------------------------------
// `--compile`: the blockers of each operation with no way.
// ---------------------------------------------------------------------------------------------

type Blockers = Record<string, Record<string, string[]>>;

function readBlockers(): Blockers {
	return existsSync(BLOCKERS_FILE) ? JSON.parse(readFileSync(BLOCKERS_FILE, 'utf8')) : {};
}

function blockersOf(
	all: Blockers,
	type: string,
	version: number,
	op: string,
): string[] | undefined {
	const node = all[`${type}@${version}`];
	if (!node) return undefined;
	const out: string[] = [];
	let seen = false;
	for (const [blocker, ops] of Object.entries(node)) {
		if (!ops.includes(op)) continue;
		seen = true;
		if (blocker !== '') out.push(blocker);
	}
	return seen ? out : undefined;
}

function compileBlockers(): void {
	const base = PACKAGES[0].dir;
	const knownCredentials: Record<string, Known> = JSON.parse(
		readFileSync(join(base, 'dist/known/credentials.json'), 'utf8'),
	);
	const registry = registryOf(loadCredentialTypes().types);
	const versionOf = (type: string, version: number) =>
		byType.get(type)?.versions.find((v) => v.version === version)?.node;
	const sources: NodeSources = {
		entry: (type, version) => {
			const node = versionOf(type, version);
			return node ? classFile.get(node.constructor.name) : undefined;
		},
		readFile: (path) =>
			existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined,
		description: (type, version) => versionOf(type, version)?.description,
		aliases: { '@utils/': `${base}/utils/` },
		evaluate: evaluateInSandbox,
		credentialEntry: (type) => {
			const entry = knownCredentials[type];
			return entry ? join(base, entry.sourcePath) : undefined;
		},
	};
	let signingKey: string | undefined;
	const fakeCredential = (type: string): Json => {
		const data: Json = {};
		const info = registry.get(type);
		const session = info?.preAuthentication === true ? info.expirable : undefined;
		for (const [key, value] of Object.entries(info?.defaults ?? {})) {
			const address = /url|host|domain|server|endpoint/i.test(key);
			const filled = address ? 'https://api.example.test' : `fake-${key}`;
			data[key] = value === '' && key !== session ? filled : value;
		}
		if (type === 'googleApi') {
			signingKey ??= generateKeyPairSync('rsa', {
				modulusLength: 2048,
				privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
				publicKeyEncoding: { type: 'spki', format: 'pem' },
			}).privateKey;
			data.privateKey = signingKey;
		}
		if (/oauth2/i.test(type))
			data.oauthTokenData = {
				access_token: 'fake-token',
				instance_url: 'https://instance.example.test',
				api_domain: 'https://api.example.test',
			};
		return data;
	};
	const resolve = (node: LoadedNode, version: number, parameters: Json): Json => {
		const d = node.description;
		return getNodeParameters(d.properties, parameters, true, false, version, d) ?? {};
	};
	const required = (node: LoadedNode, version: number, start: Json): Json => {
		const properties = node.description.properties as unknown as Property[];
		const out: Json = { ...start };
		for (const [name, value] of Object.entries(resolve(node, version, start))) {
			const type = properties.find((p) => p.name === name)?.type;
			if (name in out) continue;
			if (type === 'string' && value === '') out[name] = 'v1';
			else if (type === 'json' && value === '') out[name] = '{}';
			else if (type === 'number' && value === undefined) out[name] = 1;
			else if (type === 'resourceLocator') out[name] = { __rl: true, mode: 'id', value: 'id1' };
		}
		return out;
	};
	const credentialOf = (node: LoadedNode, resolved: Json): string | undefined => {
		const all = node.description.credentials ?? [];
		const shown = all.find((c) =>
			Object.entries(c.displayOptions?.show ?? {}).every(
				([name, allowed]) => name.startsWith('@') || allowed.includes(resolved[name]),
			),
		);
		return (shown ?? all[0])?.name;
	};
	const normal = (error: string) =>
		error
			.replace(/^[A-Za-z]+\d*: /, '')
			.replace(/\s+/g, ' ')
			.slice(0, 160);

	const all = readBlockers();
	let done = 0;
	for (const n of nodeTypes) {
		if (n.pack !== BASE || n.trigger || !only.test(n.name)) continue;
		for (const { version, node } of n.versions) {
			const id = `${n.type}@${version}`;
			delete all[id];
			const found: Record<string, string[]> = {};
			for (const { resource, operation } of operations(node)) {
				if (wayOf(n, version, resource, operation) !== 'none') continue;
				const op = `${resource}.${operation}`;
				let errors: string[];
				try {
					const start: Json = {
						...(resource === '' ? {} : { resource }),
						...(operation === '' ? {} : { operation }),
					};
					const parameters = required(node, version, start);
					const credential = credentialOf(node, resolve(node, version, parameters));
					const fields = credential
						? {
								[credential]: publicCredential(
									registry.get(credential),
									fakeCredential(credential),
								),
							}
						: {};
					const compiled = compileForCheck(sources, { type: n.type, version, parameters }, fields);
					errors = 'errors' in compiled ? compiled.errors : [];
				} catch (error) {
					errors = [`crash: the compiler failed: ${error instanceof Error ? error.message : ''}`];
				}
				const texts = [...new Set(errors.slice(0, MAX_BLOCKERS).map(normal))];
				for (const text of texts.length > 0 ? texts : ['']) (found[text] ??= []).push(op);
				done++;
			}
			if (Object.keys(found).length > 0) all[id] = found;
		}
		writeFileSync(BLOCKERS_FILE, `${JSON.stringify(all, null, '\t')}\n`);
		console.error(`${n.name}: ${done} operations compiled so far`);
	}
}

// ---------------------------------------------------------------------------------------------
// `--bundles`: the counts of real workflows.
// ---------------------------------------------------------------------------------------------

interface Usage {
	workflows: number;
	types: Record<string, number>;
	operations: Record<string, number>;
	fallbackRows: number;
	fallback: Record<string, number>;
}

function readUsage(): Usage {
	return existsSync(USAGE_FILE)
		? JSON.parse(readFileSync(USAGE_FILE, 'utf8'))
		: { workflows: 0, types: {}, operations: {}, fallbackRows: 0, fallback: {} };
}

function sorted(counts: Record<string, number>): Record<string, number> {
	return Object.fromEntries(
		Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
	);
}

function countUsage(dir: string): void {
	const usage = readUsage();
	usage.workflows = 0;
	usage.types = {};
	usage.operations = {};
	const text = (v: unknown) => (typeof v === 'string' && !v.startsWith('=') ? v : '?');
	// Only a name from a node description leaves the workflows, never another value.
	const described = new Set<string>();
	for (const n of nodeTypes)
		for (const { version, node } of n.versions)
			for (const { resource, operation } of operations(node))
				described.add(keyOf(n.type, version, resource, operation));
	for (const chunk of readdirSync(dir).filter((name) => name.startsWith('chunk-'))) {
		const bundles = join(dir, chunk, 'bundles');
		for (const bundle of existsSync(bundles) ? readdirSync(bundles) : []) {
			const file = join(bundles, bundle, 'workflow.json');
			let workflow: unknown;
			try {
				workflow = JSON.parse(readFileSync(file, 'utf8'));
			} catch {
				continue;
			}
			if (!isRecord(workflow) || !Array.isArray(workflow.nodes)) continue;
			usage.workflows++;
			const types = new Set<string>();
			const keys = new Set<string>();
			for (const node of workflow.nodes.filter(isRecord)) {
				const n = typeof node.type === 'string' ? byType.get(node.type) : undefined;
				if (!n || node.disabled === true) continue;
				types.add(n.type);
				const version = typeof node.typeVersion === 'number' ? node.typeVersion : 1;
				const loaded = n.versions.find((v) => v.version === version)?.node;
				const parameters = isRecord(node.parameters) ? node.parameters : {};
				let resolved: Json = parameters;
				if (loaded) {
					try {
						const d = loaded.description;
						resolved =
							getNodeParameters(d.properties, parameters, true, false, version, d) ?? parameters;
					} catch {
						resolved = parameters;
					}
				}
				const has = (name: string) => name in resolved || name in parameters;
				const resource = has('resource') ? text(resolved.resource ?? parameters.resource) : '';
				const operation = has('operation') ? text(resolved.operation ?? parameters.operation) : '';
				const key = keyOf(n.type, version, resource, operation);
				if (described.has(key)) keys.add(key);
			}
			for (const type of types) usage.types[type] = (usage.types[type] ?? 0) + 1;
			for (const key of keys) usage.operations[key] = (usage.operations[key] ?? 0) + 1;
		}
	}
	if (fallbackFile !== undefined) {
		usage.fallbackRows = 0;
		usage.fallback = {};
		for (const line of readFileSync(fallbackFile, 'utf8').split('\n')) {
			if (line === '') continue;
			const row: unknown = JSON.parse(line);
			if (!isRecord(row)) continue;
			usage.fallbackRows++;
			for (const short of Array.isArray(row.fallback) ? new Set(row.fallback) : []) {
				if (typeof short !== 'string') continue;
				const type = short.startsWith('lc.')
					? `${LANGCHAIN}.${short.slice(3)}`
					: `${BASE}.${short}`;
				if (byType.has(type)) usage.fallback[type] = (usage.fallback[type] ?? 0) + 1;
			}
		}
	}
	usage.types = sorted(usage.types);
	usage.operations = sorted(usage.operations);
	usage.fallback = sorted(usage.fallback);
	writeFileSync(USAGE_FILE, `${JSON.stringify(usage, null, '\t')}\n`);
}

// ---------------------------------------------------------------------------------------------
// The document.
// ---------------------------------------------------------------------------------------------

if (bundlesDir !== undefined) countUsage(bundlesDir);
if (COMPILE) compileBlockers();

const usage = readUsage();
const blockers = readBlockers();
const WAYS: Way[] = ['native', 'library', 'declarative', 'compiled', 'trigger', 'none'];
const WAY_TITLE: Record<Way, string> = {
	native: 'Native lowering of a core node',
	library: 'Hand-written library node',
	declarative: 'Declarative node, translated',
	compiled: 'Compiled from the source and verified',
	trigger: 'Trigger (n8n starts the workflow; no step runs)',
	none: 'None: the fallback host runs it',
};

interface OpRow {
	n: NodeType;
	version: number;
	op: string;
	way: Way;
	reason?: Reason;
	uses: number;
}
const rows: OpRow[] = [];
for (const n of nodeTypes) {
	for (const { version, node } of n.versions) {
		for (const { resource, operation } of operations(node)) {
			const way = wayOf(n, version, resource, operation);
			const op = `${resource}.${operation}`;
			rows.push({
				n,
				version,
				op,
				way,
				reason:
					way === 'none'
						? classify(n, version, blockersOf(blockers, n.type, version, op))
						: undefined,
				uses: usage.operations[keyOf(n.type, version, resource, operation)] ?? 0,
			});
		}
	}
}

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
const share = (part: number, whole: number) =>
	whole === 0 ? '0.0%' : `${((100 * part) / whole).toFixed(1)}%`;
const types = (list: OpRow[]) => new Set(list.map((r) => r.n.type)).size;
const short = (type: string) =>
	type.startsWith(`${BASE}.`)
		? type.slice(BASE.length + 1)
		: `lc.${type.slice(LANGCHAIN.length + 1)}`;

const lines: string[] = [];
const table = (head: string[], body: Array<Array<string | number>>) => {
	lines.push(`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`);
	for (const row of body) lines.push(`| ${row.join(' | ')} |`);
	lines.push('');
};

lines.push(
	'# Coverage of the built-in nodes',
	'',
	'Generated by `scripts/builtin-node-coverage.ts`. Do not edit. The header of the script tells how to run it again.',
	'',
	'An operation is one node type, one version and one `resource.operation` of that version (a node without operations counts as one). The converter tries four ways in this order: the native lowering of a core node, a library node (hand-written or translated from a declarative description), and the node compiled from its source and verified against v1. An operation with no way runs in the fallback host, so each workflow still runs.',
	'',
	`"Uses" counts real workflows: the workflows of ${usage.workflows} certified bundles that have a node with that type, version and operation (one count for each workflow and operation). "Falls back in" is the count of workflows, of ${usage.fallbackRows} in the coverage run, in which a node of the type went to the fallback host. Only counts leave the workflows. A node whose resource or operation is an expression counts for the node type and for no operation. The tool variant of a node (\`gmailTool\`) and a community node are not counted.`,
	'',
	'A way covers an operation, not each parameter set: a library node sends a call that its `supports` list does not accept to the next way, and a compiled operation runs only for the parameter forms that the verifier proved. A native lowering sends an expression that it cannot translate to the fallback host.',
	'',
);

for (const pack of [BASE, LANGCHAIN]) {
	const mine = rows.filter((r) => r.n.pack === pack);
	const uses = sum(mine.map((r) => r.uses));
	lines.push(`## ${pack}: operations by way`, '');
	lines.push(
		`${nodeTypes.filter((n) => n.pack === pack).length} node types, ${mine.length} operations, ${uses} uses.`,
		'',
	);
	table(
		['Way', 'Node types', 'Operations', 'Share', 'Uses', 'Share of uses'],
		WAYS.map((way) => {
			const of = mine.filter((r) => r.way === way);
			const used = sum(of.map((r) => r.uses));
			return [
				WAY_TITLE[way],
				types(of),
				of.length,
				share(of.length, mine.length),
				used,
				share(used, uses),
			];
		}),
	);
	const none = mine.filter((r) => r.way === 'none');
	lines.push(`### ${pack}: operations with no way, by reason`, '');
	const classes = [...new Set(none.map((r) => r.reason?.cls ?? 'unmeasured'))];
	table(
		['Reason', 'Route', 'Node types', 'Operations', 'Uses'],
		classes
			.map((cls) => {
				const of = none.filter((r) => r.reason?.cls === cls);
				return [
					CLASS_TITLE[cls],
					CLASS_ROUTE[cls],
					types(of),
					of.length,
					sum(of.map((r) => r.uses)),
				];
			})
			.sort((a, b) => Number(b[4]) - Number(a[4]) || Number(b[3]) - Number(a[3])),
	);
}

const baseNone = rows.filter((r) => r.n.pack === BASE && r.way === 'none');
const detailRows = (cls: ReasonClass) => {
	const of = baseNone.filter((r) => r.reason?.cls === cls);
	const details = [...new Set(of.map((r) => r.reason?.detail ?? ''))];
	return details
		.map((detail) => {
			const part = of.filter((r) => r.reason?.detail === detail);
			const names = [...new Set(part.map((r) => short(r.n.type)))];
			return [
				detail === '' ? '(the node type itself)' : detail.replace(/\|/g, '\\|'),
				names.length,
				part.length,
				sum(part.map((r) => r.uses)),
				names.slice(0, 8).join(', ') + (names.length > 8 ? ', …' : ''),
			];
		})
		.sort((a, b) => Number(b[3]) - Number(a[3]) || Number(b[2]) - Number(a[2]));
};
const detailTable = (title: string, cls: ReasonClass, first: string, limit = 40) => {
	const body = detailRows(cls);
	if (body.length === 0) return;
	lines.push(`### ${title}`, '');
	table([first, 'Node types', 'Operations', 'Uses', 'Nodes'], body.slice(0, limit));
	if (body.length > limit) lines.push(`${body.length - limit} more rows with fewer uses.`, '');
};

lines.push('## The plan to 100%', '');
lines.push(
	'Each operation with no way gets the cheapest exact route:',
	'',
	'* (a) A compiler or verifier fix. The node source has no excluded feature. Other cards own these fixes; the tables below list the blockers.',
	'* (b) A hand-written library node in `src/nodes/`. The source uses a feature that the node compiler will not support: a closure factory, class inheritance, `this` as a value, or an npm driver or parser.',
	'* (c) Runtime work first: a protocol client or a file-processing primitive in the runtime, then a library node on top of it.',
	'* (d) Not native by design: the node reads or changes the machine of the host. It stays in the fallback host.',
	'',
);
{
	const routes: Array<[string, string, ReasonClass[]]> = [
		['a', 'Compiler, translator or verifier fix', ['compiler', 'declarative', 'verifier']],
		['b', 'Hand-written library node', ['excluded']],
		['c', 'Runtime primitive, then a library node', ['protocol', 'file']],
		['d', 'Stays in the fallback host', ['local']],
		['?', 'Not measured', ['unmeasured']],
	];
	table(
		['Route', 'Work', 'Node types', 'Operations', 'Uses'],
		routes
			.map(([route, work, classes]): Array<string | number> => {
				const of = baseNone.filter((r) => r.reason && classes.includes(r.reason.cls));
				return [route, work, types(of), of.length, sum(of.map((r) => r.uses))];
			})
			.filter((row) => row[3] !== 0),
	);
}
lines.push(
	'Route (d) and the owner\'s "100%": Execute Command, Read/Write Files from Disk, the older binary file nodes and Git run a program or open a file on the machine of n8n. A compiled module has no such access, and must never get it. These node types stay correct in the fallback host, under the rules that n8n already has for them (`NODES_EXCLUDE`, the file access allow list). "100% native" cannot include them; "100% of the built-in nodes run, and each node that can be native is native" can.',
	'',
	'The LangChain package: each AI node runs as a cluster in the fallback host (the root node with its model, memory and tool sub-nodes). The one library node is the OpenAI message. A native route needs a model client, the agent loop and the tool protocol in the runtime, so it is route (c) and it is outside this census of operations.',
	'',
	'Triggers: n8n itself listens, polls or receives the webhook, and starts the workflow with the items. The converter lowers the core triggers (webhook, schedule, manual, form, error, sub-workflow) and two polls (Gmail, Google Sheets). Each other trigger starts the workflow through n8n and needs no way of its own.',
	'',
);
detailTable('Route (c): protocol clients that the runtime needs', 'protocol', 'Protocol');
detailTable(
	'Route (c): file-processing and other primitives that the runtime needs',
	'file',
	'Primitive',
);
detailTable('Route (b): excluded features', 'excluded', 'Feature');
detailTable('Route (d): local system access', 'local', 'Access');
detailTable(
	'Route (a): compiler blockers (first blocker of the operation)',
	'compiler',
	'Blocker',
	60,
);
detailTable(
	'Route (a): declarative nodes that the translator does not take',
	'declarative',
	'State',
);
detailTable(
	'Route (a): operations that compile and are not proven equal to v1',
	'verifier',
	'State',
);

{
	lines.push('### Route (b) and (c): node types in order of real use', '');
	const of = baseNone.filter(
		(r) => r.reason && ['excluded', 'protocol', 'file'].includes(r.reason.cls),
	);
	const names = [...new Set(of.map((r) => r.n.type))];
	const body = names
		.map((type) => {
			const part = of.filter((r) => r.n.type === type);
			const details = [...new Set(part.map((r) => r.reason?.detail ?? ''))];
			return [
				`\`${short(type)}\``,
				usage.types[type] ?? 0,
				sum(part.map((r) => r.uses)),
				part.length,
				[...new Set(part.map((r) => CLASS_ROUTE[r.reason?.cls ?? 'unmeasured']))].join(', '),
				details.slice(0, 3).join('; ').replace(/\|/g, '\\|'),
			];
		})
		.sort((a, b) => Number(b[2]) - Number(a[2]) || Number(b[1]) - Number(a[1]));
	table(
		['Node', 'Workflows', 'Uses with no way', 'Operations with no way', 'Route', 'Reason'],
		body.slice(0, 60),
	);
}

for (const pack of [BASE, LANGCHAIN]) {
	lines.push(`## ${pack}: node types`, '');
	lines.push(
		'Operations count each version. "Covered" is each way but "none"; a trigger counts as covered. The reason and the route are those of the operations with no way.',
		'',
	);
	const body = nodeTypes
		.filter((n) => n.pack === pack)
		.map((n) => {
			const mine = rows.filter((r) => r.n === n);
			const count = (way: Way) => mine.filter((r) => r.way === way).length;
			const none = mine.filter((r) => r.way === 'none');
			const reasons = [...new Set(none.map((r) => r.reason?.cls ?? 'unmeasured'))];
			const detail = [...new Set(none.map((r) => r.reason?.detail ?? '').filter((d) => d !== ''))];
			const ways = WAYS.filter((way) => way !== 'none' && count(way) > 0)
				.map((way) => `${way} ${count(way)}`)
				.join(', ');
			const usedNone = sum(none.map((r) => r.uses));
			return {
				workflows: usage.types[n.type] ?? 0,
				row: [
					`\`${short(n.type)}\``,
					usage.types[n.type] ?? 0,
					usage.fallback[n.type] ?? 0,
					n.versions
						.map((v) => v.version)
						.sort((a, b) => a - b)
						.join(', '),
					`${mine.length - none.length} / ${mine.length}`,
					ways === '' ? '—' : ways,
					usedNone,
					[...new Set(reasons.map((cls) => CLASS_ROUTE[cls]))].sort().join(', ') || '—',
					reasons.length === 0
						? '—'
						: pack === LANGCHAIN
							? 'AI node'
							: `${reasons.join(', ')}${detail.length > 0 ? `: ${detail.slice(0, 2).join('; ').replace(/\|/g, '\\|').slice(0, 90)}` : ''}`,
				],
			};
		})
		.sort((a, b) => b.workflows - a.workflows || String(a.row[0]).localeCompare(String(b.row[0])));
	table(
		[
			'Node',
			'Workflows',
			'Falls back in',
			'Versions',
			'Operations covered / total',
			'Ways',
			'Uses with no way',
			'Route',
			'Reason of the rest',
		],
		body.map((b) => b.row),
	);
}

writeFileSync(OUT_FILE, `${lines.join('\n').trimEnd()}\n`);
const baseRows = rows.filter((r) => r.n.pack === BASE);
console.log(
	`${OUT_FILE}: ${nodeTypes.length} node types; ${BASE}: ${baseRows.length} operations, ${WAYS.map((way) => `${way} ${baseRows.filter((r) => r.way === way).length}`).join(', ')}`,
);
