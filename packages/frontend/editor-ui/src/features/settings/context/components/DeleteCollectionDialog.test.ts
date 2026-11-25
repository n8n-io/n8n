import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useCollectionsStore } from '@/features/settings/context/collections.store';

import DeleteCollectionDialog from './DeleteCollectionDialog.vue';

const showError = vi.fn();
const showMessage = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

// N8nDialog teleports out of the tree (Reka UI's DialogPortal), so replace it with a
// render-inline pass-through that keeps the header and the close button of the title row.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		// Boolean, so the bare `open` attribute of the dialog counts as open.
		props: { open: Boolean, header: String },
		emits: ['update:open'],
		template: `
			<div v-if="open" role="dialog">
				<h2>{{ header }}</h2>
				<button data-test-id="dialog-close" @click="$emit('update:open', false)" />
				<slot />
			</div>
		`,
	};
	return { ...actual, N8nDialog };
});

function collection(overrides: Partial<KnowledgeCollectionDto> = {}): KnowledgeCollectionDto {
	return {
		id: 'c1',
		name: 'Customer support',
		description: 'Refunds and pricing',
		slug: 'customer-support',
		homeProject: { id: 'team-1', name: 'Support team', type: 'team' },
		fileCount: 3,
		totalFileSizeBytes: 100,
		agentCount: 0,
		createdAt: '2026-11-01T00:00:00.000Z',
		updatedAt: '2026-11-01T00:00:00.000Z',
		...overrides,
	};
}

const renderDialog = createComponentRenderer(DeleteCollectionDialog);

let collectionsStore: MockedStore<typeof useCollectionsStore>;

describe('DeleteCollectionDialog', () => {
	beforeEach(() => {
		createTestingPinia();
		collectionsStore = mockedStore(useCollectionsStore);
		collectionsStore.deleteCollection.mockResolvedValue(undefined);
		showError.mockReset();
		showMessage.mockReset();
	});

	it('names the collection and says what the delete removes', () => {
		const { getByTestId } = renderDialog({ props: { collection: collection() } });
		const dialog = getByTestId('collection-delete-dialog');

		expect(dialog).toHaveTextContent('Delete Customer support?');
		expect(dialog).toHaveTextContent(
			'This deletes the collection and everything in it, for every project it is shared with.',
		);
		expect(getByTestId('collection-delete-cancel')).toHaveTextContent('Cancel');
		expect(getByTestId('collection-delete-confirm')).toHaveTextContent('Delete collection');
	});

	it.each([
		[1, '1 agent uses this collection and will stop answering from it.'],
		[2, '2 agents use this collection and will stop answering from it.'],
	])('warns that %i agents stop answering from the collection', (agentCount, expected) => {
		const { getByTestId, queryByTestId } = renderDialog({
			props: { collection: collection({ agentCount }) },
		});

		expect(getByTestId('collection-delete-agents-warning')).toHaveTextContent(expected);
		expect(queryByTestId('collection-delete-no-agents')).toBeNull();
	});

	it('says that no agents use the collection, with no warning', () => {
		const { getByTestId, queryByTestId } = renderDialog({
			props: { collection: collection({ agentCount: 0 }) },
		});

		expect(getByTestId('collection-delete-no-agents')).toHaveTextContent(
			'No agents use this collection.',
		);
		expect(queryByTestId('collection-delete-agents-warning')).toBeNull();
	});

	it('deletes the collection in its home project, then reports the delete', async () => {
		const target = collection();
		const { getByTestId, emitted } = renderDialog({ props: { collection: target } });

		await userEvent.click(getByTestId('collection-delete-confirm'));

		expect(collectionsStore.deleteCollection).toHaveBeenCalledWith('team-1', 'c1');
		await waitFor(() => expect(emitted('deleted')).toEqual([[target]]));
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Collection “Customer support” deleted.',
			type: 'success',
		});
		expect(showError).not.toHaveBeenCalled();
	});

	it('reports a failed delete in a toast and stays open', async () => {
		const failure = new Error('offline');
		collectionsStore.deleteCollection.mockRejectedValue(failure);
		const { getByTestId, emitted } = renderDialog({ props: { collection: collection() } });

		await userEvent.click(getByTestId('collection-delete-confirm'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(failure, 'Could not delete collection'),
		);
		expect(emitted('deleted')).toBeUndefined();
		expect(emitted('close')).toBeUndefined();
		expect(showMessage).not.toHaveBeenCalled();
		expect(getByTestId('collection-delete-confirm')).toBeEnabled();
	});

	it('closes without deleting on cancel', async () => {
		const { getByTestId, emitted } = renderDialog({ props: { collection: collection() } });

		await userEvent.click(getByTestId('collection-delete-cancel'));

		expect(emitted('close')).toEqual([[]]);
		expect(collectionsStore.deleteCollection).not.toHaveBeenCalled();
	});

	it('closes without deleting from the close button of the dialog', async () => {
		const { getByTestId, emitted } = renderDialog({ props: { collection: collection() } });

		await userEvent.click(getByTestId('dialog-close'));

		expect(emitted('close')).toEqual([[]]);
		expect(collectionsStore.deleteCollection).not.toHaveBeenCalled();
	});

	it('shows progress and does not close while the delete runs', async () => {
		const pending = createDeferredPromise<void>();
		collectionsStore.deleteCollection.mockReturnValue(pending.promise);
		const { getByTestId, emitted } = renderDialog({ props: { collection: collection() } });

		await userEvent.click(getByTestId('collection-delete-confirm'));

		expect(getByTestId('collection-delete-confirm')).toBeDisabled();
		expect(getByTestId('collection-delete-cancel')).toBeDisabled();
		await userEvent.click(getByTestId('dialog-close'));
		expect(emitted('close')).toBeUndefined();

		pending.resolve();
		await waitFor(() => expect(emitted('deleted')).toHaveLength(1));
	});
});
