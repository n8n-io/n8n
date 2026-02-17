import { Service } from '@n8n/di';
import watcher from '@parcel/watcher';
import fs from 'fs/promises';
import { mock } from 'jest-mock-extended';
import type { DirectoryLoader } from 'n8n-core';
import { CUSTOM_NODES_PACKAGE_NAME } from 'n8n-core';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

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

jest.mock('@/tool-generation', () => ({
	createAiTools: jest.fn(),
	createHitlTools: jest.fn(),
}));

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

			// Should have: hookName selector + 2 options from first hook = 3 values
			expect(hookValues).toHaveLength(3);

			// Verify hookName selector with both hook options
			expect(hookValues[0].name).toBe('hookName');
			expect(hookValues[0].type).toBe('options');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const hookNameOptions = (hookValues[0] as any).options;
			expect(hookNameOptions).toHaveLength(2);
			expect(hookNameOptions[0].value).toBe('credentials.bearerToken');
			expect(hookNameOptions[1].value).toBe('credentials.apiKey');

			// Verify first option has display condition
			expect(hookValues[1].name).toBe('removeFromItem');
			expect(hookValues[1].displayOptions).toEqual({
				show: {
					hookName: ['credentials.bearerToken'],
				},
			});

			// Verify second option merges existing displayOptions with hookName
			expect(hookValues[2].name).toBe('advancedOption');
			expect(hookValues[2].displayOptions).toEqual({
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

	describe('postProcessLoaders', () => {
		let instance: LoadNodesAndCredentials;
		let createAiTools: jest.Mock;
		let createHitlTools: jest.Mock;

		beforeEach(async () => {
			// Import the mocked functions
			const toolGeneration = await import('@/tool-generation');
			createAiTools = toolGeneration.createAiTools as jest.Mock;
			createHitlTools = toolGeneration.createHitlTools as jest.Mock;

			// Clear mock calls before each test
			createAiTools.mockClear();
			createHitlTools.mockClear();

			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());
		});

		it('should keep types in memory after post-processing for post-processors to read', async () => {
			const mockLoader = mock<DirectoryLoader>({
				packageName: 'test-package',
				directory: '/test/dir',
				known: { nodes: {}, credentials: {} },
				types: {
					nodes: [{ name: 'TestNode', displayName: 'Test' } as INodeTypeDescription],
					credentials: [],
				},
				credentialTypes: {},
				isLazyLoaded: false,
				ensureTypesLoaded: jest.fn().mockResolvedValue(undefined),
			});

			instance.loaders = { 'test-package': mockLoader };

			await instance.postProcessLoaders();

			expect(instance.types.nodes).toHaveLength(1);
			expect(instance.types.nodes[0].name).toBe('test-package.TestNode');
		});

		it('should call createAiTools and createHitlTools', async () => {
			// Setup a mock loader
			const mockLoader = mock<DirectoryLoader>({
				packageName: 'test-package',
				directory: '/test/dir',
				known: { nodes: {}, credentials: {} },
				types: { nodes: [], credentials: [] },
				credentialTypes: {},
				isLazyLoaded: false,
				ensureTypesLoaded: jest.fn().mockResolvedValue(undefined),
			});

			instance.loaders = { 'test-package': mockLoader };

			await instance.postProcessLoaders();

			// Verify both are called
			expect(createAiTools).toHaveBeenCalledTimes(1);
			expect(createHitlTools).toHaveBeenCalledTimes(1);

			// Verify they are called with the same arguments structure
			const expectedKnown = expect.objectContaining({
				nodes: expect.any(Object),
				credentials: expect.any(Object),
			});
			expect(createAiTools).toHaveBeenCalledWith(instance.types, expectedKnown);
			expect(createHitlTools).toHaveBeenCalledWith(instance.types, expectedKnown);
		});
	});

	describe('collectTypes', () => {
		let instance: LoadNodesAndCredentials;

		beforeEach(() => {
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock(), mock(), mock());
		});

		it('should return a snapshot of types with package-namespaced node names', async () => {
			const mockLoader = mock<DirectoryLoader>({
				packageName: 'n8n-nodes-base',
				directory: '/test/dir',
				known: { nodes: {}, credentials: {} },
				types: {
					nodes: [{ name: 'httpRequest', displayName: 'HTTP Request' } as INodeTypeDescription],
					credentials: [{ name: 'httpBasicAuth', displayName: 'HTTP Basic Auth' }],
				},
				credentialTypes: {},
				isLazyLoaded: false,
				ensureTypesLoaded: jest.fn().mockResolvedValue(undefined),
			});

			instance.loaders = { 'n8n-nodes-base': mockLoader };

			const types = await instance.collectTypes();

			expect(types.nodes).toHaveLength(1);
			expect(types.nodes[0].name).toBe('n8n-nodes-base.httpRequest');
			expect(types.nodes[0].displayName).toBe('HTTP Request');
			expect(types.credentials).toHaveLength(1);
		});

		it('should release loader types after collecting', async () => {
			const mockLoader = mock<DirectoryLoader>({
				packageName: 'test-package',
				directory: '/test/dir',
				known: { nodes: {}, credentials: {} },
				types: {
					nodes: [{ name: 'TestNode', displayName: 'Test' } as INodeTypeDescription],
					credentials: [],
				},
				credentialTypes: {},
				isLazyLoaded: false,
				ensureTypesLoaded: jest.fn().mockResolvedValue(undefined),
			});

			instance.loaders = { 'test-package': mockLoader };

			await instance.collectTypes();

			expect(mockLoader.releaseTypes).toHaveBeenCalled();
		});
	});
});
