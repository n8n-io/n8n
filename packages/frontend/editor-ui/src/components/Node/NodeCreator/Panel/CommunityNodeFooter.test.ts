import { fireEvent } from '@testing-library/vue';
import { VIEWS } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CommunityNodeFooter from './CommunityNodeFooter.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { vi } from 'vitest';

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
});
