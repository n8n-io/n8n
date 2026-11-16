import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import {
	existsSync,
	linkSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NodeDescription } from '../src/convert/node-parameters.ts';
import { getNodeParameters } from '../src/convert/node-parameters.ts';
import { publicCredential } from '../src/credentials/public.ts';
import { loadCredentialTypes, registryOf } from '../src/credentials/types.ts';
import type { ErrorPairing } from '../src/node-compile/__tests__/verify.ts';
import {
	compileForCheck,
	differenceFromV1,
	flagKeyOf,
	flagVariants,
	MINTED_TOKEN_RESPONSE,
} from '../src/node-compile/__tests__/verify.ts';
import type { ErrorMode, NodeSources } from '../src/node-compile/convert.ts';
import { evaluateInSandbox } from '../src/node-compile/evaluate-node.ts';
import {
	CONTINUE_MODES,
	ERROR_ITEMS_BY_POSITION,
	errorModeCondition,
	verifiedKey,
} from '../src/node-compile/convert.ts';
import type { EquivalenceCase, NodeSettings } from '../src/nodes/__tests__/equivalence.ts';
import {
	disposeRecorder,
	recordV1,
	recordV1Cached,
	recorderAvailable,
} from '../src/nodes/__tests__/v1-recorder.ts';

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
		credentials?: Array<{ name: string; displayOptions?: { show?: Record<string, unknown[]> } }>;
	};
	nodeVersions?: Record<string, LoadedNode>;
	constructor: { name: string };
}

const here = dirname(fileURLToPath(import.meta.url));
const base = join(here, '../../../nodes-base');
const PREFIX = 'n8n-nodes-base.';
const load = createRequire(join(base, 'package.json'));

const VALUE_FLAGS = ['--one', '--weights'];
const args = process.argv.slice(2);
const valueOf = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const DIST = args.includes('--dist');
const DETAIL = args.includes('--detail');
const CACHE = !args.includes('--no-cache');
const ALL_BLOCKERS = args.includes('--all-blockers');
const one = valueOf('--one');
const weightsFile = valueOf('--weights');
const pattern = args.find((a, at) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[at - 1]));
const add = (into: Record<string, number>, from: Record<string, number> | undefined) => {
	for (const [key, count] of Object.entries(from ?? {})) into[key] = (into[key] ?? 0) + count;
};
const filter = new RegExp(one === undefined ? (pattern ?? '.') : `^${one}$`, 'i');
const PARALLEL = 6;
const NODE_TIMEOUT_MS = 900_000;
const UPLOAD_ANSWER = {
	upload_url: 'https://files.example.com/upload/v1/abc',
	file_id: 'F1',
	file: { id: 'F1' },
	files: [{ id: 'F1' }],
};
const FILE_ITEMS = [
	{
		$binary: {
			data: {
				data: Buffer.from('hello bytes').toString('base64'),
				mimeType: 'text/plain',
				fileName: 'notes/hello.txt',
				fileExtension: 'txt',
				fileSize: '11 B',
				bytes: 11,
			},
		},
	},
];
const DOWNLOAD_ANSWER = {
	headers: { 'content-type': 'application/pdf' },
	body: {
		ok: true,
		id: 'r1',
		name: 'reports/summary.pdf',
		result: { id: 'r1', file_path: 'documents/file_7.pdf' },
		data: [{ id: 'r1' }],
	},
};
const DOWNLOAD_ANSWER_TYPED = {
	headers: { 'content-type': 'image/png; charset=binary' },
	body: {
		ok: true,
		id: 'r1',
		name: 'summary',
		result: { id: 'r1', file_path: 'photos/file_8.jpg' },
		data: [{ id: 'r1' }],
	},
};
const MAX_BLOCKERS = 20;

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

function isJson(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readWeights(file: string | undefined): Map<string, number> {
	const out = new Map<string, number>();
	if (file === undefined) return out;
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
	if (!isJson(parsed)) throw new Error(`The weights file ${file} must hold a JSON object.`);
	for (const [key, count] of Object.entries(parsed)) {
		if (typeof count === 'number' && Number.isFinite(count)) out.set(key, count);
	}
	return out;
}
const weights = readWeights(weightsFile);

function weightOf(type: string, parameters: Json): number {
	const operation = `${String(parameters.resource ?? '')}.${String(parameters.operation ?? '')}`;
	return (
		weights.get(`${type}:${operation}`) ??
		weights.get(`${type.slice(PREFIX.length)}:${operation}`) ??
		0
	);
}

function credentialOf(node: LoadedNode, resolved: Json): string | undefined {
	const all = node.description.credentials ?? [];
	const shown = all.find((c) =>
		Object.entries(c.displayOptions?.show ?? {}).every(
			([name, allowed]) => name.startsWith('@') || allowed.includes(resolved[name]),
		),
	);
	return (shown ?? all[0])?.name;
}

const SIGNING_KEY_FILE = join(here, '../node_modules/.cache/v1-recordings/test-signing-key.pem');
let signingKey: string | undefined;
function testSigningKey(): string {
	if (signingKey !== undefined) return signingKey;
	if (!existsSync(SIGNING_KEY_FILE)) {
		mkdirSync(dirname(SIGNING_KEY_FILE), { recursive: true });
		const { privateKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			publicKeyEncoding: { type: 'spki', format: 'pem' },
		});
		const partial = `${SIGNING_KEY_FILE}.${process.pid}.tmp`;
		writeFileSync(partial, privateKey, { mode: 0o600 });
		try {
			linkSync(partial, SIGNING_KEY_FILE);
		} catch {
			if (!existsSync(SIGNING_KEY_FILE)) throw new Error('The test signing key has no file.');
		} finally {
			rmSync(partial, { force: true });
		}
	}
	signingKey = readFileSync(SIGNING_KEY_FILE, 'utf8');
	return signingKey;
}

const MAX_AUTHENTICATIONS = 4;
function otherAuthentications(node: LoadedNode, version: number, start: Json): Json[] {
	const properties = node.description.properties as unknown as Property[];
	const usual = credentialOf(node, resolve(node, version, required(node, version, start)));
	const out: Json[] = [];
	const seen = new Set<unknown>();
	for (const property of properties) {
		if (property.name !== 'authentication' || property.type !== 'options') continue;
		for (const { value } of property.options ?? []) {
			if (typeof value !== 'string' || seen.has(value) || out.length >= MAX_AUTHENTICATIONS)
				continue;
			seen.add(value);
			const other = { ...start, authentication: value };
			const resolved = resolve(node, version, required(node, version, other));
			if (resolved.authentication !== value) continue;
			const credential = credentialOf(node, resolved);
			if (credential !== undefined && credential !== usual) out.push(other);
		}
	}
	return out;
}

function fakeCredential(type: string): Json {
	const data: Json = {};
	for (const [key, value] of Object.entries(registry.get(type)?.defaults ?? {})) {
		const address = /url|host|domain|server|endpoint/i.test(key);
		data[key] = value === '' ? (address ? 'https://api.example.test' : `fake-${key}`) : value;
	}
	if (type === 'googleApi') data.privateKey = testSigningKey();
	if (/oauth2/i.test(type)) {
		data.oauthTokenData = {
			access_token: 'fake-token',
			instance_url: 'https://instance.example.test',
			api_domain: 'https://api.example.test',
		};
	}
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
		else if (type === 'number' && value === undefined) out[name] = 1;
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

const checking = { cache: CACHE };
const verified: Record<string, string[]> = {};
const reasons: Record<string, number> = {};
const modeReasons: Record<string, number> = {};
const alone: Record<string, number> = {};
const weighted: Record<string, number> = {};
let tried = 0;
let compiledCount = 0;
let mintedTried = 0;
let mintedVerified = 0;
const examples: string[] = [];

interface NodeResult {
	verified: Record<string, string[]>;
	reasons: Record<string, number>;
	modeReasons?: Record<string, number>;
	alone?: Record<string, number>;
	weighted?: Record<string, number>;
	tried: number;
	compiled: number;
	examples?: string[];
	mintedTried?: number;
	mintedVerified?: number;
}

async function checkInProcess(name: string): Promise<NodeResult | undefined> {
	return await new Promise((resolve) => {
		const child = spawn(
			process.execPath,
			[
				fileURLToPath(import.meta.url),
				...(DIST ? ['--dist'] : []),
				...(DETAIL ? ['--detail'] : []),
				...(CACHE ? [] : ['--no-cache']),
				...(ALL_BLOCKERS ? ['--all-blockers'] : []),
				...(weightsFile === undefined ? [] : ['--weights', weightsFile]),
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

		const timer = setTimeout(() => child.kill('SIGKILL'), NODE_TIMEOUT_MS);
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
			const name = names[next++];
			const result = await checkInProcess(name);
			if (!result) {
				lost++;
				continue;
			}
			Object.assign(verified, result.verified);
			add(reasons, result.reasons);
			add(modeReasons, result.modeReasons);
			add(alone, result.alone);
			add(weighted, result.weighted);
			for (const example of result.examples ?? [])
				if (examples.length < 400) examples.push(`${name}: ${example}`);
			tried += result.tried;
			compiledCount += result.compiled;
			mintedTried += result.mintedTried ?? 0;
			mintedVerified += result.mintedVerified ?? 0;
		}
	};
	await Promise.all(Array.from({ length: PARALLEL }, worker));
	if (lost > 0)
		console.log(`${lost} node(s) gave no result (a crash or more than fifteen minutes)`);
}

const requestPart = (reason: string) => /^v1: the requests differ: (\w+)/.exec(reason)?.[1];
const keyOf = (reason: string) => {
	if (DETAIL) return reason.slice(0, 110);
	const part = requestPart(reason);
	return part === undefined
		? reason.replace(/'[^']*'/g, "'…'").slice(0, 90)
		: `v1: the requests differ: ${part}`;
};
const why = (reason: string, weight: number, only = true) => {
	if (requestPart(reason) !== undefined && examples.length < 60)
		examples.push(reason.slice(0, 200));
	const key = keyOf(reason);
	reasons[key] = (reasons[key] ?? 0) + 1;
	if (only) alone[key] = (alone[key] ?? 0) + 1;
	if (weight !== 0) weighted[key] = (weighted[key] ?? 0) + weight;
};

const whyMode = (mode: ErrorMode, reason: string) => {
	const key = `${mode}: ${DETAIL ? reason.slice(0, 110) : reason.replace(/'[^']*'/g, "'…'").slice(0, 90)}`;
	modeReasons[key] = (modeReasons[key] ?? 0) + 1;
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
		for (const usual of operations(node)) {
			for (const start of [usual, ...otherAuthentications(node, version, usual)]) {
				const other = start !== usual;
				if (!other) tried++;
				const parameters = required(node, version, start);
				const credential = credentialOf(node, resolve(node, version, parameters));
				const weight = weightOf(type, parameters);
				const instance = { type, version, parameters };
				const fields = credential
					? {
							[credential]: publicCredential(registry.get(credential), fakeCredential(credential)),
						}
					: {};
				const compiled = compileForCheck(sources, instance, fields);
				if (other && ('errors' in compiled || compiled.mints.length === 0)) continue;
				if (other) mintedTried++;
				if ('errors' in compiled) {
					const blockers = new Map<string, string>();
					for (const error of compiled.errors.slice(0, ALL_BLOCKERS ? MAX_BLOCKERS : 1)) {
						const reason = error.slice(error.indexOf(': ') + 2);
						if (!blockers.has(keyOf(reason))) blockers.set(keyOf(reason), reason);
					}
					for (const reason of blockers.values()) why(reason, weight, blockers.size === 1);
					continue;
				}
				if (!other) compiledCount++;
				const readsFiles = /__(binaryOf|inputBytes)\(__items/.test(compiled.source);
				const token = compiled.mints.length > 0 ? [MINTED_TOKEN_RESPONSE] : [];
				const make = (
					label: string,
					p: Json,
					responses: EquivalenceCase['responses'],
					items: EquivalenceCase['items'] = readsFiles ? FILE_ITEMS : undefined,
					data: Json | undefined = credential ? fakeCredential(credential) : undefined,
				): EquivalenceCase => ({
					name: `${type}@${version} ${label}`,
					type,
					typeVersion: version,
					parameters: p,
					...(items ? { items } : {}),
					...(credential && data ? { credential: { type: credential, data } } : {}),
					responses,
				});
				const makesFiles = compiled.source.includes('__prepareBinary(');
				const plain = { ok: true, id: 'r1', result: { id: 'r1' }, data: [{ id: 'r1' }] };
				const ok = makesFiles
					? [...token, DOWNLOAD_ANSWER]
					: [...token, { body: readsFiles ? { ...plain, ...UPLOAD_ANSWER } : plain }];
				const bad = [...token, { status: 400, body: { message: 'bad request' } }];
				const missing = [
					...token,
					{ status: 404, body: { error: { message: 'no such thing' }, code: 7 } },
				];
				try {
					const difference =
						(await differenceFromV1(make('ok', parameters, ok), sources, registry, checking)) ??
						(await differenceFromV1(make('error', parameters, bad), sources, registry, checking));
					if (difference !== undefined) {
						why(`v1: ${difference}`, weight);
						continue;
					}
					if (makesFiles) {
						const unnamed = await differenceFromV1(
							make('file without an extension', parameters, [...token, DOWNLOAD_ANSWER_TYPED]),
							sources,
							registry,
							checking,
						);
						if (unnamed !== undefined) {
							why(`v1: a file without an extension: ${unnamed}`, weight);
							continue;
						}
					}
					if (readsFiles) {
						const withFile = await (CACHE ? recordV1Cached : recordV1)(make('ok', parameters, ok));
						if (withFile.error !== undefined) {
							why(`v1: the case with a file fails: ${withFile.error}`, weight);
							continue;
						}
						const withoutFile = await differenceFromV1(
							make('no file', parameters, ok, [{}]),
							sources,
							registry,
							checking,
						);
						if (withoutFile !== undefined) {
							why(`v1: without a file: ${withoutFile}`, weight);
							continue;
						}
					}
					let names = compiled.changed;

					const more = withOptions(node, version, parameters);
					const wider = compileForCheck(sources, { type, version, parameters: more }, fields);
					if (
						!('errors' in wider) &&
						(await differenceFromV1(make('options', more, ok), sources, registry, checking)) ===
							undefined
					) {
						names = wider.changed;
					}
					const key = verifiedKey(type, version, compiled.resolved);
					const before = other ? verified[key] : undefined;
					if (before?.some((name) => !name.startsWith('@') && !names.includes(name))) {
						why('v1: the other authentication agrees with v1 for fewer parameters', weight);
						continue;
					}
					const flagKeys: string[] = [];
					if (compiled.flags.length > 0) {
						const usual = make('ok', parameters, ok);
						const usualKey = flagKeyOf(usual, compiled.flags, registry);
						if (usualKey !== undefined) flagKeys.push(usualKey);
						for (const variant of flagVariants(usual, compiled.flags, registry)) {
							const difference =
								(await differenceFromV1(
									make('ok', parameters, ok, undefined, variant.data),
									sources,
									registry,
									checking,
								)) ??
								(await differenceFromV1(
									make('error', parameters, bad, undefined, variant.data),
									sources,
									registry,
									checking,
								));
							if (difference === undefined) flagKeys.push(variant.key);
							else if (examples.length < 60)
								examples.push(`${key} with ${variant.key}: ${difference.slice(0, 160)}`);
						}
					}
					const first = readsFiles ? FILE_ITEMS[0] : {};
					const several = (count: number) =>
						Array.from({ length: count }, (_, k) => ({ ...first, position: k + 1 }));
					const [badAnswer] = bad.slice(-1);
					const [okAnswer] = ok.slice(-1);
					const proven: string[] = [];
					for (const mode of CONTINUE_MODES) {
						const under = (c: EquivalenceCase, more: NodeSettings = {}): EquivalenceCase => ({
							...c,
							name: `${c.name} ${mode}`,
							settings: { onError: mode, ...more },
						});
						const cases = [
							under(make('ok', parameters, ok)),
							under(make('two errors', parameters, bad, several(2))),
							under(make('nested error', parameters, missing)),
							under(make('first fails', parameters, [...bad, okAnswer], several(3))),
							under(make('first works', parameters, [...ok, badAnswer], several(3))),
							under(make('retry', parameters, [...bad, okAnswer]), {
								retryOnFail: true,
								maxTries: 2,
								waitBetweenTries: 1,
							}),
						];
						const differenceWith = async (pairing: ErrorPairing) => {
							const pairings = new Set<ErrorPairing>();
							for (const testCase of cases) {
								const difference = await differenceFromV1(testCase, sources, registry, {
									...checking,
									pairing,
									pairings,
								});
								if (difference !== undefined)
									return `${testCase.name.slice(testCase.name.indexOf(' ') + 1)}: ${difference}`;
							}
							if (
								mode === 'continueErrorOutput' &&
								[...pairings].some((found) => found !== pairing)
							)
								return `v1 does not pair its error items by ${pairing}`;
							return undefined;
						};
						const byItem = await differenceWith('item');
						if (byItem === undefined) {
							proven.push(...errorModeCondition(mode));
							continue;
						}
						if (
							mode === 'continueErrorOutput' &&
							(await differenceWith('position')) === undefined
						) {
							proven.push(...errorModeCondition(mode), ERROR_ITEMS_BY_POSITION);
							continue;
						}
						whyMode(mode, byItem);
					}
					const isMode = (name: string) =>
						name.startsWith('@onError=') || name === ERROR_ITEMS_BY_POSITION;
					const samePairing =
						before === undefined ||
						before.includes(ERROR_ITEMS_BY_POSITION) === proven.includes(ERROR_ITEMS_BY_POSITION);
					const errorOutput = errorModeCondition('continueErrorOutput')[0];
					const modes = (
						before === undefined ? proven : proven.filter((m) => before.includes(m))
					).filter((m) => samePairing || (m !== errorOutput && m !== ERROR_ITEMS_BY_POSITION));
					verified[key] = [
						...new Set([
							...(before ?? []).filter((name) => !isMode(name)),
							...names,
							...flagKeys,
							...modes,
						]),
					].sort();
					if (compiled.mints.length > 0) mintedVerified++;
				} catch (error) {
					why(`check failed: ${error instanceof Error ? error.message : String(error)}`, weight);
				}
			}
		}
	}
}
await disposeRecorder();
if (one !== undefined) {
	const result = `RESULT ${JSON.stringify({ verified, reasons, modeReasons, alone, weighted, tried, compiled: compiledCount, examples, mintedTried, mintedVerified })}\n`;
	await new Promise<void>((written) => process.stdout.write(result, () => written()));
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
for (const mode of CONTINUE_MODES) {
	const [condition] = errorModeCondition(mode);
	const count = Object.values(verified).filter((names) => names.includes(condition)).length;
	console.log(`verified against v1 under ${mode}: ${count}`);
}
const modeLines = Object.entries(modeReasons)
	.sort((a, b) => b[1] - a[1])
	.slice(0, DETAIL ? 70 : 40)
	.map(([reason, count]) => `${count}\t${reason}`);
if (modeLines.length > 0)
	console.log(`not verified under an error setting:\n${modeLines.join('\n')}`);
if (mintedVerified > 0 || mintedTried > 0)
	console.log(
		`operation forms verified with a token that n8n mints: ${mintedVerified} (other authentications tried: ${mintedTried})`,
	);
const weightIn = (reason: string) => weighted[reason] ?? 0;
if (ALL_BLOCKERS) console.log('operations blocked\toperations with no other blocker\tblocker');
if (weights.size > 0) console.log('the first column is the weighted count');
console.log(
	Object.entries(reasons)
		.sort((a, b) => weightIn(b[0]) - weightIn(a[0]) || b[1] - a[1])
		.slice(0, DETAIL ? 70 : 40)
		.map(([reason, count]) =>
			[
				...(weights.size > 0 ? [weightIn(reason)] : []),
				count,
				...(ALL_BLOCKERS ? [alone[reason] ?? 0] : []),
				reason,
			].join('\t'),
		)
		.join('\n'),
);
if (args.includes('--examples')) console.log(examples.join('\n'));
if (pattern !== undefined && !args.includes('--examples')) console.log(lines.join('\n'));
