import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import SettingsCollectionsView from './SettingsCollectionsView.vue';
import { useCollectionsStore } from '../collections.store';

const push = vi.fn();
const showErrorMock = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: vi.fn() }),
}));

/**
 * The dialog is a page-local child. The stub shows its open state and buttons that play
 * the dialog's `saved` and `created` events back to the page.
 */
const CollectionModalStub = {
	props: ['open'],
	emits: ['saved', 'created', 'update:open'],
	template: `
		<div data-test-id="collection-modal-stub" :data-open="String(open)">
			<button
				data-test-id="collection-modal-stub-saved"
				@click="$emit('saved', { id: 'c1', name: 'Customer support' })"
			/>
			<button
				data-test-id="collection-modal-stub-created"
				@click="$emit('created', { id: 'c1', name: 'Customer support', homeProject: { id: 'p1' } })"
			/>
			<button data-test-id="collection-modal-stub-close" @click="$emit('update:open', false)" />
		</div>
	`,
};

const renderView = createComponentRenderer(SettingsCollectionsView, {
	global: { stubs: { CollectionModal: CollectionModalStub } },
});

function collection(id: string, name: string): KnowledgeCollectionDto {
	return {
		id,
		name,
		description: 'Refunds and pricing',
		slug: id,
		homeProject: { id: 'team-1', name: 'Support team', type: 'team' },
		fileCount: 2,
		totalFileSizeBytes: 100,
		agentCount: 1,
		createdAt: '2026-11-01T00:00:00.000Z',
		updatedAt: '2026-11-01T00:00:00.000Z',
	};
}

function rowNames(getAllByTestId: (id: string) => HTMLElement[]) {
	return getAllByTestId('collection-name').map((cell) => cell.textContent?.trim());
}

describe('SettingsCollectionsView', () => {
	beforeEach(() => {
		createTestingPinia();
		push.mockClear();
		showErrorMock.mockClear();
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

	it('closes the dialog and opens the new collection after a create', async () => {
		const { getByTestId } = renderView();
		await userEvent.click(getByTestId('collections-create-button'));

		await userEvent.click(getByTestId('collection-modal-stub-created'));

		expect(getByTestId('collection-modal-stub')).toHaveAttribute('data-open', 'false');
		expect(push).toHaveBeenCalledWith({
			name: 'KnowledgeCollection',
			params: { projectId: 'p1', collectionId: 'c1' },
		});
	});

	it('closes the dialog on cancel', async () => {
		const { getByTestId } = renderView();
		await userEvent.click(getByTestId('collections-create-button'));

		await userEvent.click(getByTestId('collection-modal-stub-close'));

		expect(getByTestId('collection-modal-stub')).toHaveAttribute('data-open', 'false');
	});

	it('loads the collections when the page opens', () => {
		const collectionsStore = mockedStore(useCollectionsStore);

		renderView();

		expect(collectionsStore.fetchCollections).toHaveBeenCalledTimes(1);
	});

	it('shows the table loading state and no empty state while the list loads', async () => {
		const collectionsStore = mockedStore(useCollectionsStore);
		collectionsStore.loading = true;

		const { getByTestId, queryByTestId } = renderView();
		await new Promise(process.nextTick);

		const table = getByTestId('collections-table');
		expect(table.querySelector('.loading-row')).not.toBeNull();
		expect(table.querySelector('.el-skeleton')).not.toBeNull();
		expect(queryByTestId('collections-empty-state')).toBeNull();
	});

	it('shows the empty state in the table when there are no collections', async () => {
		const { getByTestId } = renderView();
		await new Promise(process.nextTick);

		const emptyState = getByTestId('collections-empty-state');
		expect(getByTestId('collections-table')).toContainElement(emptyState);
		expect(emptyState).toHaveTextContent('No collections yet');
		expect(emptyState).toHaveTextContent(
			'A collection is a set of files and vector stores many agents can search. Change it once and every agent gets the update.',
		);

		await userEvent.click(getByTestId('collections-empty-create-button'));

		expect(getByTestId('collection-modal-stub')).toHaveAttribute('data-open', 'true');
	});

	it('reports a failed load and does not show the empty state for it', async () => {
		const error = new Error('offline');
		mockedStore(useCollectionsStore).fetchCollections.mockRejectedValueOnce(error);

		const { queryByTestId } = renderView();
		await new Promise(process.nextTick);

		expect(showErrorMock).toHaveBeenCalledWith(error, 'Could not load collections');
		expect(queryByTestId('collections-empty-state')).toBeNull();
	});

	it('lists the collections in the order the server sends them', async () => {
		const collectionsStore = mockedStore(useCollectionsStore);
		collectionsStore.collections = [collection('c2', 'Newest'), collection('c1', 'Oldest')];
		collectionsStore.count = 2;

		const { getAllByTestId, queryByTestId } = renderView();
		await new Promise(process.nextTick);

		expect(rowNames(getAllByTestId)).toEqual(['Newest', 'Oldest']);
		expect(queryByTestId('collections-empty-state')).toBeNull();
	});

	it('loads the list again after every save, so the new collection shows first', async () => {
		const collectionsStore = mockedStore(useCollectionsStore);
		collectionsStore.collections = [collection('c1', 'Oldest')];
		collectionsStore.count = 1;

		const { getByTestId, getAllByTestId } = renderView();
		await new Promise(process.nextTick);
		expect(collectionsStore.fetchCollections).toHaveBeenCalledTimes(1);

		collectionsStore.fetchCollections.mockImplementationOnce(async () => {
			collectionsStore.collections = [
				collection('c2', 'Customer support'),
				collection('c1', 'Oldest'),
			];
			collectionsStore.count = 2;
			return { count: 2, data: collectionsStore.collections };
		});
		await userEvent.click(getByTestId('collections-create-button'));
		await userEvent.click(getByTestId('collection-modal-stub-saved'));

		expect(collectionsStore.fetchCollections).toHaveBeenCalledTimes(2);
		await waitFor(() => expect(rowNames(getAllByTestId)).toEqual(['Customer support', 'Oldest']));
	});
});
