import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import WorkflowVersionRenameModal from '@/features/workflows/workflowHistory/components/WorkflowVersionRenameModal.vue';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { WORKFLOW_VERSION_RENAME_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { createEventBus } from '@n8n/utils/event-bus';
import type { WorkflowVersionRenameModalEventBusEvents } from './WorkflowVersionRenameModal.vue';
import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';

const mockShowMessage = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
	}),
}));

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: {},
		},
	},
};

const mockVersion: WorkflowHistory = {
	versionId: 'version-123',
	workflowId: 'workflow-456',
	name: 'Initial Version Name',
	description: 'Initial description',
	authors: 'Test Author',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	nodes: [],
	connections: {},
	workflowPublishHistory: [],
};

const defaultProps = {
	modalName: WORKFLOW_VERSION_RENAME_MODAL_KEY,
	data: {
		workflowId: 'workflow-456',
		versionId: 'version-123',
		version: mockVersion,
	},
};

let pinia: ReturnType<typeof createTestingPinia>;

const renderModal = createComponentRenderer(WorkflowVersionRenameModal, {
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

describe('WorkflowVersionRenameModal', () => {
	let workflowHistoryStore: ReturnType<typeof mockedStore<typeof useWorkflowHistoryStore>>;

	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
		workflowHistoryStore = mockedStore(useWorkflowHistoryStore);
		workflowHistoryStore.renameVersion = vi.fn().mockResolvedValue(mockVersion);

		mockShowMessage.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render the modal with title and form elements', () => {
			const { getByText, getByTestId } = renderModal({ props: defaultProps, pinia });

			expect(getByText('Rename version')).toBeInTheDocument();
			expect(getByTestId('workflow-rename-version-name-input')).toBeInTheDocument();
			expect(getByTestId('workflow-rename-version-description-input')).toBeInTheDocument();
			expect(getByTestId('workflow-rename-version-save-button')).toBeInTheDocument();
			expect(getByTestId('workflow-rename-version-cancel-button')).toBeInTheDocument();
		});
	});

	describe('save button state', () => {
		it('should enable save button when version name has content', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const input = getByTestId('workflow-rename-version-name-input') as HTMLInputElement;
			const saveButton = getByTestId('workflow-rename-version-save-button');

			// Type a name
			await userEvent.tripleClick(input);
			await userEvent.keyboard('New Version Name');

			await waitFor(() => {
				expect(input.value).toBe('New Version Name');
			});

			expect(saveButton).not.toBeDisabled();
		});

		it('should disable save button when version name is empty', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const input = getByTestId('workflow-rename-version-name-input') as HTMLInputElement;
			const saveButton = getByTestId('workflow-rename-version-save-button');

			// Initially empty or clear any existing value
			await userEvent.tripleClick(input);
			await userEvent.keyboard('{Backspace}');

			await waitFor(() => {
				expect(input.value).toBe('');
			});

			expect(saveButton).toBeDisabled();
		});
	});

	describe('rename functionality', () => {
		it('should call renameVersion with updated values', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const nameInput = getByTestId('workflow-rename-version-name-input') as HTMLInputElement;
			const descInput = getByTestId(
				'workflow-rename-version-description-input',
			) as HTMLTextAreaElement;
			const saveButton = getByTestId('workflow-rename-version-save-button');

			// Change the values
			await userEvent.tripleClick(nameInput);
			await userEvent.keyboard('Updated Version Name');

			await waitFor(() => {
				expect(nameInput.value).toBe('Updated Version Name');
			});

			await userEvent.tripleClick(descInput);
			await userEvent.keyboard('Updated description');

			await waitFor(() => {
				expect(descInput.value).toBe('Updated description');
			});

			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(workflowHistoryStore.renameVersion).toHaveBeenCalledWith(
					'workflow-456',
					'version-123',
					{
						name: 'Updated Version Name',
						description: 'Updated description',
					},
				);
			});
		});

		it('should show success message on successful rename', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const saveButton = getByTestId('workflow-rename-version-save-button');

			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(mockShowMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'success',
					}),
				);
			});
		});

		it('should show error message on rename failure', async () => {
			workflowHistoryStore.renameVersion = vi.fn().mockRejectedValue(new Error('Rename failed'));

			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const saveButton = getByTestId('workflow-rename-version-save-button');

			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(mockShowMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'error',
					}),
				);
			});
		});

		it('should emit renamed event via eventBus when provided', async () => {
			const eventBus = createEventBus<WorkflowVersionRenameModalEventBusEvents>();
			const renamedHandler = vi.fn();
			eventBus.on('renamed', renamedHandler);

			const { getByTestId } = renderModal({
				props: {
					...defaultProps,
					data: {
						...defaultProps.data,
						eventBus,
					},
				},
				pinia,
			});

			const saveButton = getByTestId('workflow-rename-version-save-button');
			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(renamedHandler).toHaveBeenCalledWith({
					version: mockVersion,
				});
			});
		});
	});

	describe('form submission', () => {
		it('should handle form submit via enter key', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const nameInput = getByTestId('workflow-rename-version-name-input') as HTMLInputElement;

			// Press enter to submit
			await userEvent.type(nameInput, '{enter}');

			await waitFor(() => {
				expect(workflowHistoryStore.renameVersion).toHaveBeenCalled();
			});
		});
	});

	describe('version without name', () => {
		it('should start with empty name input when version has no name', () => {
			const versionWithoutName: WorkflowHistory = {
				...mockVersion,
				name: null as never,
			};

			const { getByTestId } = renderModal({
				props: {
					...defaultProps,
					data: {
						...defaultProps.data,
						version: versionWithoutName,
					},
				},
				pinia,
			});

			const nameInput = getByTestId('workflow-rename-version-name-input') as HTMLInputElement;
			expect(nameInput.value).toBe('');
		});
	});
});
