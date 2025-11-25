import fs from 'fs/promises';
import { mock } from 'jest-mock-extended';
import type { DirectoryLoader } from 'n8n-core';
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
