jest.mock('fs');
jest.mock('fast-glob', () => async (pattern: string) => {
	return pattern.endsWith('.node.js')
		? ['dist/Node1/Node1.node.js', 'dist/Node2/Node2.node.js']
		: ['dist/Credential1.js'];
});

import { mock } from 'jest-mock-extended';
import type { ICredentialType, INodeType } from 'n8n-workflow';
import { CustomDirectoryLoader } from '@/DirectoryLoader';
import * as classLoader from '@/ClassLoader';

const mockNode1 = mock<INodeType>({
	description: { name: 'node1', icon: 'file:node1.svg', credentials: [{ name: 'credential1' }] },
});
const mockNode2 = mock<INodeType>({
	description: { name: 'node2', icon: 'file:node2.svg', credentials: [] },
});
const mockCredential1 = mock<ICredentialType>({
	name: 'credential1',
	icon: 'file:credential1.svg',
});

//@ts-expect-error overwrite a readonly property
classLoader.loadClassInIsolation = jest.fn((filePath: string, className: string) => {
	if (className === 'Node1') return mockNode1;
	if (className === 'Node2') return mockNode2;
	if (className === 'Credential1') return mockCredential1;
	throw new Error(`${className} is invalid`);
});

describe('CustomDirectoryLoader', () => {
	const directory = '/not/a/real/path';

	it('should load custom nodes and credentials', async () => {
		const loader = new CustomDirectoryLoader(directory);
		expect(loader.isLazyLoaded).toBe(false);
		expect(loader.packageName).toEqual('CUSTOM');

		await loader.loadAll();

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
	});
});
