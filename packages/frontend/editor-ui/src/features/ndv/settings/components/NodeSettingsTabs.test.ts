import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import NodeSettingsTabs from './NodeSettingsTabs.vue';
import { ref } from 'vue';
import type { PublicInstalledPackage } from 'n8n-workflow';

const renderComponent = createComponentRenderer(NodeSettingsTabs);
const installedPackage = ref<PublicInstalledPackage>();
const isCommunityNode = ref(false);
const canUpdatePackage = ref(false);
const hasUpdateAvailable = ref(false);

vi.mock('@/features/settings/communityNodes/composables/useInstalledCommunityPackage', () => ({
	useInstalledCommunityPackage: vi.fn(() => ({
		installedPackage,
		isCommunityNode,
		canUpdatePackage,
		hasUpdateAvailable,
		initInstalledPackage: vi.fn(),
	})),
}));

describe('NodeSettingsTabs', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		installedPackage.value = undefined;
		isCommunityNode.value = false;
		canUpdatePackage.value = false;
		hasUpdateAvailable.value = false;
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

	it('displays notification when an update is available', async () => {
		canUpdatePackage.value = true;
		hasUpdateAvailable.value = true;

		const { findByTestId } = renderComponent({
			props: {},
		});

		const tab = await findByTestId('tab-settings');
		expect(tab.querySelector('.notification')).toBeInTheDocument();
	});

	it('does not display notification when not updateAvailable', () => {
		// Default mock values (from beforeEach) should not trigger notification
		const { queryByTestId } = renderComponent({
			props: {},
		});

		const tab = queryByTestId('tab-settings');
		const notification = tab?.querySelector('.notification');
		expect(notification).toBeNull();
	});
});
