import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';

import AppBasicsForm from '@/features/apps/components/AppBasicsForm.vue';
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

const renderComponent = createComponentRenderer(AppBasicsForm, {
	pinia: createTestingPinia(),
	props: { projectId: 'p1', appId: 'app1', app },
});

describe('AppBasicsForm', () => {
	let appsStore: ReturnType<typeof mockedStore<typeof useAppsStore>>;

	beforeEach(() => {
		appsStore = mockedStore(useAppsStore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('saves the changed name and namespace and emits the updated app', async () => {
		const updated = { ...app, name: 'Renamed', namespace: 'renamed' };
		appsStore.updateApp.mockResolvedValue(updated);
		const { getByTestId, emitted } = renderComponent();

		const nameInput = getByTestId('app-basics-name');
		const namespaceInput = getByTestId('app-basics-namespace');
		await userEvent.clear(nameInput);
		await userEvent.type(nameInput, 'Renamed');
		await userEvent.clear(namespaceInput);
		await userEvent.type(namespaceInput, 'renamed');
		await userEvent.click(getByTestId('app-basics-save'));

		await waitFor(() =>
			expect(appsStore.updateApp).toHaveBeenCalledWith('p1', 'app1', {
				name: 'Renamed',
				namespace: 'renamed',
				auth: 'public',
			}),
		);
		expect(emitted('saved')).toEqual([[updated]]);
	});

	it('saves the changed access setting', async () => {
		appsStore.updateApp.mockResolvedValue({ ...app, auth: 'n8n' });
		const { getByTestId } = renderComponent();

		await userEvent.click(within(getByTestId('app-basics-auth')).getByRole('combobox'));
		await userEvent.click(await within(document.body).findByText('Signed-in n8n users'));
		await userEvent.click(getByTestId('app-basics-save'));

		await waitFor(() =>
			expect(appsStore.updateApp).toHaveBeenCalledWith('p1', 'app1', {
				name: 'My app',
				namespace: 'my-app',
				auth: 'n8n',
			}),
		);
	});

	it('shows the URL for the typed namespace and disables Save while it is invalid', async () => {
		const { getByTestId } = renderComponent();

		const namespaceInput = getByTestId('app-basics-namespace');
		await userEvent.clear(namespaceInput);
		await userEvent.type(namespaceInput, 'Not Valid!');

		expect(getByTestId('app-basics-url').textContent).toContain('/apps/Not Valid!/');
		expect(getByTestId('app-basics-save')).toBeDisabled();
	});

	it('disables Save while nothing changed', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('app-basics-save')).toBeDisabled();
	});
});
