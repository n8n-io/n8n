import fs from 'fs/promises';
import { mock } from 'jest-mock-extended';
import type { DirectoryLoader } from 'n8n-core';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import watcher from '@parcel/watcher';

import { LoadNodesAndCredentials } from '../load-nodes-and-credentials';
import { Service } from '@n8n/di';

jest.mock('lodash/debounce', () => (fn: () => void) => fn);

jest.mock('@parcel/watcher', () => ({
	subscribe: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs/promises');

jest.mock('@/push', () => {
	@Service()
	class Push {
		broadcast = jest.fn();
	}

	return { Push };
});

describe('LoadNodesAndCredentials', () => {
	describe('resolveIcon', () => {
		let instance: LoadNodesAndCredentials;

		beforeEach(() => {
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock());
			instance.loaders.package1 = mock<DirectoryLoader>({
				directory: '/icons/package1',
			});
		});

		it('should return undefined if the loader for the package is not found', () => {
			const result = instance.resolveIcon('unknownPackage', '/icons/unknownPackage/icon.png');
			expect(result).toBeUndefined();
		});

		it('should return undefined if the resolved file path is outside the loader directory', () => {
			const result = instance.resolveIcon('package1', '/some/other/path/icon.png');
			expect(result).toBeUndefined();
		});

		it('should return the file path if the file is within the loader directory', () => {
			const result = instance.resolveIcon('package1', '/icons/package1/icon.png');
			expect(result).toBe('/icons/package1/icon.png');
		});

		it('should return undefined if the URL is outside the package directory', () => {
			const result = instance.resolveIcon('package1', '/icons/package1/../../../etc/passwd');
			expect(result).toBeUndefined();
		});
	});

	describe('convertNodeToAiTool', () => {
		const instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock());

		let fullNodeWrapper: { description: INodeTypeDescription };

		beforeEach(() => {
			fullNodeWrapper = {
				description: {
					displayName: 'Test Node',
					name: 'testNode',
					group: ['input'],
					description: 'A test node',
					version: 1,
					defaults: {},
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					properties: [],
				},
			};
		});

		it('should modify the name and displayName correctly', () => {
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.name).toBe('testNodeTool');
			expect(result.description.displayName).toBe('Test Node Tool');
		});

		it('should update inputs and outputs', () => {
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.inputs).toEqual([]);
			expect(result.description.outputs).toEqual([NodeConnectionTypes.AiTool]);
		});

		it('should remove the usableAsTool property', () => {
			fullNodeWrapper.description.usableAsTool = true;
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.usableAsTool).toBeUndefined();
		});

		it("should add toolDescription property if it doesn't exist", () => {
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			const toolDescriptionProp = result.description.properties.find(
				(prop) => prop.name === 'toolDescription',
			);
			expect(toolDescriptionProp).toBeDefined();
			expect(toolDescriptionProp?.type).toBe('string');
			expect(toolDescriptionProp?.default).toBe(fullNodeWrapper.description.description);
		});

		it('should add toolDescription property after callout property', () => {
			fullNodeWrapper.description.properties = [
				{
					displayName: 'Callout 1',
					name: 'callout1',
					type: 'callout',
					default: '',
				},
				{
					displayName: 'Callout 2',
					name: 'callout2',
					type: 'callout',
					default: '',
				},
				{
					displayName: 'Another',
					name: 'another',
					type: 'boolean',
					default: true,
				},
			] satisfies INodeProperties[];

			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			const toolDescriptionPropIndex = result.description.properties.findIndex(
				(prop) => prop.name === 'toolDescription',
			);
			expect(toolDescriptionPropIndex).toBe(2);
			expect(result.description.properties).toHaveLength(4);
		});

		it('should set codex categories correctly', () => {
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.codex).toEqual({
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Other Tools'],
				},
				resources: {},
			});
		});

		it('should preserve existing properties', () => {
			const existingProp: INodeProperties = {
				displayName: 'Existing Prop',
				name: 'existingProp',
				type: 'string',
				default: 'test',
			};
			fullNodeWrapper.description.properties = [existingProp];
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.properties).toHaveLength(2); // Existing prop + toolDescription
			expect(result.description.properties).toContainEqual(existingProp);
		});

		it('should handle nodes with resource property', () => {
			const resourceProp: INodeProperties = {
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [{ name: 'User', value: 'user' }],
				default: 'user',
			};
			fullNodeWrapper.description.properties = [resourceProp];
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.properties[0].name).toBe('descriptionType');
			expect(result.description.properties[1].name).toBe('toolDescription');
			expect(result.description.properties[2]).toEqual(resourceProp);
		});

		it('should handle nodes with operation property', () => {
			const operationProp: INodeProperties = {
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [{ name: 'Create', value: 'create' }],
				default: 'create',
			};
			fullNodeWrapper.description.properties = [operationProp];
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.properties[0].name).toBe('descriptionType');
			expect(result.description.properties[1].name).toBe('toolDescription');
			expect(result.description.properties[2]).toEqual(operationProp);
		});

		it('should handle nodes with both resource and operation properties', () => {
			const resourceProp: INodeProperties = {
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [{ name: 'User', value: 'user' }],
				default: 'user',
			};
			const operationProp: INodeProperties = {
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [{ name: 'Create', value: 'create' }],
				default: 'create',
			};
			fullNodeWrapper.description.properties = [resourceProp, operationProp];
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.properties[0].name).toBe('descriptionType');
			expect(result.description.properties[1].name).toBe('toolDescription');
			expect(result.description.properties[2]).toEqual(resourceProp);
			expect(result.description.properties[3]).toEqual(operationProp);
		});

		it('should handle nodes with empty properties', () => {
			fullNodeWrapper.description.properties = [];
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.properties).toHaveLength(1);
			expect(result.description.properties[0].name).toBe('toolDescription');
		});

		it('should handle nodes with existing codex property', () => {
			fullNodeWrapper.description.codex = {
				categories: ['Existing'],
				subcategories: {
					Existing: ['Category'],
				},
				resources: {
					primaryDocumentation: [{ url: 'https://example.com' }],
				},
			};
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.codex).toEqual({
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Other Tools'],
				},
				resources: {
					primaryDocumentation: [{ url: 'https://example.com' }],
				},
			});
		});

		it('should handle nodes with existing codex with tool subcategory overwrite', () => {
			fullNodeWrapper.description.codex = {
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Recommended'],
				},
				resources: {
					primaryDocumentation: [{ url: 'https://example.com' }],
				},
			};
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.codex).toEqual({
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Recommended'],
				},
				resources: {
					primaryDocumentation: [{ url: 'https://example.com' }],
				},
			});
		});

		it('should handle nodes with very long names', () => {
			fullNodeWrapper.description.name = 'veryLongNodeNameThatExceedsNormalLimits'.repeat(10);
			fullNodeWrapper.description.displayName =
				'Very Long Node Name That Exceeds Normal Limits'.repeat(10);
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.name.endsWith('Tool')).toBe(true);
			expect(result.description.displayName.endsWith('Tool')).toBe(true);
		});

		it('should handle nodes with special characters in name and displayName', () => {
			fullNodeWrapper.description.name = 'special@#$%Node';
			fullNodeWrapper.description.displayName = 'Special @#$% Node';
			const result = instance.convertNodeToAiTool(fullNodeWrapper);
			expect(result.description.name).toBe('special@#$%NodeTool');
			expect(result.description.displayName).toBe('Special @#$% Node Tool');
		});
	});

	describe('resolveSchema', () => {
		let instance: LoadNodesAndCredentials;

		beforeEach(() => {
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock());
			instance.knownNodes['n8n-nodes-base.test'] = {
				className: 'Test',
				sourcePath: '/nodes-base/dist/nodes/Test/Test.node.js',
			};
		});

		it('should return undefined if the node is not known', () => {
			const result = instance.resolveSchema({
				node: 'n8n-nodes-base.doesNotExist',
				version: '1.0.0',
				resource: 'account',
				operation: 'get',
			});
			expect(result).toBeUndefined();
		});

		it('should return the correct path if the node is known', () => {
			const result = instance.resolveSchema({
				node: 'n8n-nodes-base.test',
				version: '1.0.0',
				resource: 'account',
				operation: 'get',
			});
			expect(result).toEqual('/nodes-base/dist/nodes/Test/__schema__/v1.0.0/account/get.json');
		});

		it('should return the correct path if there is no resource or operation', () => {
			const result = instance.resolveSchema({
				node: 'n8n-nodes-base.test',
				version: '1.0.0',
			});
			expect(result).toEqual('/nodes-base/dist/nodes/Test/__schema__/v1.0.0.json');
		});
	});

	describe('createAiTools', () => {
		let instance: LoadNodesAndCredentials;

		beforeEach(() => {
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock());
			instance.types.nodes = [
				{
					name: 'testNode',
					displayName: 'Test Node',
					group: ['input'],
					description: 'A test node',
					usableAsTool: true,
					properties: [], // need properties to test this
				},
			] as unknown as INodeTypeDescription[];
			// private field

			instance['known'].nodes.testNode = { className: 'TestNode', sourcePath: '/path/to/testNode' };

			instance['known'].credentials['testCredential'] = {
				className: 'TestCredential',
				sourcePath: '/path/to/testCredential',
				supportedNodes: ['testNode'],
			};
		});

		it('should create AI tools for nodes marked as usableAsTool', () => {
			instance.createAiTools();

			expect(instance.types.nodes).toHaveLength(2); // Original node + AI tool
			expect(instance.types.nodes[1]).toEqual({
				codex: {
					categories: ['AI'],
					resources: {},
					subcategories: { AI: ['Tools'], Tools: ['Other Tools'] },
				},
				description: 'A test node',
				name: 'testNodeTool',
				displayName: 'Test Node Tool',
				group: ['input'],
				inputs: [],
				outputs: ['ai_tool'],
				properties: [
					{
						default: 'A test node',
						description:
							'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
						displayName: 'Description',
						name: 'toolDescription',
						required: true,
						type: 'string',
						typeOptions: {
							rows: 2,
						},
					},
				],
			});
		});

		it('should duplicate supportedNodes for AI tools', () => {
			instance.createAiTools();

			expect(instance.types.nodes).toHaveLength(2);
			// accesses private property

			expect(instance['known'].credentials.testCredential.supportedNodes).toEqual([
				'testNode',
				'testNodeTool',
			]);
		});

		it('should not modify nodes without usableAsTool property', () => {
			instance.types.nodes[0].usableAsTool = undefined;
			instance.createAiTools();

			expect(instance.types.nodes).toHaveLength(1); // No AI tool created
			expect(instance.types.nodes[0].name).toBe('testNode');
		});

		it('should handle nodes with usableAsTool as an object with replacements', () => {
			instance.types.nodes[0].usableAsTool = {
				replacements: {
					displayName: 'Custom Tool Name',
				},
			};
			instance.createAiTools();
			expect(instance.types.nodes[1]).toEqual({
				name: 'testNodeTool',
				displayName: 'Custom Tool Name Tool',
				group: ['input'],
				inputs: [],
				outputs: ['ai_tool'],
				description: 'A test node',
				properties: [
					{
						displayName: 'Description',
						name: 'toolDescription',
						type: 'string',
						default: 'A test node',
						required: true,
						typeOptions: { rows: 2 },
						description:
							'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
					},
				],
				codex: {
					categories: ['AI'],
					subcategories: {
						AI: ['Tools'],
						Tools: ['Other Tools'],
					},
					resources: {},
				},
			});
		});
	});

	describe('shouldAddDomainRestrictions', () => {
		let instance: LoadNodesAndCredentials;

		beforeEach(() => {
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock());
		});
		it('should return true for credentials with authenticate property', () => {
			const credential = {
				name: 'testCredential',
				displayName: 'Test Credential',
				authenticate: {},
				properties: [],
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(true);
		});

		it('should return true for credentials with genericAuth set to true', () => {
			const credential = {
				name: 'testCredential',
				displayName: 'Test Credential',
				genericAuth: true,
				properties: [],
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(true);
		});

		it('should return true for credentials extending oAuth2Api', () => {
			const credential = {
				name: 'testCredential',
				displayName: 'Test Credential',
				extends: ['oAuth2Api'],
				properties: [],
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(true);
		});

		it('should return true for credentials extending oAuth1Api', () => {
			const credential = {
				name: 'testCredential',
				displayName: 'Test Credential',
				extends: ['oAuth1Api'],
				properties: [],
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(true);
		});

		it('should return true for credentials extending googleOAuth2Api', () => {
			const credential = {
				name: 'testCredential',
				displayName: 'Test Credential',
				extends: ['googleOAuth2Api'],
				properties: [],
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(true);
		});

		it('should return true when extending multiple APIs including OAuth', () => {
			const credential = {
				name: 'testCredential',
				displayName: 'Test Credential',
				extends: ['someOtherApi', 'oAuth2Api', 'anotherApi'],
				properties: [],
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(true);
		});

		it('should return false for credentials without authenticate, genericAuth, or OAuth extensions', () => {
			const credential = {
				name: 'testCredential',
				displayName: 'Test Credential',
				properties: [],
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(false);
		});

		it('should return false for credentials with extends that does not include OAuth types', () => {
			const credential = {
				name: 'testCredential',
				displayName: 'Test Credential',
				extends: ['someOtherApi', 'anotherApi'],
				properties: [],
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(false);
		});

		it('should handle LoadedClass credential objects with type property', () => {
			const credential = {
				type: {
					name: 'testCredential',
					displayName: 'Test Credential',
					authenticate: {},
					properties: [],
				},
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(true);
		});

		it('should return false for LoadedClass credential objects without auth-related properties', () => {
			const credential = {
				type: {
					name: 'testCredential',
					displayName: 'Test Credential',
					properties: [],
				},
			};

			const result = (instance as any).shouldAddDomainRestrictions(credential);
			expect(result).toBe(false);
		});
	});

	describe('setupHotReload', () => {
		let instance: LoadNodesAndCredentials;

		const mockLoader = mock<DirectoryLoader>({
			packageName: 'CUSTOM',
			directory: '/some/custom/path',
			isLazyLoaded: false,
			reset: jest.fn(),
			loadAll: jest.fn(),
		});

		beforeEach(() => {
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock());
			instance.loaders = { CUSTOM: mockLoader };

			// Allow access to directory
			(fs.access as jest.Mock).mockResolvedValue(undefined);

			// Simulate custom node dir structure
			(fs.readdir as jest.Mock).mockResolvedValue([
				{ name: 'test-node', isDirectory: () => true, isSymbolicLink: () => false },
			]);

			// Simulate symlink resolution
			(fs.realpath as jest.Mock).mockResolvedValue('/resolved/test-node');
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should subscribe to file changes and reload on changes', async () => {
			const postProcessSpy = jest
				.spyOn(instance, 'postProcessLoaders')
				.mockResolvedValue(undefined);
			const subscribe = jest.mocked(watcher.subscribe);

			await instance.setupHotReload();

			console.log(subscribe);
			expect(subscribe).toHaveBeenCalledTimes(2);
			expect(subscribe).toHaveBeenCalledWith('/some/custom/path', expect.any(Function), {
				ignore: ['**/node_modules/**/node_modules/**'],
			});
			expect(subscribe).toHaveBeenCalledWith('/resolved/test-node', expect.any(Function), {
				ignore: ['**/node_modules/**/node_modules/**'],
			});

			const [watchPath, onFileUpdate] = subscribe.mock.calls[0];

			expect(watchPath).toBe('/some/custom/path');

			// Simulate file change
			const fakeModule = '/some/custom/path/some-module.js';
			require.cache[fakeModule] = mock<NodeJS.Module>({ filename: fakeModule });
			await onFileUpdate(null, [{ type: 'update', path: fakeModule }]);

			expect(require.cache[fakeModule]).toBeUndefined(); // cache should be cleared
			expect(mockLoader.reset).toHaveBeenCalled();
			expect(mockLoader.loadAll).toHaveBeenCalled();
			expect(postProcessSpy).toHaveBeenCalled();
		});
	});
});
