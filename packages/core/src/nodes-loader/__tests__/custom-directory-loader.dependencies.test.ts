import { Logger } from '@n8n/backend-common';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { mockInstance } from '@test/utils';

import { CustomDirectoryLoader } from '../custom-directory-loader';

// NODE-6005: Dependency build files can use n8n node and credential file suffixes.
describe('CustomDirectoryLoader dependencies', () => {
	mockInstance(Logger);

	let tmpRoot: string;
	let customDir: string;
	let loader: CustomDirectoryLoader;

	const writeFile = (root: string, relativePath: string, source: string) => {
		const filePath = path.join(root, relativePath);
		mkdirSync(path.dirname(filePath), { recursive: true });
		writeFileSync(filePath, source);
		return filePath;
	};

	const writeCustomFiles = (root: string) => {
		const nodePath = writeFile(
			root,
			'nodes/Foo.node.js',
			`module.exports.Foo = class Foo {
				constructor() {
					this.description = {
						displayName: 'Foo',
						name: 'foo',
						group: ['transform'],
						version: 1,
						description: 'Test node',
						defaults: { name: 'Foo' },
						inputs: ['main'],
						outputs: ['main'],
						credentials: [{ name: 'fooApi', required: true }],
						properties: [],
					};
				}
			};`,
		);
		const credentialPath = writeFile(
			root,
			'credentials/FooApi.credentials.js',
			`module.exports.FooApi = class FooApi {
				constructor() {
					this.name = 'fooApi';
					this.displayName = 'Foo API';
					this.properties = [];
				}
			};`,
		);
		return { nodePath, credentialPath };
	};

	const writeDependency = (root: string, suffix: string) => {
		writeFile(root, 'node_modules/wmf/package.json', JSON.stringify({ name: 'wmf' }));
		return writeFile(root, `node_modules/wmf/dist/wmf.${suffix}.js`, 'module.exports = {};');
	};

	const expectCustomFilesLoaded = (files: { nodePath: string; credentialPath: string }) => {
		expect(loader.packageName).toBe('CUSTOM');
		expect(Object.keys(loader.nodeTypes)).toEqual(['foo']);
		expect(Object.keys(loader.credentialTypes)).toEqual(['fooApi']);
		expect(loader.getNode('foo').sourcePath).toBe(files.nodePath);
		expect(loader.getCredential('fooApi').sourcePath).toBe(files.credentialPath);
	};

	beforeEach(() => {
		tmpRoot = mkdtempSync(path.join(tmpdir(), 'n8n-custom-dependencies-'));
		customDir = path.join(tmpRoot, 'custom');
		mkdirSync(customDir);
		loader = new CustomDirectoryLoader(customDir);
	});

	afterEach(() => {
		loader.reset();
		vi.restoreAllMocks();
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('loads loose custom nodes and credentials without dependencies', async () => {
		const files = writeCustomFiles(customDir);

		await loader.loadAll();

		expectCustomFilesLoaded(files);
	});

	it.each(['node', 'credentials'])(
		'ignores dependency *.%s.js files beside loose custom files',
		async (suffix) => {
			const files = writeCustomFiles(customDir);
			const dependencyPath = writeDependency(customDir, suffix);
			const loadNode = vi.spyOn(loader, 'loadNodeFromFile');
			const loadCredential = vi.spyOn(loader, 'loadCredentialFromFile');

			await expect(loader.loadAll()).resolves.toBeUndefined();

			expectCustomFilesLoaded(files);
			expect(loadNode).not.toHaveBeenCalledWith(dependencyPath);
			expect(loadCredential).not.toHaveBeenCalledWith(dependencyPath);
		},
	);

	it.each(['n8n-nodes-foo', '@scope/n8n-nodes-foo'])(
		'loads the symlinked dev package %s without loading its dependencies',
		async (packageName) => {
			const projectDir = path.join(tmpRoot, 'project');
			writeCustomFiles(path.join(projectDir, 'dist'));
			writeFile(
				projectDir,
				'package.json',
				JSON.stringify({
					name: packageName,
					version: '1.0.0',
					n8n: {
						nodes: ['dist/nodes/Foo.node.js'],
						credentials: ['dist/credentials/FooApi.credentials.js'],
					},
				}),
			);
			writeDependency(projectDir, 'node');
			writeDependency(projectDir, 'credentials');
			writeFile(projectDir, 'dist/nodes/Unlisted.node.js', 'module.exports = {};');
			writeFile(projectDir, 'dist/credentials/Unlisted.credentials.js', 'module.exports = {};');
			const packageLink = path.join(customDir, 'node_modules', packageName);
			mkdirSync(path.dirname(packageLink), { recursive: true });
			symlinkSync(projectDir, packageLink, 'dir');
			const loadNode = vi.spyOn(loader, 'loadNodeFromFile');
			const loadCredential = vi.spyOn(loader, 'loadCredentialFromFile');

			await expect(loader.loadAll()).resolves.toBeUndefined();

			expect(loader.packageName).toBe('CUSTOM');
			expect(Object.keys(loader.nodeTypes)).toEqual(['foo']);
			expect(Object.keys(loader.credentialTypes)).toEqual(['fooApi']);
			expect(loader.getNode('foo').type.description.name).toBe('foo');
			expect(loader.getCredential('fooApi').type.name).toBe('fooApi');
			expect(loadNode).not.toHaveBeenCalledWith(
				path.join(packageLink, 'node_modules/wmf/dist/wmf.node.js'),
			);
			expect(loadCredential).not.toHaveBeenCalledWith(
				path.join(packageLink, 'node_modules/wmf/dist/wmf.credentials.js'),
			);
		},
	);
});
