import { createComponentRenderer } from '@/__tests__/render';
import MoveToFolderModal from './MoveToFolderModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { cleanupAppModals, createAppModals, mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/stores/ui.store';
import { MOVE_FOLDER_MODAL_KEY } from '@/constants';
import { waitFor } from '@testing-library/vue';
import { screen } from '@testing-library/vue';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '/projects/1/folders/1' });
	return {
		useRouter: vi.fn().mockReturnValue({
			push,
			resolve,
		}),
		useRoute: vi.fn().mockReturnValue({
			params: {
				projectId: '1',

				folderId: '1',
			},
			query: {},
		}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(MoveToFolderModal, {
	props: {
		modalName: MOVE_FOLDER_MODAL_KEY,
	},
});

const TEST_FOLDER_RESOURCE = {
	id: 'test-folder-id',
	name: 'Test Folder',
	parentFolderId: 'test-parent-folder-id',
};

const TEST_WORKFLOW_RESOURCE = {
	id: 'test-workflow-id',
	name: 'Test Workflow',
	parentFolderId: 'test-parent-folder-id',
};

let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
describe('MoveToFolderModal', () => {
	beforeEach(() => {
		createAppModals();
		createTestingPinia();
		uiStore = mockedStore(useUIStore);
		uiStore.modalsById = {
			[MOVE_FOLDER_MODAL_KEY]: {
				open: true,
			},
		};
	});

	afterEach(() => {
		cleanupAppModals();
		vi.clearAllMocks();
	});

	it('should render for folder resource', async () => {
		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
				},
			},
		});
		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(
			screen.getByText(`Move "${TEST_FOLDER_RESOURCE.name}" to another folder`),
		).toBeInTheDocument();
		expect(screen.getByTestId('move-folder-description')).toBeInTheDocument();
	});

	it('should render for workflow resource', async () => {
		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_WORKFLOW_RESOURCE,
					resourceType: 'workflow',
				},
			},
		});
		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(
			screen.getByText(`Move "${TEST_WORKFLOW_RESOURCE.name}" to another folder`),
		).toBeInTheDocument();
		expect(screen.queryByTestId('move-folder-description')).not.toBeInTheDocument();
	});
});
