import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { mockedStore } from '@/__tests__/utils';

import { useInstalledCommunityPackage } from './useInstalledCommunityPackage';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { useUsersStore } from '@/stores/users.store';
import type { ExtendedPublicInstalledPackage } from '@/utils/communityNodeUtils';
import type * as n8nWorkflow from 'n8n-workflow';

vi.mock('n8n-workflow', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...(original as typeof n8nWorkflow),
		isCommunityPackageName: vi.fn(),
	};
});

vi.mock('@/utils/communityNodeUtils', () => ({
	fetchInstalledPackageInfo: vi.fn(),
}));

// Import mocked functions
import { isCommunityPackageName } from 'n8n-workflow';
import { fetchInstalledPackageInfo } from '@/utils/communityNodeUtils';

const mockIsCommunityPackageName = vi.mocked(isCommunityPackageName);
const mockFetchInstalledPackageInfo = vi.mocked(fetchInstalledPackageInfo);

describe('useInstalledCommunityPackage', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
	});

	describe('computed properties', () => {
		it('should handle nodeTypeName parsing correctly', () => {
			mockIsCommunityPackageName.mockReturnValue(true);
			const composable = useInstalledCommunityPackage('@test/n8n-nodes-test.TestNode');
			expect(composable.isCommunityNode.value).toBe(true);
		});

		it('should return false for isCommunityNode when nodeTypeName is undefined', () => {
			const composable = useInstalledCommunityPackage();
			expect(composable.isCommunityNode.value).toBe(false);
		});

		it('should compute isCommunityNode correctly when nodeTypeName is provided and is community', () => {
			mockIsCommunityPackageName.mockReturnValue(true);

			const { isCommunityNode } = useInstalledCommunityPackage('@test/n8n-nodes-test.TestNode');

			expect(isCommunityNode.value).toBe(true);
			expect(mockIsCommunityPackageName).toHaveBeenCalledWith('@test/n8n-nodes-test.TestNode');
		});

		it('should compute isCommunityNode as false when nodeTypeName is provided but not community', () => {
			mockIsCommunityPackageName.mockReturnValue(false);

			const { isCommunityNode } = useInstalledCommunityPackage('n8n-nodes-base.HttpRequest');

			expect(isCommunityNode.value).toBe(false);
			expect(mockIsCommunityPackageName).toHaveBeenCalledWith('n8n-nodes-base.HttpRequest');
		});

		it('should compute isCommunityNode as false when nodeTypeName is undefined', () => {
			const { isCommunityNode } = useInstalledCommunityPackage();

			expect(isCommunityNode.value).toBe(false);
			expect(mockIsCommunityPackageName).not.toHaveBeenCalled();
		});

		it('should compute isUpdateCheckAvailable correctly when user is instance owner and node is community', () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.isInstanceOwner = true;
			mockIsCommunityPackageName.mockReturnValue(true);

			const { isUpdateCheckAvailable } = useInstalledCommunityPackage(
				'@test/n8n-nodes-test.TestNode',
			);

			expect(isUpdateCheckAvailable.value).toBe(true);
		});

		it('should compute isUpdateCheckAvailable as false when user is not instance owner', () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.isInstanceOwner = false;
			mockIsCommunityPackageName.mockReturnValue(true);

			const { isUpdateCheckAvailable } = useInstalledCommunityPackage(
				'@test/n8n-nodes-test.TestNode',
			);

			expect(isUpdateCheckAvailable.value).toBe(false);
		});

		it('should compute isUpdateCheckAvailable as false when node is not community', () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.isInstanceOwner = true;
			mockIsCommunityPackageName.mockReturnValue(false);

			const { isUpdateCheckAvailable } = useInstalledCommunityPackage('n8n-nodes-base.HttpRequest');

			expect(isUpdateCheckAvailable.value).toBe(false);
		});
	});

	describe('initInstalledPackage', () => {
		it('should return undefined when packageName is empty', async () => {
			const { initInstalledPackage } = useInstalledCommunityPackage();

			const result = await initInstalledPackage();

			expect(result).toBeUndefined();
			expect(mockFetchInstalledPackageInfo).not.toHaveBeenCalled();
		});

		it('should return undefined when node is not a community node', async () => {
			mockIsCommunityPackageName.mockReturnValue(false);

			const { initInstalledPackage } = useInstalledCommunityPackage('n8n-nodes-base.HttpRequest');

			const result = await initInstalledPackage();

			expect(result).toBeUndefined();
			expect(mockFetchInstalledPackageInfo).not.toHaveBeenCalled();
		});

		it('should fetch and set installedPackage when conditions are met', async () => {
			const mockPackage: ExtendedPublicInstalledPackage = {
				packageName: '@test/n8n-nodes-test',
				installedVersion: '1.0.0',
				installedNodes: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				unverifiedUpdate: false,
			};

			mockIsCommunityPackageName.mockReturnValue(true);
			mockFetchInstalledPackageInfo.mockResolvedValue(mockPackage);

			const { initInstalledPackage, installedPackage } = useInstalledCommunityPackage(
				'@test/n8n-nodes-test.TestNode',
			);

			const result = await initInstalledPackage();

			expect(mockFetchInstalledPackageInfo).toHaveBeenCalledWith('@test/n8n-nodes-test');
			expect(result).toStrictEqual(mockPackage);
			expect(installedPackage.value).toStrictEqual(mockPackage);
		});

		it('should handle fetchInstalledPackageInfo returning undefined', async () => {
			mockIsCommunityPackageName.mockReturnValue(true);
			mockFetchInstalledPackageInfo.mockResolvedValue(undefined);

			const { initInstalledPackage, installedPackage } = useInstalledCommunityPackage(
				'@test/n8n-nodes-test.TestNode',
			);

			const result = await initInstalledPackage();

			expect(mockFetchInstalledPackageInfo).toHaveBeenCalledWith('@test/n8n-nodes-test');
			expect(result).toBeUndefined();
			expect(installedPackage.value).toBeUndefined();
		});
	});

	describe('watcher functionality', () => {
		it('should call initInstalledPackage when installedPackages changes', async () => {
			const communityNodesStore = mockedStore(useCommunityNodesStore);
			const mockPackage: ExtendedPublicInstalledPackage = {
				packageName: '@test/n8n-nodes-test',
				installedVersion: '1.0.0',
				installedNodes: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				unverifiedUpdate: false,
			};

			mockIsCommunityPackageName.mockReturnValue(true);
			mockFetchInstalledPackageInfo.mockResolvedValue(mockPackage);

			// Initialize the composable
			const { installedPackage } = useInstalledCommunityPackage('@test/n8n-nodes-test.TestNode');

			// Simulate store change
			communityNodesStore.installedPackages = {
				'@test/n8n-nodes-test': mockPackage,
			};

			await nextTick();

			expect(mockFetchInstalledPackageInfo).toHaveBeenCalledWith('@test/n8n-nodes-test');
			expect(installedPackage.value).toStrictEqual(mockPackage);
		});

		it('should not call initInstalledPackage when packageName is empty', async () => {
			const communityNodesStore = mockedStore(useCommunityNodesStore);

			// Initialize the composable without nodeTypeName
			useInstalledCommunityPackage();

			// Simulate store change
			const mockSomePackage: ExtendedPublicInstalledPackage = {
				packageName: 'some-package',
				installedVersion: '1.0.0',
				installedNodes: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				unverifiedUpdate: false,
			};
			communityNodesStore.installedPackages = {
				'some-package': mockSomePackage,
			};

			await nextTick();

			expect(mockFetchInstalledPackageInfo).not.toHaveBeenCalled();
		});

		it('should not call initInstalledPackage when package is not in installedPackages', async () => {
			const communityNodesStore = mockedStore(useCommunityNodesStore);
			mockIsCommunityPackageName.mockReturnValue(true);

			// Initialize the composable
			useInstalledCommunityPackage('@test/n8n-nodes-test.TestNode');

			// Simulate store change with different package
			const mockDifferentPackage: ExtendedPublicInstalledPackage = {
				packageName: 'different-package',
				installedVersion: '1.0.0',
				installedNodes: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				unverifiedUpdate: false,
			};
			communityNodesStore.installedPackages = {
				'different-package': mockDifferentPackage,
			};

			await nextTick();

			expect(mockFetchInstalledPackageInfo).not.toHaveBeenCalled();
		});
	});

	describe('return values', () => {
		it('should return all expected properties and functions', () => {
			const result = useInstalledCommunityPackage('@test/n8n-nodes-test.TestNode');

			expect(result).toHaveProperty('installedPackage');
			expect(result).toHaveProperty('isUpdateCheckAvailable');
			expect(result).toHaveProperty('isCommunityNode');
			expect(result).toHaveProperty('initInstalledPackage');

			expect(typeof result.initInstalledPackage).toBe('function');
		});
	});
});
