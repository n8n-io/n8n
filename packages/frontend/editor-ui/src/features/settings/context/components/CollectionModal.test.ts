import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import {
	KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH,
	KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH,
	type KnowledgeCollectionDto,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCollectionsStore } from '@/features/settings/context/collections.store';

import CollectionModal from './CollectionModal.vue';

const showError = vi.fn();
const showMessage = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

// N8nDialog teleports out of the tree (Reka UI's DialogPortal), so replace it
// with a render-inline pass-through that keeps the open state and the header.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		props: ['open', 'size', 'header'],
		emits: ['update:open'],
		template: `
			<div v-if="open" role="dialog" data-test-id="collection-modal">
				<h2>{{ header }}</h2>
				<slot />
			</div>
		`,
	};
	return { ...actual, N8nDialog };
});

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

const initialState = {
	[STORES.PROJECTS]: {
		personalProject: {
			id: 'personal-1',
			name: 'Me <me@n8n.io>',
			type: 'personal',
			icon: null,
			scopes: ['agent:update'],
		},
		myProjects: [
			{ id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal', scopes: ['agent:update'] },
			// Project admins and editors both hold `agent:update`.
			{ id: 'p-write', name: 'Support team', type: 'team', scopes: ['agent:update'] },
			{ id: 'p-read', name: 'Viewers only', type: 'team', scopes: ['agent:read'] },
		],
	},
};

const created: KnowledgeCollectionDto = {
	id: 'c1',
	name: 'Customer support',
	description: 'Refunds and pricing',
	slug: 'customer-support-abc',
	homeProject: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal' },
	fileCount: 0,
	totalFileSizeBytes: 0,
	agentCount: 0,
	createdAt: '2026-11-20T00:00:00.000Z',
	updatedAt: '2026-11-20T00:00:00.000Z',
};

const renderModal = createComponentRenderer(CollectionModal);

let pinia: ReturnType<typeof createTestingPinia>;
let collectionsStore: MockedStore<typeof useCollectionsStore>;

function nameInput(getByTestId: (id: string) => HTMLElement) {
	return getByTestId('collection-name-input').querySelector('input')!;
}

function descriptionInput(getByTestId: (id: string) => HTMLElement) {
	return getByTestId('collection-description-input').querySelector('textarea')!;
}

async function fillForm(
	getByTestId: (id: string) => HTMLElement,
	name: string,
	description: string,
) {
	await userEvent.type(nameInput(getByTestId), name);
	await userEvent.type(descriptionInput(getByTestId), description);
}

describe('CollectionModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
		collectionsStore = mockedStore(useCollectionsStore);
		collectionsStore.createCollection.mockResolvedValue(created);
		showError.mockReset();
		showMessage.mockReset();
	});

	it('shows the form with its labels and help texts', () => {
		const { getByTestId } = renderModal({ props: { open: true }, pinia });
		const modal = getByTestId('collection-modal');

		expect(modal).toHaveTextContent('New collection');
		expect(nameInput(getByTestId)).toHaveAttribute('placeholder', 'Customer support');
		expect(nameInput(getByTestId)).toHaveAttribute(
			'maxlength',
			String(KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH),
		);
		expect(descriptionInput(getByTestId)).toHaveAttribute(
			'placeholder',
			'Customer support: refunds and pricing',
		);
		expect(descriptionInput(getByTestId)).toHaveAttribute(
			'maxlength',
			String(KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH),
		);
		expect(modal).toHaveTextContent('Agents read this to decide when to search the collection.');
		expect(modal).toHaveTextContent(
			'Every agent in this project can use the collection. You can share it with other projects later.',
		);
		expect(getByTestId('collection-modal-submit')).toHaveTextContent('Create collection');
		expect(getByTestId('collection-modal-cancel')).toHaveTextContent('Cancel');
	});

	it('loads the projects of the user when it opens', () => {
		renderModal({ props: { open: true }, pinia });

		expect(mockedStore(useProjectsStore).getMyProjects).toHaveBeenCalled();
	});

	it('offers the personal project first, then the team projects where the user can edit agents', async () => {
		const { getByTestId } = renderModal({ props: { open: true }, pinia });

		const items = await getDropdownItems(getByTestId('collection-project-select'));

		expect(Array.from(items).map((item) => item.textContent?.trim())).toEqual([
			'Personal project',
			'Support team',
		]);
	});

	it('shows the required errors when the user submits an empty form', async () => {
		const { getByTestId, getAllByText, queryByText } = renderModal({
			props: { open: true },
			pinia,
		});

		expect(queryByText('This field is required')).toBeNull();

		await userEvent.click(getByTestId('collection-modal-submit'));

		expect(getAllByText('This field is required')).toHaveLength(2);
		expect(collectionsStore.createCollection).not.toHaveBeenCalled();
	});

	it('creates the collection in the personal project by default, with trimmed text', async () => {
		const { getByTestId, emitted } = renderModal({ props: { open: true }, pinia });

		await fillForm(getByTestId, '  Customer support ', ' Refunds and pricing  ');
		await userEvent.click(getByTestId('collection-modal-submit'));

		expect(collectionsStore.createCollection).toHaveBeenCalledWith('personal-1', {
			name: 'Customer support',
			description: 'Refunds and pricing',
		});
		await waitFor(() => expect(emitted('created')).toEqual([[created]]));
		expect(emitted('saved')).toEqual([[created]]);
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Collection “Customer support” created.',
			type: 'success',
		});
	});

	it('creates the collection in the team project that the user picks', async () => {
		const { getByTestId } = renderModal({ props: { open: true }, pinia });
		await fillForm(getByTestId, 'Customer support', 'Refunds and pricing');

		const items = await getDropdownItems(getByTestId('collection-project-select'));
		const team = Array.from(items).find((item) => item.textContent?.includes('Support team'));
		await userEvent.click(team!);
		await userEvent.click(getByTestId('collection-modal-submit'));

		expect(collectionsStore.createCollection).toHaveBeenCalledWith('p-write', {
			name: 'Customer support',
			description: 'Refunds and pricing',
		});
	});

	it('shows a taken name under the name field and keeps the dialog open', async () => {
		collectionsStore.createCollection.mockRejectedValue(
			new ResponseError('A collection with this name already exists in this project.', {
				httpStatusCode: 409,
			}),
		);
		const { getByTestId, queryByTestId, emitted } = renderModal({ props: { open: true }, pinia });

		await fillForm(getByTestId, 'Customer support', 'Refunds and pricing');
		await userEvent.click(getByTestId('collection-modal-submit'));

		await waitFor(() =>
			expect(getByTestId('collection-name-error')).toHaveTextContent(
				'A collection with this name already exists.',
			),
		);
		expect(emitted('created')).toBeUndefined();
		expect(showError).not.toHaveBeenCalled();

		await userEvent.type(nameInput(getByTestId), ' 2');

		expect(queryByTestId('collection-name-error')).toBeNull();
	});

	it('clears a taken name error when the user picks another project', async () => {
		collectionsStore.createCollection.mockRejectedValue(
			new ResponseError('A collection with this name already exists in this project.', {
				httpStatusCode: 409,
			}),
		);
		const { getByTestId, queryByTestId } = renderModal({ props: { open: true }, pinia });

		await fillForm(getByTestId, 'Customer support', 'Refunds and pricing');
		await userEvent.click(getByTestId('collection-modal-submit'));
		await waitFor(() => expect(getByTestId('collection-name-error')).toBeInTheDocument());

		const items = await getDropdownItems(getByTestId('collection-project-select'));
		const team = Array.from(items).find((item) => item.textContent?.includes('Support team'));
		await userEvent.click(team!);

		expect(queryByTestId('collection-name-error')).toBeNull();
	});

	it('reports any other failure in a toast', async () => {
		const failure = new Error('offline');
		collectionsStore.createCollection.mockRejectedValue(failure);
		const { getByTestId, queryByTestId, emitted } = renderModal({ props: { open: true }, pinia });

		await fillForm(getByTestId, 'Customer support', 'Refunds and pricing');
		await userEvent.click(getByTestId('collection-modal-submit'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(failure, 'Could not create collection'),
		);
		expect(queryByTestId('collection-name-error')).toBeNull();
		expect(emitted('created')).toBeUndefined();
	});

	it('confirms a create that ends after the dialog opens again, without closing the new dialog', async () => {
		const pending = createDeferredPromise<KnowledgeCollectionDto>();
		collectionsStore.createCollection.mockReturnValue(pending.promise);
		const { getByTestId, rerender, emitted } = renderModal({ props: { open: true }, pinia });

		await fillForm(getByTestId, 'Customer support', 'Refunds and pricing');
		await userEvent.click(getByTestId('collection-modal-submit'));
		await rerender({ open: false });
		await rerender({ open: true });
		pending.resolve(created);

		await waitFor(() =>
			expect(showMessage).toHaveBeenCalledWith({
				title: 'Collection “Customer support” created.',
				type: 'success',
			}),
		);
		expect(emitted('saved')).toEqual([[created]]);
		expect(emitted('created')).toBeUndefined();
	});

	it('reports a taken name in a toast when the create ends after the dialog opens again', async () => {
		const pending = createDeferredPromise<KnowledgeCollectionDto>();
		collectionsStore.createCollection.mockReturnValue(pending.promise);
		const failure = new ResponseError(
			'A collection with this name already exists in this project.',
			{ httpStatusCode: 409 },
		);
		const { getByTestId, queryByTestId, rerender, emitted } = renderModal({
			props: { open: true },
			pinia,
		});

		await fillForm(getByTestId, 'Customer support', 'Refunds and pricing');
		await userEvent.click(getByTestId('collection-modal-submit'));
		await rerender({ open: false });
		await rerender({ open: true });
		pending.reject(failure);

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(failure, 'Could not create collection'),
		);
		expect(queryByTestId('collection-name-error')).toBeNull();
		expect(emitted('created')).toBeUndefined();
	});

	it('counts the description characters against the limit', async () => {
		const { getByTestId } = renderModal({ props: { open: true }, pinia });

		await userEvent.type(descriptionInput(getByTestId), 'Refunds');

		expect(getByTestId('collection-description-counter')).toHaveTextContent(
			`7 / ${KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH}`,
		);
	});

	it('asks the page to close on cancel', async () => {
		const { getByTestId, emitted } = renderModal({ props: { open: true }, pinia });

		await userEvent.click(getByTestId('collection-modal-cancel'));

		expect(emitted('update:open')).toEqual([[false]]);
	});

	it('starts empty again when it opens a second time', async () => {
		const { getByTestId, rerender } = renderModal({ props: { open: true }, pinia });
		await fillForm(getByTestId, 'Customer support', 'Refunds and pricing');

		await rerender({ open: false });
		await rerender({ open: true });

		expect(nameInput(getByTestId)).toHaveValue('');
		expect(descriptionInput(getByTestId)).toHaveValue('');
	});
});
