import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import NodeSettingsTabs from '@/components/NodeSettingsTabs.vue';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import type { PublicInstalledPackage } from 'n8n-workflow';

const renderComponent = createComponentRenderer(NodeSettingsTabs);

vi.mock('@/stores/communityNodes.store', () => ({
	useCommunityNodesStore: vi.fn(() => ({
		getInstalledPackage: vi.fn(),
	})),
}));

describe('NodeSettingsTabs', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the component', () => {
		const { getByText } = renderComponent({
			props: {},
		});
		expect(getByText('Parameters')).toBeInTheDocument();
	});

	it('displays notification when updateAvailable', async () => {
		const communityNodesStore = useCommunityNodesStore();
		vi.spyOn(communityNodesStore, 'getInstalledPackage').mockResolvedValue({
			updateAvailable: '1.0.1',
		} as PublicInstalledPackage);

		const { findByTestId } = renderComponent({
			props: {},
		});

		const notification = await findByTestId('tab-settings');
		expect(notification).toBeDefined();
	});

	it('does not display notification when not updateAvailable', async () => {
		const communityNodesStore = useCommunityNodesStore();
		vi.spyOn(communityNodesStore, 'getInstalledPackage').mockResolvedValue(
			{} as PublicInstalledPackage,
		);

		const { queryByTestId } = renderComponent({
			props: {},
		});

		const tab = queryByTestId('tab-settings');
		const notification = tab?.querySelector('.notification');
		expect(notification).toBeNull();
	});
});
