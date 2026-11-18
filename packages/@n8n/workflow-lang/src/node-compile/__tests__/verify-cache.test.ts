import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { forgetFileHashes, importClosure } from '../../nodes/__tests__/build-identity.ts';
import type { EquivalenceCase } from '../../nodes/__tests__/equivalence.ts';
import type { KeyInputs } from './verify-cache.ts';
import {
	CaseStore,
	CLASS_READ,
	findResult,
	mergedList,
	nodeKeys,
	readName,
	readNow,
	storeResult,
	subsetKey,
	verifierSources,
} from './verify-cache.ts';
import { caseMemoKey } from './verify.ts';

let root = '';

function put(path: string, text: string): void {
	const file = join(root, path);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, text);
}

function change(path: string): void {
	const file = join(root, path);
	writeFileSync(file, `${readFileSync(file, 'utf8')}\n;1;\n`);
	forgetFileHashes();
}

function inputs(more: Partial<KeyInputs> = {}): KeyInputs {
	return {
		packageDir: join(root, 'packages/lang'),
		repoDir: root,
		script: join(root, 'packages/lang/scripts/verify.ts'),
		converter: join(root, 'packages/lang/src/node-compile/convert.ts'),
		hostDir: join(root, 'packages/host'),
		nodePackages: { 'n8n-nodes-base': join(root, 'packages/nodes-base') },
		nodePrefix: 'n8n-nodes-base.',
		alwaysTypes: ['n8n-nodes-base.manualTrigger'],
		credentialPackages: [join(root, 'packages/nodes-base')],
		signingKey: join(root, 'packages/lang/keys/signing.pem'),
		dist: false,
		environment: { TZ: 'UTC', WF_TARGET_RUNNER_ZONE: 'UTC', VERIFY_PARALLEL: '6' },
		nodeText: 'node=v1 icu=1',
		...more,
	};
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'verify-cache-'));
	put('pnpm-lock.yaml', 'lock 1');
	put(
		'packages/lang/scripts/verify.ts',
		"import '../src/a.ts';\nimport '../src/node-compile/convert.ts';\nimport '../src/node-compile/verified.generated.ts';\n",
	);
	put('packages/lang/src/a.ts', "import './helpers.ts';\nexport const a = 1;\n");
	put('packages/lang/src/helpers.ts', 'export const h = 1;\n');
	put(
		'packages/lang/src/node-compile/convert.ts',
		"import './specialise.ts';\nimport '../helpers.ts';\nexport const c = 1;\n",
	);
	put('packages/lang/src/node-compile/specialise.ts', 'export const s = 1;\n');
	put('packages/lang/src/node-compile/verified.generated.ts', 'export const VERIFIED = {};\n');
	put('packages/lang/keys/signing.pem', 'key 1');
	put(
		'packages/host/package.json',
		JSON.stringify({
			name: 'host',
			dependencies: { core: 'workspace:*', 'n8n-nodes-base': 'workspace:*', lodash: '1.0.0' },
		}),
	);
	put('packages/host/dist/index.js', 'exports.host = 1;\n');
	put('packages/core/package.json', JSON.stringify({ name: 'core' }));
	put('packages/core/dist/index.js', 'exports.core = 1;\n');
	put('packages/nodes-base/package.json', JSON.stringify({ name: 'n8n-nodes-base' }));
	put(
		'packages/nodes-base/dist/known/nodes.json',
		JSON.stringify({
			alpha: { className: 'Alpha', sourcePath: 'dist/nodes/Alpha/Alpha.node.js' },
			beta: { className: 'Beta', sourcePath: 'dist/nodes/Beta/Beta.node.js' },
			manualTrigger: { className: 'Manual', sourcePath: 'dist/nodes/Manual/Manual.node.js' },
		}),
	);
	put('packages/nodes-base/dist/known/credentials.json', '{}');
	put('packages/nodes-base/dist/credentials/A.credentials.js', 'exports.A = 1;\n');
	put(
		'packages/nodes-base/dist/nodes/Alpha/Alpha.node.js',
		'const helper = require("./helper");\nexports.Alpha = helper;\n',
	);
	put('packages/nodes-base/dist/nodes/Alpha/helper.js', 'exports.helper = 1;\n');
	put('packages/nodes-base/dist/nodes/Beta/Beta.node.js', 'exports.Beta = 1;\n');
	put('packages/nodes-base/dist/nodes/Manual/Manual.node.js', 'exports.Manual = 1;\n');
	put('packages/nodes-base/nodes/Alpha/Alpha.node.ts', 'export class Alpha {}\n');
	mkdirSync(join(root, 'packages/host/node_modules'), { recursive: true });
	symlinkSync(join(root, 'packages/core'), join(root, 'packages/host/node_modules/core'));
	symlinkSync(
		join(root, 'packages/nodes-base'),
		join(root, 'packages/host/node_modules/n8n-nodes-base'),
	);
	forgetFileHashes();
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
	forgetFileHashes();
});

describe('the key of a verifier result', () => {
	const BOTH = { result: true, cases: true };
	const NEITHER = { result: false, cases: false };
	const FILES: Array<[string, string, { result: boolean; cases: boolean }]> = [
		['the verifier script', 'packages/lang/scripts/verify.ts', BOTH],
		['a file that the script imports', 'packages/lang/src/a.ts', BOTH],
		['a file that the script and the converter import', 'packages/lang/src/helpers.ts', BOTH],
		['the converter of a node', 'packages/lang/src/node-compile/convert.ts', BOTH],
		[
			'a file of the node compiler',
			'packages/lang/src/node-compile/specialise.ts',
			{ result: true, cases: false },
		],
		['a generated list', 'packages/lang/src/node-compile/verified.generated.ts', NEITHER],
		['the built entry of the node', 'packages/nodes-base/dist/nodes/Alpha/Alpha.node.js', BOTH],
		['a built file that the node loads', 'packages/nodes-base/dist/nodes/Alpha/helper.js', BOTH],
		['the built code of another node', 'packages/nodes-base/dist/nodes/Beta/Beta.node.js', NEITHER],
		[
			'the built code of the start node of the recorder',
			'packages/nodes-base/dist/nodes/Manual/Manual.node.js',
			BOTH,
		],
		['a built credential', 'packages/nodes-base/dist/credentials/A.credentials.js', BOTH],
		['the index of the nodes', 'packages/nodes-base/dist/known/nodes.json', BOTH],
		['the index of the credentials', 'packages/nodes-base/dist/known/credentials.json', BOTH],
		['the package file of the node package', 'packages/nodes-base/package.json', BOTH],
		['the built code of a workspace package below the host', 'packages/core/dist/index.js', BOTH],
		['the built code of the host', 'packages/host/dist/index.js', NEITHER],
		['the lock file', 'pnpm-lock.yaml', BOTH],
		['the signing key of the test credentials', 'packages/lang/keys/signing.pem', BOTH],
	];

	it.each(FILES)('follows a change in %s', (_label, file, expected) => {
		const before = nodeKeys(inputs(), 'alpha');
		change(file);
		const after = nodeKeys(inputs(), 'alpha');
		expect({
			result: after.result !== before.result,
			cases: after.cases !== before.cases,
		}).toEqual(expected);
	});

	const INPUTS: Array<[string, Partial<KeyInputs>, boolean]> = [
		['the Node.js identity', { nodeText: 'node=v2 icu=1' }, true],
		['the time zone', { environment: { TZ: 'Europe/Berlin', WF_TARGET_RUNNER_ZONE: 'UTC' } }, true],
		[
			'the time zone of the task runner',
			{ environment: { TZ: 'UTC', WF_TARGET_RUNNER_ZONE: 'Europe/Berlin' } },
			true,
		],
		[
			'a setting of n8n',
			{ environment: { TZ: 'UTC', WF_TARGET_RUNNER_ZONE: 'UTC', N8N_RUNNERS_MODE: 'external' } },
			true,
		],
		['the choice of the built node sources', { dist: true }, true],
		[
			'the count of workers',
			{ environment: { TZ: 'UTC', WF_TARGET_RUNNER_ZONE: 'UTC', VERIFY_PARALLEL: '14' } },
			false,
		],
	];

	it.each(INPUTS)('follows a change in %s', (_label, more, changes) => {
		const before = nodeKeys(inputs(), 'alpha');
		const after = nodeKeys(inputs(more), 'alpha');
		expect(after.result !== before.result).toBe(changes);
		expect(after.cases !== before.cases).toBe(changes);
	});

	it('gives each node type its own key', () => {
		expect(nodeKeys(inputs(), 'alpha').result).not.toBe(nodeKeys(inputs(), 'beta').result);
	});

	it('gives the same key in another directory', () => {
		const before = nodeKeys(inputs(), 'alpha');
		const first = root;
		root = mkdtempSync(join(tmpdir(), 'verify-cache-copy-'));
		for (const file of [
			...importClosure([join(first, 'packages/lang/scripts/verify.ts')]).files,
			join(first, 'packages/lang/keys/signing.pem'),
			join(first, 'pnpm-lock.yaml'),
			join(first, 'packages/host/package.json'),
			join(first, 'packages/host/dist/index.js'),
			join(first, 'packages/core/package.json'),
			join(first, 'packages/core/dist/index.js'),
			join(first, 'packages/nodes-base/package.json'),
			join(first, 'packages/nodes-base/dist/known/nodes.json'),
			join(first, 'packages/nodes-base/dist/known/credentials.json'),
			join(first, 'packages/nodes-base/dist/credentials/A.credentials.js'),
			join(first, 'packages/nodes-base/dist/nodes/Alpha/Alpha.node.js'),
			join(first, 'packages/nodes-base/dist/nodes/Alpha/helper.js'),
			join(first, 'packages/nodes-base/dist/nodes/Beta/Beta.node.js'),
			join(first, 'packages/nodes-base/dist/nodes/Manual/Manual.node.js'),
		])
			put(file.slice(first.length + 1), readFileSync(file, 'utf8'));
		mkdirSync(join(root, 'packages/host/node_modules'), { recursive: true });
		symlinkSync(join(root, 'packages/core'), join(root, 'packages/host/node_modules/core'));
		symlinkSync(
			join(root, 'packages/nodes-base'),
			join(root, 'packages/host/node_modules/n8n-nodes-base'),
		);
		forgetFileHashes();
		expect(nodeKeys(inputs(), 'alpha')).toEqual(before);
		rmSync(first, { recursive: true, force: true });
	});

	it('takes the whole package for a node that loads a path with no name', () => {
		put(
			'packages/nodes-base/dist/nodes/Alpha/Alpha.node.js',
			'const name = "./helper";\nexports.Alpha = require(name);\n',
		);
		forgetFileHashes();
		const before = nodeKeys(inputs(), 'alpha');
		change('packages/nodes-base/dist/nodes/Beta/Beta.node.js');
		expect(nodeKeys(inputs(), 'alpha').result).not.toBe(before.result);
	});

	it('names an import that has no file', () => {
		const before = nodeKeys(inputs(), 'alpha');
		put(
			'packages/lang/src/a.ts',
			"import './helpers.ts';\nimport './gone.ts';\nexport const a = 1;\n",
		);
		forgetFileHashes();
		expect(verifierSources(inputs()).missing).toHaveLength(1);
		expect(nodeKeys(inputs(), 'alpha').result).not.toBe(before.result);
	});
});

describe('the files that a check read', () => {
	const classFile = (name: string) =>
		name === 'Alpha' ? join(root, 'packages/nodes-base/nodes/Alpha/Alpha.node.ts') : undefined;
	const now = (read: string) => readNow(root, classFile, read);
	const source = () => readName(root, join(root, 'packages/nodes-base/nodes/Alpha/Alpha.node.ts'));
	const absent = () => readName(root, join(root, 'packages/nodes-base/nodes/Alpha/none.ts'));
	const entry = () => ({
		key: 'k',
		reads: {
			[source()]: now(source()),
			[absent()]: now(absent()),
			[`${CLASS_READ}Alpha`]: now(`${CLASS_READ}Alpha`),
		},
		result: { verified: 1 },
		seconds: 3,
	});
	const dir = () => join(root, 'cache');

	it('gives the result back when no file changed', () => {
		storeResult(dir(), 'alpha', entry());
		expect(findResult(dir(), 'alpha', 'k', now)?.result).toEqual({ verified: 1 });
		expect(findResult(dir(), 'alpha', 'other key', now)).toBeUndefined();
		expect(findResult(dir(), 'beta', 'k', now)).toBeUndefined();
	});

	it('gives no result after a change in a source file of the node', () => {
		storeResult(dir(), 'alpha', entry());
		change('packages/nodes-base/nodes/Alpha/Alpha.node.ts');
		expect(findResult(dir(), 'alpha', 'k', now)).toBeUndefined();
	});

	it('gives no result when a file that was not there is there', () => {
		storeResult(dir(), 'alpha', entry());
		put('packages/nodes-base/nodes/Alpha/none.ts', 'export const n = 1;\n');
		forgetFileHashes();
		expect(findResult(dir(), 'alpha', 'k', now)).toBeUndefined();
	});

	it('gives no result when the class of the node is in another file', () => {
		storeResult(dir(), 'alpha', entry());
		const moved = (name: string) =>
			name === 'Alpha' ? join(root, 'packages/nodes-base/nodes/Alpha/v2/Alpha.node.ts') : undefined;
		expect(findResult(dir(), 'alpha', 'k', (read) => readNow(root, moved, read))).toBeUndefined();
	});

	it('keeps the results of several states of the sources', () => {
		storeResult(dir(), 'alpha', entry());
		change('packages/nodes-base/nodes/Alpha/Alpha.node.ts');
		storeResult(dir(), 'alpha', { ...entry(), result: { verified: 2 } });
		expect(findResult(dir(), 'alpha', 'k', now)?.result).toEqual({ verified: 2 });
	});
});

describe('the kept results of cases', () => {
	const testCase: EquivalenceCase = {
		name: 'a case',
		type: 'n8n-nodes-base.alpha',
		typeVersion: 1,
		parameters: { resource: 'r', operation: 'o' },
		responses: [{ body: { ok: true } }],
	};
	const compiled = { source: 'export const node = 1;', changed: [] };

	it('has a key that follows the compiled output, the case and the form of the check', () => {
		const key = caseMemoKey('difference', testCase, [true, null], [compiled]);
		expect(caseMemoKey('difference', testCase, [true, null], [{ ...compiled }])).toBe(key);
		const others = [
			caseMemoKey('difference', testCase, [true, null], [{ ...compiled, source: 'changed' }]),
			caseMemoKey('difference', testCase, [true, null], [{ ...compiled, changed: ['limit'] }]),
			caseMemoKey('difference', testCase, [true, 'once'], [compiled]),
			caseMemoKey('cost', testCase, [true, null], [compiled]),
			caseMemoKey('difference', { ...testCase, parameters: {} }, [true, null], [compiled]),
			caseMemoKey('difference', { ...testCase, responses: [] }, [true, null], [compiled]),
			caseMemoKey('difference', { ...testCase, items: [{}] }, [true, null], [compiled]),
		];
		expect(new Set([key, ...others]).size).toBe(others.length + 1);
	});

	it('has a key for a subset check that follows the source', () => {
		expect(subsetKey('t', 1, 'a')).toBe(subsetKey('t', 1, 'a'));
		expect(subsetKey('t', 1, 'a')).not.toBe(subsetKey('t', 1, 'b'));
		expect(subsetKey('t', 1, 'a')).not.toBe(subsetKey('t', 2, 'a'));
	});

	it('keeps the entries of a run in a file', () => {
		const file = join(root, 'cache/cases/alpha.k.0-1.json.gz');
		const first = new CaseStore(file);
		expect(first.get('a'.repeat(64))).toBeUndefined();
		first.set('a'.repeat(64), { difference: null, pairings: [] });
		first.set('b'.repeat(64), ['an error']);
		first.save();
		const second = new CaseStore(file);
		expect(second.get('a'.repeat(64))).toEqual({ difference: null, pairings: [] });
		expect(second.get('b'.repeat(64))).toEqual(['an error']);
		expect(second.get('c'.repeat(64))).toBeUndefined();
		expect([second.hits, second.misses]).toEqual([2, 1]);
	});

	it('reads the entries of each part of a node type and writes only its own part', () => {
		const first = new CaseStore(join(root, 'cache/cases/alpha.k.0-2.json.gz'));
		first.set('a'.repeat(64), 1);
		first.save();
		const other = new CaseStore(join(root, 'cache/cases/beta.k.0-1.json.gz'));
		other.set('d'.repeat(64), 4);
		other.save();
		const whole = new CaseStore(join(root, 'cache/cases/alpha.k.0-1.json.gz'));
		expect(whole.get('a'.repeat(64))).toBe(1);
		expect(whole.get('d'.repeat(64))).toBeUndefined();
		whole.set('b'.repeat(64), 2);
		whole.save();
		const again = new CaseStore(join(root, 'cache/cases/alpha.k.0-2.json.gz'));
		expect([again.get('a'.repeat(64)), again.get('b'.repeat(64))]).toEqual([1, 2]);
	});

	it('reads a file that is not a store as an empty store', () => {
		put('cache/cases/bad.k.0-1.json.gz', 'not a store');
		expect(new CaseStore(join(root, 'cache/cases/bad.k.0-1.json.gz')).get('a')).toBeUndefined();
	});
});

describe('the generated lists after a run', () => {
	const committed = { 'p.a@1:r.o': 1, 'p.b@1:r.o': 2, 'p.c@1:r.o': 3 };
	const nodeOf = (key: string) => key.slice(2, key.indexOf('@'));

	it('replaces the entries of the node types of a pattern run and keeps the others', () => {
		const list = mergedList(
			committed,
			new Set(['b']),
			new Set(),
			{ 'p.b@2:r.o': 9, 'p.b@1:a.o': 8 },
			false,
			nodeOf,
		);
		expect(Object.entries(list)).toEqual([
			['p.a@1:r.o', 1],
			['p.b@1:a.o', 8],
			['p.b@2:r.o', 9],
			['p.c@1:r.o', 3],
		]);
	});

	it('has only the results of a run of all node types', () => {
		const list = mergedList(
			committed,
			new Set(['a', 'b']),
			new Set(),
			{ 'p.a@1:r.o': 5 },
			true,
			nodeOf,
		);
		expect(list).toEqual({ 'p.a@1:r.o': 5 });
	});

	it('keeps the committed entries of a node type that gave no result', () => {
		const whole = mergedList(
			committed,
			new Set(['a', 'b', 'c']),
			new Set(['b']),
			{ 'p.a@1:r.o': 5 },
			true,
			nodeOf,
		);
		expect(whole).toEqual({ 'p.a@1:r.o': 5, 'p.b@1:r.o': 2 });
		const part = mergedList(committed, new Set(['b']), new Set(['b']), {}, false, nodeOf);
		expect(part).toEqual(committed);
	});
});

describe('the sources of the verifier', () => {
	const packageDir = join(dirname(fileURLToPath(import.meta.url)), '../../..');
	const real: KeyInputs = {
		...inputs(),
		packageDir,
		repoDir: join(packageDir, '../../..'),
		script: join(packageDir, 'scripts/verify-compiled-nodes.ts'),
		converter: join(packageDir, 'src/node-compile/convert.ts'),
	};
	const converterNames = (file: string): string[] => {
		const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
		const names: string[] = [];
		for (const statement of source.statements) {
			if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
				continue;
			if (!/(^|\/)(node-compile\/)?convert\.ts$/.test(statement.moduleSpecifier.text)) continue;
			if (join(dirname(file), statement.moduleSpecifier.text) !== real.converter) continue;
			const clause = statement.importClause;
			const bindings = clause?.namedBindings;
			if (!clause || clause.isTypeOnly || !bindings || !ts.isNamedImports(bindings)) continue;
			for (const element of bindings.elements)
				if (!element.isTypeOnly) names.push((element.propertyName ?? element.name).text);
		}
		return names.sort();
	};

	it('has the parts that the key names', () => {
		const { direct, compiler, missing } = verifierSources(real);
		const names = (files: string[]) => files.map((file) => file.slice(packageDir.length + 1));
		expect(missing).toEqual([]);
		expect(names(direct)).toEqual(
			expect.arrayContaining([
				'scripts/verify-compiled-nodes.ts',
				'src/node-compile/__tests__/verify.ts',
				'src/node-compile/__tests__/verify-cache.ts',
				'src/node-compile/convert.ts',
				'src/node-compile/variants.ts',
				'src/node-compile/walk.ts',
				'src/nodes/__tests__/v1-recorder.ts',
				'src/nodes/__tests__/equivalence.ts',
				'src/nodes/__tests__/build-identity.ts',
				'src/convert/helpers.ts',
				'src/convert/node-identity.ts',
				'src/convert/steps.ts',
				'src/compiler/index.ts',
				'src/reference/runner.ts',
			]),
		);
		expect(names(compiler)).toEqual(
			expect.arrayContaining(['src/node-compile/specialise.ts', 'src/node-compile/routing.ts']),
		);
		expect(
			names([...direct, ...compiler]).filter((name) => name.endsWith('.generated.ts')),
		).toEqual(
			expect.not.arrayContaining([
				'src/node-compile/verified.generated.ts',
				'src/node-compile/cost.generated.ts',
			]),
		);
	});

	it('reaches the node compiler only through names of the converter that are known', () => {
		const { direct } = verifierSources(real);
		const users = direct
			.filter((file) => file !== real.converter && converterNames(file).length > 0)
			.map((file) => file.slice(packageDir.length + 1));
		expect(users.sort()).toEqual([
			'scripts/verify-compiled-nodes.ts',
			'src/convert/steps.ts',
			'src/node-compile/__tests__/verify.ts',
		]);
		expect(converterNames(real.script)).toEqual(
			[
				'CALL_FOR_EACH_ITEM',
				'CONTINUE_MODES',
				'ERROR_ITEMS_BY_POSITION',
				'ITEM_ERROR',
				'ITEM_PARAMETER_PREFIX',
				'PAIRED_ITEMS',
				'authenticationCondition',
				'errorModeCondition',
				'evaluatedCondition',
				'evaluatedParameterNames',
				'itemErrorCondition',
				'itemParameterCondition',
				'oneCallCondition',
				'verifiedKey',
			].sort(),
		);
		expect(converterNames(join(packageDir, 'src/node-compile/__tests__/verify.ts'))).toEqual([
			'compileNodeInstance',
			'valueAtPath',
		]);
		expect(converterNames(join(packageDir, 'src/convert/steps.ts'))).toEqual(
			[
				'compileNodeInstance',
				'callsOnce',
				'deferredVerified',
				'pairsAsV1',
				'errorItemsByPosition',
				'flagGuard',
				'unverifiedConditions',
				'valueAtPath',
				'verifiedFlagKeys',
			].sort(),
		);
	});
});
