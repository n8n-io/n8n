import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { STORES } from '@n8n/stores';

import AddAppModal from '@/features/apps/components/AddAppModal.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { ADD_APP_MODAL_KEY } from '@/features/apps/apps.constants';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';

const routerPush = vi.fn();
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: routerPush }),
}));

const app: App = {
	id: 'app1',
	name: 'My app',
	namespace: 'my-app',
	theme: null,
	auth: 'public',
	components: null,
	projectId: 'p1',
	activeVersionId: null,
	publishedAt: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(AddAppModal, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: { [ADD_APP_MODAL_KEY]: { open: true, data: { projectId: 'p1' } } },
			},
		},
	}),
	props: { modalName: ADD_APP_MODAL_KEY, data: { projectId: 'p1' } },
});

describe('AddAppModal', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		appsStore = mockedStore(useAppsStore);
		appsStore.createApp.mockResolvedValue(app);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('offers the layout presets as preview cards with top-nav selected by default', async () => {
		const { getByTestId, getByAltText } = renderComponent();

		await waitFor(() =>
			expect(getByTestId('apps-new-layout-preset-top-nav')).toHaveAttribute('aria-checked', 'true'),
		);
		expect(getByTestId('apps-new-layout-preset-sidebar')).toHaveAttribute('aria-checked', 'false');
		expect(getByTestId('apps-new-layout-preset').textContent).toContain('Sidebar');
		expect(getByAltText('Sidebar').getAttribute('src')).toContain('sidebar');
		expect(getByTestId('apps-new-layout-preset').querySelectorAll('img')).toHaveLength(4);
	});

	it('moves the selection with the arrow keys', async () => {
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('apps-new-layout-preset-top-nav')).toBeInTheDocument());
		await userEvent.click(getByTestId('apps-new-layout-preset-top-nav'));
		await userEvent.keyboard('{ArrowRight}');

		expect(getByTestId('apps-new-layout-preset-sidebar')).toHaveAttribute('aria-checked', 'true');
		expect(getByTestId('apps-new-layout-preset-sidebar')).toHaveFocus();

		await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
		expect(getByTestId('apps-new-layout-preset-minimal')).toHaveAttribute('aria-checked', 'true');
	});

	it('creates the app with the name, the derived namespace and the chosen preset, then opens it', async () => {
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('apps-new-name')).toBeInTheDocument());
		const nameInput = getByTestId('apps-new-name').querySelector('input');
		if (!nameInput) throw new Error('name input not rendered');
		await userEvent.type(nameInput, 'My app');
		await userEvent.click(getByTestId('apps-new-layout-preset-sidebar'));
		await waitFor(() => expect(getByTestId('apps-new-submit')).toBeEnabled());
		await userEvent.click(getByTestId('apps-new-submit'));

		await waitFor(() =>
			expect(appsStore.createApp).toHaveBeenCalledWith('p1', 'My app', 'my-app', 'sidebar'),
		);
		expect(routerPush).toHaveBeenCalledWith(
			expect.objectContaining({ params: { projectId: 'p1', appId: 'app1' } }),
		);
	});
});
