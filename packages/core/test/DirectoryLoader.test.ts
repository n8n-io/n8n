import { mock } from 'jest-mock-extended';
import type { ICredentialType, INodeType } from 'n8n-workflow';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

jest.mock('node:fs');
jest.mock('node:fs/promises');
const mockFs = mock<typeof fs>();
const mockFsPromises = mock<typeof fsPromises>();
fs.readFileSync = mockFs.readFileSync;
fsPromises.readFile = mockFsPromises.readFile;

jest.mock('fast-glob', () => async (pattern: string) => {
	return pattern.endsWith('.node.js')
		? ['dist/Node1/Node1.node.js', 'dist/Node2/Node2.node.js']
		: ['dist/Credential1.js'];
});

import * as classLoader from '@/ClassLoader';
import {
	CustomDirectoryLoader,
	PackageDirectoryLoader,
	LazyPackageDirectoryLoader,
} from '@/DirectoryLoader';

describe('DirectoryLoader', () => {
	const directory = '/not/a/real/path';

	const createNode = (name: string, credential?: string) =>
		mock<INodeType>({
			description: {
				name,
				icon: `file:${name}.svg`,
				credentials: credential ? [{ name: credential }] : [],
			},
		});

	const createCredential = (name: string) =>
		mock<ICredentialType>({ name, icon: `file:${name}.svg` });

	let mockCredential1: ICredentialType, mockNode1: INodeType, mockNode2: INodeType;

	beforeEach(() => {
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
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(
				JSON.stringify({
					name: 'n8n-nodes-testing',
					n8n: {
						credentials: ['dist/Credential1.js'],
						nodes: ['dist/Node1/Node1.node.js', 'dist/Node2/Node2.node.js'],
					},
				}),
			);

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
	});

	describe('LazyPackageDirectoryLoader', () => {
		it('should skip loading nodes and credentials from a lazy-loadable package', async () => {
			mockFs.readFileSync.calledWith(`${directory}/package.json`).mockReturnValue(
				JSON.stringify({
					name: 'n8n-nodes-testing',
					n8n: {
						credentials: ['dist/Credential1.js'],
						nodes: ['dist/Node1/Node1.node.js', 'dist/Node2/Node2.node.js'],
					},
				}),
			);
			mockFsPromises.readFile.mockResolvedValue('[]');

			const loader = new LazyPackageDirectoryLoader(directory);
			expect(loader.packageName).toEqual('n8n-nodes-testing');

			await loader.loadAll();

			expect(loader.isLazyLoaded).toBe(true);
			expect(mockFsPromises.readFile).toHaveBeenCalledTimes(4);
			expect(classLoader.loadClassInIsolation).not.toHaveBeenCalled();
		});
	});
});
