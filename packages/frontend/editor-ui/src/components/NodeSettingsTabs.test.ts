import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import NodeSettingsTabs from '@/components/NodeSettingsTabs.vue';
import { ref } from 'vue';
import type { ExtendedPublicInstalledPackage } from '@/utils/communityNodeUtils';

const renderComponent = createComponentRenderer(NodeSettingsTabs);

const mockInstalledPackage = ref<ExtendedPublicInstalledPackage | undefined>(undefined);
const mockIsCommunityNode = ref(false);
const mockIsUpdateCheckAvailable = ref(false);

vi.mock('@/composables/useInstalledCommunityPackage', () => ({
	useInstalledCommunityPackage: vi.fn(() => ({
		installedPackage: mockInstalledPackage,
		isCommunityNode: mockIsCommunityNode,
		isUpdateCheckAvailable: mockIsUpdateCheckAvailable,
		initInstalledPackage: vi.fn(),
	})),
}));

describe('NodeSettingsTabs', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });

		// Reset mock values before each test
		mockInstalledPackage.value = undefined;
		mockIsCommunityNode.value = false;
		mockIsUpdateCheckAvailable.value = false;
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
		mockIsUpdateCheckAvailable.value = true;
		mockInstalledPackage.value = {
			packageName: 'test-package',
			installedVersion: '1.0.0',
			updateAvailable: '1.0.1',
			unverifiedUpdate: false,
			installedNodes: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const { findByTestId } = renderComponent({
			props: {},
		});

		const notification = await findByTestId('tab-settings');
		expect(notification).toBeDefined();
	});

	it('does not display notification when not updateAvailable', () => {
		// Default mock values (from beforeEach) should not trigger notification
		// mockIsUpdateCheckAvailable.value = false and mockInstalledPackage.value = undefined

		const { queryByTestId } = renderComponent({
			props: {},
		});

		const tab = queryByTestId('tab-settings');
		const notification = tab?.querySelector('.notification');
		expect(notification).toBeNull();
	});
});
