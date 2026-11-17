import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { createEventBus } from '@n8n/utils/event-bus';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { DELETE_FOLDER_MODAL_KEY } from '../folders.constants';
import { useFoldersStore } from '../folders.store';
import DeleteFolderModal from './DeleteFolderModal.vue';

vi.mock('vue-router', () => ({
	useRouter: vi.fn().mockReturnValue({
		push: vi.fn(),
		resolve: vi.fn().mockReturnValue({ href: '/projects/project-1/folders/folder-1' }),
	}),
	useRoute: vi.fn().mockReturnValue({
		name: 'ProjectWorkflows',
		params: { projectId: 'project-1' },
		query: {},
	}),
	RouterLink: vi.fn(),
}));

const FOLDER_ID = 'folder-1';
const FOLDER_NAME = 'Reports';

const DialogStub = {
	props: ['header'],
	template: `
		<div role="dialog">
			<h2 v-if="header">{{ header }}</h2>
			<slot />
		</div>
	`,
};

const dialogPartStub = { template: '<div><slot /></div>' };

const renderModal = createComponentRenderer(DeleteFolderModal, {
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

describe('DeleteFolderModal', () => {
	let foldersStore: MockedStore<typeof useFoldersStore>;
	let renderResult: ReturnType<typeof renderModal>;

	beforeEach(() => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalStateById: {
						[DELETE_FOLDER_MODAL_KEY]: { open: true },
					},
					modalStack: [DELETE_FOLDER_MODAL_KEY],
				},
				[STORES.FOLDERS]: {
					breadcrumbsCache: {
						[FOLDER_ID]: { id: FOLDER_ID, name: FOLDER_NAME },
					},
				},
			},
		});
		foldersStore = mockedStore(useFoldersStore);
		foldersStore.deleteFolder.mockResolvedValue(undefined);
		renderResult = renderModal({
			pinia,
			props: {
				modalName: DELETE_FOLDER_MODAL_KEY,
				activeId: FOLDER_ID,
				data: {
					workflowListEventBus: createEventBus(),
					content: { workflowCount: 1, subFolderCount: 0 },
				},
			},
		});
	});

	it('submits the delete action when Enter is pressed in the confirmation input', async () => {
		const { getByRole, getByTestId } = renderResult;
		const confirmButton = getByTestId('confirm-delete-folder-button');
		expect(confirmButton).toBeDisabled();

		await userEvent.click(getByTestId('delete-content-radio'));

		const input = getByRole('textbox');
		expect(input).toHaveAttribute('placeholder', `delete ${FOLDER_NAME}`);

		await userEvent.type(input, 'delete{Enter}');
		expect(foldersStore.deleteFolder).not.toHaveBeenCalled();
		expect(confirmButton).toBeDisabled();

		await userEvent.type(input, ` ${FOLDER_NAME}{Enter}`);

		expect(foldersStore.deleteFolder).toHaveBeenCalledTimes(1);
		expect(foldersStore.deleteFolder).toHaveBeenCalledWith('project-1', FOLDER_ID, undefined);
	});
});
