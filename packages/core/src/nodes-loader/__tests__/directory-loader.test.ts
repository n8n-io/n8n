import { mock } from 'jest-mock-extended';
import type {
	IconFile,
	ICredentialType,
	INodeType,
	INodeTypeDescription,
	IVersionedNodeType,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

jest.mock('node:fs');
jest.mock('node:fs/promises');
const mockFs = mock<typeof fs>();
const mockFsPromises = mock<typeof fsPromises>();
fs.realpathSync = mockFs.realpathSync;
fs.readFileSync = mockFs.readFileSync;
fsPromises.readFile = mockFsPromises.readFile;

jest.mock('fast-glob', () => async (pattern: string) => {
	return pattern.endsWith('.node.js')
		? ['dist/Node1/Node1.node.js', 'dist/Node2/Node2.node.js']
		: ['dist/Credential1.js'];
});

import { NodeTypes } from '@test/helpers';

import { CustomDirectoryLoader } from '../custom-directory-loader';
import { DirectoryLoader } from '../directory-loader';
import { LazyPackageDirectoryLoader } from '../lazy-package-directory-loader';
import * as classLoader from '../load-class-in-isolation';
import { PackageDirectoryLoader } from '../package-directory-loader';

describe('DirectoryLoader', () => {
	const directory = '/not/a/real/path';
	const packageJson = JSON.stringify({
		name: 'n8n-nodes-testing',
		n8n: {
			credentials: ['dist/Credential1.js'],
			nodes: ['dist/Node1/Node1.node.js', 'dist/Node2/Node2.node.js'],
		},
	});

	const createNode = (name: string, credential?: string) =>
		mock<INodeType>({
			description: {
				name,
				version: 1,
				icon: `file:${name}.svg`,
				iconUrl: undefined,
				credentials: credential ? [{ name: credential }] : [],
				properties: [],
			},
		});

	const createCredential = (name: string) =>
		mock<ICredentialType>({
			name,
			icon: `file:${name}.svg`,
			iconUrl: undefined,
			extends: undefined,
			properties: [],
		});

	let mockCredential1: ICredentialType, mockNode1: INodeType, mockNode2: INodeType;

	beforeEach(() => {
		mockFs.realpathSync.mockImplementation((path) => String(path));
		mockCredential1 = createCredential('credential1');
		mockNode1 = createNode('node1', 'credential1');
		mockNode2 = createNode('node2');
		jest.clearAllMocks();
	});

	//@ts-expect-error overwrite a readonly property
	classLoader.loadClassInIsolation = jest.fn((_: string, className: string) => {
		if (className === 'Node1') return mockNode1;
		if (className === 'Node2') return mockNode2;
		if (className === 'Credential1') return mockCredential1;
		throw new Error(`${className} is invalid`);
	});

	describe('CustomDirectoryLoader', () => {
		it('should load custom nodes and credentials', async () => {
			const loader = new CustomDirectoryLoader(directory);
			expect(loader.packageName).toEqual('CUSTOM');

			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(false);
			expect(mockFsPromises.readFile).not.toHaveBeenCalled();
			expect(classLoader.loadClassInIsolation).toHaveBeenCalledTimes(3);

			expect(loader.nodesByCredential).toEqual({ credential1: ['node1'] });
			expect(loader.credentialTypes).toEqual({
				credential1: { sourcePath: 'dist/Credential1.js', type: mockCredential1 },
			});
			expect(loader.nodeTypes).toEqual({
				node1: { sourcePath: 'dist/Node1/Node1.node.js', type: mockNode1 },
				node2: { sourcePath: 'dist/Node2/Node2.node.js', type: mockNode2 },
			});
			expect(mockCredential1.iconUrl).toBe('icons/CUSTOM/dist/credential1.svg');
			expect(mockNode1.description.iconUrl).toBe('icons/CUSTOM/dist/Node1/node1.svg');
			expect(mockNode2.description.iconUrl).toBe('icons/CUSTOM/dist/Node2/node2.svg');

			expect(mockFs.readFileSync).not.toHaveBeenCalled();
		});
	});

	describe('PackageDirectoryLoader', () => {
		it('should load nodes and credentials from an installed package', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);

			const loader = new PackageDirectoryLoader(directory);
			expect(loader.packageName).toEqual('n8n-nodes-testing');

			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(false);
			expect(mockFsPromises.readFile).not.toHaveBeenCalled();
			expect(classLoader.loadClassInIsolation).toHaveBeenCalledTimes(3);

			expect(loader.nodesByCredential).toEqual({ credential1: ['node1'] });
			expect(loader.credentialTypes).toEqual({
				credential1: { sourcePath: 'dist/Credential1.js', type: mockCredential1 },
			});
			expect(loader.nodeTypes).toEqual({
				node1: { sourcePath: 'dist/Node1/Node1.node.js', type: mockNode1 },
				node2: { sourcePath: 'dist/Node2/Node2.node.js', type: mockNode2 },
			});
			expect(mockCredential1.iconUrl).toBe('icons/n8n-nodes-testing/dist/credential1.svg');
			expect(mockNode1.description.iconUrl).toBe('icons/n8n-nodes-testing/dist/Node1/node1.svg');
			expect(mockNode2.description.iconUrl).toBe('icons/n8n-nodes-testing/dist/Node2/node2.svg');
		});

		it('should throw error if node has icon not contained within the package directory', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);
			mockNode2.description.icon = {
				light: 'file:../../../../../../evil' as IconFile,
				dark: 'file:dark.svg',
			};

			const loader = new PackageDirectoryLoader(directory);

			await expect(loader.loadAll()).rejects.toThrow(
				'Icon path "../../../../evil" is not contained within',
			);
		});

		it('should throw error when package.json is missing', async () => {
			mockFs.readFileSync.mockImplementationOnce(() => {
				throw new Error('ENOENT');
			});

			expect(() => new PackageDirectoryLoader(directory)).toThrow();
		});

		it('should throw error when package.json is invalid', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue('invalid json');

			expect(() => new PackageDirectoryLoader(directory)).toThrow('Failed to parse JSON');
		});

		it('should do nothing if package.json has no n8n field', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(
				JSON.stringify({
					name: 'n8n-nodes-testing',
				}),
			);

			const loader = new PackageDirectoryLoader(directory);
			await loader.loadAll();

			expect(loader.nodeTypes).toEqual({});
			expect(loader.credentialTypes).toEqual({});
			expect(classLoader.loadClassInIsolation).not.toHaveBeenCalled();
		});

		it('should hide httpRequestNode property when credential has supported nodes', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);
			mockCredential1.httpRequestNode = mock<ICredentialType['httpRequestNode']>({ hidden: false });

			const loader = new PackageDirectoryLoader(directory);
			await loader.loadAll();

			expect(mockCredential1.httpRequestNode?.hidden).toBe(true);
		});

		it('should not modify httpRequestNode when credential has no supported nodes', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);
			mockCredential1.httpRequestNode = mock<ICredentialType['httpRequestNode']>({ hidden: false });
			mockNode1.description.credentials = [];

			const loader = new PackageDirectoryLoader(directory);
			await loader.loadAll();

			expect(mockCredential1.httpRequestNode?.hidden).toBe(false);
		});

		it('should inherit iconUrl from supported node when credential has no icon', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);
			mockCredential1.icon = undefined;

			const loader = new PackageDirectoryLoader(directory);
			await loader.loadAll();

			expect(mockCredential1.supportedNodes).toEqual(['node1']);
			expect(mockCredential1.iconUrl).toBe(mockNode1.description.iconUrl);
		});

		it('should not include nodes that are not in "includeNodes" even if they are from a different package', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);

			const loader = new PackageDirectoryLoader(directory, [], ['n8n-nodes-other-package.node']);
			await loader.loadAll();

			expect(loader.nodeTypes).toEqual({});
		});
	});

	describe('LazyPackageDirectoryLoader', () => {
		it('should skip loading nodes and credentials from a lazy-loadable package', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);
			mockFsPromises.readFile.mockResolvedValue('[]');

			const loader = new LazyPackageDirectoryLoader(directory);
			expect(loader.packageName).toEqual('n8n-nodes-testing');

			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(true);
			expect(mockFsPromises.readFile).toHaveBeenCalledTimes(4);
			expect(classLoader.loadClassInIsolation).not.toHaveBeenCalled();
		});

		it('should fall back to non-lazy loading if any json file fails to parse', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);
			mockFsPromises.readFile.mockRejectedValue(new Error('Failed to read file'));

			const loader = new LazyPackageDirectoryLoader(directory);
			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(false);
			expect(mockFsPromises.readFile).toHaveBeenCalled();
			expect(classLoader.loadClassInIsolation).toHaveBeenCalledTimes(3);
		});

		it('should only load included nodes when includeNodes is set', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);

			mockFsPromises.readFile.mockImplementation(async (path) => {
				if (typeof path !== 'string') throw new Error('Invalid path');

				if (path.endsWith('known/nodes.json')) {
					return JSON.stringify({
						node1: { className: 'Node1', sourcePath: 'dist/Node1/Node1.node.js' },
						node2: { className: 'Node2', sourcePath: 'dist/Node2/Node2.node.js' },
					});
				}
				if (path.endsWith('known/credentials.json')) {
					return JSON.stringify({});
				}
				if (path.endsWith('types/nodes.json')) {
					return JSON.stringify([{ name: 'node1' }, { name: 'node2' }]);
				}
				if (path.endsWith('types/credentials.json')) {
					return JSON.stringify([]);
				}
				throw new Error('File not found');
			});

			const loader = new LazyPackageDirectoryLoader(directory, [], ['n8n-nodes-testing.node1']);
			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(true);
			expect(loader.known.nodes).toEqual({
				node1: { className: 'Node1', sourcePath: 'dist/Node1/Node1.node.js' },
			});
			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.nodes[0].name).toBe('node1');
			expect(classLoader.loadClassInIsolation).not.toHaveBeenCalled();
		});

		it('should load no nodes when includeNodes does not match any nodes', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);

			mockFsPromises.readFile.mockImplementation(async (path) => {
				if (typeof path !== 'string') throw new Error('Invalid path');

				if (path.endsWith('known/nodes.json')) {
					return JSON.stringify({
						node1: { className: 'Node1', sourcePath: 'dist/Node1/Node1.node.js' },
						node2: { className: 'Node2', sourcePath: 'dist/Node2/Node2.node.js' },
					});
				}
				if (path.endsWith('known/credentials.json')) {
					return JSON.stringify({});
				}
				if (path.endsWith('types/nodes.json')) {
					return JSON.stringify([{ name: 'node1' }, { name: 'node2' }]);
				}
				if (path.endsWith('types/credentials.json')) {
					return JSON.stringify([]);
				}
				throw new Error('File not found');
			});

			const loader = new LazyPackageDirectoryLoader(
				directory,
				[],
				['n8n-nodes-testing.nonexistent'],
			);
			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(true);
			expect(loader.known.nodes).toEqual({});
			expect(loader.types.nodes).toHaveLength(0);
			expect(classLoader.loadClassInIsolation).not.toHaveBeenCalled();
		});

		it('should not include nodes that are not in "includeNodes" even if they are from a different package', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);

			mockFsPromises.readFile.mockImplementation(async (path) => {
				if (typeof path !== 'string') throw new Error('Invalid path');

				if (path.endsWith('known/nodes.json')) {
					return JSON.stringify({
						node1: { className: 'Node1', sourcePath: 'dist/Node1/Node1.node.js' },
						node2: { className: 'Node2', sourcePath: 'dist/Node2/Node2.node.js' },
					});
				}
				if (path.endsWith('known/credentials.json')) {
					return JSON.stringify({});
				}
				if (path.endsWith('types/nodes.json')) {
					return JSON.stringify([{ name: 'node1' }, { name: 'node2' }]);
				}
				if (path.endsWith('types/credentials.json')) {
					return JSON.stringify([]);
				}
				throw new Error('File not found');
			});

			const loader = new LazyPackageDirectoryLoader(
				directory,
				[],
				['n8n-nodes-other-package.node'],
			);
			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(true);
			expect(loader.known.nodes).toEqual({});
			expect(loader.types.nodes).toHaveLength(0);
			expect(classLoader.loadClassInIsolation).not.toHaveBeenCalled();
		});

		it('should exclude specified nodes when excludeNodes is set', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);

			mockFsPromises.readFile.mockImplementation(async (path) => {
				if (typeof path !== 'string') throw new Error('Invalid path');

				if (path.endsWith('known/nodes.json')) {
					return JSON.stringify({
						node1: { className: 'Node1', sourcePath: 'dist/Node1/Node1.node.js' },
						node2: { className: 'Node2', sourcePath: 'dist/Node2/Node2.node.js' },
					});
				}
				if (path.endsWith('known/credentials.json')) {
					return JSON.stringify({});
				}
				if (path.endsWith('types/nodes.json')) {
					return JSON.stringify([{ name: 'node1' }, { name: 'node2' }]);
				}
				if (path.endsWith('types/credentials.json')) {
					return JSON.stringify([]);
				}
				throw new Error('File not found');
			});

			const loader = new LazyPackageDirectoryLoader(directory, ['n8n-nodes-testing.node1']);
			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(true);
			expect(loader.known.nodes).toEqual({
				node2: { className: 'Node2', sourcePath: 'dist/Node2/Node2.node.js' },
			});
			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.nodes[0].name).toBe('node2');
			expect(classLoader.loadClassInIsolation).not.toHaveBeenCalled();
		});
	});

	describe('constructor', () => {
		it('should resolve symlinks to real paths when directory is a symlink', () => {
			const symlinkPath = '/symlink/path';
			const realPath = '/real/path';
			mockFs.realpathSync.mockReturnValueOnce(realPath);

			const loader = new CustomDirectoryLoader(symlinkPath);

			expect(mockFs.realpathSync).toHaveBeenCalledWith(symlinkPath);
			expect(loader.directory).toBe(realPath);
		});
	});

	describe('reset()', () => {
		it('should reset all properties to their initial state', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(packageJson);

			const loader = new PackageDirectoryLoader(directory);
			await loader.loadAll();

			// Verify loader has loaded data
			expect(loader.nodeTypes).not.toEqual({});
			expect(loader.credentialTypes).not.toEqual({});
			expect(loader.types.nodes.length).toBeGreaterThan(0);
			expect(loader.types.credentials.length).toBeGreaterThan(0);
			expect(loader.loadedNodes.length).toBeGreaterThan(0);
			expect(Object.keys(loader.known.nodes).length).toBeGreaterThan(0);
			expect(Object.keys(loader.known.credentials).length).toBeGreaterThan(0);

			// Reset the loader
			loader.reset();

			// Verify all properties are reset
			expect(loader.nodeTypes).toEqual({});
			expect(loader.credentialTypes).toEqual({});
			expect(loader.types.nodes).toEqual([]);
			expect(loader.types.credentials).toEqual([]);
			expect(loader.loadedNodes).toEqual([]);
			expect(loader.known.nodes).toEqual({});
			expect(loader.known.credentials).toEqual({});
		});
	});

	describe('getVersionedNodeTypeAll', () => {
		it('should return array with single node for non-versioned node', () => {
			const loader = new CustomDirectoryLoader(directory);
			const node = createNode('node1');

			const result = loader.getVersionedNodeTypeAll(node);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(node);
		});

		it('should return all versions of a versioned node', () => {
			const loader = new CustomDirectoryLoader(directory);
			const nodeV1 = createNode('test');
			const nodeV2 = createNode('test');
			nodeV1.description.version = 1;
			nodeV2.description.version = 2;

			const versionedNode = mock<IVersionedNodeType>({
				description: { name: 'test', codex: {} },
				currentVersion: 2,
				nodeVersions: {
					1: nodeV1,
					2: nodeV2,
				},
			});

			const result = loader.getVersionedNodeTypeAll(versionedNode);

			expect(result).toHaveLength(2);
			expect(result).toEqual([nodeV2, nodeV1]);
			expect(result[0].description.name).toBe('test');
			expect(result[1].description.name).toBe('test');
		});
	});

	describe('getCredentialsForNode', () => {
		it('should return empty array if node has no credentials', () => {
			const loader = new CustomDirectoryLoader(directory);
			const node = createNode('node1');

			const result = loader.getCredentialsForNode(node);

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toEqual(0);
		});

		it('should return credentials for non-versioned node', () => {
			const loader = new CustomDirectoryLoader(directory);
			const node = createNode('node1', 'testCred');

			const result = loader.getCredentialsForNode(node);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('testCred');
		});

		it('should return unique credentials from all versions of a versioned node', () => {
			const loader = new CustomDirectoryLoader(directory);
			const nodeV1 = createNode('test', 'cred1');
			const nodeV2 = createNode('test', 'cred2');

			const versionedNode = mock<IVersionedNodeType>({
				description: { name: 'test' },
				currentVersion: 2,
				nodeVersions: {
					1: nodeV1,
					2: nodeV2,
				},
			});

			const result = loader.getCredentialsForNode(versionedNode);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('cred1');
			expect(result[1].name).toBe('cred2');
		});

		it('should remove duplicate credentials from different versions', () => {
			const loader = new CustomDirectoryLoader(directory);
			const nodeV1 = createNode('test', 'cred1');
			const nodeV2 = createNode('test', 'cred1'); // Same credential

			const versionedNode = mock<IVersionedNodeType>({
				description: { name: 'test' },
				currentVersion: 2,
				nodeVersions: {
					1: nodeV1,
					2: nodeV2,
				},
			});

			const result = loader.getCredentialsForNode(versionedNode);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('cred1');
		});
	});

	describe('loadCredentialFromFile', () => {
		it('should load credential and store it correctly', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Credential1.js';

			loader.loadCredentialFromFile(filePath);

			expect(loader.credentialTypes).toEqual({
				credential1: {
					type: mockCredential1,
					sourcePath: filePath,
				},
			});

			expect(loader.known.credentials).toEqual({
				credential1: {
					className: mockCredential1.constructor.name,
					sourcePath: filePath,
					extends: undefined,
					supportedNodes: undefined,
				},
			});

			expect(loader.types.credentials).toEqual([mockCredential1]);
		});

		it('should update credential icon paths', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Credential1.js';

			const credWithIcon = createCredential('credentialWithIcon');
			credWithIcon.icon = {
				light: 'file:light.svg',
				dark: 'file:dark.svg',
			};

			jest.spyOn(classLoader, 'loadClassInIsolation').mockReturnValueOnce(credWithIcon);

			loader.loadCredentialFromFile(filePath);

			expect(credWithIcon.iconUrl).toEqual({
				light: 'icons/CUSTOM/dist/light.svg',
				dark: 'icons/CUSTOM/dist/dark.svg',
			});
			expect(credWithIcon.icon).toBeUndefined();
		});

		it('should add toJSON method to credential type', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Credential1.js';

			const credWithAuth = createCredential('credWithAuth');
			credWithAuth.authenticate = jest.fn();

			jest.spyOn(classLoader, 'loadClassInIsolation').mockReturnValueOnce(credWithAuth);

			loader.loadCredentialFromFile(filePath);

			const serialized = deepCopy(credWithAuth);
			expect(serialized.authenticate).toEqual({});
		});

		it('should store credential extends and supported nodes info', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Credential1.js';

			const extendingCred = createCredential('extendingCred');
			extendingCred.extends = ['baseCredential'];

			jest.spyOn(classLoader, 'loadClassInIsolation').mockReturnValueOnce(extendingCred);

			// Set up nodesByCredential before loading
			loader.nodesByCredential.extendingCred = ['node1', 'node2'];

			loader.loadCredentialFromFile(filePath);

			expect(loader.known.credentials.extendingCred).toEqual({
				className: extendingCred.constructor.name,
				sourcePath: filePath,
				extends: ['baseCredential'],
				supportedNodes: ['node1', 'node2'],
			});
		});

		it('should throw error if credential class cannot be loaded', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/InvalidCred.js';

			jest.spyOn(classLoader, 'loadClassInIsolation').mockImplementationOnce(() => {
				throw new TypeError('Class not found');
			});

			expect(() => loader.loadCredentialFromFile(filePath)).toThrow('Class could not be found');
		});

		it('should not push credential to types array when lazy loaded', () => {
			const loader = new CustomDirectoryLoader(directory);
			loader.isLazyLoaded = true;

			loader.loadCredentialFromFile('dist/Credential1.js');

			expect(loader.credentialTypes).toEqual({
				credential1: { sourcePath: 'dist/Credential1.js', type: mockCredential1 },
			});
			expect(loader.types.credentials).toEqual([]);
		});
	});

	describe('getCredential', () => {
		it('should return existing loaded credential type', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Credential1.js';

			loader.loadCredentialFromFile(filePath);

			const result = loader.getCredential('credential1');
			expect(result).toEqual({
				type: mockCredential1,
				sourcePath: filePath,
			});
		});

		it('should load credential from known credentials if not already loaded', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Credential1.js';

			// Setup known credentials without loading
			loader.known.credentials.credential1 = {
				className: 'Credential1',
				sourcePath: filePath,
			};

			const result = loader.getCredential('credential1');

			expect(result).toEqual({
				type: mockCredential1,
				sourcePath: filePath,
			});
			expect(classLoader.loadClassInIsolation).toHaveBeenCalledWith(
				expect.stringContaining(filePath),
				'Credential1',
			);
		});

		it('should throw UnrecognizedCredentialTypeError if credential type is not found', () => {
			const loader = new CustomDirectoryLoader(directory);

			expect(() => loader.getCredential('nonexistent')).toThrow(
				'Unrecognized credential type: nonexistent',
			);
		});
	});

	describe('loadNodeFromFile', () => {
		it('should load node and store it correctly', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Node1/Node1.node.js';

			loader.loadNodeFromFile(filePath);

			expect(loader.nodeTypes).toEqual({
				node1: {
					type: mockNode1,
					sourcePath: filePath,
				},
			});

			expect(loader.known.nodes).toEqual({
				node1: {
					className: mockNode1.constructor.name,
					sourcePath: filePath,
				},
			});
			expect(loader.types.nodes).toEqual([mockNode1.description]);
			expect(loader.loadedNodes).toEqual([{ name: 'node1', version: 1 }]);
		});

		it('should load node with package version if provided', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Node1/Node1.node.js';

			loader.loadNodeFromFile(filePath, '1.0.0');

			expect(
				(loader.nodeTypes.node1.type.description as INodeTypeDescription)
					.communityNodePackageVersion,
			).toBe('1.0.0');
		});

		it('should update node icon paths', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Node1/Node1.node.js';

			const nodeWithIcon = createNode('nodeWithIcon');
			nodeWithIcon.description.icon = {
				light: 'file:light.svg',
				dark: 'file:dark.svg',
			};

			jest.spyOn(classLoader, 'loadClassInIsolation').mockReturnValueOnce(nodeWithIcon);

			loader.loadNodeFromFile(filePath);

			expect(nodeWithIcon.description.iconUrl).toEqual({
				light: 'icons/CUSTOM/dist/Node1/light.svg',
				dark: 'icons/CUSTOM/dist/Node1/dark.svg',
			});
			expect(nodeWithIcon.description.icon).toBeUndefined();
		});

		it('should error if icon path is not contained within the package directory', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Node1/Node1.node.js';

			const nodeWithIcon = createNode('nodeWithIcon');
			nodeWithIcon.description.icon = {
				light: 'file:../../../evil' as IconFile,
				dark: 'file:dark.svg',
			};

			jest.spyOn(classLoader, 'loadClassInIsolation').mockReturnValueOnce(nodeWithIcon);

			expect(() => loader.loadNodeFromFile(filePath)).toThrow(
				'Icon path "../evil" is not contained within',
			);
		});

		it('should skip node if not in includeNodes', () => {
			const loader = new CustomDirectoryLoader(directory, [], ['CUSTOM.other']);
			const filePath = 'dist/Node1/Node1.node.js';

			loader.loadNodeFromFile(filePath);

			expect(loader.nodeTypes).toEqual({});
			expect(loader.known.nodes).toEqual({});
			expect(loader.types.nodes).toEqual([]);
			expect(loader.loadedNodes).toEqual([]);
		});

		it('should handle versioned nodes correctly', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Node1/Node1.node.js';

			const nodeV1 = createNode('test');
			const nodeV2 = createNode('test');
			nodeV1.description.version = 1;
			nodeV2.description.version = 2;

			const versionedNode = mock<IVersionedNodeType>({
				description: { name: 'test', codex: {}, iconUrl: undefined, icon: undefined },
				currentVersion: 2,
				nodeVersions: {
					1: nodeV1,
					2: nodeV2,
				},
			});

			jest.spyOn(classLoader, 'loadClassInIsolation').mockReturnValueOnce(versionedNode);

			loader.loadNodeFromFile(filePath);

			expect(loader.loadedNodes).toEqual([{ name: 'test', version: 2 }]);

			const nodes = loader.types.nodes as INodeTypeDescription[];
			expect(nodes).toHaveLength(2);
			expect(nodes[0]?.version).toBe(2);
			expect(nodes[1]?.version).toBe(1);
		});

		it('should store credential associations correctly', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Node1/Node1.node.js';

			const nodeWithCreds = createNode('testNode', 'testCred');
			jest.spyOn(classLoader, 'loadClassInIsolation').mockReturnValueOnce(nodeWithCreds);

			loader.loadNodeFromFile(filePath);

			expect(loader.nodesByCredential).toEqual({
				testCred: ['testNode'],
			});
		});

		it('should throw error if node class cannot be loaded', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/InvalidNode/InvalidNode.node.js';

			jest.spyOn(classLoader, 'loadClassInIsolation').mockImplementationOnce(() => {
				throw new TypeError('Class not found');
			});

			expect(() => loader.loadNodeFromFile(filePath)).toThrow('Class could not be found');
		});
	});

	describe('getNode', () => {
		it('should return existing loaded node type', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Node1/Node1.node.js';

			loader.loadNodeFromFile(filePath);

			const result = loader.getNode('node1');
			expect(result).toEqual({
				type: mockNode1,
				sourcePath: filePath,
			});
		});

		it('should load node from known nodes if not already loaded', () => {
			const loader = new CustomDirectoryLoader(directory);
			const filePath = 'dist/Node1/Node1.node.js';

			// Setup known nodes without loading
			loader.known.nodes.node1 = {
				className: 'Node1',
				sourcePath: filePath,
			};

			const result = loader.getNode('node1');

			expect(result).toEqual({
				type: mockNode1,
				sourcePath: filePath,
			});
			expect(classLoader.loadClassInIsolation).toHaveBeenCalledWith(
				expect.stringContaining(filePath),
				'Node1',
			);
		});

		it('should throw UnrecognizedNodeTypeError if node type is not found', () => {
			const loader = new CustomDirectoryLoader(directory);

			expect(() => loader.getNode('nonexistent')).toThrow(
				'Unrecognized node type: CUSTOM.nonexistent',
			);
		});
	});

	describe('applyDeclarativeNodeOptionParameters', () => {
		test('sets up the options parameters', () => {
			const nodeTypes = NodeTypes();
			const nodeType = nodeTypes.getByNameAndVersion('test.setMulti');

			DirectoryLoader.applyDeclarativeNodeOptionParameters(nodeType);

			const options = nodeType.description.properties.find(
				(property) => property.name === 'requestOptions',
			);

			expect(options?.options).toBeDefined;

			const optionNames = options!.options!.map((option) => option.name);

			expect(optionNames).toEqual(['batching', 'allowUnauthorizedCerts', 'proxy', 'timeout']);
		});

		test.each([
			[
				'node with execute method',
				{
					execute: jest.fn(),
					description: {
						properties: [],
					},
				},
			],
			[
				'node with trigger method',
				{
					trigger: jest.fn(),
					description: {
						properties: [],
					},
				},
			],
			[
				'node with webhook method',
				{
					webhook: jest.fn(),
					description: {
						properties: [],
					},
				},
			],
			[
				'a polling node-type',
				{
					description: {
						polling: true,
						properties: [],
					},
				},
			],
			[
				'a node-type with a non-main output',
				{
					description: {
						outputs: ['main', 'ai_agent'],
						properties: [],
					},
				},
			],
		])('should not modify properties on node with %s method', (_, nodeTypeName) => {
			const nodeType = nodeTypeName as unknown as INodeType;
			DirectoryLoader.applyDeclarativeNodeOptionParameters(nodeType);
			expect(nodeType.description.properties).toEqual([]);
		});
	});
});
