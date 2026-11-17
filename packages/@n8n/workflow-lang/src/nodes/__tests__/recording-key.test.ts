/**
 * The key of the v1 recording cache: it follows the code that a recording runs, and no other
 * part of the recorder. Each test changes a copy of the recorder and compares the keys.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	declarationsKey,
	nodeIdentity,
	requireClosure,
	forgetFileHashes,
} from './build-identity.ts';
import { recorderKey, START_TYPE } from './v1-recorder.ts';

const here = dirname(fileURLToPath(import.meta.url));
const KINDS = ['plain', 'engine', 'sub-nodes'] as const;

let root = '';
let recorder = '';

function copy(path: string): void {
	const target = join(root, path);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, readFileSync(join(here, '../..', path), 'utf8'));
}

function keys(): string[] {
	return KINDS.map((kind) => recorderKey(kind, recorder));
}

/** Replaces one text of a copied file. The text must be there once. */
function edit(path: string, from: string, to: string): void {
	const file = join(root, path);
	const text = readFileSync(file, 'utf8');
	if (text.split(from).length !== 2) throw new Error(`"${from}" is not there once in ${path}`);
	writeFileSync(file, text.replace(from, to));
}

function changed(before: string[]): boolean[] {
	return keys().map((key, at) => key !== before[at]);
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'recording-key-'));
	for (const path of [
		'nodes/__tests__/v1-recorder.ts',
		'nodes/__tests__/equivalence.ts',
		'nodes/__tests__/no-network.ts',
		'nodes/__tests__/build-identity.ts',
		'reference/binary-response.ts',
		'generated/mime-table.generated.ts',
	])
		copy(path);
	recorder = join(root, 'nodes/__tests__/v1-recorder.ts');
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('the code of the recorder in the key of a recording', () => {
	it('is the same for the copy and for the recorder itself', () => {
		expect(recorderKey('plain', recorder)).toBe(recorderKey('plain'));
		expect(new Set(keys()).size).toBe(3);
	});

	it('does not follow a comment, blank space or a type', () => {
		const before = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'async function recordNode(',
			'// A new comment.\n\n\nasync   function recordNode(',
		);
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'interface KnownEntry {',
			'interface KnownEntry {\n\tmore?: string;',
		);
		edit(
			'nodes/__tests__/equivalence.ts',
			'export interface NodeSettings {',
			'export interface NodeSettings {\n\tmore?: string;',
		);
		expect(changed(before)).toEqual([false, false, false]);
	});

	it('does not follow the cache of the recordings', () => {
		const before = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'const CACHE_MAX_ENTRIES = 400_000;',
			'const CACHE_MAX_ENTRIES = 5;',
		);
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'function isRecording(value: unknown)',
			'function isRecording(value: unknown, _more = 1)',
		);
		expect(changed(before)).toEqual([false, false, false]);
	});

	it('follows the code that each case runs', () => {
		const before = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			"executionId: 'equivalence',\n\t\t\t\tstepId",
			"executionId: 'other',\n\t\t\t\tstepId",
		);
		expect(changed(before)).toEqual([true, true, true]);
	});

	it('follows a function that the recorder calls and a statement at the top level', () => {
		const first = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'function snapshot(value: unknown): unknown {',
			'function snapshot(value: unknown): unknown {\n\tvoid 0;',
		);
		expect(changed(first)).toEqual([true, true, true]);
		const second = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'installNetworkGuard();',
			'installNetworkGuard();\nvoid 0;',
		);
		expect(changed(second)).toEqual([true, true, true]);
	});

	it('follows the engine part only for a case that runs in the engine', () => {
		const before = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			"const START_NODE = 'Start';",
			"const START_NODE = 'Begin';",
		);
		expect(changed(before)).toEqual([false, true, true]);
	});

	it('follows the fake of `fetch` only for a case with sub-nodes', () => {
		const before = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'function installFakeFetch(',
			'function installFakeFetch(\n\t_more: unknown,',
		);
		expect(changed(before)).toEqual([false, false, true]);
	});

	it('keeps the engine part in the key when a use is not under the condition', () => {
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'const { workflow, engine, compat } = load();',
			'const { workflow, engine, compat } = load();\n\tvoid recordInEngine;',
		);
		const before = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			"const START_NODE = 'Start';",
			"const START_NODE = 'Begin';",
		);
		expect(changed(before)).toEqual([true, true, true]);
	});

	it('keeps the fake of `fetch` in the key when the condition has another meaning', () => {
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'\tconst subNodes = testCase.subNodes ?? [];\n',
			'\tconst subNodes = testCase.subNodes ?? [testCase];\n',
		);
		const before = keys();
		edit(
			'nodes/__tests__/v1-recorder.ts',
			'function installFakeFetch(',
			'function installFakeFetch(\n\t_more: unknown,',
		);
		expect(changed(before)).toEqual([false, true, true]);
	});

	it('follows the functions of other files that the recorder uses, and no other function', () => {
		const first = keys();
		edit(
			'nodes/__tests__/equivalence.ts',
			'export function normalizeRequest(raw: RawRequest): NormalRequest {',
			'export function normalizeRequest(raw: RawRequest): NormalRequest {\n\tvoid 0;',
		);
		expect(changed(first)).toEqual([true, true, true]);
		const second = keys();
		edit(
			'nodes/__tests__/equivalence.ts',
			'export function applyCredential(',
			'export function applyCredential(\n\t_more: unknown,',
		);
		expect(changed(second)).toEqual([false, false, false]);
		const third = keys();
		edit(
			'nodes/__tests__/no-network.ts',
			'export function installNetworkGuard(',
			'export function installNetworkGuard(\n\t_more?: unknown,',
		);
		expect(changed(third)).toEqual([true, true, true]);
	});

	it('names the node type that the engine part puts before the node', () => {
		const text = readFileSync(join(here, 'v1-recorder.ts'), 'utf8');
		const types = [...text.matchAll(/type: '([\w@/-]+\.[\w]+)'/g)].map((match) => match[1]);
		expect([...new Set(types)]).toEqual([START_TYPE]);
	});
});

describe('the declarations that a name needs', () => {
	it('follows a name through other declarations and leaves the rest out', () => {
		const file = join(root, 'parts.ts');
		const text = (used: string, unused: string) =>
			`const limit = ${used};\nfunction inner() { return limit; }\nexport function root() { return inner(); }\nexport function other() { return ${unused}; }\n`;
		writeFileSync(file, text('1', '2'));
		const before = declarationsKey(file, ['root']);
		writeFileSync(file, text('1', '3'));
		expect(declarationsKey(file, ['root'])).toBe(before);
		writeFileSync(file, text('4', '3'));
		expect(declarationsKey(file, ['root'])).not.toBe(before);
	});
});

describe('the built code of a node type', () => {
	const put = (path: string, text: string) => {
		const file = join(root, path);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, text);
		forgetFileHashes();
	};

	beforeEach(() => {
		put('package.json', '{"name":"nodes"}');
		put(
			'dist/known/nodes.json',
			JSON.stringify({
				one: { className: 'One', sourcePath: 'dist/nodes/One.node.js' },
				two: { className: 'Two', sourcePath: 'dist/nodes/Two.node.js' },
			}),
		);
		put('dist/nodes/One.node.js', 'require("./shared/a");\nrequire("lodash");\n');
		put('dist/nodes/Two.node.js', 'exports.Two = 1;\n');
		put('dist/nodes/shared/a.js', 'await import("./b.js");\n');
		put('dist/nodes/shared/b.js', 'exports.b = 1;\n');
		put('dist/credentials/C.credentials.js', 'exports.C = require("../nodes/shared/c");\n');
		put('dist/nodes/shared/c.js', 'exports.c = 1;\n');
	});

	it('has the files that the entry loads, to any depth', () => {
		expect(requireClosure(join(root, 'dist/nodes/One.node.js'), root)).toEqual({
			files: ['dist/nodes/One.node.js', 'dist/nodes/shared/a.js', 'dist/nodes/shared/b.js'],
			open: false,
		});
	});

	it('follows a file of the node, a credential, a file that a credential loads and the index, and no file of another node', () => {
		const identity = () => nodeIdentity(root, 'one');
		let before = identity();
		put('dist/nodes/shared/b.js', 'exports.b = 2;\n');
		expect(identity()).not.toBe(before);
		before = identity();
		put('dist/credentials/C.credentials.js', 'exports.C = require("../nodes/shared/c") + 1;\n');
		expect(identity()).not.toBe(before);
		before = identity();
		put('dist/nodes/shared/c.js', 'exports.c = 2;\n');
		expect(identity()).not.toBe(before);
		before = identity();
		put('dist/nodes/Two.node.js', 'exports.Two = 2;\n');
		expect(identity()).toBe(before);
		expect(nodeIdentity(root, 'oneTool')).toBe(before);
	});

	it('is the whole package for a node that loads a path with no name or no file', () => {
		for (const text of ['require(name);\n', 'require("./gone");\n', 'require("../../../out");\n']) {
			put('dist/nodes/One.node.js', text);
			expect(requireClosure(join(root, 'dist/nodes/One.node.js'), root).open).toBe(true);
			const before = nodeIdentity(root, 'one');
			put('dist/nodes/Two.node.js', `exports.Two = ${JSON.stringify(text)};\n`);
			expect(nodeIdentity(root, 'one')).not.toBe(before);
		}
		const unknown = nodeIdentity(root, 'three');
		put('dist/nodes/Two.node.js', 'exports.Two = 5;\n');
		expect(nodeIdentity(root, 'three')).not.toBe(unknown);
	});
});
