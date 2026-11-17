import {
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

import { identityKey } from '../../convert/node-identity.ts';
import {
	digest,
	hashOfFile,
	importClosure,
	nodeTypesIdentity,
	NO_FILE,
	packageIdentity,
	portablePath,
	processText,
	sharedIdentity,
} from '../../nodes/__tests__/build-identity.ts';

export const CACHE_FORM = 'verify-1';

export const GENERATED_LISTS = [
	'src/node-compile/verified.generated.ts',
	'src/node-compile/cost.generated.ts',
];

const ENVIRONMENT_NAMES = /^(N8N_|WF_|NODE_|LC_|TZ$|LANG$|LANGUAGE$)/;

export interface KeyInputs {
	packageDir: string;
	repoDir: string;
	script: string;
	converter: string;
	hostDir: string;
	nodePackages: Record<string, string>;
	nodePrefix: string;
	alwaysTypes: string[];
	credentialPackages: string[];
	signingKey: string;
	dist: boolean;
	environment: Record<string, string | undefined>;
	nodeText: string;
}

export interface KeyPart {
	name: string;
	value: string;
}

export function verifierSources(inputs: KeyInputs): {
	direct: string[];
	compiler: string[];
	missing: string[];
} {
	const generated = new Set(GENERATED_LISTS.map((file) => resolve(inputs.packageDir, file)));
	const all = importClosure([inputs.script]);
	const direct = importClosure([inputs.script], [inputs.converter], true);
	const inDirect = new Set(direct.files);
	return {
		direct: direct.files.filter((file) => !generated.has(file)),
		compiler: all.files.filter((file) => !inDirect.has(file) && !generated.has(file)),
		missing: all.missing,
	};
}

function hashOfSources(inputs: KeyInputs, files: string[]): string {
	return digest(
		files.map((file) => `${portablePath(inputs.repoDir, file)}:${hashOfFile(file)}`).join('\n'),
	);
}

function environmentText(environment: Record<string, string | undefined>): string {
	return Object.keys(environment)
		.filter((name) => ENVIRONMENT_NAMES.test(name))
		.sort()
		.map((name) => `${name}=${environment[name] ?? ''}`)
		.join('\n');
}

export function nodeTextOfProcess(): string {
	return `${processText()} ${identityKey()}`;
}

export function sharedParts(inputs: KeyInputs): { direct: KeyPart[]; compiler: KeyPart } {
	const sources = verifierSources(inputs);
	return {
		direct: [
			{ name: 'form', value: CACHE_FORM },
			{ name: 'node', value: inputs.nodeText },
			{ name: 'environment', value: digest(environmentText(inputs.environment)) },
			{ name: 'dist', value: String(inputs.dist) },
			{ name: 'verifier', value: hashOfSources(inputs, sources.direct) },
			{ name: 'imports with no file', value: sources.missing.length === 0 ? '' : NO_FILE },
			{
				name: 'v1 packages',
				value: sharedIdentity(inputs.hostDir, Object.keys(inputs.nodePackages)),
			},
			{
				name: 'credentials',
				value: digest(inputs.credentialPackages.map((dir) => packageIdentity(dir)).join('\n')),
			},
			{ name: 'signing key', value: hashOfFile(inputs.signingKey) },
		],
		compiler: { name: 'compiler', value: hashOfSources(inputs, sources.compiler) },
	};
}

export function nodePart(inputs: KeyInputs, name: string): KeyPart {
	return {
		name: 'v1 node',
		value: digest(
			nodeTypesIdentity(inputs.nodePackages, [
				`${inputs.nodePrefix}${name}`,
				...inputs.alwaysTypes,
			]),
		),
	};
}

export function keyOfParts(parts: KeyPart[]): string {
	return digest(parts.map((part) => `${part.name}=${part.value}`).join('\n'));
}

export interface NodeKeys {
	result: string;
	cases: string;
}

export function nodeKeys(
	inputs: KeyInputs,
	name: string,
	shared: { direct: KeyPart[]; compiler: KeyPart } = sharedParts(inputs),
): NodeKeys {
	const own = nodePart(inputs, name);
	return {
		result: keyOfParts([...shared.direct, shared.compiler, own]),
		cases: keyOfParts([...shared.direct, own]),
	};
}

export const FILE_READ = 'file:';
export const CLASS_READ = 'class:';
const OUTSIDE = 'outside:';

export function readName(repoDir: string, path: string): string {
	const inside = portablePath(repoDir, path);
	return inside.startsWith('..') ? `${FILE_READ}${OUTSIDE}${path}` : `${FILE_READ}${inside}`;
}

export function readNow(
	repoDir: string,
	classFile: (name: string) => string | undefined,
	read: string,
): string {
	if (read.startsWith(CLASS_READ)) {
		const file = classFile(read.slice(CLASS_READ.length));
		return file === undefined ? NO_FILE : portablePath(repoDir, file);
	}
	const path = read.slice(FILE_READ.length);
	return hashOfFile(
		path.startsWith(OUTSIDE) ? path.slice(OUTSIDE.length) : join(repoDir, ...path.split('/')),
	);
}

export interface StoredResult<T> {
	key: string;
	reads: Record<string, string>;
	result: T;
	seconds: number;
}

const MAX_RESULTS_OF_A_NODE = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStored(value: unknown): value is StoredResult<unknown> {
	return (
		isRecord(value) &&
		typeof value.key === 'string' &&
		isRecord(value.reads) &&
		Object.values(value.reads).every((read) => typeof read === 'string') &&
		typeof value.seconds === 'number' &&
		'result' in value
	);
}

function writeWhole(file: string, content: string | Buffer): void {
	mkdirSync(dirname(file), { recursive: true });
	const partial = `${file}.${process.pid}.tmp`;
	try {
		writeFileSync(partial, content);
		renameSync(partial, file);
	} catch {
		rmSync(partial, { force: true });
	}
}

const resultFile = (dir: string, name: string) => join(dir, `${name}.json.gz`);

export function storedResults(dir: string, name: string): Array<StoredResult<unknown>> {
	try {
		const parsed: unknown = JSON.parse(gunzipSync(readFileSync(resultFile(dir, name))).toString());
		return Array.isArray(parsed) ? parsed.filter(isStored) : [];
	} catch {
		return [];
	}
}

export function findResult(
	dir: string,
	name: string,
	key: string,
	now: (read: string) => string,
): StoredResult<unknown> | undefined {
	return storedResults(dir, name).find(
		(entry) =>
			entry.key === key && Object.entries(entry.reads).every(([read, was]) => now(read) === was),
	);
}

export function storeResult(dir: string, name: string, entry: StoredResult<unknown>): void {
	const others = storedResults(dir, name).filter(
		(other) =>
			other.key !== entry.key || JSON.stringify(other.reads) !== JSON.stringify(entry.reads),
	);
	writeWhole(
		resultFile(dir, name),
		gzipSync(JSON.stringify([entry, ...others].slice(0, MAX_RESULTS_OF_A_NODE))),
	);
}

const MIN_KEPT_CASES = 2000;
const CASE_KEY_LENGTH = 32;

export class CaseStore {
	private readonly entries = new Map<string, unknown>();

	private readonly used = new Set<string>();

	private readonly file: string;

	hits = 0;

	misses = 0;

	constructor(file: string) {
		this.file = file;
		try {
			const parsed: unknown = JSON.parse(gunzipSync(readFileSync(file)).toString());
			if (!Array.isArray(parsed)) return;
			for (const entry of parsed) {
				if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string')
					this.entries.set(entry[0], entry[1]);
			}
		} catch {
			this.entries.clear();
		}
	}

	get(key: string): unknown {
		const short = key.slice(0, CASE_KEY_LENGTH);
		if (!this.entries.has(short)) {
			this.misses++;
			return undefined;
		}
		this.hits++;
		this.used.add(short);
		return this.entries.get(short);
	}

	set(key: string, value: unknown): void {
		const short = key.slice(0, CASE_KEY_LENGTH);
		this.entries.set(short, value);
		this.used.add(short);
	}

	save(): void {
		const kept: Array<[string, unknown]> = [];
		for (const key of this.used) kept.push([key, this.entries.get(key)]);
		const most = Math.max(MIN_KEPT_CASES, 2 * this.used.size);
		for (const [key, value] of this.entries) {
			if (kept.length >= most) break;
			if (!this.used.has(key)) kept.push([key, value]);
		}
		writeWhole(this.file, gzipSync(JSON.stringify(kept)));
	}
}

export function subsetKey(type: string, version: number, source: string): string {
	return digest(JSON.stringify(['subset', type, version, source]));
}

export function pruneCache(dir: string, most: number): void {
	let names: string[];
	try {
		names = readdirSync(dir);
	} catch {
		return;
	}
	if (names.length <= most) return;
	const byAge = names
		.map((name) => {
			try {
				return { name, time: statSync(join(dir, name)).mtimeMs };
			} catch {
				return { name, time: 0 };
			}
		})
		.sort((a, b) => a.time - b.time);
	for (const { name } of byAge.slice(0, names.length - most))
		rmSync(join(dir, name), { force: true });
}

export function mergedList<T>(
	committed: Record<string, T>,
	ran: Set<string>,
	stale: Set<string>,
	fresh: Record<string, T>,
	whole: boolean,
	nodeOfKey: (key: string) => string,
): Record<string, T> {
	const out: Record<string, T> = {};
	for (const [key, value] of Object.entries(committed)) {
		const node = nodeOfKey(key);
		if (stale.has(node) || (!whole && !ran.has(node))) out[key] = value;
	}
	for (const [key, value] of Object.entries(fresh)) {
		if (!stale.has(nodeOfKey(key))) out[key] = value;
	}
	const sorted: Record<string, T> = {};
	for (const key of Object.keys(out).sort()) sorted[key] = out[key];
	return sorted;
}

export interface Progress {
	pid: number;
	started: string;
	updated: string;
	finished: boolean;
	nodeTypes: number;
	done: number;
	fromCache: number;
	ran: number;
	operations: number;
	verified: number;
	lost: number;
	stale: string[];
	running: Array<{ name: string; seconds: number; operations: string }>;
}

export function writeStatus(file: string | undefined, progress: Progress): void {
	if (file !== undefined) writeWhole(file, `${JSON.stringify(progress, null, '\t')}\n`);
}
