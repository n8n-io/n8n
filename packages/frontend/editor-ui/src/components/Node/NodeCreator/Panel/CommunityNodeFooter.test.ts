import { fireEvent, waitFor } from '@testing-library/vue';
import { VIEWS } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CommunityNodeFooter from './CommunityNodeFooter.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { vi } from 'vitest';
import type { PublicInstalledPackage } from 'n8n-workflow';

const getInstalledPackage = vi.fn();

const push = vi.fn();

const communityNodesStore: {
	getInstalledPackage: (packageName: string) => Promise<PublicInstalledPackage>;
} = {
	getInstalledPackage,
};

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		useRouter: vi.fn(() => ({
			push,
		})),
	};
});

vi.mock('@/stores/communityNodes.store', () => ({
	useCommunityNodesStore: vi.fn(() => communityNodesStore),
}));

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

	it('Manage should not be in the footer', async () => {
		const { queryByText } = createComponentRenderer(CommunityNodeFooter)({
			props: { packageName: 'n8n-nodes-test', showManage: false },
		});

		expect(queryByText('Manage')).not.toBeInTheDocument();
	});

	it('displays "Legacy" when updateAvailable', async () => {
		getInstalledPackage.mockResolvedValue({
			installedVersion: '1.0.0',
			updateAvailable: '1.0.1',
		} as PublicInstalledPackage);
		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				showManage: false,
			},
		});
		await waitFor(() => expect(getInstalledPackage).toHaveBeenCalled());

		expect(getByText('Package version 1.0.0 (Legacy)')).toBeInTheDocument();
	});

	it('displays "Latest" when not updateAvailable', async () => {
		getInstalledPackage.mockResolvedValue({
			installedVersion: '1.0.0',
		} as PublicInstalledPackage);
		const { getByText } = createComponentRenderer(CommunityNodeFooter)({
			props: {
				packageName: 'n8n-nodes-test',
				showManage: false,
			},
		});

		await waitFor(() => expect(getInstalledPackage).toHaveBeenCalled());

		expect(getByText('Package version 1.0.0 (Latest)')).toBeInTheDocument();
	});
});
