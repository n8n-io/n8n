import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

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
 * The dialog is a page-local child. The stub shows its open state, the collection it edits, and
 * buttons that play the dialog's `saved` and `created` events back to the page.
 */
const CollectionModalStub = {
	props: ['open', 'collection'],
	emits: ['saved', 'created', 'update:open'],
	template: `
		<div
			data-test-id="collection-modal-stub"
			:data-open="String(open)"
			:data-collection="collection?.id ?? ''"
		>
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

/** The stub shows the collection it deletes and plays its `deleted` and `close` events back. */
const DeleteCollectionDialogStub = {
	props: ['collection'],
	emits: ['deleted', 'close'],
	template: `
		<div data-test-id="collection-delete-dialog-stub" :data-collection="collection.id">
			<button
				data-test-id="collection-delete-dialog-stub-deleted"
				@click="$emit('deleted', collection)"
			/>
			<button data-test-id="collection-delete-dialog-stub-close" @click="$emit('close')" />
		</div>
	`,
};

const renderView = createComponentRenderer(SettingsCollectionsView, {
	global: {
		stubs: {
			CollectionModal: CollectionModalStub,
			DeleteCollectionDialog: DeleteCollectionDialogStub,
		},
	},
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

/** One collection in a project where the user can edit agents, so its row has a menu. */
async function renderWithEditableRow() {
	mockedStore(useProjectsStore).myProjects = [
		{ id: 'team-1', name: 'Support team', type: 'team', scopes: ['agent:update'] },
	] as ProjectListItem[];
	const collectionsStore = mockedStore(useCollectionsStore);
	collectionsStore.collections = [collection('c1', 'Customer support')];
	collectionsStore.count = 1;

	const rendered = renderView();
	await new Promise(process.nextTick);
	return { ...rendered, collectionsStore };
}

async function pickRowAction(getByTestId: (id: string) => HTMLElement, action: 'edit' | 'delete') {
	await userEvent.click(getByTestId('collection-row-actions').querySelector('button')!);
	await waitFor(() =>
		expect(document.querySelector(`[data-test-id="action-${action}"]`)).toBeInTheDocument(),
	);
	await userEvent.click(document.querySelector(`[data-test-id="action-${action}"]`)!);
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

	it('opens the collection of a clicked row', async () => {
		const { getByTestId } = await renderWithEditableRow();

		await userEvent.click(getByTestId('collection-name'));

		expect(push).toHaveBeenCalledWith({
			name: 'KnowledgeCollection',
			params: { projectId: 'team-1', collectionId: 'c1' },
		});
	});

	it('opens the dialog in edit mode for the collection of the row', async () => {
		const { getByTestId } = await renderWithEditableRow();

		await pickRowAction(getByTestId, 'edit');

		const modal = getByTestId('collection-modal-stub');
		expect(modal).toHaveAttribute('data-open', 'true');
		expect(modal).toHaveAttribute('data-collection', 'c1');
		expect(push).not.toHaveBeenCalled();
	});

	it('reloads the list after an edit', async () => {
		const { getByTestId, collectionsStore } = await renderWithEditableRow();
		await pickRowAction(getByTestId, 'edit');

		await userEvent.click(getByTestId('collection-modal-stub-saved'));

		expect(collectionsStore.fetchCollections).toHaveBeenCalledTimes(2);
	});

	it('opens the create dialog with no collection after an edit', async () => {
		const { getByTestId } = await renderWithEditableRow();
		await pickRowAction(getByTestId, 'edit');
		await userEvent.click(getByTestId('collection-modal-stub-close'));

		await userEvent.click(getByTestId('collections-create-button'));

		const modal = getByTestId('collection-modal-stub');
		expect(modal).toHaveAttribute('data-open', 'true');
		expect(modal).toHaveAttribute('data-collection', '');
	});

	it('opens the delete dialog for the collection of the row', async () => {
		const { getByTestId, queryByTestId } = await renderWithEditableRow();
		expect(queryByTestId('collection-delete-dialog-stub')).toBeNull();

		await pickRowAction(getByTestId, 'delete');

		expect(getByTestId('collection-delete-dialog-stub')).toHaveAttribute('data-collection', 'c1');
		expect(push).not.toHaveBeenCalled();
	});

	it('closes the delete dialog and reloads the list after a delete', async () => {
		const { getByTestId, queryByTestId, collectionsStore } = await renderWithEditableRow();
		await pickRowAction(getByTestId, 'delete');

		await userEvent.click(getByTestId('collection-delete-dialog-stub-deleted'));

		expect(queryByTestId('collection-delete-dialog-stub')).toBeNull();
		expect(collectionsStore.fetchCollections).toHaveBeenCalledTimes(2);
	});

	it('closes the delete dialog on cancel without loading the list again', async () => {
		const { getByTestId, queryByTestId, collectionsStore } = await renderWithEditableRow();
		await pickRowAction(getByTestId, 'delete');

		await userEvent.click(getByTestId('collection-delete-dialog-stub-close'));

		expect(queryByTestId('collection-delete-dialog-stub')).toBeNull();
		expect(collectionsStore.fetchCollections).toHaveBeenCalledTimes(1);
	});
});
