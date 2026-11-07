import { fireEvent } from '@testing-library/vue';
import { VIEWS } from '@/app/constants';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CommunityNodeFooter from './CommunityNodeFooter.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { vi } from 'vitest';
import { ref } from 'vue';
import type { PublicInstalledPackage } from 'n8n-workflow';

// Mock the useInstalledCommunityPackage composable
const mockInstalledPackage = ref<PublicInstalledPackage>();
const mockHasUpdateAvailable = ref(false);

vi.mock('../../composables/useInstalledCommunityPackage', () => ({
	useInstalledCommunityPackage: vi.fn(() => ({
		installedPackage: mockInstalledPackage,
		canUpdatePackage: ref(false),
		hasUpdateAvailable: mockHasUpdateAvailable,
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
		mockHasUpdateAvailable.value = false;
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('calls router.push to open settings page when "Manage" is clicked', async () => {
		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				nodeTypeName: 'n8n-nodes-test.test',
				showManage: true,
			},
		});

		const manageLink = getByText('Manage');
		await fireEvent.click(manageLink);

		expect(push).toHaveBeenCalledWith({ name: VIEWS.COMMUNITY_NODES });
	});

	it('Manage should not be in the footer', () => {
		const { queryByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				nodeTypeName: 'n8n-nodes-test.test',
				showManage: false,
			},
		});

		expect(queryByText('Manage')).not.toBeInTheDocument();
	});

	it('displays "Legacy" when an update is available', () => {
		mockInstalledPackage.value = {
			packageName: 'n8n-nodes-test',
			installedVersion: '1.0.0',
			installedNodes: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		mockHasUpdateAvailable.value = true;

		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				nodeTypeName: 'n8n-nodes-test.test',
				showManage: false,
			},
		});

		expect(getByText('Package version 1.0.0 (Legacy)')).toBeInTheDocument();
	});

	it('displays "Latest" when no update is available', () => {
		mockInstalledPackage.value = {
			packageName: 'n8n-nodes-test',
			installedVersion: '1.0.0',
			installedNodes: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				nodeTypeName: 'n8n-nodes-test.test',
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
				nodeTypeName: 'n8n-nodes-test.test',
				showManage: false,
			},
		});

		expect(queryByText(/Package version/)).not.toBeInTheDocument();
	});
});
