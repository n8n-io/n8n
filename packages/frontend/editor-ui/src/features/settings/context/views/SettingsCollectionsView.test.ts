import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import SettingsCollectionsView from './SettingsCollectionsView.vue';

const push = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

/**
 * The dialog is a page-local child. The stub shows its open state and a button that plays
 * the dialog's `created` event back to the page.
 */
const CollectionModalStub = {
	props: ['open'],
	emits: ['created', 'update:open'],
	template: `
		<div data-test-id="collection-modal-stub" :data-open="String(open)">
			<button
				data-test-id="collection-modal-stub-created"
				@click="$emit('created', { id: 'c1', name: 'Customer support' })"
			/>
			<button data-test-id="collection-modal-stub-close" @click="$emit('update:open', false)" />
		</div>
	`,
};

const renderView = createComponentRenderer(SettingsCollectionsView, {
	global: { stubs: { CollectionModal: CollectionModalStub } },
});

describe('SettingsCollectionsView', () => {
	beforeEach(() => {
		createTestingPinia();
		push.mockClear();
	});

	it('shows the page header and the create button', () => {
		const { getByTestId } = renderView();
		const page = getByTestId('settings-collections');

		expect(page).toHaveTextContent('Collections');
		expect(page).toHaveTextContent(
			'Reusable sets of knowledge any agent can use. Set it up once, change it in one place.',
		);
		expect(getByTestId('collections-create-button')).toHaveTextContent('Create collection');
		expect(getByTestId('collection-modal-stub')).toHaveAttribute('data-open', 'false');
	});

	it('goes back to the Context page', async () => {
		const { getByText } = renderView();

		await userEvent.click(getByText('Back to Context'));

		expect(push).toHaveBeenCalledWith({ name: 'SettingsContext' });
	});

	it('opens the dialog from the create button', async () => {
		const { getByTestId } = renderView();

		await userEvent.click(getByTestId('collections-create-button'));

		expect(getByTestId('collection-modal-stub')).toHaveAttribute('data-open', 'true');
	});

	it('closes the dialog after a create', async () => {
		const { getByTestId } = renderView();
		await userEvent.click(getByTestId('collections-create-button'));

		await userEvent.click(getByTestId('collection-modal-stub-created'));

		expect(getByTestId('collection-modal-stub')).toHaveAttribute('data-open', 'false');
		expect(push).not.toHaveBeenCalled();
	});

	it('closes the dialog on cancel', async () => {
		const { getByTestId } = renderView();
		await userEvent.click(getByTestId('collections-create-button'));

		await userEvent.click(getByTestId('collection-modal-stub-close'));

		expect(getByTestId('collection-modal-stub')).toHaveAttribute('data-open', 'false');
	});
});
