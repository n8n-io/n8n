import { createPinia, setActivePinia } from 'pinia';
import type { InstalledPackageWithRestrictions } from '@n8n/rest-api-client/api/communityNodes';
import * as communityNodesApi from '@n8n/rest-api-client/api/communityNodes';
import type { PublicInstalledPackage } from 'n8n-workflow';

import { isAuthenticated } from '@/app/utils/rbac/checks';
import { useCommunityNodesStore } from './communityNodes.store';

vi.mock('@n8n/rest-api-client/api/communityNodes', () => ({
	installNewPackage: vi.fn(),
	getInstalledCommunityNodes: vi.fn(),
}));

vi.mock('@/app/utils/rbac/checks', () => ({
	isAuthenticated: vi.fn(() => true),
}));

const installedPackage = (): PublicInstalledPackage => ({
	packageName: 'n8n-nodes-example',
	installedVersion: '1.0.0',
	installedNodes: [],
	createdAt: new Date(),
	updatedAt: new Date(),
});

describe('useCommunityNodesStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.mocked(isAuthenticated).mockReturnValue(true);
	});

	describe('installPackage', () => {
		it('returns the install response with its policy restrictions after the list refresh', async () => {
			const response: InstalledPackageWithRestrictions = {
				...installedPackage(),
				policyRestrictions: {
					nodeTypes: [
						{ type: 'n8n-nodes-example.example', blockedOn: 'instance', optInAvailable: false },
					],
				},
			};
			vi.mocked(communityNodesApi.installNewPackage).mockResolvedValue(response);
			// The refreshed list holds the package without the install-only field.
			vi.mocked(communityNodesApi.getInstalledCommunityNodes).mockResolvedValue([
				installedPackage(),
			]);
			const store = useCommunityNodesStore();

			const result = await store.installPackage('n8n-nodes-example', '1.0.0');

			expect(result).toBe(response);
			expect(result.policyRestrictions).toEqual(response.policyRestrictions);
			expect(communityNodesApi.installNewPackage).toHaveBeenCalledWith(
				expect.anything(),
				'n8n-nodes-example',
				'1.0.0',
			);
			expect(communityNodesApi.getInstalledCommunityNodes).toHaveBeenCalledOnce();
			expect(store.getInstalledPackages.map((pkg) => pkg.packageName)).toEqual([
				'n8n-nodes-example',
			]);
		});
	});
});
