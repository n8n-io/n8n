import { fireEvent } from '@testing-library/vue';
import { VIEWS } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CommunityNodeFooter from './CommunityNodeFooter.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { vi } from 'vitest';
import { ref } from 'vue';
import type { ExtendedPublicInstalledPackage } from '@/utils/communityNodeUtils';

// Mock the useInstalledCommunityPackage composable
const mockInstalledPackage = ref<ExtendedPublicInstalledPackage | undefined>(undefined);

vi.mock('@/composables/useInstalledCommunityPackage', () => ({
	useInstalledCommunityPackage: vi.fn(() => ({
		installedPackage: mockInstalledPackage,
		isUpdateCheckAvailable: ref(false),
		isCommunityNode: ref(true),
		initInstalledPackage: vi.fn(),
	})),
}));

const push = vi.fn();

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		useRouter: vi.fn(() => ({
			push,
		})),
	};
});

describe('CommunityNodeInfo - links & bugs URL', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				bugs: {
					url: 'https://github.com/n8n-io/n8n/issues',
				},
			}),
		});

		vi.stubGlobal('fetch', fetchMock);

		// Reset the mock installed package before each test
		mockInstalledPackage.value = undefined;
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('calls router.push to open settings page when "Manage" is clicked', async () => {
		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: { packageName: 'n8n-nodes-test', showManage: true },
		});

		const manageLink = getByText('Manage');
		await fireEvent.click(manageLink);

		expect(push).toHaveBeenCalledWith({ name: VIEWS.COMMUNITY_NODES });
	});

	it('Manage should not be in the footer', () => {
		const { queryByText } = createComponentRenderer(CommunityNodeFooter)({
			props: { packageName: 'n8n-nodes-test', showManage: false },
		});

		expect(queryByText('Manage')).not.toBeInTheDocument();
	});

	it('displays "Legacy" when updateAvailable', () => {
		mockInstalledPackage.value = {
			packageName: 'n8n-nodes-test',
			installedVersion: '1.0.0',
			updateAvailable: '1.0.1',
			unverifiedUpdate: false,
			installedNodes: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				showManage: false,
			},
		});

		expect(getByText('Package version 1.0.0 (Legacy)')).toBeInTheDocument();
	});

	it('displays "Latest" when not updateAvailable', () => {
		mockInstalledPackage.value = {
			packageName: 'n8n-nodes-test',
			installedVersion: '1.0.0',
			unverifiedUpdate: false,
			installedNodes: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				showManage: false,
			},
		});

		expect(getByText('Package version 1.0.0 (Latest)')).toBeInTheDocument();
	});

	it('displays "Latest" when only unverified update is available', () => {
		mockInstalledPackage.value = {
			packageName: 'n8n-nodes-test',
			installedVersion: '1.0.0',
			unverifiedUpdate: true,
			installedNodes: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				showManage: false,
			},
		});

		expect(getByText('Package version 1.0.0 (Latest)')).toBeInTheDocument();
	});

	it('does not display package version when installedPackage is undefined', () => {
		// mockInstalledPackage.value is already undefined from beforeEach
		const { queryByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				showManage: false,
			},
		});

		expect(queryByText(/Package version/)).not.toBeInTheDocument();
	});
});
