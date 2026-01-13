import { Service } from '@n8n/di';
import watcher from '@parcel/watcher';
import fs from 'fs/promises';
import { mock } from 'jest-mock-extended';
import type { DirectoryLoader } from 'n8n-core';
import { CUSTOM_NODES_PACKAGE_NAME } from 'n8n-core';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '../load-nodes-and-credentials';

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
		let instanceCustom: LoadNodesAndCredentials;
		let instanceCustomWin: LoadNodesAndCredentials;

		const packageName = 'package1';
		const packageNameCustom = CUSTOM_NODES_PACKAGE_NAME;

		const dir = '/home/user/.n8n/nodes';
		const dirCustom = '/home/user/.n8n-custom-nodes';
		const dirCustomWin = 'C:/Users/name/.n8n-custom-nodes';

		const pathPrefix = `/icons/${packageName}`;
		const pathPrefixCustom = `/icons/${packageNameCustom}`;
		const pathPrefixAbsolute = `${pathPrefixCustom}/${dirCustom}`;
		const pathPrefixAbsoluteWin = `${pathPrefixCustom}/${dirCustomWin}`;

		beforeEach(() => {
			const mockInstance = (pkg: string, directory: string) => {
				const mi = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());
				mi.loaders[pkg] = mock<DirectoryLoader>({
					directory,
				});
				return mi;
			};
			instance = mockInstance(packageName, dir);
			instanceCustom = mockInstance(packageNameCustom, dirCustom);
			instanceCustomWin = mockInstance(packageNameCustom, dirCustomWin);
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
			const result = instance.resolveIcon('package1', `${pathPrefix}/icon.png`);
			expect(result).toBe(`${dir}/icon.png`);
		});

		it('should return undefined if the URL is outside the package directory', () => {
			const result = instance.resolveIcon('package1', `${pathPrefix}/../../../etc/passwd`);
			expect(result).toBeUndefined();
		});

		describe('N8N_CUSTOM_EXTENSIONS', () => {
			it('should return file path if url contains "//" with absolute custom file path', () => {
				const result = instanceCustom.resolveIcon(
					packageNameCustom,
					`${pathPrefixAbsolute}/icon.png`,
				);
				expect(result).toBe(`${dirCustom}/icon.png`);
			});

			it('should return file path if url contains "C:" with absolute custom windows file path', () => {
				const winIconPath = `${dirCustomWin}/icon.png`;
				const result = instanceCustomWin.resolveIcon(
					packageNameCustom,
					`${pathPrefixAbsoluteWin}/icon.png`,
				);
				expect(result).toBe(winIconPath);
			});
		});
	});

	describe('convertNodeToAiTool', () => {
		const instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());

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
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());
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
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());
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
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());
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

	describe('injectContextEstablishmentHooks', () => {
		let instance: LoadNodesAndCredentials;
		let mockLogger: { debug: jest.Mock };
		let mockExecutionContextHookRegistry: { getHookForTriggerType: jest.Mock };

		beforeEach(() => {
			// Enable the feature flag for tests
			process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

			mockLogger = {
				debug: jest.fn(),
			};
			mockExecutionContextHookRegistry = {
				getHookForTriggerType: jest.fn(),
			};
			instance = new LoadNodesAndCredentials(
				mockLogger as never,
				mock(),
				mock(),
				mock(),
				mock(),
				mockExecutionContextHookRegistry as never,
			);
		});

		afterEach(() => {
			// Clean up the environment variable after each test
			delete process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS;
		});

		it('should not inject hooks when feature flag is disabled', () => {
			// Disable the feature flag
			delete process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS;

			const triggerNode: INodeTypeDescription = {
				name: 'webhookTrigger',
				displayName: 'Webhook Trigger',
				group: ['trigger'],
				description: 'A webhook trigger',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: ['main'],
				properties: [],
			};

			instance.types.nodes = [triggerNode];

			const mockHook = {
				hookDescription: {
					name: 'credentials.bearerToken',
					displayName: 'Bearer Token',
					options: [],
				},
			};

			mockExecutionContextHookRegistry.getHookForTriggerType.mockReturnValue([mockHook]);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(instance as any).injectContextEstablishmentHooks();

			expect(triggerNode.properties).toHaveLength(0);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Context establishment hooks feature is disabled',
			);

			// Re-enable for other tests
			process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';
		});

		it('should not inject hooks if no hooks exist', () => {
			const triggerNode: INodeTypeDescription = {
				name: 'manualTrigger',
				displayName: 'Manual Trigger',
				group: ['trigger'],
				description: 'A manual trigger',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: ['main'],
				properties: [],
			};

			instance.types.nodes = [triggerNode];

			mockExecutionContextHookRegistry.getHookForTriggerType.mockReturnValue([]);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(instance as any).injectContextEstablishmentHooks();

			expect(triggerNode.properties).toHaveLength(0);
		});

		it('should not inject hooks when isApplicableToTriggerNode returns false', () => {
			const manualTriggerNode: INodeTypeDescription = {
				name: 'manualTrigger',
				displayName: 'Manual Trigger',
				group: ['trigger'],
				description: 'A manual trigger',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: ['main'],
				properties: [],
			};

			instance.types.nodes = [manualTriggerNode];

			const mockNonApplicableHook = {
				hookDescription: {
					name: 'credentials.bearerToken',
					displayName: 'Bearer Token',
					options: [
						{
							displayName: 'Remove from Item',
							name: 'removeFromItem',
							type: 'boolean',
							default: true,
						},
					],
				},
				isApplicableToTriggerNode: jest.fn((nodeType: string) => {
					// Only applicable to webhook trigger
					return nodeType === 'webhookTrigger';
				}),
			};

			// Mock getHookForTriggerType to simulate real filtering behavior
			mockExecutionContextHookRegistry.getHookForTriggerType.mockImplementation((nodeType) => {
				const allHooks = [mockNonApplicableHook];
				// Filter hooks based on isApplicableToTriggerNode
				return allHooks.filter((hook) => hook.isApplicableToTriggerNode(nodeType));
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(instance as any).injectContextEstablishmentHooks();

			// Verify isApplicableToTriggerNode was called, but no properties added
			expect(mockNonApplicableHook.isApplicableToTriggerNode).toHaveBeenCalledWith('manualTrigger');
			expect(manualTriggerNode.properties).toHaveLength(0);
		});

		it('should inject hooks with multiple hook types and options', () => {
			const triggerNode: INodeTypeDescription = {
				name: 'webhookTrigger',
				displayName: 'Webhook Trigger',
				group: ['trigger'],
				description: 'A webhook trigger',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: ['main'],
				properties: [],
			};

			instance.types.nodes = [triggerNode];

			// Hook 1: With 2 options (one with existing displayOptions)
			const mockHookWithOptions = {
				hookDescription: {
					name: 'credentials.bearerToken',
					displayName: 'Bearer Token',
					options: [
						{
							displayName: 'Remove from Item',
							name: 'removeFromItem',
							type: 'boolean',
							default: true,
						},
						{
							displayName: 'Advanced Option',
							name: 'advancedOption',
							type: 'string',
							default: '',
							displayOptions: {
								show: {
									someOtherField: ['value'],
								},
							},
						},
					],
				},
			};

			// Hook 2: Without options
			const mockHookWithoutOptions = {
				hookDescription: {
					name: 'credentials.apiKey',
					displayName: 'API Key',
					options: [],
				},
			};

			mockExecutionContextHookRegistry.getHookForTriggerType.mockReturnValue([
				mockHookWithOptions,
				mockHookWithoutOptions,
			]);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(instance as any).injectContextEstablishmentHooks();

			// Verify three properties are injected
			expect(triggerNode.properties).toHaveLength(3);
			expect(triggerNode.properties[0].name).toBe('executionsHooksVersion');
			expect(triggerNode.properties[0].type).toBe('hidden');
			expect(triggerNode.properties[1].name).toBe('contextEstablishmentHooks');
			expect(triggerNode.properties[1].type).toBe('fixedCollection');
			expect(triggerNode.properties[2].name).toBe('contextHooksNotice');
			expect(triggerNode.properties[2].type).toBe('notice');

			// Verify the hook collection structure
			const hookProperty = triggerNode.properties[1];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const hookValues = (hookProperty as any).options?.[0]?.values as INodeProperties[];

			// Should have: hookName selector + isAllowedToFail + 2 options from first hook = 4 values
			expect(hookValues).toHaveLength(4);

			// Verify hookName selector with both hook options
			expect(hookValues[0].name).toBe('hookName');
			expect(hookValues[0].type).toBe('options');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const hookNameOptions = (hookValues[0] as any).options;
			expect(hookNameOptions).toHaveLength(2);
			expect(hookNameOptions[0].value).toBe('credentials.bearerToken');
			expect(hookNameOptions[1].value).toBe('credentials.apiKey');

			// Verify isAllowedToFail field
			expect(hookValues[1].name).toBe('isAllowedToFail');
			expect(hookValues[1].type).toBe('boolean');
			expect(hookValues[1].default).toBe(false);

			// Verify first option has display condition
			expect(hookValues[2].name).toBe('removeFromItem');
			expect(hookValues[2].displayOptions).toEqual({
				show: {
					hookName: ['credentials.bearerToken'],
				},
			});

			// Verify second option merges existing displayOptions with hookName
			expect(hookValues[3].name).toBe('advancedOption');
			expect(hookValues[3].displayOptions).toEqual({
				show: {
					someOtherField: ['value'],
					hookName: ['credentials.bearerToken'],
				},
			});
		});
	});

	describe('setupHotReload', () => {
		let instance: LoadNodesAndCredentials;

		const mockLoader = mock<DirectoryLoader>({
			packageName: CUSTOM_NODES_PACKAGE_NAME,
			directory: '/some/custom/path',
			isLazyLoaded: false,
			reset: jest.fn(),
			loadAll: jest.fn(),
		});

		beforeEach(() => {
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());
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
