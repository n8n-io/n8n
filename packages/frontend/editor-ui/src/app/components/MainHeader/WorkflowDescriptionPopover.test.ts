import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import WorkflowDescriptionPopover from '@/app/components/MainHeader/WorkflowDescriptionPopover.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { STORES } from '@n8n/stores';

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

const renderComponent = createComponentRenderer(WorkflowDescriptionPopover, {
	pinia: createTestingPinia({ initialState }),
});

describe('WorkflowDescriptionPopover', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let uiStore: MockedStore<typeof useUIStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let telemetry: ReturnType<typeof useTelemetry>;
	let toast: ReturnType<typeof useToast>;

	beforeEach(() => {
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
		uiStore.stateIsDirty = false;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Component rendering', () => {
		it('should render the description button and default description', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			const button = getByTestId('workflow-description-button');
			await userEvent.click(button);

			const textarea = getByTestId('workflow-description-input');
			expect(textarea).toHaveValue('Initial description');
		});

		it('should render empty string if there is no description', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
				},
			});

			const button = getByTestId('workflow-description-button');
			await userEvent.click(button);

			const textarea = getByTestId('workflow-description-input');
			expect(textarea).toHaveValue('');
		});
	});

	describe('Popover interaction', () => {
		it('should open popover when button is clicked', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Test description',
				},
			});

			const button = getByTestId('workflow-description-button');
			expect(queryByTestId('workflow-description-edit-content')).not.toBeInTheDocument();

			await userEvent.click(button);
			expect(getByTestId('workflow-description-edit-content')).toBeInTheDocument();
		});

		it('should focus textarea when popover opens', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
				},
			});

			const button = getByTestId('workflow-description-button');
			await userEvent.click(button);
			await nextTick();

			const textarea = getByTestId('workflow-description-input');
			expect(textarea).toHaveFocus();
		});

		it('should save description when popover closes', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			const button = getByTestId('workflow-description-button');
			await userEvent.click(button);

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'Updated description');

			// Click outside to close popover
			await userEvent.click(document.body);

			expect(workflowsStore.saveWorkflowDescription).toHaveBeenCalledWith(
				'test-workflow-id',
				'Updated description',
			);
		});
	});

	describe('Save and Cancel functionality', () => {
		it('should save description when save button is clicked', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

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
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

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
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const saveButton = getByTestId('workflow-description-save-button');
			expect(saveButton).toBeDisabled();
		});

		it('should disable save button when whitespace-only changes result in same trimmed value', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: '',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			// Type only whitespace
			await userEvent.type(textarea, '   ');

			const saveButton = getByTestId('workflow-description-save-button');
			// Should be disabled since trimmed value is still empty
			expect(saveButton).toBeDisabled();
		});

		it('should not save on Enter key when only whitespace is entered', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: '',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			// Type only whitespace
			await userEvent.type(textarea, '   ');
			await userEvent.keyboard('{Enter}');

			// Should not save since canSave is false
			expect(workflowsStore.saveWorkflowDescription).not.toHaveBeenCalled();
		});

		it('should enable save button when description changes', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			const saveButton = getByTestId('workflow-description-save-button');
			expect(saveButton).not.toBeDisabled();
		});

		it('should revert changes when cancel button is clicked', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'Changed description');

			const cancelButton = getByTestId('workflow-description-cancel-button');
			await userEvent.click(cancelButton);

			// Re-open popover to check value
			await userEvent.click(getByTestId('workflow-description-button'));
			const textareaAfterCancel = getByTestId('workflow-description-input');
			expect(textareaAfterCancel).toHaveValue('Initial description');
		});

		it('should disable cancel button during save', async () => {
			workflowsStore.saveWorkflowDescription = vi.fn(
				async () => await new Promise((resolve) => setTimeout(resolve, 100)),
			);

			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

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
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

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
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: '',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, 'Line 1');
			await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
			await userEvent.type(textarea, 'Line 2');

			expect(textarea).toHaveValue('Line 1\nLine 2');
			expect(workflowsStore.saveWorkflowDescription).not.toHaveBeenCalled();
		});

		it('should cancel when Escape key is pressed', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'Changed description');
			await userEvent.keyboard('{Escape}');

			// Check that popover is closed
			expect(queryByTestId('workflow-description-edit-content')).not.toBeInTheDocument();

			// Re-open to verify changes were reverted
			await userEvent.click(getByTestId('workflow-description-button'));
			const textareaAfterEscape = getByTestId('workflow-description-input');
			expect(textareaAfterEscape).toHaveValue('Initial description');
		});
	});

	describe('Error handling', () => {
		it('should show error toast when save fails', async () => {
			const error = new Error('Save failed');
			workflowsStore.saveWorkflowDescription = vi.fn().mockRejectedValue(error);

			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

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

		it('should revert to last saved value on error', async () => {
			const error = new Error('Save failed');
			workflowsStore.saveWorkflowDescription = vi.fn().mockRejectedValue(error);

			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'Failed update');

			const saveButton = getByTestId('workflow-description-save-button');
			await userEvent.click(saveButton);

			await vi.waitFor(() => {
				expect(textarea).toHaveValue('Initial description');
			});
		});
	});

	describe('Dirty state management', () => {
		it('should set dirty flag when description changes', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			expect(uiStore.stateIsDirty).toBe(false);

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			expect(uiStore.stateIsDirty).toBe(true);
		});

		it('should clear dirty flag when saving', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			expect(uiStore.stateIsDirty).toBe(true);

			const saveButton = getByTestId('workflow-description-save-button');
			await userEvent.click(saveButton);

			await vi.waitFor(() => {
				expect(uiStore.stateIsDirty).toBe(false);
			});
		});

		it('should clear dirty flag when canceling', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			expect(uiStore.stateIsDirty).toBe(true);

			const cancelButton = getByTestId('workflow-description-cancel-button');
			await userEvent.click(cancelButton);

			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should handle whitespace-only changes correctly', async () => {
			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: '  Initial  ',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.clear(textarea);
			await userEvent.type(textarea, 'Initial');

			// Should not be dirty since trimmed values are the same
			expect(uiStore.stateIsDirty).toBe(false);
		});
	});

	describe('MCP tooltips', () => {
		it('should show base tooltip when MCP is disabled', async () => {
			// Ensure MCP is disabled
			settingsStore.isModuleActive = vi.fn().mockReturnValue(false);
			settingsStore.moduleSettings.mcp = { mcpAccessEnabled: false };

			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: '',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			// The tooltip text appears as placeholder in the textarea
			const textarea = getByTestId('workflow-description-input');
			const placeholder = textarea.getAttribute('placeholder');

			expect(placeholder).toContain('Edit workflow description');
			expect(placeholder).not.toContain('MCP clients');
		});

		it('should show MCP tooltip when MCP is enabled', async () => {
			// Enable MCP module
			settingsStore.isModuleActive = vi.fn().mockReturnValue(true);
			settingsStore.moduleSettings.mcp = { mcpAccessEnabled: true };

			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: '',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			const placeholder = textarea.getAttribute('placeholder');

			expect(placeholder).toContain('MCP clients');
			expect(placeholder).not.toContain('Edit workflow description');
		});
	});

	describe('UI state tracking', () => {
		it('should track active actions during save', async () => {
			const addActiveActionSpy = vi.spyOn(uiStore, 'addActiveAction');
			const removeActiveActionSpy = vi.spyOn(uiStore, 'removeActiveAction');

			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			const saveButton = getByTestId('workflow-description-save-button');
			await userEvent.click(saveButton);

			expect(addActiveActionSpy).toHaveBeenCalledWith('workflowSaving');

			await vi.waitFor(() => {
				expect(removeActiveActionSpy).toHaveBeenCalledWith('workflowSaving');
			});
		});

		it('should remove active action even on error', async () => {
			const removeActiveActionSpy = vi.spyOn(uiStore, 'removeActiveAction');
			workflowsStore.saveWorkflowDescription = vi.fn().mockRejectedValue(new Error('Failed'));

			const { getByTestId } = renderComponent({
				props: {
					workflowId: 'test-workflow-id',
					workflowDescription: 'Initial description',
				},
			});

			await userEvent.click(getByTestId('workflow-description-button'));

			const textarea = getByTestId('workflow-description-input');
			await userEvent.type(textarea, ' updated');

			const saveButton = getByTestId('workflow-description-save-button');
			await userEvent.click(saveButton);

			await vi.waitFor(() => {
				expect(removeActiveActionSpy).toHaveBeenCalledWith('workflowSaving');
			});
		});
	});
});
