import { describe, it, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import NodeSettingsTabs from '@/components/NodeSettingsTabs.vue';
import { ref } from 'vue';
import type { ExtendedPublicInstalledPackage } from '@/utils/communityNodeUtils';
import { useInstalledCommunityPackage } from '@/composables/useInstalledCommunityPackage';

const renderComponent = createComponentRenderer(NodeSettingsTabs);

vi.mock('@/composables/useInstalledCommunityPackage', () => ({
	useInstalledCommunityPackage: vi.fn(() => ({
		installedPackage: ref<ExtendedPublicInstalledPackage | undefined>(undefined),
		isCommunityNode: ref(false),
		isUpdateCheckAvailable: ref(false),
		initInstalledPackage: vi.fn(),
	})),
}));

let installedCommunityPackage: ReturnType<typeof useInstalledCommunityPackage>;

describe('NodeSettingsTabs', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		installedCommunityPackage = useInstalledCommunityPackage();
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
		vi.spyOn(installedCommunityPackage.isUpdateCheckAvailable, 'value', 'get').mockReturnValue(
			true,
		);
		vi.spyOn(installedCommunityPackage.installedPackage, 'value', 'get').mockReturnValue(
			mock<ExtendedPublicInstalledPackage>({
				packageName: 'test-package',
				installedVersion: '1.0.0',
				updateAvailable: '1.0.1',
			}),
		);

		const { findByTestId } = renderComponent({
			props: {},
		});

		const notification = await findByTestId('tab-settings');
		expect(notification).toBeDefined();
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
