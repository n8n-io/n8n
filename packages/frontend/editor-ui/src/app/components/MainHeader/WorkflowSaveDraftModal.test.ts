import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import WorkflowSaveDraftModal from '@/app/components/MainHeader/WorkflowSaveDraftModal.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { WORKFLOW_SAVE_DRAFT_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { createEventBus } from '@n8n/utils/event-bus';
import type { WorkflowSaveDraftModalEventBusEvents } from './WorkflowSaveDraftModal.vue';

const mockShowMessage = vi.fn();

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
	}),
}));

vi.mock('@/app/plugins/telemetry', () => ({
	telemetry: {
		track: vi.fn(),
	},
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

const defaultProps = {
	modalName: WORKFLOW_SAVE_DRAFT_MODAL_KEY,
	data: {
		workflowId: 'workflow-123',
		versionId: 'version-456',
	},
};

let pinia: ReturnType<typeof createTestingPinia>;

const renderModal = createComponentRenderer(WorkflowSaveDraftModal, {
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

describe('WorkflowSaveDraftModal', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflow = {
			id: 'workflow-123',
			name: 'Test Workflow',
			versionId: 'version-456',
			nodes: [],
			connections: {},
			active: false,
			activeVersionId: null,
			activeVersion: null,
			isArchived: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		} as never;
		workflowsStore.saveNamedVersion = vi.fn().mockResolvedValue({});

		mockShowMessage.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render the modal with title and form elements', () => {
			const { getAllByText } = renderModal({ props: defaultProps, pinia });
			// Title and button both have "Create version" text
			const createVersionElements = getAllByText('Create version');
			expect(createVersionElements.length).toBeGreaterThanOrEqual(1);
		});

		it('should render version name input', () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			expect(getByTestId('workflow-save-draft-version-name-input')).toBeInTheDocument();
		});

		it('should render description input', () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			expect(getByTestId('workflow-save-draft-description-input')).toBeInTheDocument();
		});

		it('should render save and cancel buttons', () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			expect(getByTestId('workflow-save-draft-button')).toBeInTheDocument();
			expect(getByTestId('workflow-save-draft-cancel-button')).toBeInTheDocument();
		});
	});

	describe('save button state', () => {
		it('should have save button enabled when version name has content', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const input = getByTestId('workflow-save-draft-version-name-input') as HTMLInputElement;
			const saveButton = getByTestId('workflow-save-draft-button');

			// Wait for any initial value to be set
			await waitFor(() => {
				// Either has auto-generated value or is empty - either way we can test
				expect(input).toBeInTheDocument();
			});

			// Triple click to select all, then type to replace
			await userEvent.tripleClick(input);
			await userEvent.keyboard('My Version');

			await waitFor(() => {
				expect(input.value).toBe('My Version');
			});

			expect(saveButton).not.toBeDisabled();
		});
	});

	describe('save draft functionality', () => {
		it('should call saveNamedVersion when save button is clicked', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const nameInput = getByTestId('workflow-save-draft-version-name-input') as HTMLInputElement;
			const descriptionInput = getByTestId('workflow-save-draft-description-input');
			const saveButton = getByTestId('workflow-save-draft-button');

			// Triple click to select all text, then type to replace
			await userEvent.tripleClick(nameInput);
			await userEvent.keyboard('My Named Version');

			await waitFor(() => {
				expect(nameInput.value).toBe('My Named Version');
			});

			await userEvent.type(descriptionInput, 'A test description');
			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(workflowsStore.saveNamedVersion).toHaveBeenCalledWith('workflow-123', {
					name: 'My Named Version',
					description: 'A test description',
					versionId: 'version-456',
				});
			});
		});

		it('should show success message on successful save', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const nameInput = getByTestId('workflow-save-draft-version-name-input') as HTMLInputElement;
			const saveButton = getByTestId('workflow-save-draft-button');

			// Ensure there's a valid name
			await userEvent.tripleClick(nameInput);
			await userEvent.keyboard('Test Version');

			await waitFor(() => {
				expect(nameInput.value).toBe('Test Version');
			});

			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(mockShowMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'success',
					}),
				);
			});
		});

		it('should show error message on save failure', async () => {
			workflowsStore.saveNamedVersion = vi.fn().mockRejectedValue(new Error('Save failed'));

			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const nameInput = getByTestId('workflow-save-draft-version-name-input') as HTMLInputElement;
			const saveButton = getByTestId('workflow-save-draft-button');

			// Ensure there's a valid name
			await userEvent.tripleClick(nameInput);
			await userEvent.keyboard('Test Version');

			await waitFor(() => {
				expect(nameInput.value).toBe('Test Version');
			});

			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(mockShowMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'error',
					}),
				);
			});
		});

		it('should emit saved event via eventBus when provided', async () => {
			const eventBus = createEventBus<WorkflowSaveDraftModalEventBusEvents>();
			const savedHandler = vi.fn();
			eventBus.on('saved', savedHandler);

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

			const nameInput = getByTestId('workflow-save-draft-version-name-input') as HTMLInputElement;
			const saveButton = getByTestId('workflow-save-draft-button');

			// Triple click to select all, then type to replace
			await userEvent.tripleClick(nameInput);
			await userEvent.keyboard('Test Version');

			await waitFor(() => {
				expect(nameInput.value).toBe('Test Version');
			});

			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(savedHandler).toHaveBeenCalledWith({
					versionId: 'version-456',
					name: 'Test Version',
					description: '',
				});
			});
		});
	});

	describe('form submission', () => {
		it('should handle form submit via enter key', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const nameInput = getByTestId('workflow-save-draft-version-name-input') as HTMLInputElement;

			// Triple click to select all, then type to replace, and submit with enter
			await userEvent.tripleClick(nameInput);
			await userEvent.keyboard('My Version{enter}');

			await waitFor(() => {
				expect(workflowsStore.saveNamedVersion).toHaveBeenCalled();
			});
		});
	});

	describe('version name editing', () => {
		it('should allow editing the version name', async () => {
			const { getByTestId } = renderModal({ props: defaultProps, pinia });
			const input = getByTestId('workflow-save-draft-version-name-input') as HTMLInputElement;

			// Triple click to select all, then type to replace
			await userEvent.tripleClick(input);
			await userEvent.keyboard('My Custom Version');

			await waitFor(() => {
				expect(input.value).toBe('My Custom Version');
			});
		});
	});
});
