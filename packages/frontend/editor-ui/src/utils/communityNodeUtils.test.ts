import { describe, it, expect, vi } from 'vitest';
import { fetchInstalledPackageInfo } from './communityNodeUtils';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { type NodeTypesStore, useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { PublicInstalledPackage } from 'n8n-workflow';
import type { CommunityNodeType } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';

vi.mock('@/stores/communityNodes.store', () => ({
	useCommunityNodesStore: vi.fn(() => ({
		getInstalledPackage: vi.fn(),
	})),
}));

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		communityNodeType: vi.fn(),
	})),
}));

type CommunityNodesStore = ReturnType<typeof useCommunityNodesStore>;

const mockCommunityNodesStore = (mock: Partial<CommunityNodesStore>) => {
	vi.mocked(useCommunityNodesStore).mockImplementation(
		() =>
			({
				getInstalledPackage: vi.fn(),
				...mock,
			}) as unknown as CommunityNodesStore,
	);
};

const mockNodeTypesStore = (mock: Partial<NodeTypesStore>) => {
	vi.mocked(useNodeTypesStore).mockImplementation(
		() =>
			({
				communityNodeType: vi.fn(),
				...mock,
			}) as unknown as NodeTypesStore,
	);
};

describe('fetchInstalledPackageInfo', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return undefined if no installed package is found', async () => {
		const packageName = 'test-package';
		mockCommunityNodesStore({
			getInstalledPackage: vi.fn().mockResolvedValue(undefined),
		});

		const result = await fetchInstalledPackageInfo(packageName);
		expect(result).toBeUndefined();
	});

	it('should return package info with unverifiedUpdate as false if no update is available', async () => {
		const packageName = 'test-package';
		const installedPackage = { packageName, updateAvailable: null };
		mockCommunityNodesStore({
			getInstalledPackage: vi
				.fn()
				.mockResolvedValue(installedPackage as unknown as PublicInstalledPackage),
		});
		mockNodeTypesStore({
			communityNodeType: vi
				.fn()
				.mockReturnValue({ npmVersion: '1.0.0' } as unknown as CommunityNodeType),
		});

		const result = await fetchInstalledPackageInfo(packageName);
		expect(result).toEqual({ ...installedPackage, unverifiedUpdate: false });
	});

	it('should return package info with unverifiedUpdate as true if an update is available', async () => {
		const packageName = 'test-package';
		const installedPackage = { packageName, updateAvailable: '1.1.0' };
		mockCommunityNodesStore({
			getInstalledPackage: vi
				.fn()
				.mockResolvedValue(installedPackage as unknown as PublicInstalledPackage),
		});
		mockNodeTypesStore({
			communityNodeType: vi
				.fn()
				.mockReturnValue({ npmVersion: '1.0.0' } as unknown as CommunityNodeType),
		});

		const result = await fetchInstalledPackageInfo(packageName);
		expect(result).toEqual({ ...installedPackage, unverifiedUpdate: true });
	});
});
