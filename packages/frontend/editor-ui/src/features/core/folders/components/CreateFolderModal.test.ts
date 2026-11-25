import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { useUIStore } from '@/app/stores/ui.store';

import { CREATE_FOLDER_MODAL_KEY } from '../folders.constants';
import CreateFolderModal from './CreateFolderModal.vue';

const DialogStub = {
	props: ['header', 'closeOnEscape', 'closeOnOverlayClick', 'showCloseButton'],
	emits: ['update:open'],
	template: `
		<div
			role="dialog"
			:data-close-on-escape="String(closeOnEscape)"
			:data-close-on-overlay-click="String(closeOnOverlayClick)"
			:data-show-close-button="String(showCloseButton)"
		>
			<button type="button" data-test-id="stub-dismiss" @click="$emit('update:open', false)">
				Dismiss
			</button>
			<h2 v-if="header">{{ header }}</h2>
			<slot />
		</div>
	`,
};

const dialogPartStub = { template: '<div><slot /></div>' };

const renderModal = createComponentRenderer(CreateFolderModal, {
	global: {
		stubs: {
			Dialog: DialogStub,
			DialogHeader: dialogPartStub,
			DialogTitle: dialogPartStub,
			DialogFooter: dialogPartStub,
			DialogDescription: dialogPartStub,
		},
	},
});

describe('CreateFolderModal', () => {
	let uiStore: MockedStore<typeof useUIStore>;
	let renderResult: ReturnType<typeof renderModal>;
	const onConfirm = vi.fn();

	beforeEach(() => {
		onConfirm.mockReset();
		onConfirm.mockResolvedValue(undefined);
		const pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalStateById: {
						[CREATE_FOLDER_MODAL_KEY]: { open: true },
					},
					modalStack: [CREATE_FOLDER_MODAL_KEY],
				},
			},
		});
		uiStore = mockedStore(useUIStore);
		renderResult = renderModal({
			pinia,
			props: {
				modalName: CREATE_FOLDER_MODAL_KEY,
				data: { parentName: 'Reports', onConfirm },
			},
		});
	});

	it('asks for a name in the parent folder and creates it', async () => {
		const { getByRole, getByTestId, getByText, queryByText } = renderResult;

		expect(getByRole('heading', { name: "Create folder in 'Reports'" })).toBeInTheDocument();
		expect(getByTestId('create-folder-confirm')).toBeDisabled();

		const nameInput = getByRole('textbox', { name: /Name/ });
		await userEvent.click(nameInput);
		expect(queryByText('This field is required')).not.toBeInTheDocument();
		expect(queryByText(/Folder name cannot/)).not.toBeInTheDocument();

		await userEvent.type(nameInput, 'bad/name');
		await userEvent.tab();
		expect(getByText(/Folder name cannot contain the following characters:/)).toBeInTheDocument();
		expect(getByTestId('create-folder-confirm')).toBeDisabled();

		await userEvent.clear(nameInput);
		await userEvent.type(nameInput, 'Quarterly');
		expect(getByTestId('create-folder-confirm')).toBeEnabled();

		await userEvent.click(getByTestId('create-folder-confirm'));

		expect(onConfirm).toHaveBeenCalledWith('Quarterly');
		expect(uiStore.closeModal).toHaveBeenCalledWith(CREATE_FOLDER_MODAL_KEY);
	});

	it('creates the folder when Enter is pressed in the name field', async () => {
		const { getByRole } = renderResult;

		const nameInput = getByRole('textbox', { name: /Name/ });
		await userEvent.type(nameInput, 'Quarterly');
		await userEvent.keyboard('{Enter}');

		expect(onConfirm).toHaveBeenCalledWith('Quarterly');
		expect(uiStore.closeModal).toHaveBeenCalledWith(CREATE_FOLDER_MODAL_KEY);
	});

	it('closes without creating a folder when cancelled', async () => {
		const { getByTestId } = renderResult;

		await userEvent.click(getByTestId('create-folder-cancel'));

		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.closeModal).toHaveBeenCalledWith(CREATE_FOLDER_MODAL_KEY);
	});

	it('keeps the dialog open while the folder is created', async () => {
		let finishCreate: () => void = () => {};
		onConfirm.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finishCreate = resolve;
				}),
		);

		const { getByRole, getByTestId } = renderResult;
		await userEvent.type(getByRole('textbox', { name: /Name/ }), 'Quarterly');
		await userEvent.click(getByTestId('create-folder-confirm'));

		const dialog = getByRole('dialog');
		expect(dialog).toHaveAttribute('data-close-on-escape', 'false');
		expect(dialog).toHaveAttribute('data-close-on-overlay-click', 'false');
		expect(dialog).toHaveAttribute('data-show-close-button', 'false');
		expect(getByTestId('create-folder-cancel')).toBeDisabled();

		await userEvent.click(getByTestId('stub-dismiss'));
		expect(uiStore.closeModal).not.toHaveBeenCalled();

		finishCreate();
		await waitFor(() => {
			expect(uiStore.closeModal).toHaveBeenCalledWith(CREATE_FOLDER_MODAL_KEY);
		});
	});
});
