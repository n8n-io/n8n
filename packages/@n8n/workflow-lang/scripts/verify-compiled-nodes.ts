import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NodeDescription } from '../src/convert/node-parameters.ts';
import { getNodeParameters } from '../src/convert/node-parameters.ts';
import { publicCredential } from '../src/credentials/public.ts';
import { loadCredentialTypes, registryOf } from '../src/credentials/types.ts';
import { differenceFromV1, V1_TIMEZONE } from '../src/node-compile/__tests__/verify.ts';
import type { NodeSources } from '../src/node-compile/convert.ts';
import { evaluateInSandbox } from '../src/node-compile/evaluate-node.ts';
import { compileNodeInstance, verifiedKey } from '../src/node-compile/convert.ts';
import type { EquivalenceCase } from '../src/nodes/__tests__/equivalence.ts';
import { disposeRecorder, recorderAvailable } from '../src/nodes/__tests__/v1-recorder.ts';

type Json = Record<string, unknown>;
interface Property {
	name: string;
	type: string;
	default?: unknown;
	options?: Array<{ name?: string; value?: unknown; type?: string; default?: unknown }>;
	displayOptions?: { show?: Record<string, unknown[]> };
}
interface LoadedNode {
	description: NodeDescription & {
		version: number | number[];
		credentials?: Array<{ name: string }>;
	};
	nodeVersions?: Record<string, LoadedNode>;
	constructor: { name: string };
}

const here = dirname(fileURLToPath(import.meta.url));
const base = join(here, '../../../nodes-base');
const PREFIX = 'n8n-nodes-base.';
const load = createRequire(join(base, 'package.json'));

const DIST = process.argv.includes('--dist');
const oneAt = process.argv.indexOf('--one');
const one = oneAt >= 0 ? process.argv[oneAt + 1] : undefined;
const pattern = process.argv.slice(2).find((a) => !a.startsWith('--'));
const filter = new RegExp(one === undefined ? (pattern ?? '.') : `^${one}$`, 'i');
const PARALLEL = 6;

if (!recorderAvailable() || !existsSync(join(base, 'dist/known/nodes.json'))) {
	console.error('Build n8n-nodes-base and @n8n/workflow-fallback-host first.');
	process.exit(1);
}

const classFile = new Map<string, string>();
function findClasses(dir: string): void {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (!/^(test|__tests__|__schema__)$/.test(entry)) findClasses(path);
		} else if (entry.endsWith(DIST ? '.node.js' : '.node.ts')) {
			for (const m of readFileSync(path, 'utf8').matchAll(/^(?:export )?class (\w+)/gm))
				classFile.set(m[1], path);
		}
	}
}
findClasses(join(base, DIST ? 'dist/nodes' : 'nodes'));

const known: Record<string, { className: string; sourcePath: string }> = JSON.parse(
	readFileSync(join(base, 'dist/known/nodes.json'), 'utf8'),
);
const knownCredentials: Record<string, { className: string; sourcePath: string }> = JSON.parse(
	readFileSync(join(base, 'dist/known/credentials.json'), 'utf8'),
);
const loaded = new Map<string, LoadedNode | undefined>();
function nodeOf(type: string, version: number): LoadedNode | undefined {
	const key = `${type}@${version}`;
	if (loaded.has(key)) return loaded.get(key);
	let node: LoadedNode | undefined;
	try {
		const entry = known[type.slice(PREFIX.length)];
		const top: LoadedNode = new (load(join(base, entry.sourcePath))[entry.className])();
		node = top.nodeVersions ? top.nodeVersions[String(version)] : top;
	} catch {
		node = undefined;
	}
	loaded.set(key, node);
	return node;
}

const sources: NodeSources = {
	entry: (type, version) => {
		const node = nodeOf(type, version);
		return node ? classFile.get(node.constructor.name) : undefined;
	},
	readFile: (path) =>
		existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined,
	description: (type, version) => nodeOf(type, version)?.description,
	aliases: { '@utils/': `${base}/utils/` },
	evaluate: evaluateInSandbox,
	credentialEntry: (type) => {
		const entry = knownCredentials[type];
		return entry ? join(base, entry.sourcePath) : undefined;
	},
};

const registry = registryOf(loadCredentialTypes().types);

function fakeCredential(type: string): Json {
	const data: Json = {};
	for (const [key, value] of Object.entries(registry.get(type)?.defaults ?? {})) {
		const address = /url|host|domain|server|endpoint/i.test(key);
		data[key] = value === '' ? (address ? 'https://api.example.test' : `fake-${key}`) : value;
	}
	if (/oauth2/i.test(type)) data.oauthTokenData = { access_token: 'fake-token' };
	return data;
}

function resolve(node: LoadedNode, version: number, parameters: Json): Json {
	const d = node.description;
	return getNodeParameters(d.properties, parameters, true, false, version, d) ?? {};
}

function required(node: LoadedNode, version: number, start: Json): Json {
	const properties = node.description.properties as unknown as Property[];
	const out: Json = { ...start };
	for (const [name, value] of Object.entries(resolve(node, version, start))) {
		const type = properties.find((p) => p.name === name)?.type;
		if (name in out) continue;
		if (type === 'string' && value === '') out[name] = 'v1';
		else if (type === 'json' && value === '') out[name] = '{}';
		else if (type === 'resourceLocator') out[name] = { __rl: true, mode: 'id', value: 'id1' };
	}
	return out;
}

function withOptions(node: LoadedNode, version: number, start: Json): Json {
	const properties = node.description.properties as unknown as Property[];
	const out: Json = { ...start };
	for (const name of Object.keys(resolve(node, version, start))) {
		const property = properties.find((p) => p.name === name && p.type === 'collection');
		if (!property || name in out) continue;
		const members: Json = {};
		for (const option of (property.options ?? []).slice(0, 8)) {
			if (!option.name) continue;
			if (option.type === 'string') members[option.name] = 'v2';
			else if (option.type === 'number')
				members[option.name] = typeof option.default === 'number' ? option.default + 1 : 1;
			else if (option.type === 'boolean') members[option.name] = option.default !== true;
		}
		if (Object.keys(members).length > 0) out[name] = members;
	}
	return out;
}

function operations(node: LoadedNode): Json[] {
	const properties = node.description.properties as unknown as Property[];
	const values = (p: Property) =>
		(p.options ?? []).map((o) => o.value).filter((v) => typeof v === 'string');
	const resources = properties.filter((p) => p.name === 'resource').flatMap(values);
	const out: Json[] = [];
	for (const resource of resources.length > 0 ? resources : [undefined]) {
		const shown = properties.filter(
			(p) =>
				p.name === 'operation' &&
				(resource === undefined ||
					!p.displayOptions?.show?.resource ||
					p.displayOptions.show.resource.includes(resource)),
		);
		const names = [...new Set(shown.flatMap(values))];
		for (const operation of names.length > 0 ? names : [undefined]) {
			out.push({
				...(resource === undefined ? {} : { resource }),
				...(operation === undefined ? {} : { operation }),
			});
		}
	}
	return out;
}

const verified: Record<string, string[]> = {};
const reasons: Record<string, number> = {};
let tried = 0;
let compiledCount = 0;
const examples: string[] = [];

interface NodeResult {
	verified: Record<string, string[]>;
	reasons: Record<string, number>;
	tried: number;
	compiled: number;
	examples?: string[];
}

async function checkInProcess(name: string): Promise<NodeResult | undefined> {
	return await new Promise((resolve) => {
		const child = spawn(
			process.execPath,
			[
				fileURLToPath(import.meta.url),
				...(DIST ? ['--dist'] : []),
				...(process.argv.includes('--detail') ? ['--detail'] : []),
				'--one',
				name,
			],
			{
				stdio: ['ignore', 'pipe', 'ignore'],
			},
		);
		let out = '';
		child.stdout.on('data', (chunk: Buffer) => {
			out += chunk.toString();
		});

		const timer = setTimeout(() => child.kill('SIGKILL'), 300_000);
		child.on('close', () => {
			clearTimeout(timer);
			const line = out.split('\n').find((l) => l.startsWith('RESULT '));
			resolve(line ? (JSON.parse(line.slice('RESULT '.length)) as NodeResult) : undefined);
		});
	});
}

if (one === undefined) {
	const names = Object.keys(known)
		.sort()
		.filter((name) => filter.test(name) && !/Trigger$/.test(name));
	let next = 0;
	let lost = 0;
	const worker = async () => {
		while (next < names.length) {
			const result = await checkInProcess(names[next++]);
			if (!result) {
				lost++;
				continue;
			}
			Object.assign(verified, result.verified);
			for (const [reason, count] of Object.entries(result.reasons))
				reasons[reason] = (reasons[reason] ?? 0) + count;
			for (const example of result.examples ?? [])
				if (examples.length < 400) examples.push(`${names[next - 1] ?? ''}: ${example}`);
			tried += result.tried;
			compiledCount += result.compiled;
		}
	};
	await Promise.all(Array.from({ length: PARALLEL }, worker));
	if (lost > 0) console.log(`${lost} node(s) gave no result (a crash or more than five minutes)`);
}

const why = (reason: string) => {
	const part = /^v1: the requests differ: (\w+)/.exec(reason);
	const short = part
		? `v1: the requests differ: ${part[1]}`
		: reason.replace(/'[^']*'/g, "'…'").slice(0, 90);
	if (part && examples.length < 60) examples.push(reason.slice(0, 200));
	reasons[process.argv.includes('--detail') ? reason.slice(0, 110) : short] =
		(reasons[process.argv.includes('--detail') ? reason.slice(0, 110) : short] ?? 0) + 1;
};

for (const name of one === undefined ? [] : Object.keys(known).sort()) {
	if (!filter.test(name) || /Trigger$/.test(name)) continue;
	const type = `${PREFIX}${name}`;
	let top: LoadedNode;
	try {
		top = new (load(join(base, known[name].sourcePath))[known[name].className])();
	} catch {
		continue;
	}
	const versions = top.nodeVersions
		? Object.keys(top.nodeVersions).map(Number)
		: [top.description.version].flat();
	for (const version of versions) {
		const node = nodeOf(type, version);
		if (!node || sources.entry(type, version) === undefined) continue;
		const credential = node.description.credentials?.[0]?.name;
		for (const start of operations(node)) {
			tried++;
			const parameters = required(node, version, start);
			const instance = { type, version, parameters };
			const fields = credential
				? {
						[credential]: publicCredential(registry.get(credential), fakeCredential(credential)),
					}
				: {};
			const compiled = compileNodeInstance(sources, instance, null, fields, V1_TIMEZONE);
			if ('errors' in compiled) {
				why(compiled.errors[0].slice(compiled.errors[0].indexOf(': ') + 2));
				continue;
			}
			compiledCount++;
			const make = (
				label: string,
				p: Json,
				responses: EquivalenceCase['responses'],
			): EquivalenceCase => ({
				name: `${type}@${version} ${label}`,
				type,
				typeVersion: version,
				parameters: p,
				...(credential
					? { credential: { type: credential, data: fakeCredential(credential) } }
					: {}),
				responses,
			});
			const ok = [{ body: { ok: true, id: 'r1', result: { id: 'r1' }, data: [{ id: 'r1' }] } }];
			const bad = [{ status: 400, body: { message: 'bad request' } }];
			try {
				const difference =
					(await differenceFromV1(make('ok', parameters, ok), sources, registry)) ??
					(await differenceFromV1(make('error', parameters, bad), sources, registry));
				if (difference !== undefined) {
					why(`v1: ${difference}`);
					continue;
				}
				let names = compiled.changed;

				const more = withOptions(node, version, parameters);
				const wider = compileNodeInstance(
					sources,
					{ type, version, parameters: more },
					null,
					fields,
					V1_TIMEZONE,
				);
				if (
					!('errors' in wider) &&
					(await differenceFromV1(make('options', more, ok), sources, registry)) === undefined
				) {
					names = wider.changed;
				}
				verified[verifiedKey(type, version, compiled.resolved)] = [...names].sort();
			} catch (error) {
				why(`check failed: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	}
}
await disposeRecorder();
if (one !== undefined) {
	console.log(
		`RESULT ${JSON.stringify({ verified, reasons, tried, compiled: compiledCount, examples })}`,
	);
	process.exit(0);
}

const lines = Object.keys(verified)
	.sort()
	.map((key) => `\t${JSON.stringify(key)}: ${JSON.stringify(verified[key])},`);
if (pattern === undefined && !DIST) {
	writeFileSync(
		join(here, '../src/node-compile/verified.generated.ts'),
		`export const VERIFIED: Record<string, string[]> = {
${lines.join('\n')}
};
`,
	);
}
console.log(`operations ${tried}; compiled ${compiledCount}; verified against v1 ${lines.length}`);
console.log(
	Object.entries(reasons)
		.sort((a, b) => b[1] - a[1])
		.slice(0, process.argv.includes('--detail') ? 70 : 40)
		.map(([reason, count]) => `${count}\t${reason}`)
		.join('\n'),
);
if (process.argv.includes('--examples')) console.log(examples.join('\n'));
if (pattern !== undefined && !process.argv.includes('--examples')) console.log(lines.join('\n'));
