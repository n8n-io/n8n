import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import AppThemeForm from '@/features/apps/components/AppThemeForm.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';

const app: App = {
	id: 'app1',
	name: 'My app',
	namespace: 'my-app',
	theme: null,
	components: null,
	auth: 'public',
	projectId: 'p1',
	activeVersionId: null,
	publishedAt: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(AppThemeForm, {
	pinia: createTestingPinia(),
	props: { projectId: 'p1', appId: 'app1', theme: null },
});

describe('AppThemeForm', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		appsStore = mockedStore(useAppsStore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('saves the custom CSS with the theme and emits the saved theme', async () => {
		const theme = { customCss: '.app-main { max-width: 80rem; }' };
		appsStore.updateApp.mockResolvedValue({ ...app, theme });
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('app-theme-custom-css'));
		await userEvent.paste(theme.customCss);
		await userEvent.click(getByTestId('app-theme-save'));

		await waitFor(() => expect(appsStore.updateApp).toHaveBeenCalledWith('p1', 'app1', { theme }));
		expect(emitted('saved')).toEqual([[theme]]);
	});

	it('omits customCss when the textarea is empty', async () => {
		appsStore.updateApp.mockResolvedValue({ ...app, theme: {} });
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('app-theme-save'));

		await waitFor(() =>
			expect(appsStore.updateApp).toHaveBeenCalledWith('p1', 'app1', { theme: {} }),
		);
	});

	it('saves the content width with the theme', async () => {
		const theme = { contentWidth: '64rem' };
		appsStore.updateApp.mockResolvedValue({ ...app, theme });
		const { getByTestId } = renderComponent();

		await userEvent.type(getByTestId('app-theme-content-width'), '64rem');
		await userEvent.click(getByTestId('app-theme-save'));

		await waitFor(() => expect(appsStore.updateApp).toHaveBeenCalledWith('p1', 'app1', { theme }));
	});

	it('shows the saved content width from the theme prop', () => {
		const { getByTestId } = renderComponent({ props: { theme: { contentWidth: '1200px' } } });

		expect(getByTestId('app-theme-content-width')).toHaveValue('1200px');
	});

	it('shows the saved custom CSS from the theme prop', () => {
		const { getByTestId } = renderComponent({
			props: { theme: { customCss: '.app-menu { display: none; }' } },
		});

		expect(getByTestId('app-theme-custom-css')).toHaveValue('.app-menu { display: none; }');
	});
});
