import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import WorkflowDescriptionModal from '@/app/components/WorkflowDescriptionModal.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { STORES } from '@n8n/stores';
import { WORKFLOW_DESCRIPTION_MODAL_KEY } from '../constants';

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	return {
		useToast: () => ({
			showError,
		}),
	};
});

vi.mock('@/app/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({
			track,
		}),
	};
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			modules: {
				mcp: {
					enabled: false,
				},
			},
		},
	},
};

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

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

const renderModal = createComponentRenderer(WorkflowDescriptionModal);

let pinia: ReturnType<typeof createTestingPinia>;

describe('WorkflowDescriptionModal', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let uiStore: MockedStore<typeof useUIStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let telemetry: ReturnType<typeof useTelemetry>;
	let toast: ReturnType<typeof useToast>;

	beforeEach(() => {
		pinia = createTestingPinia({ initialState });

		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);
		settingsStore = mockedStore(useSettingsStore);
		telemetry = useTelemetry();
		toast = useToast();

		// Reset mocks
		workflowsStore.saveWorkflowDescription = vi.fn().mockResolvedValue(undefined);
		workflowsStore.workflow = {
			id: 'test-workflow-id',
			name: 'Test Workflow',
			active: false,
			activeVersionId: null,
			isArchived: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			versionId: '1',
			nodes: [],
			connections: {},
		};
		uiStore.markStateClean();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Component rendering', () => {
		it('should render empty string if there is no description', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			expect(textarea).toHaveValue('');
		});
	});

	describe('Popover interaction', () => {
		it('should focus textarea when modal opens', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
					},
				},
				pinia,
				global,
			});

			await new Promise((resolve) => setTimeout(resolve, 200));

			const textarea = getByTestId('workflow-description-input');
			expect(textarea).toHaveFocus();
		});

		it('should not save description when modal closes by esc', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'Updated description');

			await userEvent.type(textarea, '{Esc}');

			expect(workflowsStore.saveWorkflowDescription).not.toHaveBeenCalled();
		});
	});

	describe('Save and Cancel functionality', () => {
		it('should save description when save button is clicked', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'New description');

			const saveButton = getByTestId('workflow-description-save-button');
			await userEvent.click(saveButton);

			expect(workflowsStore.saveWorkflowDescription).toHaveBeenCalledWith(
				'test-workflow-id',
				'New description',
			);
			expect(telemetry.track).toHaveBeenCalledWith('User set workflow description', {
				workflow_id: 'test-workflow-id',
				description: 'New description',
			});
		});

		it('should save empty string when description is cleared', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);

			const saveButton = getByTestId('workflow-description-save-button');
			await userEvent.click(saveButton);

			expect(workflowsStore.saveWorkflowDescription).toHaveBeenCalledWith('test-workflow-id', '');
			expect(telemetry.track).toHaveBeenCalledWith('User set workflow description', {
				workflow_id: 'test-workflow-id',
				description: '',
			});
		});

		it('should disable save button when description has not changed', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const saveButton = getByTestId('workflow-description-save-button');
			expect(saveButton).toBeDisabled();
		});

		it('should disable save button when whitespace-only changes result in same trimmed value', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: '',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			// Type only whitespace
			await userEvent.type(textarea, '   ');

			const saveButton = getByTestId('workflow-description-save-button');
			// Should be disabled since trimmed value is still empty
			expect(saveButton).toBeDisabled();
		});

		it('should not save on Enter key when only whitespace is entered', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: '',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			// Type only whitespace
			await userEvent.type(textarea, '   ');
			await userEvent.keyboard('{Enter}');

			// Should not save since canSave is false
			expect(workflowsStore.saveWorkflowDescription).not.toHaveBeenCalled();
		});

		it('should enable save button when description changes', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			const saveButton = getByTestId('workflow-description-save-button');
			expect(saveButton).not.toBeDisabled();
		});

		it('should disable cancel button during save', async () => {
			workflowsStore.saveWorkflowDescription = vi.fn(
				async () => await new Promise((resolve) => setTimeout(resolve, 100)),
			);

			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			const saveButton = getByTestId('workflow-description-save-button');
			const cancelButton = getByTestId('workflow-description-cancel-button');

			await userEvent.click(saveButton);

			// During save, cancel should be disabled
			expect(cancelButton).toBeDisabled();
		});
	});

	describe('Keyboard shortcuts', () => {
		it('should save when Enter key is pressed', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'New description');
			await userEvent.keyboard('{Enter}');

			expect(workflowsStore.saveWorkflowDescription).toHaveBeenCalledWith(
				'test-workflow-id',
				'New description',
			);
		});

		it('should allow new lines with Shift+Enter', async () => {
			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: '',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, 'Line 1');
			await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
			await userEvent.type(textarea, 'Line 2');

			expect(textarea).toHaveValue('Line 1\nLine 2');
			expect(workflowsStore.saveWorkflowDescription).not.toHaveBeenCalled();
		});
	});

	describe('Error handling', () => {
		it('should show error toast when save fails', async () => {
			const error = new Error('Save failed');
			workflowsStore.saveWorkflowDescription = vi.fn().mockRejectedValue(error);

			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			const saveButton = getByTestId('workflow-description-save-button');
			await userEvent.click(saveButton);

			await vi.waitFor(() => {
				expect(toast.showError).toHaveBeenCalledWith(
					error,
					'Problem updating workflow description',
				);
			});
		});

		it('should keep text on error', async () => {
			const error = new Error('Save failed');
			workflowsStore.saveWorkflowDescription = vi.fn().mockRejectedValue(error);

			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: 'Initial description',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'Failed update');

			const saveButton = getByTestId('workflow-description-save-button');
			await userEvent.click(saveButton);

			await vi.waitFor(() => {
				expect(textarea).toHaveValue('Failed update');
			});
		});
	});

	describe('MCP tooltips', () => {
		it('should show base tooltip when MCP is disabled', async () => {
			// Ensure MCP is disabled
			settingsStore.isModuleActive = vi.fn().mockReturnValue(false);
			settingsStore.moduleSettings.mcp = { mcpAccessEnabled: false };

			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: '',
					},
				},
				pinia,
				global,
			});

			// The tooltip text appears as placeholder in the textarea
			const textarea = getByTestId('descriptionTooltip');
			const placeholder = textarea.textContent;

			expect(placeholder).toContain(
				'Clear descriptions help other users understand the purpose of your workflow',
			);
			expect(placeholder).not.toContain('MCP clients');
		});

		it('should show MCP tooltip when MCP is enabled', async () => {
			// Enable MCP module
			settingsStore.isModuleActive = vi.fn().mockReturnValue(true);
			settingsStore.moduleSettings.mcp = { mcpAccessEnabled: true };

			const { getByTestId } = renderModal({
				props: {
					modalName: WORKFLOW_DESCRIPTION_MODAL_KEY,
					data: {
						workflowId: 'test-workflow-id',
						workflowDescription: '',
					},
				},
				pinia,
				global,
			});

			const textarea = getByTestId('descriptionTooltip');
			const placeholder = textarea.textContent;

			// When MCP is enabled, the placeholder includes both base tooltip and MCP-specific text
			expect(placeholder).toContain('MCP clients');
		});
	});
});
