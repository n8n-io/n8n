import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { findSchemaDirectory, withSchemaDirIndex } from './generate-types';

function addSchemaDir(root: string, relativeDir: string): string {
	const schemaDir = path.join(root, relativeDir, '__schema__');
	fs.mkdirSync(path.join(schemaDir, 'v1.0.0'), { recursive: true });
	fs.writeFileSync(path.join(schemaDir, 'v1.0.0', 'output.json'), '{}');
	return schemaDir;
}

describe('schema directory index', () => {
	let packageDir: string;
	let nodesRoot: string;
	let originalCwd: string;

	beforeEach(() => {
		originalCwd = process.cwd();
		// realpath: on macOS the temp dir is a symlink, and process.cwd() resolves it.
		packageDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'schema-dir-index-test-')));
		nodesRoot = path.join(packageDir, 'dist', 'nodes');
		fs.mkdirSync(nodesRoot, { recursive: true });
		// schemaSearchRoots() puts <cwd>/dist/nodes ahead of nodes-base.
		process.chdir(packageDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		fs.rmSync(packageDir, { recursive: true, force: true });
	});

	const names = [
		'__IdxTarget__',
		'__idxchainllm__',
		'__IdxSheets__',
		'__IdxDuplicate__',
		'__IdxHidden__',
		'__IdxMissing__',
	];

	function buildTree() {
		// A nested match that sorts before the flat match. The flat match must win.
		addSchemaDir(nodesRoot, 'AAA/__IdxTarget__');
		const flatTarget = addSchemaDir(nodesRoot, '__IdxTarget__');
		// Folder casing differs from the node name.
		const chain = addSchemaDir(nodesRoot, 'chains/__IDXCHAINLLM__');
		// A folder with the node name but no schema, with a match below it.
		fs.mkdirSync(path.join(nodesRoot, '__IdxSheets__'), { recursive: true });
		const sheets = addSchemaDir(nodesRoot, '__IdxSheets__/V2/__IdxSheets__');
		// Two nested matches. Walk order decides, the same as the direct search.
		addSchemaDir(nodesRoot, 'Group1/__IdxDuplicate__');
		addSchemaDir(nodesRoot, 'Group2/__IdxDuplicate__');
		// The search skips node_modules.
		addSchemaDir(nodesRoot, 'node_modules/__IdxHidden__');
		return { flatTarget, chain, sheets };
	}

	it('returns the same directories as the direct search', async () => {
		const { flatTarget, chain, sheets } = buildTree();

		const direct = names.map((name) => findSchemaDirectory(name));
		const indexed = await withSchemaDirIndex(
			async () => await Promise.resolve(names.map((name) => findSchemaDirectory(name))),
		);

		expect(indexed).toEqual(direct);
		expect(indexed[0]).toBe(flatTarget);
		expect(indexed[1]).toBe(chain);
		expect(indexed[2]).toBe(sheets);
		expect(indexed[3]).toBeDefined();
		expect(indexed[4]).toBeUndefined();
		expect(indexed[5]).toBeUndefined();
	});

	it('keeps an explicit schema path ahead of the name lookup', async () => {
		buildTree();
		const explicit = addSchemaDir(nodesRoot, 'custom/place');

		const result = await withSchemaDirIndex(
			async () => await Promise.resolve(findSchemaDirectory('__IdxTarget__', 'custom/place')),
		);

		expect(result).toBe(explicit);
	});

	it('does not keep the index after the run ends', async () => {
		await withSchemaDirIndex(async () => await Promise.resolve(findSchemaDirectory('__IdxLate__')));
		const late = addSchemaDir(nodesRoot, '__IdxLate__');

		expect(findSchemaDirectory('__IdxLate__')).toBe(late);
		const nextRun = await withSchemaDirIndex(
			async () => await Promise.resolve(findSchemaDirectory('__IdxLate__')),
		);
		expect(nextRun).toBe(late);
	});
});
