import { Logger } from '@n8n/backend-common';
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { mockInstance } from '@test/utils';

import { CustomDirectoryLoader } from '../custom-directory-loader';

// NODE-6005: Dependency build files can use n8n node and credential file suffixes.
describe('CustomDirectoryLoader dependencies', () => {
	const logger = mockInstance(Logger);

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
		vi.clearAllMocks();
		tmpRoot = realpathSync(mkdtempSync(path.join(tmpdir(), 'n8n-custom-dependencies-')));
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

	describe.each(['loose', 'package'])('%s custom files', (layout) => {
		it.each(['single-version', 'versioned'])(
			'skips a %s node with an invalid description without registering it',
			async (kind) => {
				const root =
					layout === 'loose' ? customDir : path.join(customDir, 'node_modules/n8n-nodes-foo');
				const files = writeCustomFiles(root);
				const brokenPath = writeFile(
					root,
					'AaaBroken.node.js',
					`module.exports.AaaBroken = class AaaBroken {
						constructor() {
							this.description = {
								displayName: 'Broken',
								name: 'broken',
								group: ['transform'],
								version: 1,
								description: 'Test node',
								defaults: { name: 'Broken' },
								inputs: ['main'],
								outputs: ['main'],
								credentials: [{ name: 'brokenApi', required: true }],
								properties: [{
									displayName: 'Operation',
									name: 'operation',
									type: 'options',
									default: 'test',
									options: [{ name: 'Test', value: 'test' }],
									builderHint: { searchHint: 'Test hint' },
								}],
							};
							if (${kind === 'versioned'}) {
								this.currentVersion = 2;
								this.nodeVersions = {
									1: { description: this.description },
									2: { description: { ...this.description, version: 2, properties: [] } },
								};
							}
						}
					};`,
				);
				if (layout === 'package') {
					writeFile(
						root,
						'package.json',
						JSON.stringify({
							name: 'n8n-nodes-foo',
							n8n: {
								nodes: ['AaaBroken.node.js', 'nodes/Foo.node.js'],
								credentials: ['credentials/FooApi.credentials.js'],
							},
						}),
					);
				}

				await expect(loader.loadAll()).resolves.toBeUndefined();

				expectCustomFilesLoaded(files);
				expect(Object.keys(loader.known.nodes)).toEqual(['foo']);
				expect(loader.loadedNodes).toEqual([{ name: 'foo', version: 1 }]);
				expect(loader.types.nodes.map(({ name }) => name)).toEqual(['foo']);
				expect(loader.nodesByCredential).toEqual({ fooApi: ['foo'] });
				expect(() => loader.getNode('broken')).toThrow();
				expect(logger.warn).toHaveBeenCalledTimes(1);
				expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(brokenPath), {
					error: expect.objectContaining({
						message: expect.stringContaining('has a builderHint on the "operation" discriminator'),
					}),
				});
			},
		);

		describe.each(['node', 'credentials'])('*.%s.js', (suffix) => {
			it.each([
				{
					failure: 'a missing dependency',
					source: "require('n8n-test-missing-dependency');",
					error: expect.objectContaining({ code: 'MODULE_NOT_FOUND' }),
				},
				{
					failure: 'an incorrect class name',
					source: 'module.exports = {};',
					error: expect.objectContaining({
						message: 'Class could not be found. Please check if the class is named correctly.',
					}),
				},
			])('skips a file with $failure and loads healthy files', async ({ source, error }) => {
				const root =
					layout === 'loose' ? customDir : path.join(customDir, 'node_modules/n8n-nodes-foo');
				const files = writeCustomFiles(root);
				const brokenPath = writeFile(root, `AaaBroken.${suffix}.js`, source);
				if (layout === 'package') {
					writeFile(
						root,
						'package.json',
						JSON.stringify({
							name: 'n8n-nodes-foo',
							n8n: {
								nodes: [
									...(suffix === 'node' ? [path.basename(brokenPath)] : []),
									'nodes/Foo.node.js',
								],
								credentials: [
									...(suffix === 'credentials' ? [path.basename(brokenPath)] : []),
									'credentials/FooApi.credentials.js',
								],
							},
						}),
					);
				}

				await expect(loader.loadAll()).resolves.toBeUndefined();

				expectCustomFilesLoaded(files);
				expect(logger.warn).toHaveBeenCalledTimes(1);
				expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(brokenPath), { error });
			});
		});
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

	it('skips ordinary dependencies without a warning', async () => {
		const files = writeCustomFiles(customDir);
		writeDependency(customDir, 'node');

		await loader.loadAll();

		expectCustomFilesLoaded(files);
		expect(logger.warn).not.toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalledWith(
			`Skipping custom node package "${path.join(customDir, 'node_modules/wmf/package.json')}": no n8n field found.`,
		);
	});

	it('skips a broken manifest and loads another custom package', async () => {
		const packageFile = writeFile(customDir, 'node_modules/a-broken/package.json', '{ "n8n":');
		const packageDir = path.join(customDir, 'node_modules/z-working');
		const files = writeCustomFiles(packageDir);
		writeFile(
			packageDir,
			'package.json',
			JSON.stringify({
				name: 'z-working',
				n8n: {
					nodes: ['nodes/Foo.node.js'],
					credentials: ['credentials/FooApi.credentials.js'],
				},
			}),
		);

		await expect(loader.loadAll()).resolves.toBeUndefined();

		expectCustomFilesLoaded(files);
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(packageFile), {
			error: expect.any(Error),
		});
	});

	it.each(['nodePath', 'credentialPath'] as const)(
		'skips a linked package with a missing %s until it is built',
		async (missingFile) => {
			const looseFiles = writeCustomFiles(customDir);
			const projectDir = path.join(tmpRoot, 'project');
			const projectFiles = writeCustomFiles(path.join(projectDir, 'dist'));
			unlinkSync(projectFiles[missingFile]);
			writeFile(
				projectDir,
				'package.json',
				JSON.stringify({
					name: 'n8n-nodes-foo',
					n8n: {
						nodes: ['dist/nodes/Foo.node.js'],
						credentials: ['dist/credentials/FooApi.credentials.js'],
					},
				}),
			);
			const packageLink = path.join(customDir, 'node_modules/n8n-nodes-foo');
			mkdirSync(path.dirname(packageLink), { recursive: true });
			symlinkSync(projectDir, packageLink, 'dir');
			const linkedFiles = {
				nodePath: path.join(packageLink, 'dist/nodes/Foo.node.js'),
				credentialPath: path.join(packageLink, 'dist/credentials/FooApi.credentials.js'),
			};
			const loadNode = vi.spyOn(loader, 'loadNodeFromFile');
			const loadCredential = vi.spyOn(loader, 'loadCredentialFromFile');

			await expect(loader.loadAll()).resolves.toBeUndefined();

			expectCustomFilesLoaded(looseFiles);
			expect(loadNode).not.toHaveBeenCalledWith(linkedFiles.nodePath);
			expect(loadCredential).not.toHaveBeenCalledWith(linkedFiles.credentialPath);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining(path.join(packageLink, 'package.json')),
				{ error: expect.objectContaining({ code: 'ENOENT' }) },
			);

			writeCustomFiles(path.join(projectDir, 'dist'));
			loader.reset();
			vi.clearAllMocks();
			await loader.loadAll();

			expectCustomFilesLoaded(linkedFiles);
			expect(logger.warn).not.toHaveBeenCalled();
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
